import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme, type ContentAccess } from '@adhyapak/core';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useResponsive } from '@/lib/responsive';

/**
 * Navigating touchable.
 *
 * Deliberately not `<Link asChild>`: on react-native-web that path forwards the
 * style array straight onto the underlying anchor element, which React DOM
 * cannot apply. Pushing through the router keeps one code path that behaves the
 * same on iOS, Android and web.
 */
export function Touch({
  href,
  style,
  children,
}: {
  href: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={() => router.push(href as never)} style={style}>
      {children}
    </Pressable>
  );
}

/** Native counterparts of apps/web/components/ui.tsx, driven by the same tokens. */

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.bg },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  h1: {
    fontSize: theme.font.xl,
    lineHeight: theme.line.xl,
    fontFamily: theme.family.displayBold,
    color: theme.color.text,
  },
  h2: {
    fontSize: theme.font.md,
    lineHeight: theme.line.md,
    fontFamily: theme.family.display,
    color: theme.color.text,
  },
  title: {
    fontSize: theme.font.base,
    lineHeight: theme.line.base,
    fontFamily: theme.family.bodySemi,
    color: theme.color.text,
  },
  body: {
    fontSize: theme.font.base,
    lineHeight: theme.line.base,
    fontFamily: theme.family.body,
    color: theme.color.text,
  },
  muted: {
    fontSize: theme.font.sm,
    lineHeight: theme.line.sm,
    fontFamily: theme.family.body,
    color: theme.color.textMuted,
  },
  faint: {
    fontSize: theme.font.xs,
    lineHeight: theme.line.xs,
    fontFamily: theme.family.body,
    color: theme.color.textFaint,
  },
  /** Digits that line up in columns — scores, timers, ranks. */
  numeric: { fontFamily: theme.family.displayBold, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center' },
  pad: { paddingHorizontal: theme.space.xl },
});

