import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  SUBJECT_BY_ID,
  examBrowsableSubjects,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  countQuestions,
  countQuestionsBySubject,
  recommendedTopics,
  resolvePaperSubjects,
  t,
  theme,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { Badge, ElectiveNotice, ProgressBar, SectionHeader, Stat, Touch, s } from '@/components/ui';
import { Screen } from '@/components/prep';

export default function PracticeScreen() {
  const { lang, user } = useStore();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  // Only what this exam tests — the grid below used to list the whole
  // catalogue, offering subjects from exams the learner is not sitting.
  const examSubjectIds = examBrowsableSubjects(user.goalExamId);
  const examSubjects = examSubjectIds
    .map((id) => SUBJECT_BY_ID.get(id))
    .filter((sub): sub is NonNullable<typeof sub> => Boolean(sub));

  // A paper with an elective has no subject list until the learner picks one;
  // recommending against a guess would hand them another candidate's syllabus.
  const resolved = resolvePaperSubjects(paper?.id, user.electiveSubjectId);
  const paperSubjects = resolved.ok
    ? resolved.subjectIds.length > 0
      ? resolved.subjectIds
      : examSubjectIds
    : [];
  const recommended = recommendedTopics(paperSubjects, 6);
  const streak = currentStreak(user.activeDates);

  // From the bank, not from the bundled arrays. These read 67 and 21 against a
  // live database of ~900.
  const bankCount = useAsync(() => countQuestions({ examId: user.goalExamId }), [user.goalExamId]);
  const pyqCount = useAsync(
    () => countQuestions({ examId: user.goalExamId, pyqOnly: true }),
    [user.goalExamId],
  );
  const bySubject = useAsync(() => countQuestionsBySubject(user.goalExamId), [user.goalExamId]);

  return (
    <Screen
      title={lang === 'hi' ? 'अभ्यास' : 'Practice'}
      subtitle={lang === 'hi' ? 'रोज़ थोड़ा, लगातार' : 'A little every day'}
      lang={lang}
      back
      scroll
    >
      <View style={{ flexDirection: 'row', gap: 8, padding: theme.space.lg }}>
        <Stat
          label={lang === 'hi' ? 'श्रृंखला' : 'Streak'}
          value={`🔥 ${streak}`}
          color={theme.color.primary}
        />
        <Stat
          label={lang === 'hi' ? 'बुकमार्क' : 'Bookmarks'}
          value={String(user.bookmarkedQuestionIds.length)}
          color={theme.color.accent}
        />
        <Stat
          label={lang === 'hi' ? 'प्रश्न' : 'Questions'}
          value={bankCount.loading ? '…' : formatCount(bankCount.data ?? 0)}
        />
      </View>

      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.md }}>
        <Shortcut
          href="/practice/pyq"
          icon="📜"
          bg={theme.color.infoLight}
          title={lang === 'hi' ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
          sub={
            pyqCount.loading
              ? lang === 'hi'
                ? 'गिन रहे हैं…'
                : 'counting…'
              : `${formatCount(pyqCount.data ?? 0)} ${lang === 'hi' ? 'प्रश्न' : 'questions'}`
          }
        />
        <Shortcut
          href="/practice/bookmarks"
          icon="🔖"
          bg={theme.color.warningLight}
          title={lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
          sub={`${user.bookmarkedQuestionIds.length} ${lang === 'hi' ? 'सहेजे गए' : 'saved'}`}
        />
        <Shortcut
          href="/test/test-daily-quiz"
          icon="⚡"
          bg={theme.color.primaryLight}
          title={lang === 'hi' ? 'आज की क्विज़' : "Today's quiz"}
          sub={lang === 'hi' ? '10 प्रश्न · 10 मिनट' : '10 questions · 10 min'}
        />
      </View>

      <View style={{ marginTop: theme.space.xl }}>
        <SectionHeader
          title={lang === 'hi' ? 'आपके पेपर हेतु सुझाव' : 'Recommended for your paper'}
          subtitle={paper ? t(paper.name, lang) : undefined}
        />
        <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
          {!resolved.ok ? (
            <ElectiveNotice error={resolved.error} lang={lang} />
          ) : (
            recommended.map((topic) => (
              <Touch key={topic.id} href={`/practice/topic/${topic.id}`} style={[s.card, { padding: theme.space.md }]}>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: theme.font.sm, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {t(topic.name, lang)}
                  </Text>
                  {(topic.weightage ?? 0) >= 15 ? (
                    <Badge tone="danger">{lang === 'hi' ? 'अति महत्वपूर्ण' : 'High yield'}</Badge>
                  ) : null}
                </View>
                {topic.weightage !== undefined ? (
                  <>
                    <View style={{ marginTop: 8 }}>
                      <ProgressBar value={topic.weightage * 3} />
                    </View>
                    <Text style={[s.faint, { marginTop: 5 }]}>
                      {lang === 'hi' ? 'भार' : 'Weightage'} {topic.weightage}%
                    </Text>
                  </>
                ) : null}
              </Touch>
            ))
          )}
        </View>
      </View>

      <View style={{ marginTop: theme.space.xl }}>
        <SectionHeader title={lang === 'hi' ? 'सभी विषय' : 'All subjects'} />
        <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
          {examSubjects.map((subject) => {
            const ready = bySubject.data?.[subject.id] ?? 0;
            return (
              <Touch key={subject.id} href={`/practice/subject/${subject.id}`} style={[s.card, s.row, { padding: theme.space.md, gap: theme.space.md }]}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: theme.radius.md,
                      backgroundColor: `${subject.color}1a`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{subject.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.font.base, fontWeight: '700' }}>
                      {t(subject.name, lang)}
                    </Text>
                    <Text style={[s.faint, { marginTop: 2 }]}>
                      {subject.topics.length} {lang === 'hi' ? 'टॉपिक' : 'topics'} · {ready}{' '}
                      {lang === 'hi' ? 'प्रश्न तैयार' : 'ready'}
                    </Text>
                  </View>
                </Touch>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function Shortcut({
  href,
  icon,
  bg,
  title,
  sub,
}: {
  href: string;
  icon: string;
  bg: string;
  title: string;
  sub: string;
}) {
  return (
    <Touch href={href as never} style={[s.card, s.row, { padding: theme.space.lg, gap: theme.space.md }]}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.font.base, fontWeight: '700' }}>{title}</Text>
          <Text style={[s.faint, { marginTop: 2 }]}>{sub}</Text>
        </View>
      </Touch>
  );
}
