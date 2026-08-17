import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme, type Lang, type StudioAccess } from '@adhyapak/core';
import { EmptyState, s } from '@/components/ui';

/**
 * The three reasons the Studio may be unusable, each said in its own words.
 *
 * Mirrors the website's gate, for the same reason it exists there: collapsing
 * these to one boolean made a blocked upload look exactly like a missing
 * database, and an operator could not tell whether to check the deploy, sign
 * in, or ask for a role.
 *
 *   no-backend  — this build was compiled without credentials.
 *   signed-out  — there is a database; nobody has authenticated to it.
 *   not-staff   — authenticated, but `profiles.role` is neither educator nor
 *                 admin, which is the state the database itself refuses in.
 */
export function StudioGate({
  access,
  loading,
  lang,
  children,
}: {
  access: StudioAccess | undefined;
  loading: boolean;
  lang: Lang;
  children: React.ReactNode;
}) {
  const hi = lang === 'hi';

  if (loading || !access) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <Text style={s.muted}>{hi ? 'जाँचा जा रहा है…' : 'Checking…'}</Text>
      </View>
    );
  }

  if (access.kind === 'staff') return <>{children}</>;

  const panel =
    access.kind === 'no-backend'
      ? {
          icon: '🔌',
          title: hi ? 'कोई डेटाबेस कॉन्फ़िगर नहीं' : 'No database configured',
          body: hi
            ? 'यह बिल्ड बिना क्रेडेंशियल के बना है, इसलिए साइन इन करने के लिए कुछ नहीं है।'
            : 'This build was compiled without credentials, so there is nothing to sign in to.',
          cta: null,
        }
      : access.kind === 'signed-out'
        ? {
            icon: '🔑',
            title: hi ? 'साइन इन करें' : 'Sign in to continue',
            body: hi
              ? 'स्टूडियो शिक्षकों एवं एडमिन के लिए है। आगे बढ़ने हेतु उसी खाते से साइन इन कीजिए।'
              : 'The Studio is for educators and admins. Sign in with that account to continue.',
            cta: hi ? 'साइन इन' : 'Sign in',
          }
        : {
            icon: '🔒',
            title: hi ? 'यह खाता स्टाफ़ नहीं है' : 'This account is not staff',
            body: hi
              ? 'सामग्री अपलोड एवं आयात केवल शिक्षक और एडमिन खाते कर सकते हैं। भूमिका बदले बिना डेटाबेस लिखने से मना कर देगा।'
              : 'Only educator and admin accounts can upload or import content. Without a role change the database will refuse the write.',
            cta: null,
          };

  return (
    <View style={[s.screen, { padding: theme.space.lg, justifyContent: 'center' }]}>
      <EmptyState icon={panel.icon} title={panel.title} body={panel.body} />
      {panel.cta ? (
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={{
            alignSelf: 'center',
            marginTop: theme.space.lg,
            backgroundColor: theme.color.primary,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 20,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: theme.family.bodySemi }}>{panel.cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