export function SectionHeader({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  const r = useResponsive();
  return (
    <View
      style={[
        s.row,
        {
          justifyContent: 'space-between',
          paddingHorizontal: r.gutter,
          marginBottom: theme.space.md,
          // Headers share the page's centred column, so they line up with the
          // cards beneath them instead of hugging the viewport edges.
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
        },
      ]}
    >
      <View style={{ flex: 1, paddingRight: theme.space.md }}>
        <Text style={s.h2} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[s.muted, { marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {href && action ? (
        <Touch href={href}>
          <Text style={{ color: theme.color.primary, fontWeight: '700', fontSize: theme.font.sm }}>
            {action}
          </Text>
        </Touch>
      ) : null}
    </View>
  );
}

const TONES = {
  neutral: { bg: theme.color.surfaceAlt, fg: theme.color.textMuted },
  brand: { bg: theme.color.primaryLight, fg: theme.color.primaryDark },
  accent: { bg: theme.color.accentLight, fg: theme.color.accent },
  danger: { bg: theme.color.dangerLight, fg: theme.color.danger },
  warning: { bg: theme.color.warningLight, fg: theme.color.warning },
  info: { bg: theme.color.infoLight, fg: theme.color.info },
  success: { bg: theme.color.successLight, fg: theme.color.success },
} as const;

export function Badge({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  style?: ViewStyle;
}) {
  const c = TONES[tone];
  return (
    <View
      style={[
        {
          backgroundColor: c.bg,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      <Text style={{ color: c.fg, fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
        {children}
      </Text>
    </View>
  );
}

export function AccessBadge({ access, lang }: { access: ContentAccess; lang: 'en' | 'hi' }) {
  if (access === 'free') return <Badge tone="brand">{lang === 'hi' ? 'निःशुल्क' : 'Free'}</Badge>;
  if (access === 'plus') return <Badge tone="accent">Plus</Badge>;
  return <Badge tone="warning">Iconic</Badge>;
}

export function Stat({
  label,
  value,
  color = theme.color.text,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={[s.card, { flex: 1, paddingVertical: theme.space.lg, alignItems: 'center' }]}>
      <Text style={[s.numeric, { fontSize: theme.font.lg, color }]}>{value}</Text>
      <Text style={[s.faint, { marginTop: 4 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, color = theme.color.primary }: { value: number; color?: string }) {
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.color.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'dark';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const variants = {
    primary: { bg: theme.color.primary, fg: '#fff', border: 'transparent' },
    danger: { bg: theme.color.danger, fg: '#fff', border: 'transparent' },
    dark: { bg: theme.color.ink, fg: '#fff', border: 'transparent' },
    outline: { bg: theme.color.surface, fg: theme.color.text, border: theme.color.border },
  } as const;
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: v.fg, fontFamily: theme.family.display, fontSize: theme.font.base }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? theme.color.ink : theme.color.surface,
        borderColor: active ? 'transparent' : theme.color.border,
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: theme.space.sm,
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : theme.color.textMuted,
          fontFamily: theme.family.bodyMedium,
          fontSize: theme.font.sm,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={[s.card, { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 }]}>
      <Text style={{ fontSize: theme.icon.xl }}>{icon}</Text>
      <Text style={[s.h2, { marginTop: 8 }]}>{title}</Text>
      <Text style={[s.muted, { marginTop: 4, textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}

/**
 * Centres a page's content and applies the responsive gutter.
 *
 * Wrapping every screen in this is what keeps a 1920px browser from stretching
 * phone layouts across the whole viewport: the column stops growing at the
 * breakpoint's max width and sits in the middle instead.
 */
export function Content({
  children,
  style,
  gutter = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gutter?: boolean;
}) {
  const r = useResponsive();
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: gutter ? r.gutter : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A grid that reflows by breakpoint — one column on a phone, two on a tablet,
 * three on a desktop — without any screen having to know the numbers.
 */
export function Grid({ children, gap = theme.space.md }: { children: ReactNode[]; gap?: number }) {
  const r = useResponsive();
  const items = children.filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, i) => (
        <View
          key={i}
          style={{
            // Subtracting the gaps keeps the last column flush with the edge.
            width: r.columns === 1 ? '100%' : `${(100 - (r.columns - 1) * 2) / r.columns}%`,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------- async screen states */

/** A grey block standing in for content that has not arrived yet. */
export function Skeleton({ height = 88 }: { height?: number }) {
  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surfaceAlt,
      }}
    />
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <View style={[s.card, { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 }]}>
      <Text style={{ fontSize: theme.icon.xl }}>⚠️</Text>
      <Text style={[s.h2, { marginTop: 8 }]}>{title}</Text>
      <Text style={[s.muted, { marginTop: 4, textAlign: 'center' }]}>{body}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={{
            marginTop: theme.space.lg,
            backgroundColor: theme.color.ink,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 20,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: theme.family.bodySemi, fontSize: theme.font.sm }}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The three states every database-backed screen has to handle, in one wrapper:
 * skeletons while loading, an error with a retry, an empty state when the query
 * legitimately returned nothing, and the content only when there is content.
 */
export function AsyncSection<T>({
  state,
  lang,
  empty,
  skeleton,
  children,
}: {
  state: { data: T | undefined; loading: boolean; error: Error | null; retry: () => void };
  lang: 'en' | 'hi';
  empty: { icon: string; title: string; body: string };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const hi = lang === 'hi';

  if (state.loading && state.data === undefined) {
    return (
      <View style={{ gap: theme.space.md }}>
        {skeleton ?? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        )}
      </View>
    );
  }

  if (state.error && state.data === undefined) {
    return (
      <ErrorState
        title={hi ? 'लोड नहीं हो सका' : 'Could not load'}
        body={
          hi
            ? 'सामग्री लोड नहीं हो पाई। कृपया दोबारा प्रयास करें।'
            : 'That content did not load. Please try again.'
        }
        onRetry={state.retry}
        retryLabel={hi ? 'दोबारा प्रयास करें' : 'Try again'}
      />
    );
  }

  const data = state.data;
  const isEmpty =
    data === undefined || data === null || (Array.isArray(data) && data.length === 0);
  if (isEmpty) return <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />;

  return <>{children(data as T)}</>;
}
