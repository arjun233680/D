import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  QUESTIONS,
  configureBackend,
  countQuestions,
  countQuestionsBySubject,
  previousYearQuestions,
} from '../src/index.ts';

/**
 * Where a question count comes from.
 *
 * The practice hub used to render `QUESTIONS.length` and
 * `previousYearQuestions().length` — the lengths of the arrays compiled into the
 * bundle. Those are 67 and 21. The database holds ~900. A learner was told the
 * bank was a fifteenth of its real size, and no amount of importing would ever
 * change the number, because the number never described the bank.
 *
 * So these tests do not check that a count is plausible; they check where it was
 * fetched from. The backend is stubbed at `fetch`, which is the only place the
 * difference is observable: a count that comes from Postgres produces an HTTP
 * request, and a count measured from a bundled array does not.
 */

/* ------------------------------------------------------------ stub backend */

interface StubCall {
  path: string;
  method: string;
  params: URLSearchParams;
  prefer: string | null;
}

/**
 * Runs `body` with a Supabase client wired to a stubbed `fetch`.
 *
 * The client resolves `fetch` once, when it is constructed, and `getBackend()`
 * constructs it lazily on first use — so the stub has to be installed before
 * `configureBackend` hands over credentials, and the credentials have to be
 * withdrawn afterwards or every later test would leave offline mode.
 */
