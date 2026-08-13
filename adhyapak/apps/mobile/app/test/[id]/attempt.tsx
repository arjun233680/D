import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  clearResponse,
  createAttempt,
  formatClock,
  getQuestion,
  getTest,
  gradeAttempt,
  paletteCounts,
  selectOption,
  statusOf,
  t,
  testQuestionIds,
  theme,
  toggleMarkForReview,
  UI,
  visitQuestion,
  type QuestionStatus,
  type TestAttempt,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, Button, s } from '@/components/ui';

const STATUS_COLOR: Record<QuestionStatus, string> = {
  answered: theme.color.answered,
  'not-answered': theme.color.notAnswered,
  'not-visited': theme.color.notVisited,
  marked: theme.color.marked,
  'answered-marked': theme.color.answeredMarked,
};

/** The exam engine: timer, palette, mark-for-review, section jumps, auto-submit. */
export default function AttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    lang,
    toggleLang,
    user,
    attempts,
    ready,
    saveAttempt,
    saveResult,
    markActiveToday,
    toggleBookmark,
  } = useStore();

  const test = getTest(String(id));
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lastTick = useRef(Date.now());

  const questionIds = useMemo(() => (test ? testQuestionIds(test) : []), [test]);

  useEffect(() => {
    if (!ready || !test || attempt) return;
    const existing = attempts[test.id];
    const resumable = existing && !existing.submittedAt && existing.remainingMs > 0;
    setAttempt(resumable ? existing : createAttempt(test, user.id, lang));
    lastTick.current = Date.now();
  }, [ready, test, attempt, attempts, user.id, lang]);

  const submit = useCallback(
    (current: TestAttempt) => {
      if (!test) return;
      const submitted = { ...current, submittedAt: new Date().toISOString() };
      saveAttempt(submitted);
      saveResult(gradeAttempt(test, submitted));
      markActiveToday();
      router.replace(`/test/${test.id}/result`);
    },
    [test, saveAttempt, saveResult, markActiveToday],
  );

  useEffect(() => {
    if (!attempt || !test) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;

      setAttempt((prev) => {
        if (!prev) return prev;
        const remainingMs = Math.max(0, prev.remainingMs - delta);
        const qid = prev.currentQuestionId;
        const answers = qid
          ? {
              ...prev.answers,
              [qid]: {
                questionId: qid,
                selectedIndex: prev.answers[qid]?.selectedIndex ?? null,
                markedForReview: prev.answers[qid]?.markedForReview ?? false,
                timeSpentMs: (prev.answers[qid]?.timeSpentMs ?? 0) + delta,
              },
            }
          : prev.answers;
        const next = { ...prev, remainingMs, answers };
        if (remainingMs === 0) setTimeout(() => submit(next), 0);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt !== null, test, submit]);

  useEffect(() => {
    if (attempt && !attempt.submittedAt) saveAttempt(attempt);
  }, [attempt, saveAttempt]);

  if (!test || !attempt) {
    return (
      <SafeAreaView style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.muted}>{lang === 'hi' ? 'पेपर तैयार हो रहा है…' : 'Preparing your paper…'}</Text>
      </SafeAreaView>
    );
  }

  const currentId = attempt.currentQuestionId ?? questionIds[0]!;
  const index = questionIds.indexOf(currentId);
  const question = getQuestion(currentId);
  const answer = attempt.answers[currentId];
  const counts = paletteCounts(test, attempt);
  const section = test.sections.find((x) => x.questionIds.includes(currentId)) ?? test.sections[0]!;
  const lowTime = attempt.remainingMs < 5 * 60_000;
  const bookmarked = user.bookmarkedQuestionIds.includes(currentId);

  const goTo = (qid: string) => {
    setAttempt((prev) => (prev ? visitQuestion(prev, qid) : prev));
    setPaletteOpen(false);
  };
  const move = (delta: number) => {
    const next = questionIds[index + delta];
    if (next) goTo(next);
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.color.surface }]} edges={['top']}>
      {/* Header */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.color.border,
          paddingHorizontal: theme.space.md,
          paddingVertical: theme.space.sm,
        }}
      >
        <View style={[s.row, { gap: theme.space.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: '700' }} numberOfLines={1}>
              {t(test.title, lang)}
            </Text>
            <Text style={s.faint} numberOfLines={1}>
              {t(section.name, lang)}
            </Text>
          </View>
          <Pressable
            onPress={toggleLang}
            style={{
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 9,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: theme.font.xs, fontWeight: '800' }}>
              {lang === 'hi' ? 'ENG' : 'हिंदी'}
            </Text>
          </Pressable>
          <View
            style={{
              backgroundColor: lowTime ? theme.color.dangerLight : theme.color.surfaceAlt,
              borderRadius: theme.radius.sm,
              paddingHorizontal: 9,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontWeight: '800',
                fontSize: theme.font.base,
                color: lowTime ? theme.color.danger : theme.color.text,
              }}
            >
              ⏱ {formatClock(attempt.remainingMs)}
            </Text>
          </View>
          <Pressable
            onPress={() => setPaletteOpen(true)}
            style={{
              backgroundColor: theme.color.ink,
              borderRadius: theme.radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>☰</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: theme.space.sm }}
        >
          {test.sections.map((sec) => {
            const active = sec.id === section.id;
            return (
              <Pressable
                key={sec.id}
                onPress={() => sec.questionIds[0] && goTo(sec.questionIds[0])}
                style={{
                  backgroundColor: active ? theme.color.primary : theme.color.surfaceAlt,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  marginRight: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontWeight: '600',
                    color: active ? '#fff' : theme.color.textMuted,
                  }}
                >
                  {t(sec.name, lang)} ({sec.questionIds.length})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Question */}
      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40 }}>
        {question ? (
          <>
            <View style={[s.row, { gap: theme.space.sm }]}>
              <View
                style={{
                  backgroundColor: theme.color.surfaceAlt,
                  borderRadius: theme.radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontWeight: '800', fontSize: theme.font.sm }}>
                  Q{index + 1}
                  <Text style={{ color: theme.color.textFaint, fontWeight: '500' }}>
                    /{questionIds.length}
                  </Text>
                </Text>
              </View>
              <Text style={s.faint}>
                +{test.marksPerQuestion}
                {test.negativeMarking ? ` / −${test.negativeMarking}` : ''}
              </Text>
              {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => toggleBookmark(currentId)}>
                <Text style={{ fontSize: 17 }}>{bookmarked ? '🔖' : '📑'}</Text>
              </Pressable>
            </View>

            <Text
              style={{
                fontSize: theme.font.md,
                fontWeight: '600',
                lineHeight: 25,
                marginTop: theme.space.md,
              }}
            >
              {t(question.text, lang)}
            </Text>

            <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
              {question.options.map((opt, i) => {
                const selected = answer?.selectedIndex === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setAttempt((prev) => (prev ? selectOption(prev, currentId, i) : prev))}
                    style={{
                      flexDirection: 'row',
                      gap: theme.space.md,
                      borderWidth: 1,
                      borderColor: selected ? theme.color.primary : theme.color.border,
                      backgroundColor: selected ? theme.color.primaryLight : theme.color.surface,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selected ? theme.color.primary : theme.color.borderStrong,
                        backgroundColor: selected ? theme.color.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          fontWeight: '800',
                          color: selected ? '#fff' : theme.color.textMuted,
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: theme.font.base, lineHeight: 22 }}>
                      {t(opt, lang)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Actions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          padding: theme.space.md,
          gap: theme.space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
          <Pressable
            onPress={() => setAttempt((prev) => (prev ? toggleMarkForReview(prev, currentId) : prev))}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: answer?.markedForReview ? theme.color.marked : theme.color.border,
              borderRadius: theme.radius.sm,
              paddingVertical: 9,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: theme.font.xs,
                fontWeight: '700',
                color: answer?.markedForReview ? theme.color.marked : theme.color.textMuted,
              }}
            >
              🔖 {t(UI.markReview, lang)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAttempt((prev) => (prev ? clearResponse(prev, currentId) : prev))}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.sm,
              paddingVertical: 9,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: theme.font.xs, fontWeight: '700', color: theme.color.textMuted }}>
              {t(UI.clear, lang)}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
          <Button
            label={`← ${t(UI.previous, lang)}`}
            variant="outline"
            disabled={index === 0}
            onPress={() => move(-1)}
            style={{ flex: 1 }}
          />
          {index === questionIds.length - 1 ? (
            <Button
              label={t(UI.submit, lang)}
              variant="danger"
              onPress={() => setConfirmOpen(true)}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              label={`${t(UI.next, lang)} →`}
              onPress={() => move(1)}
              style={{ flex: 1.4 }}
            />
          )}
        </View>
      </View>

      {/* Palette */}
      <Modal visible={paletteOpen} animationType="slide" transparent onRequestClose={() => setPaletteOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setPaletteOpen(false)}
        />
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            padding: theme.space.lg,
            paddingBottom: theme.space.xxl,
            maxHeight: '70%',
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { color: STATUS_COLOR.answered, label: t(UI.answered, lang), value: counts.answered },
              { color: STATUS_COLOR['not-answered'], label: t(UI.notAnswered, lang), value: counts.notAnswered },
              { color: STATUS_COLOR.marked, label: t(UI.marked, lang), value: counts.marked + counts.answeredMarked },
              { color: STATUS_COLOR['not-visited'], label: t(UI.notVisited, lang), value: counts.notVisited },
            ].map((c) => (
              <View key={c.label} style={[s.row, { gap: 6 }]}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    backgroundColor: c.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{c.value}</Text>
                </View>
                <Text style={s.faint}>{c.label}</Text>
              </View>
            ))}
          </View>

          <ScrollView style={{ marginTop: theme.space.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {questionIds.map((qid, i) => {
                const status = statusOf(attempt, qid);
                return (
                  <Pressable
                    key={qid}
                    onPress={() => goTo(qid)}
                    style={{
                      width: 40,
                      height: 34,
                      borderRadius: 6,
                      backgroundColor: STATUS_COLOR[status],
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: qid === currentId ? 2 : 0,
                      borderColor: theme.color.ink,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: theme.font.xs,
                        color: status === 'not-visited' ? theme.color.text : '#fff',
                      }}
                    >
                      {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Button
            label={t(UI.submit, lang)}
            variant="danger"
            onPress={() => {
              setPaletteOpen(false);
              setConfirmOpen(true);
            }}
            style={{ marginTop: theme.space.lg }}
          />
        </View>
      </Modal>

      {/* Submit confirmation */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.space.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.color.surface,
              borderRadius: theme.radius.xl,
              padding: theme.space.xl,
              width: '100%',
            }}
          >
            <Text style={s.h1}>{lang === 'hi' ? 'टेस्ट सबमिट करें?' : 'Submit the test?'}</Text>
            <Text style={[s.muted, { marginTop: 4 }]}>
              {lang === 'hi'
                ? 'सबमिट करने के बाद उत्तर नहीं बदले जा सकते।'
                : 'Answers cannot be changed after submitting.'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.space.lg }}>
              {[
                { label: t(UI.answered, lang), value: counts.answered + counts.answeredMarked, color: theme.color.success },
                { label: t(UI.notAnswered, lang), value: counts.notAnswered, color: theme.color.danger },
                { label: t(UI.marked, lang), value: counts.marked + counts.answeredMarked, color: theme.color.marked },
                { label: t(UI.notVisited, lang), value: counts.notVisited, color: theme.color.textFaint },
              ].map((c) => (
                <View
                  key={c.label}
                  style={{
                    flexBasis: '47%',
                    backgroundColor: theme.color.surfaceAlt,
                    borderRadius: theme.radius.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: theme.font.lg, fontWeight: '800', color: c.color }}>
                    {c.value}
                  </Text>
                  <Text style={s.faint}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
              <Button
                label={lang === 'hi' ? 'वापस जाएँ' : 'Go back'}
                variant="outline"
                onPress={() => setConfirmOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={t(UI.submit, lang)}
                variant="danger"
                onPress={() => submit(attempt)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
