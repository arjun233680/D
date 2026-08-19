'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  isBackendConfigured,
  sendPhoneOtp,
  signInWithGoogle,
  signOut,
  verifyPhoneOtp,
  type AuthError,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { authRedirectUrl } from '@/lib/authRedirect';

/**
 * The door.
 *
 * A phone number and a code, with Google beside it. Email and password used to
 * be here and are not any more: they are how staff sign in, they live at
 * /studio/sign-in, and an aspirant who has to invent a password and then wait
 * on a confirmation email has been given two chances to give up before seeing
 * a single question. A number they already know reaches the app in one.
 *
 * Rendered outside the app shell — see `immersive` in AppShell — because the
 * nav bar behind this screen points at places nobody standing here can go.
 *
 * The shape of the card follows the phone app's login screen exactly, so the
 * two products open the same way. Colours are written literally rather than
 * taken from the tokens in globals.css: those are the green Adhyapak brand that
 * governs the rest of the app, and this screen is the violet one from the
 * design. Changing the tokens to match would repaint every other screen.
 */

const VIOLET = '#6d4aed';
const VIOLET_LIGHT = '#8b5cf6';

type Step = 'phone' | 'code';

export default function SignInPage() {
  const { lang, toggleLang, user } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  /** The E.164 number the code actually went to, which is what verifies it. */
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  // A build-time fact, so it is read once at render rather than watched.
  const noBackend = !isBackendConfigured();
  const signedIn = Boolean(user.signedIn && user.id);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(sentTo, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // The store is subscribed to auth changes and is already fetching the
    // profile, so there is nothing to hand it here. A number that signed in is
    // a learner — staff arrive through /studio/sign-in — so there is no role
    // question to ask before choosing where to land.
    //
    // Everyone lands on the exam chooser, including returning learners: it
    // reads their saved exams and forwards them on if they have any, which
    // keeps the "have they answered yet" question in one place instead of
    // duplicating it here.
    router.push('/onboarding/exams');
  };

  /**
   * Google takes over the tab, so there is no success path to write: this page
   * is unmounted by the navigation. Only the failure to *leave* lands back
   * here, which is why nothing resets `busy` on the happy path — doing so would
   * flicker the button back to life as the page is torn down.
   */
  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    const started = await signInWithGoogle(authRedirectUrl());
    if (!started.ok) {
      setError(started.error);
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setStep('phone');
    setCode('');
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#faf9ff]">
      <Backdrop />

      {/*
        The design has no language switch, but taking the app shell away took
        the only one on this screen with it — and this screen gates everything,
        so a learner who wanted English would have had no way to ask for it.
        Small, in the corner, where the design has a decorative ring.
      */}
      <button
        type="button"
        onClick={toggleLang}
        className="absolute top-5 right-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-[#e5e0f7] bg-white/70 text-[11px] font-bold text-[#6b6785] backdrop-blur transition-colors hover:border-[#c9bef0]"
        aria-label={hi ? 'Switch to English' : 'हिंदी में देखें'}
      >
        {hi ? 'EN' : 'हि'}
      </button>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 pt-12 pb-6">
        <header className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-[40px] leading-none font-extrabold tracking-tight text-[#1e1b4b]">
            Adhyapak
          </h1>
          {/* The tagline is the wordmark's other half — a brand line, not copy,
              so it stays in English in both languages. */}
          <p className="mt-2 text-[17px] font-semibold">
            <span className="text-[#7c5cf7]">Learn.</span>{' '}
            <span className="text-[#3b9ae1]">Practice.</span>{' '}
            <span className="text-[#22c07a]">Succeed.</span>
          </p>

          <h2 className="mt-9 text-[22px] font-extrabold text-[#1e1b4b]">
            {step === 'code'
              ? hi
                ? 'कोड डालें 📩'
                : 'Enter the code 📩'
              : hi
                ? 'वापसी पर स्वागत है! 👋'
                : 'Welcome Back! 👋'}
          </h2>
          <p className="mt-1.5 text-[14px] text-[#6b7280]">
            {step === 'code'
              ? hi
                ? `हमने ${sentTo} पर छह अंकों का कोड भेजा है`
                : `We sent a six-digit code to ${sentTo}`
              : hi
                ? 'अपनी तैयारी जारी रखने के लिए लॉगिन करें'
                : 'Login to continue your learning journey'}
          </p>
        </header>

        {noBackend ? (
          <p className="mt-5 rounded-2xl border border-[#f3d9a8] bg-[#fef7e8] px-4 py-3 text-[12.5px] leading-relaxed text-[#7a5a1e]">
            ⚠️{' '}
            {hi
              ? 'इस बिल्ड में कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए लॉगिन काम नहीं करेगा। ऐप बंडल की गई सामग्री पर चल रहा है।'
              : 'This build has no database configured, so login will not work. The app is running on bundled content.'}
          </p>
        ) : null}

        {signedIn ? (
          <section className="mt-6 rounded-[22px] bg-white p-5 shadow-[0_10px_30px_-12px_rgba(76,52,160,0.28)]">
            <p className="text-[14px] text-[#1e1b4b]">
              {hi ? 'साइन इन:' : 'Signed in as'}{' '}
              <span className="font-bold">{user.name || user.email}</span>
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 rounded-2xl py-3 text-[14px] font-bold text-white"
                style={{ background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
              >
                {hi ? 'तैयारी शुरू करें' : 'Start preparing'}
              </button>
              <button
                type="button"
                onClick={leave}
                disabled={busy}
                className="rounded-2xl border border-[#e8e4f6] px-4 text-[14px] font-bold text-[#6b7280] disabled:opacity-50"
              >
                {hi ? 'साइन आउट' : 'Sign out'}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-[22px] bg-white p-5 shadow-[0_10px_30px_-12px_rgba(76,52,160,0.28)]">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
                >
                  <PhoneIcon />
                </span>
                <span className="text-[16px] font-bold text-[#1e1b4b]">
                  {step === 'code'
                    ? hi
                      ? 'छह अंकों का कोड'
                      : 'Six-digit code'
                    : hi
                      ? 'मोबाइल नंबर से लॉगिन'
                      : 'Login with Mobile Number'}
                </span>
              </div>

              {step === 'phone' ? (
                <form onSubmit={send}>
                  <div className="mt-4 flex items-stretch rounded-2xl border border-[#e8e4f6] focus-within:border-[#c4b5fd]">
                    {/* A select rather than text: +91 is the only code the app
                        serves, and a field that can be typed into is a field
                        that can be typed into wrongly. */}
                    <span className="flex items-center gap-1 border-r border-[#e8e4f6] px-4 text-[15px] font-semibold text-[#1e1b4b]">
                      +91 <ChevronIcon />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={busy || noBackend}
                      placeholder={hi ? 'मोबाइल नंबर डालें' : 'Enter mobile number'}
                      aria-label={hi ? 'मोबाइल नंबर' : 'Mobile number'}
                      className="w-full rounded-r-2xl px-4 py-3.5 text-[15px] text-[#1e1b4b] placeholder:text-[#a8a3bd] focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  {error ? <ErrorNote error={error} hi={hi} /> : null}

                  <button
                    type="submit"
                    disabled={busy || noBackend}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,74,237,0.9)] disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
                  >
                    {busy ? (hi ? 'भेज रहे हैं…' : 'Sending…') : hi ? 'OTP भेजें' : 'Send OTP'}
                    <ArrowIcon />
                  </button>
                </form>
              ) : (
                <form onSubmit={verify}>
                  <div className="mt-4 rounded-2xl border border-[#e8e4f6] focus-within:border-[#c4b5fd]">
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      disabled={busy}
                      placeholder="••••••"
                      aria-label={hi ? 'छह अंकों का कोड' : 'Six-digit code'}
                      className="w-full rounded-2xl px-4 py-3.5 text-center text-[22px] font-bold tracking-[0.5em] text-[#1e1b4b] placeholder:tracking-[0.4em] placeholder:text-[#cfcadf] focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  {error ? <ErrorNote error={error} hi={hi} /> : null}

                  <button
                    type="submit"
                    disabled={busy || code.length < 6}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,74,237,0.9)] disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
                  >
                    {busy ? (hi ? 'जाँच रहे हैं…' : 'Checking…') : hi ? 'सत्यापित करें' : 'Verify'}
                    <ArrowIcon />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setError(null);
                    }}
                    className="mt-3 w-full text-[13px] font-semibold text-[#6b7280]"
                  >
                    {hi ? 'नंबर बदलें' : 'Change number'}
                  </button>
                </form>
              )}
            </section>

            <div className="mt-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#e6e2f4]" />
              <span className="text-[13px] text-[#9b96b0]">{hi ? 'या' : 'or'}</span>
              <span className="h-px flex-1 bg-[#e6e2f4]" />
            </div>

            <button
              type="button"
              onClick={withGoogle}
              disabled={busy || noBackend}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#eae7f5] bg-white py-4 text-[16px] font-bold text-[#1e1b4b] shadow-[0_6px_18px_-12px_rgba(76,52,160,0.5)] disabled:opacity-60"
            >
              <GoogleIcon />
              {hi ? 'Google से जारी रखें' : 'Continue with Google'}
            </button>
          </>
        )}

        {/* Pushes the illustration and the terms to the bottom of the viewport
            on a tall screen, and simply follows the card on a short one. */}
        <div className="min-h-6 flex-1" />

        <Illustration />

        {/*
          Styled as the link the design shows, but not yet a link: there is no
          /terms route, and every route that is not /sign-in or /studio is
          behind the gate — so an anchor here would 404 for anyone who reached
          it and bounce everyone else back to this page. It becomes an <a> the
          day the terms exist, and not before, because a dead link under the
          word "agree" is worse than no link at all.
        */}
        <p className="mt-4 text-center text-[12.5px] text-[#8b869e]">
          {hi ? 'जारी रखने पर आप सहमत हैं ' : 'By continuing you agree to the '}
          <span className="font-semibold text-[#7c5cf7]">
            {hi ? 'सेवा की शर्तों से' : 'Terms of Service'}
          </span>
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- fragments */

