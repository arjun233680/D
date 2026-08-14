import { useState } from 'react';
import {
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
import { EXAMS, countQuestions, formatCount, theme } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';
import { s } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';

/**
 * Sign in.
 *
 * Deliberately low-friction: an aspirant downloading a prep app at 11pm should
 * reach the question bank in two taps, so continuing without an account is a
 * first-class option rather than fine print. Signing in only matters once
 * progress needs to follow them to another device.
 */
export default function LoginScreen() {
  // The headline stat counts what the library actually holds, so it grows with
  // an import instead of being a number baked into the bundle.
  const questionCount = useAsync(() => countQuestions(), []);
  const { lang, toggleLang } = useStore();
  const { signIn, continueAsGuest } = useSession();
  const r = useResponsive();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const hi = lang === 'hi';
  const canSubmit = name.trim().length >= 2;

  const proceed = (guest: boolean) => {
    if (guest) continueAsGuest();
    else signIn(name, contact.trim() || undefined);
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

          <View style={{ alignItems: 'center', marginTop: theme.space.xxl }}>
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

          <View style={{ marginTop: theme.space.xxl, gap: theme.space.lg }}>
            <View>
              <Text style={styles.label}>{hi ? 'आपका नाम' : 'Your name'}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={hi ? 'जैसे: अर्जुन' : 'e.g. Arjun'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={styles.label}>
                {hi ? 'मोबाइल या ईमेल (वैकल्पिक)' : 'Mobile or email (optional)'}
              </Text>
              <TextInput
                value={contact}
                onChangeText={setContact}
                placeholder={hi ? '98XXXXXXXX' : '98XXXXXXXX'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.hint}>
                {hi
                  ? 'इससे आपकी प्रगति दूसरे फ़ोन पर भी मिलेगी।'
                  : 'Lets your progress follow you to another phone.'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => proceed(false)}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? theme.color.primary : 'rgba(255,255,255,0.15)',
              borderRadius: theme.radius.md,
              paddingVertical: 17,
              alignItems: 'center',
              marginTop: theme.space.xxl,
            }}
          >
            <Text
              style={{
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: theme.font.base,
                fontFamily: theme.family.display,
              }}
            >
              {hi ? 'आगे बढ़ें' : 'Continue'}
            </Text>
          </Pressable>

          <Pressable onPress={() => proceed(true)} style={{ paddingVertical: 18, alignItems: 'center' }}>
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
              { value: formatCount(questionCount.data ?? 0), label: hi ? 'प्रश्न' : 'Questions' },
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
} as const;