const withStubbedBackend = async <T>(
  respond: (call: StubCall) => Response,
  body: (calls: StubCall[]) => Promise<T>,
): Promise<T> => {
  const realFetch = globalThis.fetch;
  const calls: StubCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    const call: StubCall = {
      path: url.pathname,
      method: (init?.method ?? 'GET').toUpperCase(),
      params: url.searchParams,
      prefer: new Headers(init?.headers).get('Prefer'),
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;

  configureBackend({ url: 'https://stub.test', anonKey: 'stub-anon-key' });
  try {
    return await body(calls);
  } finally {
    configureBackend(null);
    globalThis.fetch = realFetch;
  }
};

/** What PostgREST returns for `head: true, count: 'exact'`: a header, no rows. */
const countResponse = (total: number) =>
  new Response(null, {
    status: 200,
    headers: { 'content-range': `0-0/${total}` },
  });

const rowsResponse = (rows: unknown[]) =>
  new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

/* ------------------------------------------------------------------ tests */

describe('countQuestions asks the database, not the bundle', () => {
  it('returns the number the database reported', async () => {
    const count = await withStubbedBackend(
      () => countResponse(861),
      () => countQuestions({ examId: 'htet', pyqOnly: true }),
    );
    assert.equal(count, 861);
    // The point of the test: 861 is not any length available locally.
    assert.notEqual(count, QUESTIONS.length);
    assert.notEqual(count, previousYearQuestions().length);
  });

  it('counts without transferring the questions', async () => {
    const calls = await withStubbedBackend(
      () => countResponse(861),
      async (calls) => {
        await countQuestions({ examId: 'htet' });
        return calls;
      },
    );
    assert.equal(calls.length, 1, 'one round trip');
    assert.equal(calls[0]!.method, 'HEAD', 'no rows come back for a count');
    assert.match(calls[0]!.prefer ?? '', /count=exact/);
    assert.equal(calls[0]!.path, '/rest/v1/questions');
  });

  it('never counts anything unpublished', async () => {
    const calls = await withStubbedBackend(
      () => countResponse(0),
      async (calls) => {
        await countQuestions({});
        return calls;
      },
    );
    assert.equal(calls[0]!.params.get('status'), 'eq.published');
  });

  it('sends the whole funnel to the database', async () => {
    const calls = await withStubbedBackend(
      () => countResponse(30),
      async (calls) => {
        await countQuestions({
          pyqOnly: true,
          examId: 'htet',
          level: 'primary',
          subjectId: 'cdp',
          year: 2023,
          shift: '1',
        });
        return calls;
      },
    );
    const p = calls[0]!.params;
    assert.equal(p.get('exam_ids'), 'cs.{htet}');
    assert.equal(p.get('subject_id'), 'eq.cdp');
    assert.equal(p.get('pyq_year'), 'eq.2023');
    // Level, shift and difficulty were missing from countQuestions while
    // listQuestions honoured all three, so the count above a filtered list
    // described a wider set than the list itself.
    assert.equal(p.get('levels'), 'cs.{primary}');
    assert.equal(p.get('pyq_shift'), 'eq.1');
  });

  it('narrows by difficulty, which it also used to ignore', async () => {
    const calls = await withStubbedBackend(
      () => countResponse(12),
      async (calls) => {
        await countQuestions({ difficulty: 'hard' });
        return calls;
      },
    );
    assert.equal(calls[0]!.params.get('difficulty'), 'eq.hard');
  });

  it('agrees with the list it is supposed to describe', async () => {
    // Same filter, both functions: every parameter one sends, the other sends.
    const filter = {
      pyqOnly: true,
      examId: 'htet',
      level: 'primary',
      subjectId: 'cdp',
      year: 2023,
      shift: '1',
      difficulty: 'medium',
    } as const;

    const [countParams, listParams] = await withStubbedBackend(
      (call) => (call.method === 'HEAD' ? countResponse(30) : rowsResponse([])),
      async (calls) => {
        const { listQuestions } = await import('../src/index.ts');
        await countQuestions(filter);
        await listQuestions(filter);
        return calls.map((c) => c.params);
      },
    );

    for (const [key, value] of countParams!) {
      if (key === 'select') continue; // a count selects a column it never returns
      assert.equal(listParams!.get(key), value, `list is missing ${key}=${value}`);
    }
  });
});

describe('per-subject counts come from the database too', () => {
  it('tallies what the database returned', async () => {
    const counts = await withStubbedBackend(
      () =>
        rowsResponse([
          { subject_id: 'cdp' },
          { subject_id: 'cdp' },
          { subject_id: 'haryana-gk' },
        ]),
      () => countQuestionsBySubject('htet'),
    );
    assert.deepEqual(counts, { cdp: 2, 'haryana-gk': 1 });
  });

  it('fetches one column for the whole index rather than one request per tile', async () => {
    const calls = await withStubbedBackend(
      () => rowsResponse([{ subject_id: 'cdp' }]),
      async (calls) => {
        await countQuestionsBySubject('htet');
        return calls;
      },
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.params.get('select'), 'subject_id');
    assert.equal(calls[0]!.params.get('status'), 'eq.published');
    assert.equal(calls[0]!.params.get('exam_ids'), 'cs.{htet}');
  });
});

describe('offline, the count is still the count of what is served', () => {
  it('measures the bundled set when there is no backend', async () => {
    // Not a contradiction of the above: offline the bundled array *is* the bank,
    // so counting it is honest. The bug was reading it while connected.
    const cdp = await countQuestions({ subjectId: 'cdp' });
    assert.equal(cdp, QUESTIONS.filter((q) => q.subjectId === 'cdp').length);
  });

  it('counts previous-year questions the same way the PYQ tile does', async () => {
    assert.equal(await countQuestions({ pyqOnly: true }), previousYearQuestions().length);
  });

  it('tallies bundled questions per subject', async () => {
    const counts = await countQuestionsBySubject();
    assert.equal(counts.cdp, QUESTIONS.filter((q) => q.subjectId === 'cdp').length);
  });

  it('reports nothing for a year it cannot verify, rather than a wider set', async () => {
    // The bundle records provenance as prose. `?year=2019` used to come back
    // with the same questions as `?year=2023` — and the screen prints the year
    // beside the count, so the learner was told those were the 2019 paper.
    assert.equal(await countQuestions({ pyqOnly: true, year: 2019 }), 0);
    assert.equal(await countQuestions({ pyqOnly: true, year: 2023 }), 0);
    assert.equal(await countQuestions({ pyqOnly: true, shift: '1' }), 0);
    // And the unfiltered count is unaffected, so offline practice still works.
    assert.ok((await countQuestions({ pyqOnly: true })) > 0);
  });
});

/* -------------------------------------------------------------- the guard */

const APPS = join(dirname(fileURLToPath(import.meta.url)), '../../../apps');

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.expo' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

describe('no screen measures the question bank locally', () => {
  /**
   * The two bundled arrays that describe the question bank. Any screen holding
   * one of these is one `.length` away from telling a learner the bank is 67
   * questions, so the import itself is what this forbids — a rule that can be
   * checked, unlike "do not render its length".
   *
   * TESTS, NOTES, VIDEOS and BATCHES are deliberately not on this list: screens
   * use those to render the items themselves, not to claim a total.
   */
  const forbidden = ['QUESTIONS', 'previousYearQuestions'];

  it('never imports the bundled question arrays into an app', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(APPS)) {
      const source = readFileSync(file, 'utf8');
      for (const name of forbidden) {
        // Only an import binding counts; the word may appear in prose.
        const pattern = new RegExp(`import[^;]*\\b${name}\\b[^;]*from\\s*'@adhyapak/core'`, 's');
        if (pattern.test(source)) offenders.push(`${relative(APPS, file)} imports ${name}`);
      }
    }
    assert.deepEqual(offenders, [], 'counts must come from countQuestions()');
  });

  it('is looking at real files', () => {
    assert.ok([...sourceFiles(APPS)].length > 40, 'the walk found the app sources');
  });
});
