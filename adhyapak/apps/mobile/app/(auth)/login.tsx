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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  isBackendConfigured,
  sendPhoneOtp,
  theme,
  verifyPhoneOtp,
  type AuthError,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';
import { GradientFill } from '@/components/onboarding';

/**
 * The door.
 *
 * A phone number and a code, with Google beside it. Email and password used to
 * be here and are not any more: they are how staff sign in, and an aspirant who
 * has to invent a password and then wait on a confirmation email has been given
 * two chances to give up before seeing a single question. A number they already
 * know reaches the app in one.
 *
 * This is apps/web/app/sign-in/page.tsx, and the two screens are meant to be
 * indistinguishable: the same backdrop, the same 74pt logo tile, the same
 * tagline, the same card, the same desk illustration at the foot. Both are
 * drawn from the same design, and `sendPhoneOtp` / `verifyPhoneOtp` in
 * packages/core are the same two calls behind both.
 *
 * The only thing the phone adds is a keyboard-avoiding scroll, because a
 * numeric keypad covers roughly the bottom third of a handset and the card it
 * would cover is the one being typed into.
 */

const VIOLET = '#6d4aed';
const VIOLET_LIGHT = '#8b5cf6';
const INK = '#1e1b4b';
const MUTED = '#6b7280';

type Step = 'phone' | 'code';

