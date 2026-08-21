import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  listDraftQuestions,
  setQuestionStatusBulk,
  theme,
  type ContentStatus,
  type DraftQuestion,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { AsyncSection, Badge, s } from '@/components/ui';
import { StudioGate } from '@/components/StudioGate';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { CANVAS, CheckRow, INK, MUTED, PrepHeader, PrepShell, VIOLET } from '@/components/prep';

/**
 * Draft review — the native half of apps/web/app/studio/drafts/page.tsx.
 *
 * The step between an import and a learner: imported questions land here, get
 * looked at, and are published or archived in bulk.
 *
 * Publishing goes through `setQuestionStatusBulk`, which calls the database's
 * `set_question_status` once per question — so the publish-time checks (English
 * text, Hindi text, at least two options, an answer inside them) apply to every
 * row and the audit trigger fires for each. Rows the database refuses come back
 * with the reason and are shown, never silently dropped.
 *
 * WHAT THE PHONE DOES DIFFERENTLY
 *
 * The website reviews drafts in a six-column table. A table is the right shape
 * for the job and the wrong shape for a handset — 640px of columns on a 360px
 * screen is a sideways scroll that hides the checkbox you are trying to hit —
 * so each draft is a card here: the question, then subject, topic, year and the
 * Hindi flag underneath it, with the checkbox as the whole row's tap target.
 * Same columns, same order, same bulk actions.
 */
