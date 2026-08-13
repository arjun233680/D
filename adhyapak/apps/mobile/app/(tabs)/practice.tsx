import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  QUESTIONS,
  SUBJECTS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  previousYearQuestions,
  recommendedTopics,
  t,
  theme,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, ProgressBar, SectionHeader, Stat, Touch, s } from '@/components/ui';

export default function PracticeScreen() {
  const { lang, user } = useStore();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const paperSubjects = paper ? paper.sections.map((x) => x.subjectId) : SUBJECTS.map((x) => x.id);
  const recommended = recommendedTopics(paperSubjects, 6);
  const streak = currentStreak(user.activeDates);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>
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
          value={formatCount(QUESTIONS.length)}
        />
      </View>

      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.md }}>
        <Shortcut
          href="/practice/pyq"
          icon="📜"
          bg={theme.color.infoLight}
          title={lang === 'hi' ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
          sub={`${previousYearQuestions().length} ${lang === 'hi' ? 'प्रश्न' : 'questions'}`}
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
          {recommended.map((topic) => (
            <Touch key={topic.id} href={`/practice/topic/${topic.id}`} style={[s.card, { padding: theme.space.md }]}>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: theme.font.sm, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {t(topic.name, lang)}
                  </Text>
                  {topic.weightage >= 15 ? (
                    <Badge tone="danger">{lang === 'hi' ? 'अति महत्वपूर्ण' : 'High yield'}</Badge>
                  ) : null}
                </View>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar value={topic.weightage * 3} />
                </View>
                <Text style={[s.faint, { marginTop: 5 }]}>
                  {lang === 'hi' ? 'भार' : 'Weightage'} {topic.weightage}% ·{' '}
                  {formatCount(topic.questionCount)} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
                </Text>
              </Touch>
          ))}
        </View>
      </View>

      <View style={{ marginTop: theme.space.xl }}>
        <SectionHeader title={lang === 'hi' ? 'सभी विषय' : 'All subjects'} />
        <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
          {SUBJECTS.map((subject) => {
            const ready = QUESTIONS.filter((q) => q.subjectId === subject.id).length;
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
    </ScrollView>
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