function ErrorNote({ error, hi }: { error: AuthError; hi: boolean }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-xl bg-[#fdecec] px-3 py-2 text-[12.5px] leading-relaxed text-[#b42318]"
    >
      {hi ? error.hi : error.en}
    </p>
  );
}

/**
 * The soft shapes behind everything: a violet wash at the top, a dotted grid in
 * the corner, and two rings on the right. Decoration only, so it is hidden from
 * anyone listening rather than looking.
 */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-[#ece8fd] blur-2xl" />
      <div className="absolute -top-10 -right-20 h-64 w-64 rounded-full bg-[#eef4fd] blur-2xl" />
      <div className="absolute top-[290px] -right-16 h-40 w-40 rounded-full bg-[#e9ecfb] opacity-70 blur-xl" />
      <div className="absolute top-[215px] right-9 h-4 w-4 rounded-full border-2 border-[#c9d3f5]" />
      <svg className="absolute top-16 left-5 opacity-70" width="86" height="60" fill="none">
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 7 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={4 + col * 13}
              cy={4 + row * 13}
              r="2"
              fill="#d8d3ee"
            />
          )),
        )}
      </svg>
    </div>
  );
}

/** The app icon: an open book under a graduation cap, on a violet tile. */
function Logo() {
  return (
    <span
      className="grid h-[74px] w-[74px] place-items-center rounded-[22px] shadow-[0_12px_26px_-10px_rgba(109,74,237,0.85)]"
      style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M20 7 32 12.2 20 17.4 8 12.2 20 7Z" fill="#fff" />
        <path d="M27.5 15.4v5.2c0 .5-3.4 2.6-7.5 2.6s-7.5-2.1-7.5-2.6v-5.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M11 22.5h8.2c.5 0 .8.4.8.9V33c0-.6-.4-1-1-1H11V22.5Z" fill="#fff" opacity=".95" />
        <path d="M29 22.5h-8.2c-.5 0-.8.4-.8.9V33c0-.6.4-1 1-1h8V22.5Z" fill="#fff" opacity=".78" />
      </svg>
    </span>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4.5" y="1.5" width="9" height="15" rx="2.2" stroke="#fff" strokeWidth="1.6" />
      <path d="M7.8 13.6h2.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5 6 7.5l3-3" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** The desk at the foot of the screen: a plant, a stack of books, an open book
 *  and a pot of pencils. Drawn rather than an image so it costs no request and
 *  stays sharp at any width. */
function Illustration() {
  return (
    <svg
      viewBox="0 0 340 130"
      className="w-full"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      {/* ground */}
      <ellipse cx="170" cy="118" rx="168" ry="16" fill="#efecfb" />
      <path d="M0 118h340v12H0z" fill="#f6f4fd" />

      {/* potted plant */}
      <path
        d="M42 74c-9-4-14-13-12-21 9-1 17 5 19 14"
        fill="#34c77b"
        opacity=".85"
      />
      <path d="M48 76c3-10 12-16 21-15-1 9-9 16-19 17" fill="#7fdcae" />
      <path d="M45 78V60" stroke="#2fae6b" strokeWidth="2" strokeLinecap="round" />
      <path d="M31 79h29l-3.5 26a3 3 0 0 1-3 2.6H37.5a3 3 0 0 1-3-2.6L31 79Z" fill="#fff" />
      <path d="M31 79h29l-.7 5H31.7L31 79Z" fill="#e9e5f8" />

      {/* stack of books */}
      <rect x="88" y="76" width="82" height="12" rx="3" fill="#7c5cf7" />
      <rect x="88" y="76" width="82" height="4" rx="2" fill="#9b83fa" />
      <rect x="94" y="88" width="76" height="12" rx="3" fill="#fbc02d" />
      <rect x="94" y="88" width="76" height="4" rx="2" fill="#fdd460" />
      <rect x="84" y="100" width="90" height="12" rx="3" fill="#5b9bf5" />
      <rect x="84" y="100" width="90" height="4" rx="2" fill="#82b4f8" />

      {/* open book */}
      <path d="M196 112c8-7 20-7 28-2v-18c-8-5-20-5-28 2v18Z" fill="#fff" />
      <path d="M252 112c-8-7-20-7-28-2v-18c8-5 20-5 28 2v18Z" fill="#fdfcff" />
      <path
        d="M224 94v16"
        stroke="#ddd7f2"
        strokeWidth="1.6"
      />
      <path
        d="M203 97h13M203 102h13M232 97h13M232 102h13"
        stroke="#e6e1f6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* pot of pencils */}
      <path d="M283 68v38M294 62v44M305 72v34" stroke="#f4a259" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M283 68v-5M294 62v-5M305 72v-5" stroke="#7c5cf7" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M277 94h34l-2.6 16a3 3 0 0 1-3 2.6h-22.8a3 3 0 0 1-3-2.6L277 94Z" fill="#fff" />
      <path d="M277 94h34l-.6 4h-32.8l-.6-4Z" fill="#e9e5f8" />
    </svg>
  );
}