export default function DraftsScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';

  // Drafts live in the database, so without one there is nothing to review —
  // and that is a different message from "you lack permission".
  const { access, loading } = useStudioAccess();
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; failures: string[] } | null>(
    null,
  );
  const [round, setRound] = useState(0);

  // No limit: the whole queue. This asked for 200, so an 840-row import showed
  // 200 drafts with no next page and no sign the rest existed.
  const drafts = useAsync(() => listDraftQuestions({ status }), [status, round]);

  const rows = useMemo(() => drafts.data ?? [], [drafts.data]);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const apply = async (to: ContentStatus) => {
    if (selected.size === 0) return;
    setBusy(true);
    setResult(null);
    const outcome = await setQuestionStatusBulk([...selected], to);
    setBusy(false);

    if (!outcome.ok) {
      setResult({ ok: false, text: outcome.error, failures: [] });
      return;
    }
    const failed = outcome.value.filter((o) => !o.ok);
    const done = outcome.value.length - failed.length;
    setResult({
      ok: failed.length === 0,
      text: hi
        ? `${done} प्रश्न ${to === 'published' ? 'प्रकाशित' : 'संग्रहीत'} हुए।`
        : `${done} questions ${to === 'published' ? 'published' : 'archived'}.`,
      failures: failed.map((f) => `${f.id}: ${f.message ?? 'refused'}`),
    });
    setSelected(new Set());
    setRound((n) => n + 1);
  };

  // Three states, three sentences. See components/StudioGate.
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
            title={hi ? 'समीक्षा एवं प्रकाशन' : 'Review and publish'}
            subtitle={
              hi
                ? 'प्रकाशन से पहले डेटाबेस हर प्रश्न दोबारा जाँचता है'
                : 'The database re-checks every question as you publish'
            }
            onMenu={openMenu}
            back
            lang={lang}
          />

          <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40, gap: 16 }}>
            {/* ------------------------------------------------- status rail */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {(['draft', 'review', 'published', 'archived'] as ContentStatus[]).map((x) => {
                const on = status === x;
                return (
                  <Pressable
                    key={x}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setStatus(x);
                      setSelected(new Set());
                    }}
                    style={{
                      minHeight: 40,
                      justifyContent: 'center',
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      borderColor: on ? 'transparent' : theme.color.border,
                      backgroundColor: on ? theme.color.ink : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: theme.family.bodySemi,
                        color: on ? '#fff' : MUTED,
                      }}
                    >
                      {x}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {result ? (
              <View
                accessibilityRole="alert"
                style={{
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderColor: result.ok ? theme.color.success : theme.color.danger,
                  backgroundColor: result.ok ? theme.color.successLight : theme.color.dangerLight,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: theme.family.displayBold, color: INK }}>
                  {result.ok ? '✅ ' : '⚠️ '}
                  {result.text}
                </Text>
                {result.failures.map((f) => (
                  <Text
                    key={f}
                    style={{ marginTop: 4, fontSize: 12, fontFamily: theme.family.body, color: INK }}
                  >
                    ✕ {f}
                  </Text>
                ))}
              </View>
            ) : null}

            <AsyncSection
              state={drafts}
              lang={lang}
              empty={{
                icon: '📝',
                title: hi ? `कोई ${status} प्रश्न नहीं` : `No ${status} questions`,
                body: hi
                  ? 'CSV आयात करने पर प्रश्न यहाँ ड्राफ़्ट के रूप में दिखेंगे।'
                  : 'Import a CSV and the questions will appear here as drafts.',
              }}
            >
              {(list) => (
                <View style={{ gap: 12 }}>
                  {/* ------------------------------------- bulk actions */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setSelected(
                          allSelected ? new Set() : new Set(list.map((r: DraftQuestion) => r.id)),
                        )
                      }
                      style={pill(false)}
                    >
                      <Text style={pillText(false)}>
                        {allSelected
                          ? hi
                            ? 'चयन हटाएँ'
                            : 'Clear selection'
                          : hi
                            ? 'सभी चुनें'
                            : 'Select all'}
                      </Text>
                    </Pressable>
                    <Text style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}>
                      {selected.size} {hi ? 'चयनित' : 'selected'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {status !== 'published' ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy || selected.size === 0}
                        onPress={() => apply('published')}
                        style={[
                          pill(true),
                          { opacity: busy || selected.size === 0 ? 0.5 : 1 },
                        ]}
                      >
                        <Text style={pillText(true)}>
                          {hi ? 'चयनित प्रकाशित करें' : 'Publish selected'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy || selected.size === 0}
                      onPress={() => apply('archived')}
                      style={[pill(false), { opacity: busy || selected.size === 0 ? 0.5 : 1 }]}
                    >
                      <Text style={pillText(false)}>
                        {hi ? 'संग्रहित करें' : 'Archive selected'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* ------------------------------------------ the queue */}
                  {list.map((q: DraftQuestion) => (
                    <Pressable
                      key={q.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected.has(q.id) }}
                      accessibilityLabel={q.text.en || q.id}
                      onPress={() => toggle(q.id)}
                      style={[
                        s.card,
                        {
                          padding: 14,
                          flexDirection: 'row',
                          gap: 12,
                          borderColor: selected.has(q.id) ? VIOLET : theme.color.border,
                          backgroundColor: selected.has(q.id) ? '#f8f6ff' : theme.color.surface,
                        },
                      ]}
                    >
                      <CheckRow on={selected.has(q.id)} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={3}
                          style={{
                            fontSize: 13.5,
                            lineHeight: 19,
                            fontFamily: theme.family.body,
                            color: INK,
                          }}
                        >
                          {q.text.en || q.text.hi}
                        </Text>
                        <View
                          style={{
                            marginTop: 8,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Meta label={hi ? 'विषय' : 'Subject'} value={q.subjectId} />
                          <Meta label={hi ? 'टॉपिक' : 'Topic'} value={q.topicId} />
                          <Meta label={hi ? 'वर्ष' : 'Year'} value={String(q.pyq?.year ?? '—')} />
                          {/* Publishing needs Hindi, so flag its absence before
                              the database refuses the row. */}
                          {q.text.hi?.trim() ? (
                            <Badge tone="success">✓ {hi ? 'हिंदी' : 'Hindi'}</Badge>
                          ) : (
                            <Badge tone="warning">⚠ {hi ? 'हिंदी नहीं' : 'Hindi missing'}</Badge>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </AsyncSection>
          </ScrollView>
        </View>
      )}
    </PrepShell>
  );
}

/* --------------------------------------------------------------- fragments */

const pill = (primary: boolean) => ({
  minHeight: 40,
  justifyContent: 'center' as const,
  borderRadius: theme.radius.pill,
  borderWidth: 1,
  paddingHorizontal: 16,
  borderColor: primary ? 'transparent' : theme.color.border,
  backgroundColor: primary ? VIOLET : 'transparent',
});

const pillText = (primary: boolean) => ({
  fontSize: 12,
  fontFamily: theme.family.displayBold,
  color: primary ? '#fff' : INK,
});

/** One of the table's narrow columns, as a labelled pair. */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'baseline' }}>
      <Text style={{ fontSize: 12, fontFamily: theme.family.bodySemi, color: MUTED }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: theme.family.bodySemi, color: INK }}>{value}</Text>
    </View>
  );
}