export default function LoginScreen() {
  const { lang, toggleLang } = useStore();
  const hi = lang === 'hi';
  const { signInWithGoogle } = useSession();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  /** The E.164 number the code actually went to, which is what verifies it. */
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  // A build-time fact, so it is read once at render rather than watched.
  const noBackend = !isBackendConfigured();

  const send = async () => {
    setBusy(true);
    setError(null);
    const result = await sendPhoneOtp(phone);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(result.value.phone);
    setCode('');
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(sentTo, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    /*
     * The store is subscribed to auth changes and is already fetching the
     * profile, so there is nothing to hand it here.
     *
     * Everyone lands on the exam chooser, including returning learners: it
     * reads their saved exams and forwards them on if they have any, which
     * keeps the "have they answered yet" question in one place rather than
     * duplicating it here. The website does exactly this.
     */
    router.replace('/onboarding/exams');
  };

  /**
   * Google.
   *
   * On a device this opens a system auth sheet and comes back here, so there is
   * a success path to handle. In a browser there is not: `signInWithGoogle`
   * hands the tab to Supabase, this component is torn down mid-navigation, and
   * the session is picked up out of the URL on the way back in. So the web
   * branch neither clears `busy` nor reports the failure it is handed — the
   * button stays down while the page leaves, which is the honest thing for it
   * to be doing.
   */
  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    const started = await signInWithGoogle();
    if (Platform.OS === 'web') return;
    setBusy(false);
    if (!started.ok) {
      setError(started.error);
      return;
    }
    router.replace('/onboarding/exams');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#faf9ff', overflow: 'hidden' }}>
      <Backdrop />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/*
          The design has no language switch, and this screen gates everything —
          so a learner who wanted English would have had no way to ask for it.
          Small, in the corner, where the design has a decorative ring.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hi ? 'Switch to English' : 'हिंदी में देखें'}
          onPress={toggleLang}
          style={{
            position: 'absolute',
            top: 8,
            right: 20,
            zIndex: 10,
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#e5e0f7',
            backgroundColor: '#ffffffb3',
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: theme.family.displayBold, color: '#6b6785' }}>
            {hi ? 'EN' : 'हि'}
          </Text>
        </Pressable>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View
              style={{
                flex: 1,
                width: '100%',
                maxWidth: 420,
                alignSelf: 'center',
                paddingHorizontal: 24,
                paddingTop: 40,
                paddingBottom: 8,
              }}
            >
              {/* --------------------------------------------------- header */}
              <View style={{ alignItems: 'center' }}>
                <Logo />
                <Text
                  style={{
                    marginTop: 16,
                    fontSize: 40,
                    lineHeight: 44,
                    fontFamily: theme.family.displayBold,
                    color: INK,
                  }}
                >
                  Adhyapak
                </Text>
                {/* The tagline is the wordmark's other half — a brand line, not
                    copy, so it stays in English in both languages. */}
                <Text style={{ marginTop: 8, fontSize: 17, fontFamily: theme.family.bodySemi }}>
                  <Text style={{ color: '#7c5cf7' }}>Learn.</Text>
                  <Text> </Text>
                  <Text style={{ color: '#3b9ae1' }}>Practice.</Text>
                  <Text> </Text>
                  <Text style={{ color: '#22c07a' }}>Succeed.</Text>
                </Text>

                <Text
                  style={{
                    marginTop: 36,
                    fontSize: 22,
                    fontFamily: theme.family.displayBold,
                    color: INK,
                  }}
                >
                  {step === 'code'
                    ? hi
                      ? 'कोड डालें 📩'
                      : 'Enter the code 📩'
                    : hi
                      ? 'वापसी पर स्वागत है! 👋'
                      : 'Welcome Back! 👋'}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    textAlign: 'center',
                    fontSize: 14,
                    fontFamily: theme.family.body,
                    color: MUTED,
                  }}
                >
                  {step === 'code'
                    ? hi
                      ? `हमने ${sentTo} पर छह अंकों का कोड भेजा है`
                      : `We sent a six-digit code to ${sentTo}`
                    : hi
                      ? 'अपनी तैयारी जारी रखने के लिए लॉगिन करें'
                      : 'Login to continue your learning journey'}
                </Text>
              </View>

              {noBackend ? (
                <View
                  style={{
                    marginTop: 20,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#f3d9a8',
                    backgroundColor: '#fef7e8',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      lineHeight: 19,
                      fontFamily: theme.family.body,
                      color: '#7a5a1e',
                    }}
                  >
                    ⚠️{' '}
                    {hi
                      ? 'इस बिल्ड में कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए लॉगिन काम नहीं करेगा। ऐप बंडल की गई सामग्री पर चल रहा है।'
                      : 'This build has no database configured, so login will not work. The app is running on bundled content.'}
                  </Text>
                </View>
              ) : null}

              {/* ----------------------------------------------------- card */}
              <View
                style={{
                  marginTop: 24,
                  borderRadius: 22,
                  backgroundColor: '#fff',
                  padding: 20,
                  // The web card carries a soft violet drop shadow; this is the
                  // same weight expressed the way each platform understands.
                  shadowColor: '#4c34a0',
                  shadowOpacity: 0.16,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 12,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GradientFill />
                    <PhoneIcon />
                  </View>
                  <Text style={{ fontSize: 16, fontFamily: theme.family.displayBold, color: INK }}>
                    {step === 'code'
                      ? hi
                        ? 'छह अंकों का कोड'
                        : 'Six-digit code'
                      : hi
                        ? 'मोबाइल नंबर से लॉगिन'
                        : 'Login with Mobile Number'}
                  </Text>
                </View>

                {step === 'phone' ? (
                  <>
                    <View
                      style={{
                        marginTop: 16,
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#e8e4f6',
                      }}
                    >
                      {/* Fixed rather than typed: +91 is the only code the app
                          serves, and a field that can be typed into is a field
                          that can be typed into wrongly. */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          borderRightWidth: 1,
                          borderRightColor: '#e8e4f6',
                          paddingHorizontal: 16,
                        }}
                      >
                        <Text
                          style={{ fontSize: 15, fontFamily: theme.family.bodySemi, color: INK }}
                        >
                          +91
                        </Text>
                        <ChevronIcon />
                      </View>
                      <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        editable={!busy && !noBackend}
                        keyboardType="number-pad"
                        textContentType="telephoneNumber"
                        placeholder={hi ? 'मोबाइल नंबर डालें' : 'Enter mobile number'}
                        placeholderTextColor="#a8a3bd"
                        accessibilityLabel={hi ? 'मोबाइल नंबर' : 'Mobile number'}
                        style={{
                          flex: 1,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          fontSize: 15,
                          fontFamily: theme.family.body,
                          color: INK,
                        }}
                      />
                    </View>

                    {error ? <ErrorNote error={error} hi={hi} /> : null}

                    <PrimaryButton
                      label={busy ? (hi ? 'भेज रहे हैं…' : 'Sending…') : hi ? 'OTP भेजें' : 'Send OTP'}
                      onPress={send}
                      disabled={busy || noBackend}
                    />
                  </>
                ) : (
                  <>
                    <View
                      style={{
                        marginTop: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#e8e4f6',
                      }}
                    >
                      <TextInput
                        value={code}
                        onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                        editable={!busy}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        maxLength={6}
                        placeholder="••••••"
                        placeholderTextColor="#cfcadf"
                        accessibilityLabel={hi ? 'छह अंकों का कोड' : 'Six-digit code'}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          textAlign: 'center',
                          fontSize: 22,
                          letterSpacing: 10,
                          fontFamily: theme.family.displayBold,
                          color: INK,
                        }}
                      />
                    </View>

                    {error ? <ErrorNote error={error} hi={hi} /> : null}

                    <PrimaryButton
                      label={
                        busy ? (hi ? 'जाँच रहे हैं…' : 'Checking…') : hi ? 'सत्यापित करें' : 'Verify'
                      }
                      onPress={verify}
                      disabled={busy || code.length < 6}
                    />

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setStep('phone');
                        setError(null);
                      }}
                      style={{ marginTop: 12, minHeight: 44, justifyContent: 'center' }}
                    >
                      <Text
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          fontFamily: theme.family.bodySemi,
                          color: MUTED,
                        }}
                      >
                        {hi ? 'नंबर बदलें' : 'Change number'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              {/* --------------------------------------------------- or / google */}
              <View
                style={{
                  marginTop: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: '#e6e2f4' }} />
                <Text style={{ fontSize: 13, fontFamily: theme.family.body, color: '#9b96b0' }}>
                  {hi ? 'या' : 'or'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e6e2f4' }} />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={withGoogle}
                disabled={busy || noBackend}
                style={{
                  marginTop: 24,
                  minHeight: 56,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#eae7f5',
                  backgroundColor: '#fff',
                  opacity: busy || noBackend ? 0.6 : 1,
                }}
              >
                <GoogleIcon />
                <Text style={{ fontSize: 16, fontFamily: theme.family.displayBold, color: INK }}>
                  {hi ? 'Google से जारी रखें' : 'Continue with Google'}
                </Text>
              </Pressable>

              {/* Pushes the illustration and the terms to the bottom on a tall
                  screen, and simply follows the card on a short one. */}
              <View style={{ flex: 1, minHeight: 24 }} />

              <Illustration />

              {/*
                Styled as the link the design shows, but not a link: there is no
                terms route, and a dead link under the word "agree" is worse
                than no link at all. It becomes one the day the terms exist.
              */}
              <Text
                style={{
                  marginTop: 16,
                  textAlign: 'center',
                  fontSize: 12.5,
                  fontFamily: theme.family.body,
                  color: '#8b869e',
                }}
              >
                {hi ? 'जारी रखने पर आप सहमत हैं ' : 'By continuing you agree to the '}
                <Text style={{ fontFamily: theme.family.bodySemi, color: '#7c5cf7' }}>
                  {hi ? 'सेवा की शर्तों से' : 'Terms of Service'}
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------------------------------------- fragments */

/** The violet gradient action inside the card. */
function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={{
        marginTop: 16,
        minHeight: 56,
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <GradientFill />
      <Text style={{ fontSize: 16, fontFamily: theme.family.displayBold, color: '#fff' }}>
        {label}
      </Text>
      <ArrowIcon />
    </Pressable>
  );
}

function ErrorNote({ error, hi }: { error: AuthError; hi: boolean }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: '#fdecec',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{ fontSize: 12.5, lineHeight: 19, fontFamily: theme.family.body, color: '#b42318' }}
      >
        {hi ? error.hi : error.en}
      </Text>
    </View>
  );
}

