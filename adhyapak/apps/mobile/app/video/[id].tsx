import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import {
  VIDEOS,
  formatCount,
  formatDate,
  formatDuration,
  getEducator,
  getSubject,
  t,
  theme,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, EmptyState, s } from '@/components/ui';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, uploadedVideos } = useStore();
  const player = useRef<ExpoVideo>(null);
  const [active, setActive] = useState(0);

  const video = [...uploadedVideos, ...VIDEOS].find((v) => v.id === String(id));
  if (!video) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState icon="🎥" title="Not found" body="This video is no longer available." />
      </View>
    );
  }

  const educator = getEducator(video.educatorId);
  const subject = getSubject(video.subjectId);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: educator?.name ?? 'Class' }} />

      <ExpoVideo
        ref={player}
        source={{ uri: video.src }}
        style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
      />

      <View style={{ padding: theme.space.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {video.isLive ? <Badge tone="danger">● {lang === 'hi' ? 'लाइव' : 'LIVE'}</Badge> : null}
          <AccessBadge access={video.access} lang={lang} />
          {subject ? (
            <Badge tone="neutral">
              {subject.icon} {t(subject.name, lang)}
            </Badge>
          ) : null}
        </View>

        <Text style={[s.h1, { marginTop: 10 }]}>{t(video.title, lang)}</Text>
        <Text style={[s.faint, { marginTop: 4 }]}>
          {formatCount(video.views)} {lang === 'hi' ? 'बार देखा' : 'views'} ·{' '}
          {formatDate(video.publishedAt, lang)} · {formatDuration(video.durationSeconds)}
        </Text>

        {educator ? (
          <View style={[s.card, s.row, { padding: theme.space.md, gap: theme.space.md, marginTop: theme.space.lg }]}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: theme.color.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>{educator.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: theme.font.base }}>{educator.name}</Text>
              <Text style={s.faint} numberOfLines={1}>
                {t(educator.headline, lang)}
              </Text>
            </View>
            <Text style={{ color: theme.color.warning, fontWeight: '700' }}>★ {educator.rating}</Text>
          </View>
        ) : null}

        <Text style={[s.muted, { marginTop: theme.space.lg, lineHeight: 21 }]}>
          {t(video.description, lang)}
        </Text>

        {video.chapters.length ? (
          <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.lg }]}>
            <Text style={s.h2}>
              {lang === 'hi' ? 'चैप्टर' : 'Chapters'} ({video.chapters.length})
            </Text>
            {video.chapters.map((c, i) => (
              <Pressable
                key={c.at}
                onPress={() => {
                  setActive(i);
                  player.current?.setPositionAsync(c.at * 1000);
                }}
                style={[
                  s.row,
                  {
                    gap: theme.space.md,
                    paddingVertical: 10,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.color.border,
                  },
                ]}
              >
                <View
                  style={{
                    backgroundColor: theme.color.surfaceAlt,
                    borderRadius: 4,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: theme.font.xs, fontWeight: '700' }}>
                    {formatDuration(c.at)}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: theme.font.sm,
                    fontWeight: '600',
                    color: i === active ? theme.color.primary : theme.color.text,
                  }}
                >
                  {t(c.title, lang)}
                </Text>
                <Text>▶</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
