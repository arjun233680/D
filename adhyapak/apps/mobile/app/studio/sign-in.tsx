import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { signInWithPassword, signOut, theme, type AuthError } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { CANVAS, INK, MUTED, PrepHeader, PrepShell, VIOLET } from '@/components/prep';
import { s } from '@/components/ui';

/**
 * Studio sign-in — the native half of apps/web/app/studio/sign-in/page.tsx.
 *
 * Deliberately spare: this is the operator's way into the Studio, not the
 * learner funnel. Staff accounts are created by hand in the Supabase dashboard
 * and have a password, so email and password is the whole surface. The learner
 * funnel — phone OTP and Google, then exam, level and subject — lives at
 * (auth)/login and lands in the same `@adhyapak/core` auth module rather than
 * beside it.
 *
 * Nothing on the learner side of the app is gated by any of this.
 */
export default function StudioSignInScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { access, loading, refresh } = useStudioAccess();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refresh();
    // Straight to the work: the only reason to be on this screen is to import.
    router.replace('/studio/import');
  };

  const leave = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setPassword('');
    refresh();
  };

  const noBackend = access?.kind === 'no-backend';
  const known = !loading && (access?.kind === 'staff' || access?.kind === 'not-staff');

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <PrepHeader
            title={hi ? 'स्टूडियो साइन इन' : 'Studio sign-in'}
            subtitle={
              hi
                ? 'शिक्षक और एडमिन खातों के लिए'
                : 'For educator and admin accounts'
            }
            onMenu={openMenu}
            back
            lang={lang}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40, gap: theme.space.lg }}
          >
            <Text style={{ fontSize: 13, lineHeight: 19, fontFamily: theme.family.body, color: MUTED }}>
              {hi
                ? 'शिक्षार्थियों को यहाँ साइन इन करने की आवश्यकता नहीं है।'
                : 'Learners do not need to sign in here.'}
            </Text>

            {noBackend ? (
              <View
                style={{
                  borderRadius: theme.radius.card,
                  borderWidth: 1,
                  borderColor: theme.color.warning,
                  backgroundColor: theme.color.warningLight,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, lineHeight: 19, fontFamily: theme.family.body, color: INK }}>
                  ⚠️{' '}
                  {hi
                    ? 'इस बिल्ड में कोई डेटाबेस नहीं है, इसलिए साइन इन करने के लिए कुछ नहीं है।'
                    : 'This build has no database, so there is nothing to sign in to.'}
                </Text>
              </View>
            ) : null}

            {known ? (
              <View style={[s.card, { padding: 20, gap: 12 }]}>
                <Text style={{ fontSize: 13, fontFamily: theme.family.body, color: INK }}>
                  {hi ? 'साइन इन: ' : 'Signed in as '}
                  <Text style={{ fontFamily: theme.family.displayBold }}>
                    {access?.email ?? '—'}
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 18, fontFamily: theme.family.body, color: MUTED }}>
                  {access?.kind === 'staff'
                    ? hi
                      ? 'यह खाता स्टाफ़ है — आयात उपलब्ध है।'
                      : 'This account is staff — importing is available.'
                    : hi
                      ? 'यह खाता स्टाफ़ नहीं है। भूमिका बदले बिना डेटाबेस आयात अस्वीकार करेगा।'
                      : 'This account is not staff. Without a role change the database will refuse the import.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {access?.kind === 'staff' ? (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => router.push('/studio/import')}
                      style={{
                        minHeight: 44,
                        justifyContent: 'center',
                        borderRadius: theme.radius.pill,
                        backgroundColor: VIOLET,
                        paddingHorizontal: 18,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: theme.family.displayBold, color: '#fff' }}>
                        {hi ? 'आयात करें' : 'Go to import'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={leave}
                    disabled={busy}
                    style={{
                      minHeight: 44,
                      justifyContent: 'center',
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.color.border,
                      paddingHorizontal: 18,
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: theme.family.displayBold, color: INK }}>
                      {hi ? 'साइन आउट' : 'Sign out'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[s.card, { padding: 20, gap: 16 }]}>
                <Field
                  label={hi ? 'ईमेल' : 'Email'}
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy && !noBackend}
                  keyboardType="email-address"
                  textContentType="username"
                />
                <Field
                  label={hi ? 'पासवर्ड' : 'Password'}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy && !noBackend}
                  secureTextEntry
                  textContentType="password"
                />

                {error ? (
                  <View
                    accessibilityRole="alert"
                    style={{
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.color.danger,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: theme.family.body, color: theme.color.danger }}>
                      ✕ {hi ? error.hi : error.en}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={submit}
                  disabled={busy || noBackend}
                  style={{
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radius.pill,
                    backgroundColor: VIOLET,
                    opacity: busy || noBackend ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: theme.family.displayBold, color: '#fff' }}>
                    {busy
                      ? hi
                        ? 'साइन इन हो रहा है…'
                        : 'Signing in…'
                      : hi
                        ? 'साइन इन'
                        : 'Sign in'}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </PrepShell>
  );
}

function Field({
  label,
  ...input
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontFamily: theme.family.displayBold, color: INK }}>
        {label}
      </Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor="#a8a3bd"
        {...input}
        style={{
          marginTop: 4,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.color.border,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          fontFamily: theme.family.body,
          color: INK,
        }}
      />
    </View>
  );
}
