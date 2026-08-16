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
import {
  EXAMS,
  countQuestions,
  formatCount,
  isBackendConfigured,
  theme,
  type AuthError,
} from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Sign in, or make an account.
 *
 * Deliberately low-friction: an aspirant downloading a prep app at 11pm should
 * reach the question bank in two taps, so continuing without an account stays a
 * first-class option rather than fine print. Signing in only matters once
 * progress needs to follow them to another device — which is now something it
 * can actually do.
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
  const { signIn, signUp, continueAsGuest } = useSession();

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

    // The gate in _layout routes on `onboarded`, which the store sets from the
    // profile — a returning learner skips the goal picker, a new one does not.
    router.replace('/(auth)/goal');
  };

  const asGuest = () => {
    continueAsGuest();
    router.replace('/(auth)/goal');
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

          <Pressable onPress={asGuest} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: theme.font.sm,
                fontFamily: theme.family.bodyMedium,
              }}
            >
              {hi ? 'बिना खाता बनाए शुरू करें' : 'Start without an account'}
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
