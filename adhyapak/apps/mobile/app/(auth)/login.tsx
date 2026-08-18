import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  EXAMS,
  countQuestions,
  formatCount,
  isBackendConfigured,
  isStaff,
  theme,
  type AuthError,
} from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Sign in, or make an account.
 *
 * The door, and there is no way past it. Continuing without an account used to
 * be a first-class option here — the reasoning was that an aspirant downloading
 * a prep app at 11pm should reach the question bank in two taps — and that
 * decision has been withdrawn. Everything behind this screen is scoped to a
 * learner: the goal reshapes every subject list, progress and bookmarks have to
 * survive a reinstall, and an attempt is only worth submitting if there is
 * somewhere to record it. A guest could see all of it and keep none of it.
 *
 * What this screen used to be: a name field and an optional "mobile or email"
 * that were written to local state and nothing else. There was no account
 * behind it, so the promise under the contact field — "lets your progress
 * follow you to another phone" — was not true. The fields are real now, and the
 * promise is kept by the profile row the sign-up creates.
 */
export default function LoginScreen() {
  // The headline stat counts what the library actually holds, so it grows with
  // an import instead of being a number baked into the bundle.
  const questionCount = useAsync(() => countQuestions(), []);
  const { lang, toggleLang } = useStore();
  const { signIn, signUp, signInWithGoogle } = useSession();

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hi = lang === 'hi';
  const noBackend = !isBackendConfigured();
  const signingUp = mode === 'sign-up';
  const canSubmit =
    !busy &&
    !noBackend &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    (!signingUp || name.trim().length >= 2);

  /**
   * Where a signed-in account belongs.
   *
   * An educator signing in came to publish, not to practise, so the role decides
   * it. The goal picker is skipped by the gate in _layout for a returning
   * account whose profile is already onboarded.
   */
  const land = async () => {
    if (await isStaff()) {
      router.replace('/studio');
      return;
    }
    router.replace('/(auth)/goal');
  };

  /**
   * Google leaves and returns within this screen — the auth session is a sheet
   * over the app, not a navigation — so unlike the website there is a success
   * path to handle here, and a spinner that has to be turned off either way.
   */
  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) {
      // A dismissed browser is somebody changing their mind. Saying so in red
      // beneath the button would read as a fault they have to fix.
      if (result.error.kind !== 'oauth-cancelled') setError(result.error);
      return;
    }
    await land();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    if (signingUp) {
      const created = await signUp(email, password, name);
      setBusy(false);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      // A project with email confirmation on returns no session. Routing
      // onward here would land them in an app that thinks they are signed out,
      // so say what actually happened instead.
      if (!created.value.session) {
        setNotice(
          hi
            ? `हमने ${email.trim()} पर पुष्टिकरण लिंक भेजा है। उसे खोलकर यहाँ साइन इन करें।`
            : `We sent a confirmation link to ${email.trim()}. Open it, then sign in here.`,
        );
        setMode('sign-in');
        setPassword('');
        return;
      }
    } else {
      const entered = await signIn(email, password);
      setBusy(false);
      if (!entered.ok) {
        setError(entered.error);
        return;
      }
    }

    await land();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.ink }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: theme.space.xl,
            justifyContent: 'center',
            width: '100%',
            maxWidth: 460,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={toggleLang}
            style={{
              alignSelf: 'flex-end',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              borderRadius: theme.radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: theme.family.displayMedium, fontSize: theme.font.sm }}>
              {hi ? 'English' : 'हिंदी'}
            </Text>
          </Pressable>

          <View style={{ alignItems: 'center', marginTop: theme.space.xl }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                backgroundColor: theme.color.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 38, fontFamily: theme.family.displayBold }}>अ</Text>
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: theme.font.xxl,
                lineHeight: theme.line.xxl,
                fontFamily: theme.family.displayBold,
                marginTop: theme.space.lg,
              }}
            >
              {hi ? 'अध्यापक' : 'Adhyapak'}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: theme.font.base,
                lineHeight: theme.line.base,
                fontFamily: theme.family.body,
                textAlign: 'center',
                marginTop: theme.space.sm,
              }}
            >
              {hi
                ? 'शिक्षक भर्ती परीक्षाओं की संपूर्ण तैयारी'
                : 'Complete preparation for teaching exams'}
            </Text>
          </View>

          {noBackend ? (
            <Text style={styles.warning}>
              {hi
                ? '⚠️ इस बिल्ड में कोई डेटाबेस नहीं है, इसलिए खाता बनाना संभव नहीं। बिना खाते के पूरा प्रश्न बैंक खुला है।'
                : '⚠️ This build has no database, so accounts are not possible. The full question bank is open without one.'}
            </Text>
          ) : null}

          {/*
            First, because it is the shorter path: no password to invent and no
            confirmation email to wait for — Google has already verified the
            address, so this route signs a learner in immediately.
          */}
          <Pressable
            onPress={withGoogle}
            disabled={busy || noBackend}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.space.md,
              backgroundColor: busy || noBackend ? 'rgba(255,255,255,0.45)' : '#fff',
              borderRadius: theme.radius.md,
              paddingVertical: 15,
              marginTop: theme.space.xl,
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 18 18">
              <Path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
              />
              <Path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
              />
              <Path
                fill="#FBBC05"
                d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
              />
              <Path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </Svg>
            <Text
              style={{
                color: '#1f1f1f',
                fontSize: theme.font.base,
                fontFamily: theme.family.display,
              }}
            >
              {hi ? 'Google से जारी रखें' : 'Continue with Google'}
            </Text>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.md,
              marginTop: theme.space.lg,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: theme.font.xs,
                fontFamily: theme.family.body,
              }}
            >
              {hi ? 'या ईमेल से' : 'or with email'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>

          <View style={{ marginTop: theme.space.xl, gap: theme.space.lg }}>
            {signingUp ? (
              <View>
                <Text style={styles.label}>{hi ? 'आपका नाम' : 'Your name'}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={hi ? 'जैसे: अर्जुन' : 'e.g. Arjun'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!busy && !noBackend}
                  returnKeyType="next"
                />
              </View>
            ) : null}

            <View>
              <Text style={styles.label}>{hi ? 'ईमेल' : 'Email'}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!busy && !noBackend}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={styles.label}>{hi ? 'पासवर्ड' : 'Password'}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                editable={!busy && !noBackend}
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (canSubmit) void submit();
                }}
              />
              <Text style={styles.hint}>
                {signingUp
                  ? hi
                    ? 'कम से कम छह अक्षर। साइन इन करने पर आपकी प्रगति हर डिवाइस पर साथ चलेगी।'
                    : 'At least six characters. Signing in carries your progress to every device.'
                  : hi
                    ? 'इससे आपकी प्रगति दूसरे फ़ोन पर भी मिलेगी।'
                    : 'Lets your progress follow you to another phone.'}
              </Text>
            </View>
          </View>

          {error ? (
            <Text style={styles.error}>✕ {hi ? error.hi : error.en}</Text>
          ) : null}
          {notice ? <Text style={styles.notice}>✉️ {notice}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? theme.color.primary : 'rgba(255,255,255,0.15)',
              borderRadius: theme.radius.md,
              paddingVertical: 17,
              alignItems: 'center',
              marginTop: theme.space.xl,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: canSubmit ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: theme.font.base,
                  fontFamily: theme.family.display,
                }}
              >
                {signingUp ? (hi ? 'खाता बनाएँ' : 'Create account') : hi ? 'साइन इन' : 'Sign in'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(signingUp ? 'sign-in' : 'sign-up');
              setError(null);
              setNotice(null);
            }}
            disabled={noBackend}
            style={{ paddingVertical: 14, alignItems: 'center' }}
          >
            <Text
              style={{
                color: noBackend ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
                fontSize: theme.font.sm,
                fontFamily: theme.family.bodyMedium,
              }}
            >
              {signingUp
                ? hi
                  ? 'पहले से खाता है? साइन इन करें'
                  : 'Already have an account? Sign in'
                : hi
                  ? 'खाता नहीं है? बनाएँ'
                  : 'No account yet? Create one'}
            </Text>
          </Pressable>


          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: theme.space.xl,
              marginTop: theme.space.lg,
            }}
          >
            {[
              { value: `${EXAMS.length}`, label: hi ? 'परीक्षाएँ' : 'Exams' },
              // A dash while the count is in flight. `?? 0` rendered a
              // confident "0 questions" for as long as the request took, which
              // on a slow connection is the first thing a learner reads about
              // the library — and it is a number nothing has proved yet.
              {
                value: questionCount.data === undefined ? '—' : formatCount(questionCount.data),
                label: hi ? 'प्रश्न' : 'Questions',
              },
              { value: hi ? 'हिं/EN' : 'Hi/EN', label: hi ? 'द्विभाषी' : 'Bilingual' },
            ].map((stat) => (
              <View key={stat.label} style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: theme.font.md,
                    fontFamily: theme.family.displayBold,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: theme.font.xs,
                    fontFamily: theme.family.body,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.font.sm,
    fontFamily: theme.family.bodyMedium,
    marginBottom: theme.space.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: 15,
    color: '#fff',
    fontSize: theme.font.base,
    fontFamily: theme.family.body,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: theme.font.xs,
    fontFamily: theme.family.body,
    marginTop: theme.space.sm,
  },
  warning: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: theme.font.xs,
    fontFamily: theme.family.body,
    lineHeight: theme.line.sm,
    marginTop: theme.space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  error: {
    color: '#FCA5A5',
    fontSize: theme.font.sm,
    fontFamily: theme.family.bodyMedium,
    marginTop: theme.space.lg,
  },
  notice: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: theme.font.sm,
    fontFamily: theme.family.body,
    lineHeight: theme.line.sm,
    marginTop: theme.space.lg,
  },
} as const;
