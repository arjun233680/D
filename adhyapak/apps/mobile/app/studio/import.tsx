import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  DEFAULT_COLUMNS,
  EXAMS,
  SUBJECTS,
  commitImport,
  createImportBatch,
  findDuplicates,
  findLibraryDuplicates,
  fingerprint,
  importQuestions,
  isBackendConfigured,
  parseDelimited,
  readWorkbook,
  refsFrom,
  sheetToRows,
  theme,
  type DuplicateMatch,
  type ImportReport,
  type Row,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { StudioGate } from '@/components/StudioGate';
import { Badge, s } from '@/components/ui';
import { CANVAS, INK, MUTED, PrepHeader, PrepShell, VIOLET } from '@/components/prep';

/**
 * Question import — the native half of apps/web/app/studio/import/page.tsx.
 *
 * Pick a CSV or a workbook, see what the file actually contains, then write the
 * accepted rows as drafts for the review queue. Nothing reaches a learner from
 * here: every row lands at `status: 'draft'` and has to be published from
 * /studio/drafts, which is where the database re-checks it.
 *
 * WHAT THE PHONE LEAVES OUT, AND WHY
 *
 * The website has a four-step wizard whose second step is a column mapper — a
 * grid pairing each canonical field with a column from the sheet, so an
 * operator can rescue a file whose headers are spelled their own way. That grid
 * is a two-dimensional control, and it is the one part of this flow a handset
 * genuinely cannot carry: eleven fields against twenty columns is a table, and
 * a table is what a phone cannot show.
 *
 * So this screen imports files the auto-mapper already understands, reports
 * honestly when it does not, and says where to go — the website — rather than
 * pretending a phone-sized mapper would do. That is a smaller screen than the
 * website's, deliberately, and it is the one difference in the port that is
 * about capability rather than layout.
 *
 * Everything else is the same code: `importQuestions` from packages/core does
 * the validating, `findDuplicates` the collision check, and `createImportBatch`
 * plus `commitImport` the writing, exactly as the website calls them.
 */

/** The same reference sets the website validates against. */
const LEVELS = ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'];

const contentRefs = () =>
  refsFrom({
    exams: EXAMS.map((e) => e.id),
    subjects: SUBJECTS.map((x) => x.id),
    topics: SUBJECTS.flatMap((x) => x.topics.map((tp) => tp.id)),
    levels: LEVELS,
  });

interface Picked {
  filename: string;
  rows: Row[];
  headers: string[];
}

