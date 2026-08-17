import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  BATCHES,
  EXAMS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  getTest,
  t,
  theme,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';
import { Badge, Chip, EmptyState, ProgressBar, SectionHeader, Stat, Touch, s } from '@/components/ui';

export default function ProfileScreen() {
  const { lang, user, results, setGoal, setLang } = useStore();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const streak = currentStreak(user.activeDates);
  const attempted = Object.values(results);
  const enrolled = BATCHES.filter((b) => user.enrolledBatchIds.includes(b.id));
  // A guest is past the door without having an account; the id is what says
  // whether there is a profile row behind them.
  const signedIn = Boolean(user.signedIn && user.id);
  const hi = lang === 'hi';
  const { signOut } = useSession();
  const [leaving, setLeaving] = useState(false);

  /**
   * Ends the session and returns to the door. The store clears the cached
   * learner on the auth change — including the copy in AsyncStorage, so the
   * next person to pick up this phone does not inherit somebody else's goal.
   */
  const leave = async () => {
    setLeaving(true);
    await signOut();
    setLeaving(false);
    router.replace('/(auth)/login');
  };

  const best = attempted.length ? Math.max(...attempted.map((r) => r.percentage)) : 0;
  const avgAccuracy = attempted.length
    ? Math.round(attempted.reduce((sum, r) => sum + r.accuracy, 0) / attempted.length)
    : 0;

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, active: user.activeDates.includes(key) };
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ padding: theme.space.lg }}>
        {/* Signed out there is no name and no email, and rendering the card
            anyway put an avatar beside an empty heading and an empty line —
            which reads as a screen that failed to load rather than as a learner
            without an account. The settings below are still theirs, so the
            screen stays; only this block knows the difference. */}
        <View style={[s.card, s.row, { padding: theme.space.lg, gap: theme.space.lg }]}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: signedIn ? theme.color.ink : theme.color.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>{signedIn ? user.avatar : '🧑‍🎓'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {signedIn ? (
              <>
                <Text style={s.h1}>{user.name || (hi ? 'शिक्षार्थी' : 'Learner')}</Text>
                {user.email ? <Text style={s.faint}>{user.email}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <Badge tone="brand">
                    {user.subscription === 'free' ? t(UI.free, lang) : user.subscription}
                  </Badge>
                  {user.state ? <Badge tone="neutral">{user.state}</Badge> : null}
                </View>
                {/* There was no way out of the app at all: `signOut` existed in
                    the session and no screen ever called it. On a shared phone
                    that is not a missing convenience, it is a learner unable to
                    stop being signed in. */}
                <Pressable
                  onPress={leave}
                  disabled={leaving}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: theme.color.border,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    opacity: leaving ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: theme.font.xs, fontFamily: theme.family.bodySemi, color: theme.color.textMuted }}>
                    {leaving ? (hi ? 'रुकिए…' : 'Signing out…') : hi ? 'साइन आउट' : 'Sign out'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.h1}>{hi ? 'आप साइन इन नहीं हैं' : 'Not signed in'}</Text>
                <Text style={[s.faint, { marginTop: 2 }]}>
                  {hi
                    ? 'नीचे की सेटिंग्स इसी फ़ोन में सहेजी जाती हैं। साइन इन करने पर लक्ष्य, बुकमार्क और प्रगति हर डिवाइस पर साथ चलते हैं।'
                    : 'The settings below are saved on this phone. Signing in carries your goal, bookmarks and progress to every device.'}
                </Text>
                <Pressable
                  onPress={() => router.push('/(auth)/login')}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 10,
                    backgroundColor: theme.color.primary,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
                    {hi ? 'साइन इन' : 'Sign in'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: theme.space.lg }}>
        <Stat
          label={lang === 'hi' ? 'श्रृंखला' : 'Streak'}
          value={`🔥 ${streak}`}
          color={theme.color.primary}
        />
        <Stat
          label={lang === 'hi' ? 'टेस्ट' : 'Tests'}
          value={String(attempted.length)}
          color={theme.color.accent}
        />
        <Stat
          label={lang === 'hi' ? 'सर्वश्रेष्ठ' : 'Best'}
          value={`${best}%`}
          color={theme.color.success}
        />
        <Stat label={lang === 'hi' ? 'शुद्धता' : 'Accuracy'} value={`${avgAccuracy}%`} />
      </View>

      <View style={{ padding: theme.space.lg }}>
        <View style={[s.card, { padding: theme.space.lg }]}>
          <Text style={s.h2}>{lang === 'hi' ? 'पिछले 28 दिन' : 'Last 28 days'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {days.map((d) => (
              <View
                key={d.key}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: d.active ? theme.color.primary : theme.color.border,
                }}
              />
            ))}
          </View>
          <Text style={[s.faint, { marginTop: 8 }]}>
            {lang === 'hi'
              ? 'हर हरा वर्ग वह दिन है जब आपने अभ्यास किया।'
              : 'Each green square is a day you practised.'}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.space.lg }}>
        <View style={[s.card, { padding: theme.space.lg }]}>
          <Text style={s.h2}>{lang === 'hi' ? 'आपका लक्ष्य' : 'Your goal'}</Text>
          <View style={[s.row, { gap: theme.space.md, marginTop: 12 }]}>
            <Text style={{ fontSize: 28 }}>{exam?.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.font.base, fontWeight: '700' }}>
                {exam ? t(exam.name, lang) : '—'}
              </Text>
              {paper ? <Text style={s.faint}>{t(paper.name, lang)}</Text> : null}
            </View>
          </View>

          {exam && exam.papers.length > 1 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={[s.faint, { marginBottom: 6, fontWeight: '700' }]}>
                {lang === 'hi' ? 'पेपर बदलें' : 'Change paper'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {exam.papers.map((p) => (
                  <Chip
                    key={p.id}
                    label={t(p.name, lang)}
                    active={user.targetPaperId === p.id}
                    onPress={() => setGoal(exam.id, p.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Text style={[s.faint, { marginTop: 12, marginBottom: 6, fontWeight: '700' }]}>
            {t(UI.changeGoal, lang)}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMS.map((e) => (
              <Chip
                key={e.id}
                label={`${e.emoji} ${e.shortName}`}
                active={user.goalExamId === e.id}
                onPress={() => setGoal(e.id, e.papers[0]?.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={{ padding: theme.space.lg }}>
        <View style={[s.card, { padding: theme.space.lg }]}>
          <Text style={s.h2}>{lang === 'hi' ? 'भाषा' : 'Language'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['hi', 'en'] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: theme.radius.md,
                  alignItems: 'center',
                  backgroundColor: lang === l ? theme.color.primary : theme.color.surface,
                  borderWidth: 1,
                  borderColor: lang === l ? 'transparent' : theme.color.border,
                }}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: lang === l ? '#fff' : theme.color.textMuted,
                  }}
                >
                  {l === 'hi' ? 'हिंदी' : 'English'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <SectionHeader title={lang === 'hi' ? 'टेस्ट इतिहास' : 'Test history'} />
      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        {attempted.length ? (
          attempted.map((r) => {
            const test = getTest(r.testId);
            return (
              <Touch key={r.testId} href={`/test/${r.testId}/result`} style={[s.card, { padding: theme.space.lg }]}>
                  <View style={[s.row, { justifyContent: 'space-between', gap: 8 }]}>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: theme.font.sm }} numberOfLines={1}>
                      {test ? t(test.title, lang) : r.testId}
                    </Text>
                    <Badge tone={r.qualified ? 'success' : 'danger'}>
                      {r.score}/{r.maxScore}
                    </Badge>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar
                      value={r.percentage}
                      color={r.qualified ? theme.color.success : theme.color.danger}
                    />
                  </View>
                  <Text style={[s.faint, { marginTop: 6 }]}>
                    {r.rank !== undefined ? `${t(UI.rank, lang)} #${formatCount(r.rank)} · ` : ''}
                    {t(UI.accuracy, lang)} {r.accuracy}%
                  </Text>
                </Touch>
            );
          })
        ) : (
          <EmptyState
            icon="🎯"
            title={lang === 'hi' ? 'अभी कोई टेस्ट नहीं' : 'No tests yet'}
            body={
              lang === 'hi'
                ? 'एक निःशुल्क मॉक से शुरुआत करें।'
                : 'Start with a free mock test.'
            }
          />
        )}
      </View>

      <SectionHeader title={lang === 'hi' ? 'आपके बैच' : 'Your batches'} />
      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        {enrolled.length ? (
          enrolled.map((b) => (
            <Touch key={b.id} href={`/batch/${b.id}`} style={[s.card, { padding: theme.space.lg }]}>
                <Text style={{ fontWeight: '700', fontSize: theme.font.sm }}>{t(b.title, lang)}</Text>
                <Text style={[s.faint, { marginTop: 3 }]}>{t(b.schedule, lang)}</Text>
              </Touch>
          ))
        ) : (
          <EmptyState
            icon="🎥"
            title={lang === 'hi' ? 'कोई बैच नहीं' : 'No batches yet'}
            body={lang === 'hi' ? 'निःशुल्क बैच में शामिल हों।' : 'Join a free batch.'}
          />
        )}
      </View>
    </ScrollView>
  );
}
