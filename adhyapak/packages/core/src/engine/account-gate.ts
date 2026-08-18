import type { Bilingual } from '../types';

/**
 * Where an account stops being optional.
 *
 * Browsing is deliberately open. The login screen says why: an aspirant
 * downloading a prep app at 11pm should reach the question bank in two taps,
 * so reading questions, exploring an exam and even working through a set stay
 * first-class without signing in. That decision is not being reversed here.
 *
 * What needs an account is the moment something is *kept*. A bookmark and a
 * submitted attempt are promises that the thing will be there tomorrow, on
 * whichever device the learner picks up — and there is nowhere to keep them for
 * somebody with no profile row. Letting a guest bookmark forty questions into
 * localStorage and then lose them on a new phone is worse than asking at the
 * moment they first try to keep one.
 *
 * So the prompt fires on save, never on open. A guest starts a paper, answers
 * it, and is asked to sign in when they submit — not when they arrive.
 */
export type GatedAction = 'bookmark' | 'submit-attempt' | 'save-note';

/** Whether there is a profile row behind this learner. */
export const hasAccount = (user: { signedIn?: boolean; id?: string }): boolean =>
  Boolean(user.signedIn && user.id);

/**
 * What to say when the prompt appears.
 *
 * Each names the thing they were doing rather than the rule they hit. "Sign in
 * to continue" is true of all three and explains none of them; a learner who
 * just pressed the bookmark icon needs to know that bookmarks are what is being
 * saved, and that their answers are not being thrown away.
 */
export const accountGateReason = (action: GatedAction): { title: Bilingual; body: Bilingual } => {
  switch (action) {
    case 'bookmark':
      return {
        title: { en: 'Sign in to save bookmarks', hi: 'बुकमार्क सहेजने हेतु साइन इन करें' },
        body: {
          en: 'Bookmarks follow you to every device, so they need an account to live on.',
          hi: 'बुकमार्क हर डिवाइस पर आपके साथ चलते हैं, इसलिए उन्हें खाते की आवश्यकता है।',
        },
      };
    case 'save-note':
      return {
        title: { en: 'Sign in to save notes', hi: 'नोट्स सहेजने हेतु साइन इन करें' },
        body: {
          en: 'Saved notes follow you to every device, so they need an account to live on.',
          hi: 'सहेजे गए नोट्स हर डिवाइस पर आपके साथ चलते हैं, इसलिए उन्हें खाते की आवश्यकता है।',
        },
      };
    case 'submit-attempt':
      return {
        title: { en: 'Sign in to save this attempt', hi: 'यह प्रयास सहेजने हेतु साइन इन करें' },
        body: {
          en: 'Your answers are still here. Signing in records the score, the rank and this paper in your history.',
          hi: 'आपके उत्तर सुरक्षित हैं। साइन इन करने पर स्कोर, रैंक और यह पेपर आपके इतिहास में दर्ज हो जाएँगे।',
        },
      };
  }
};
