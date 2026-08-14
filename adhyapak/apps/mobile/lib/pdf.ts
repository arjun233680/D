import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { noteToPdfHtml, type Lang, type Note } from '@adhyapak/core';

/**
 * Hands the learner the note as an actual PDF.
 *
 * The two platforms reach a file by different routes and neither is a
 * work-around: on a phone the OS print service is the PDF writer (it is what
 * "Save as PDF" uses everywhere else on the device), and in a browser the
 * document is opened in its own tab where the same save produces the same
 * file. `expo-print`'s web build ignores the HTML it is given and prints the
 * current page, so the browser path is written out here instead.
 */
export async function openNotePdf(note: Note, lang: Lang): Promise<void> {
  const html = noteToPdfHtml(note, lang);

  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) {
      // Pop-up blocked — fall back to printing the note in place.
      URL.revokeObjectURL(url);
      window.print();
      return;
    }
    // The tab keeps its own reference to the blob once loaded; releasing the
    // URL sooner can race the navigation on Safari.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  await Print.printAsync({ html });
}
