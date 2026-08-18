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
  getSubject,
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

  const subject = user.electiveSubjectId ? getSubject(user.electiveSubjectId) : undefined;

  const Divider = () => (
    <View style={{ height: 1, backgroundColor: theme.color.border, marginHorizontal: theme.space.lg }} />
  );

  return (
    /*
     * Flat surfaces and hairline rules rather than a stack of bordered cards.
     * This is a settings screen with a little history on it, and boxing every
     * block made them all look equally important — the goal, which decides what
     * the whole app shows, read the same as the language toggle.
     *
     * Order is identity, goal, activity, library, settings: who you are, what
     * you are working towards, how it is going, what you saved, and the
     * controls last because they are used least.
     */
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ---------------------------------------------------------- identity */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.lg,
          padding: theme.space.lg,
          paddingTop: theme.space.xl,
          paddingBottom: theme.space.xl,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.color.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }}>{user.avatar || '🧑‍🎓'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.h1} numberOfLines={1}>
            {signedIn
              ? user.name || (hi ? 'शिक्षार्थी' : 'Learner')
              : hi
                ? 'आप साइन इन नहीं हैं'
                : 'Not signed in'}
          </Text>
          <Text style={[s.faint, { marginTop: 2 }]} numberOfLines={1}>
            {signedIn
              ? user.email || (hi ? 'खाता सक्रिय' : 'Account active')
              : hi
                ? 'सेटिंग्स इसी फ़ोन में सहेजी जाती हैं।'
                : 'Settings are saved on this phone only.'}
          </Text>
        </View>
        {signedIn ? null : (
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={{
              backgroundColor: theme.color.primary,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.space.lg,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#fff', fontSize: theme.font.sm, fontFamily: theme.family.display }}>
              {hi ? 'साइन इन' : 'Sign in'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* -------------------------------------------------------------- goal */}
      {/*
        One row into the picker, not chips for the exam and more chips for the
        paper. Those called `setGoal` with a paper and no subject, so switching
        to TGT here cleared the elective and offered nowhere to set it — the
        goal came out half-answered from the one screen meant to show it.
      */}
      <Pressable
        onPress={() => router.push('/(auth)/goal')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.lg,
          paddingHorizontal: theme.space.lg,
          paddingVertical: theme.space.lg,
        }}
      >
        <Text style={{ fontSize: 30 }}>{exam?.emoji ?? '🎯'}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.faint, { fontFamily: theme.family.bodySemi, letterSpacing: 0.6 }]}>{hi ? 'आपका लक्ष्य' : 'Your goal'}</Text>
          <Text style={[s.h2, { marginTop: 2 }]} numberOfLines={1}>
            {exam ? t(exam.name, lang) : hi ? 'कोई लक्ष्य नहीं चुना' : 'No goal chosen'}
          </Text>
          <Text style={s.faint} numberOfLines={1}>
            {[paper ? t(paper.name, lang) : null, subject ? t(subject.name, lang) : null]
              .filter(Boolean)
              .join('  ·  ') || (hi ? 'चुनने के लिए टैप करें' : 'Tap to choose')}
          </Text>
        </View>
        <Text style={{ color: theme.color.textMuted, fontSize: theme.font.md }}>›</Text>
      </Pressable>

      {/* ---------------------------------------------------------- activity */}
      <Divider />
      <View style={{ padding: theme.space.lg }}>
        <View style={{ flexDirection: 'row' }}>
          {[
            { label: hi ? 'श्रृंखला' : 'Streak', value: `🔥 ${streak}` },
            { label: hi ? 'टेस्ट' : 'Tests', value: String(attempted.length) },
            { label: hi ? 'सर्वश्रेष्ठ' : 'Best', value: `${best}%` },
            { label: hi ? 'शुद्धता' : 'Accuracy', value: `${avgAccuracy}%` },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1 }}>
              <Text style={[s.h2, { fontVariant: ['tabular-nums'] }]}>{stat.value}</Text>
              <Text style={s.faint}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: theme.space.xl }}>
          {days.map((d) => (
            <View
              key={d.key}
              style={{
                width: `${100 / 14 - 2}%`,
                aspectRatio: 1,
                borderRadius: 3,
                backgroundColor: d.active ? theme.color.primary : theme.color.border,
              }}
            />
          ))}
        </View>
        <Text style={[s.faint, { marginTop: theme.space.sm }]}>
          {hi
            ? 'पिछले 28 दिन — हर हरा वर्ग वह दिन है जब आपने अभ्यास किया।'
            : 'Last 28 days — each green square is a day you practised.'}
        </Text>
      </View>

      {/* ----------------------------------------------------------- library */}
      <Divider />
      <View style={{ paddingVertical: theme.space.sm }}>
        {[
          { href: '/practice/bookmarks', icon: '🔖', label: hi ? 'बुकमार्क' : 'Bookmarks', count: user.bookmarkedQuestionIds.length },
          { href: '/notes', icon: '📚', label: hi ? 'सहेजे नोट्स' : 'Saved notes', count: user.savedNoteIds.length },
          { href: '/(tabs)/batches', icon: '🎥', label: hi ? 'आपके बैच' : 'Your batches', count: enrolled.length },
          { href: '/(tabs)/tests', icon: '🎯', label: hi ? 'टेस्ट इतिहास' : 'Test history', count: attempted.length },
        ].map((row) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.md,
              paddingHorizontal: theme.space.lg,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 17 }}>{row.icon}</Text>
            <Text style={[s.body, { flex: 1, fontFamily: theme.family.bodySemi }]}>{row.label}</Text>
            <Text style={[s.faint, { fontVariant: ['tabular-nums'] }]}>{row.count}</Text>
            <Text style={{ color: theme.color.textMuted }}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* ---------------------------------------------------------- settings */}
      <Divider />
      <View style={{ padding: theme.space.lg }}>
        <Text style={[s.faint, { fontFamily: theme.family.bodySemi, letterSpacing: 0.6 }]}>{hi ? 'भाषा' : 'Language'}</Text>
        <View style={{ flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.md }}>
          {(['hi', 'en'] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={{
                flex: 1,
                borderRadius: theme.radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                backgroundColor: lang === l ? theme.color.ink : theme.color.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontFamily: theme.family.bodySemi,
                  color: lang === l ? '#fff' : theme.color.textMuted,
                }}
              >
                {l === 'hi' ? 'हिंदी' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>

        {signedIn ? (
          <Pressable
            onPress={leave}
            disabled={leaving}
            style={{ marginTop: theme.space.xl, paddingVertical: 13, alignItems: 'center' }}
          >
            <Text
              style={{
                fontSize: theme.font.sm,
                fontFamily: theme.family.bodySemi,
                color: theme.color.danger,
                opacity: leaving ? 0.5 : 1,
              }}
            >
              {leaving ? (hi ? 'रुकिए…' : 'Signing out…') : hi ? 'साइन आउट' : 'Sign out'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
