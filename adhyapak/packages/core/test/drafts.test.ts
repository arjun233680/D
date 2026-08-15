import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { configureBackend, listDraftQuestions } from '../src/index.ts';

/**
 * The review queue has to show the whole batch.
 *
 * It fetched one page and stopped, so an 840-row import put 200 drafts on the
 * screen with no next-page control and nothing saying the other 640 existed.
 * You published what you could see and the rest stayed invisible — which looks
 * exactly like an import that only wrote 200 rows.
 *
 * Paging is only observable as a second request, so the backend is stubbed at
 * `fetch` and the requests are counted.
 */

interface StubCall {
  path: string;
  params: URLSearchParams;
}

const draftRow = (i: number) => ({
  id: `q-${i}`,
  status: 'draft',
  text: { en: `Question ${i}`, hi: `प्रश्न ${i}` },
  options: [
    { en: 'A', hi: 'A' },
    { en: 'B', hi: 'B' },
  ],
  correct_index: 0,
  subject_id: 'cdp',
  topic_id: 'cdp-piaget',
  exam_ids: ['htet'],
  created_at: '2026-08-01T00:00:00Z',
});

/**
 * Runs `body` against a stubbed backend whose pages are `pages` — one array of
 * rows per request, in order. The client resolves `fetch` when it is built, so
 * the stub goes in before `configureBackend` hands over credentials.
 */
const withPages = async <T>(
  pages: unknown[][],
  body: (calls: StubCall[]) => Promise<T>,
): Promise<T> => {
  const realFetch = globalThis.fetch;
  const calls: StubCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    calls.push({ path: url.pathname, params: url.searchParams });
    const rows = pages[calls.length - 1] ?? [];
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  configureBackend({ url: 'https://stub.test', anonKey: 'stub-anon-key' });
  try {
    return await body(calls);
  } finally {
    configureBackend(null);
    globalThis.fetch = realFetch;
  }
};

const page = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => draftRow(from + i));

describe('the draft queue is fetched whole', () => {
  it('keeps paging until a page comes back short', async () => {
    // 1000 is the page size, so a full page means "there may be more".
    const { rows, calls } = await withPages(
      [page(0, 1000), page(1000, 1000), page(2000, 240)],
      async (calls) => ({ rows: await listDraftQuestions({ status: 'draft' }), calls }),
    );

    assert.equal(rows.length, 2240, 'every draft came back');
    assert.equal(calls.length, 3, 'three requests: two full pages and a short one');
    assert.equal(rows[0]!.id, 'q-0');
    assert.equal(rows.at(-1)!.id, 'q-2239');
  });

  it('stops after one request when the first page is short', async () => {
    const { rows, calls } = await withPages([page(0, 12)], async (calls) => ({
      rows: await listDraftQuestions(),
      calls,
    }));
    assert.equal(rows.length, 12);
    assert.equal(calls.length, 1, 'no pointless second request');
  });

  it('returns nothing without asking twice when the queue is empty', async () => {
    const { rows, calls } = await withPages([[]], async (calls) => ({
      rows: await listDraftQuestions(),
      calls,
    }));
    assert.deepEqual(rows, []);
    assert.equal(calls.length, 1);
  });

  it('still honours an explicit window, and asks only once for it', async () => {
    // A caller that asks for 50 wants 50 — paging past it would be surprising.
    const { rows, calls } = await withPages([page(0, 50)], async (calls) => ({
      rows: await listDraftQuestions({ limit: 50 }),
      calls,
    }));
    assert.equal(rows.length, 50);
    assert.equal(calls.length, 1);
  });

  it('asks for drafts, and for the status it was given', async () => {
    const calls = await withPages([[]], async (calls) => {
      await listDraftQuestions();
      await listDraftQuestions({ status: 'published' });
      return calls;
    });
    assert.equal(calls[0]!.params.get('status'), 'eq.draft');
    assert.equal(calls[1]!.params.get('status'), 'eq.published');
  });

  it('moves the window forward between pages', async () => {
    const calls = await withPages([page(0, 1000), page(1000, 3)], async (calls) => {
      await listDraftQuestions();
      return calls;
    });
    // The second request has to start where the first stopped, or the same
    // thousand rows come back forever and the loop never reaches the end.
    assert.equal(calls[0]!.params.get('offset'), '0');
    assert.equal(calls[0]!.params.get('limit'), '1000');
    assert.equal(calls[1]!.params.get('offset'), '1000');
  });
});