export default function StudioImportScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { access, loading } = useStudioAccess();

  const [examId, setExamId] = useState<string | undefined>(undefined);
  const [file, setFile] = useState<Picked | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ written: number; attempted: number } | null>(null);

  const noBackend = !isBackendConfigured();

  /** Reads the picked document as bytes, whichever platform handed it over. */
  const bytesOf = async (uri: string): Promise<Uint8Array> => {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  };

  const pick = async () => {
    setError(null);
    setDone(null);
    setReport(null);
    setDuplicates([]);

    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setBusy(hi ? 'फ़ाइल पढ़ी जा रही है…' : 'Reading the file…');
    try {
      const bytes = await bytesOf(asset.uri);
      const isCsv = /\.csv$/i.test(asset.name ?? '') || asset.mimeType?.includes('csv');

      let rows: Row[];
      let headers: string[];

      if (isCsv) {
        const text = new TextDecoder().decode(bytes);
        rows = parseDelimited(text);
        headers = Object.keys(rows[0] ?? {});
      } else {
        const book = await readWorkbook(bytes);
        const sheet = book.sheets[0];
        if (!sheet) throw new Error(hi ? 'इस फ़ाइल में कोई शीट नहीं है।' : 'This file has no sheets.');
        // The first sheet only. The website lets an operator switch sheets;
        // that control belongs with the column mapper it sits beside, and both
        // are on the website for the reason given at the head of this file.
        const grid = sheetToRows(book.read(sheet.name));
        headers = grid.headers;
        rows = grid.rows;
      }

      if (rows.length === 0) {
        throw new Error(
          hi ? 'फ़ाइल में कोई पंक्ति नहीं मिली।' : 'No rows were found in that file.',
        );
      }
      setFile({ filename: asset.name ?? 'import', rows, headers });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setBusy(null);
    }
  };

  const validate = async () => {
    if (!file) return;
    setBusy(hi ? 'जाँच हो रही है…' : 'Checking…');
    setError(null);
    try {
      const built = importQuestions(file.rows, {
        columns: DEFAULT_COLUMNS,
        refs: contentRefs(),
        defaultExamIds: examId ? [examId] : [],
        status: 'draft',
        idPrefix: `q-${Date.now().toString(36)}`,
      });
      // The library check is a network call, so a build with no backend still
      // gets the in-file collision report rather than nothing.
      const existing = await findLibraryDuplicates(
        built.accepted.map((q) => fingerprint(q.text)),
      ).catch(() => []);
      setReport(built);
      setDuplicates(findDuplicates(built.accepted, existing));
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!file || !report) return;
    setBusy(hi ? 'लिखा जा रहा है…' : 'Writing…');
    setError(null);

    const batch = await createImportBatch({
      label: file.filename,
      filename: file.filename,
      examId,
      totalRows: report.stats.total,
      rejectedRows: report.stats.rejected,
      duplicateRows: duplicates.length,
      report: {
        stats: report.stats,
        rejected: report.rejected.slice(0, 500),
        duplicates: duplicates.slice(0, 500),
      },
    });
    if (!batch.ok) {
      setBusy(null);
      setError(batch.error);
      return;
    }

    const written = await commitImport(batch.value.id, report.accepted);
    setBusy(null);
    if (!written.ok) {
      // "23 of 40 saved, then the connection dropped" is a different situation
      // from "nothing saved", and an educator has to be able to tell them apart.
      setError(written.error);
      return;
    }
    setDone({ written: written.value, attempted: report.accepted.length });
  };

  if (!access || access.kind !== 'staff') {
    return (
      <StudioGate access={access} loading={loading} lang={lang}>
        {null}
      </StudioGate>
    );
  }

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <PrepHeader
            title={hi ? 'प्रश्न आयात' : 'Import questions'}
            subtitle={
              hi ? 'CSV या स्प्रेडशीट से ड्राफ़्ट बनाएँ' : 'Turn a CSV or sheet into drafts'
            }
            onMenu={openMenu}
            back
            lang={lang}
          />

          <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40, gap: 16 }}>
            {noBackend ? (
              <Note tone="warn">
                ⚠️{' '}
                {hi
                  ? 'इस बिल्ड में कोई डेटाबेस नहीं है, इसलिए आयात सहेजा नहीं जाएगा।'
                  : 'This build has no database, so an import cannot be saved.'}
              </Note>
            ) : null}

            {/* ------------------------------------------------------ exam */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: theme.family.displayBold, color: MUTED }}>
                {hi ? 'परीक्षा (वैकल्पिक)' : 'Exam (optional)'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {EXAMS.slice(0, 12).map((e) => {
                  const on = examId === e.id;
                  return (
                    <Pressable
                      key={e.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setExamId(on ? undefined : e.id)}
                      style={{
                        minHeight: 40,
                        justifyContent: 'center',
                        borderRadius: theme.radius.pill,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        borderColor: on ? 'transparent' : theme.color.border,
                        backgroundColor: on ? VIOLET : theme.color.surface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontFamily: theme.family.bodySemi,
                          color: on ? '#fff' : MUTED,
                        }}
                      >
                        {e.shortName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ------------------------------------------------------ pick */}
            <Pressable
              accessibilityRole="button"
              onPress={pick}
              disabled={busy !== null}
              style={[
                s.card,
                {
                  alignItems: 'center',
                  padding: 24,
                  borderStyle: 'dashed',
                  borderColor: '#ded9f3',
                  opacity: busy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 30 }}>📄</Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 15,
                  fontFamily: theme.family.displayBold,
                  color: INK,
                }}
              >
                {file
                  ? file.filename
                  : hi
                    ? 'फ़ाइल चुनें'
                    : 'Choose a file'}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  textAlign: 'center',
                  fontSize: 12,
                  lineHeight: 17,
                  fontFamily: theme.family.body,
                  color: MUTED,
                }}
              >
                {file
                  ? hi
                    ? `${file.rows.length} पंक्तियाँ · ${file.headers.length} कॉलम`
                    : `${file.rows.length} rows · ${file.headers.length} columns`
                  : hi
                    ? 'CSV या XLSX'
                    : 'CSV or XLSX'}
              </Text>
            </Pressable>

            {busy ? <Note tone="info">{busy}</Note> : null}
            {error ? <Note tone="bad">✕ {error}</Note> : null}

            {/* ---------------------------------------------------- validate */}
            {file && !report ? (
              <Action label={hi ? 'फ़ाइल जाँचें' : 'Check the file'} onPress={validate} disabled={busy !== null} />
            ) : null}

            {/* ------------------------------------------------------ review */}
            {report ? (
              <View style={[s.card, { padding: 16, gap: 12 }]}>
                <Text style={{ fontSize: 15, fontFamily: theme.family.displayBold, color: INK }}>
                  {hi ? 'फ़ाइल में क्या मिला' : 'What the file holds'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  <Figure label={hi ? 'कुल' : 'Rows'} value={report.stats.total} />
                  <Figure label={hi ? 'स्वीकृत' : 'Accepted'} value={report.stats.accepted} />
                  <Figure label={hi ? 'अस्वीकृत' : 'Rejected'} value={report.stats.rejected} />
                  <Figure label={hi ? 'दोहराव' : 'Duplicates'} value={duplicates.length} />
                </View>

                {report.stats.accepted === 0 ? (
                  <Note tone="warn">
                    {hi
                      ? 'एक भी पंक्ति स्वीकार नहीं हुई। सम्भवतः इस फ़ाइल के कॉलम अपने-आप पहचाने नहीं गए — कॉलम मैपिंग वेबसाइट के स्टूडियो में उपलब्ध है।'
                      : 'No row was accepted. The columns in this file were probably not recognised automatically — column mapping lives in the Studio on the website.'}
                  </Note>
                ) : null}

                {/* The first few refusals, with the reason the validator gave.
                    Not all of them: a 630-row rejection list is a scroll nobody
                    reads, and the pattern is visible in the first handful. */}
                {report.rejected.slice(0, 5).map((r, i) => (
                  <Text
                    key={`${r.row}-${i}`}
                    style={{ fontSize: 12, lineHeight: 17, fontFamily: theme.family.body, color: MUTED }}
                  >
                    ✕ {hi ? 'पंक्ति' : 'row'} {r.row}: {r.issues.map((i) => i.message).join('; ')}
                  </Text>
                ))}
                {report.rejected.length > 5 ? (
                  <Text style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}>
                    {hi
                      ? `…और ${report.rejected.length - 5} और`
                      : `…and ${report.rejected.length - 5} more`}
                  </Text>
                ) : null}

                {done ? (
                  <Note tone="good">
                    ✅{' '}
                    {hi
                      ? `${done.written} / ${done.attempted} प्रश्न ड्राफ़्ट के रूप में सहेजे गए।`
                      : `${done.written} of ${done.attempted} questions saved as drafts.`}
                  </Note>
                ) : (
                  <Action
                    label={
                      hi
                        ? `${report.stats.accepted} प्रश्न ड्राफ़्ट में लिखें`
                        : `Write ${report.stats.accepted} as drafts`
                    }
                    onPress={commit}
                    disabled={busy !== null || noBackend || report.stats.accepted === 0}
                  />
                )}

                {done ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push('/studio/drafts')}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        fontSize: 13,
                        fontFamily: theme.family.displayBold,
                        color: VIOLET,
                      }}
                    >
                      {hi ? 'समीक्षा कतार खोलें →' : 'Open the review queue →'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Text
              style={{ fontSize: 11.5, lineHeight: 17, fontFamily: theme.family.body, color: MUTED }}
            >
              {hi
                ? 'यहाँ से कुछ भी सीधे शिक्षार्थी तक नहीं पहुँचता — हर पंक्ति ड्राफ़्ट बनती है और प्रकाशन समीक्षा कतार से होता है।'
                : 'Nothing here reaches a learner directly — every row lands as a draft and is published from the review queue.'}
            </Text>
          </ScrollView>
        </View>
      )}
    </PrepShell>
  );
}

/* --------------------------------------------------------------- fragments */

function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.pill,
        backgroundColor: VIOLET,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 13.5, fontFamily: theme.family.displayBold, color: '#fff' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontFamily: theme.family.displayBold,
          fontVariant: ['tabular-nums'],
          color: INK,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: theme.family.body, color: MUTED }}>{label}</Text>
    </View>
  );
}

function Note({
  tone,
  children,
}: {
  tone: 'info' | 'good' | 'warn' | 'bad';
  children: React.ReactNode;
}) {
  const look = {
    info: { bg: theme.color.infoLight, border: theme.color.info },
    good: { bg: theme.color.successLight, border: theme.color.success },
    warn: { bg: theme.color.warningLight, border: theme.color.warning },
    bad: { bg: theme.color.dangerLight, border: theme.color.danger },
  }[tone];
  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: look.border,
        backgroundColor: look.bg,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 12.5, lineHeight: 18, fontFamily: theme.family.body, color: INK }}>
        {children}
      </Text>
    </View>
  );
}