/**
 * The soft shapes behind everything: a violet wash at the top, a dotted grid in
 * the corner, and two rings on the right. Decoration only.
 *
 * The web version blurs three circles with CSS. React Native has no blur on a
 * plain view, so the same shapes are drawn as low-opacity radial fills — the
 * effect a blurred pastel circle has at this size is a soft disc, and that is
 * what these are.
 */
function Backdrop() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ece8fd" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#faf9ff" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="320" fill="url(#wash)" />
        <Circle cx="-40" cy="-30" r="150" fill="#ece8fd" opacity={0.55} />
        <Circle cx="360" cy="10" r="130" fill="#eef4fd" opacity={0.6} />
        <Circle cx="350" cy="330" r="80" fill="#e9ecfb" opacity={0.5} />
        <Circle cx="300" cy="245" r="8" stroke="#c9d3f5" strokeWidth={2} fill="none" />
        {Array.from({ length: 5 }).flatMap((_, row) =>
          Array.from({ length: 7 }).map((__, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={24 + col * 13}
              cy={72 + row * 13}
              r={2}
              fill="#d8d3ee"
              opacity={0.7}
            />
          )),
        )}
      </Svg>
    </View>
  );
}

/** The app icon: an open book under a graduation cap, on a violet tile. */
function Logo() {
  return (
    <View
      style={{
        height: 74,
        width: 74,
        borderRadius: 22,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: VIOLET,
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      }}
    >
      <GradientFill from={VIOLET} to={VIOLET_LIGHT} />
      <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
        <Path d="M20 7 32 12.2 20 17.4 8 12.2 20 7Z" fill="#fff" />
        <Path
          d="M27.5 15.4v5.2c0 .5-3.4 2.6-7.5 2.6s-7.5-2.1-7.5-2.6v-5.2"
          stroke="#fff"
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M11 22.5h8.2c.5 0 .8.4.8.9V33c0-.6-.4-1-1-1H11V22.5Z" fill="#fff" opacity={0.95} />
        <Path d="M29 22.5h-8.2c-.5 0-.8.4-.8.9V33c0-.6.4-1 1-1h8V22.5Z" fill="#fff" opacity={0.78} />
      </Svg>
    </View>
  );
}

function PhoneIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={4.5} y={1.5} width={9} height={15} rx={2.2} stroke="#fff" strokeWidth={1.6} />
      <Path d="M7.8 13.6h2.4" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
      <Path d="M3 4.5 6 7.5l3-3" stroke="#6b7280" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <Path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </Svg>
  );
}

/**
 * The desk at the foot of the screen: a plant, a stack of books, an open book
 * and a pot of pencils. Drawn rather than an image so it costs no request and
 * stays sharp at any width.
 */
function Illustration() {
  return (
    <Svg width="100%" height={130} viewBox="0 0 340 130" fill="none">
      {/* ground */}
      <Ellipse cx={170} cy={118} rx={168} ry={16} fill="#efecfb" />
      <Rect x={0} y={118} width={340} height={12} fill="#f6f4fd" />

      {/* potted plant */}
      <Path d="M42 74c-9-4-14-13-12-21 9-1 17 5 19 14" fill="#34c77b" opacity={0.85} />
      <Path d="M48 76c3-10 12-16 21-15-1 9-9 16-19 17" fill="#7fdcae" />
      <Path d="M45 78V60" stroke="#2fae6b" strokeWidth={2} strokeLinecap="round" />
      <Path d="M31 79h29l-3.5 26a3 3 0 0 1-3 2.6H37.5a3 3 0 0 1-3-2.6L31 79Z" fill="#fff" />
      <Path d="M31 79h29l-.7 5H31.7L31 79Z" fill="#e9e5f8" />

      {/* stack of books */}
      <Rect x={88} y={76} width={82} height={12} rx={3} fill="#7c5cf7" />
      <Rect x={88} y={76} width={82} height={4} rx={2} fill="#9b83fa" />
      <Rect x={94} y={88} width={76} height={12} rx={3} fill="#fbc02d" />
      <Rect x={94} y={88} width={76} height={4} rx={2} fill="#fdd460" />
      <Rect x={84} y={100} width={90} height={12} rx={3} fill="#5b9bf5" />
      <Rect x={84} y={100} width={90} height={4} rx={2} fill="#82b4f8" />

      {/* open book */}
      <Path d="M196 112c8-7 20-7 28-2v-18c-8-5-20-5-28 2v18Z" fill="#fff" />
      <Path d="M252 112c-8-7-20-7-28-2v-18c8-5 20-5 28 2v18Z" fill="#fdfcff" />
      <Path d="M224 94v16" stroke="#ddd7f2" strokeWidth={1.6} />
      <Path
        d="M203 97h13M203 102h13M232 97h13M232 102h13"
        stroke="#e6e1f6"
        strokeWidth={1.6}
        strokeLinecap="round"
      />

      {/* pot of pencils */}
      <Path
        d="M283 68v38M294 62v44M305 72v34"
        stroke="#f4a259"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
      <Path
        d="M283 68v-5M294 62v-5M305 72v-5"
        stroke="#7c5cf7"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
      <Path d="M277 94h34l-2.6 16a3 3 0 0 1-3 2.6h-22.8a3 3 0 0 1-3-2.6L277 94Z" fill="#fff" />
      <Path d="M277 94h34l-.6 4h-32.8l-.6-4Z" fill="#e9e5f8" />
    </Svg>
  );
}
