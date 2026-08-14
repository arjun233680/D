import type { Bilingual, Lang, Note, NoteSection } from './types';
import { formatDate, t } from './engine/format';
import { getSubject } from './data/subjects';
import { getEducator } from './data/educators';
import { getExam } from './data/exams';

/**
 * Notes are study material, and study material is read as a PDF — a cover, a
 * contents page, numbered A4 sheets. This module turns a `Note` into that
 * document once, so the reader on the phone, the reader in the browser and the
 * downloadable file are the same document rather than three lookalikes.
 *
 * Pagination is done here in plain TypeScript instead of by the layout engine
 * because both readers must break pages identically — "page 4 of 9" has to mean
 * the same thing on an Android phone as it does in the printed file.
 */

export interface NoteBlock {
  /** 1-based section number, shown next to the heading. */
  index: number;
  section: NoteSection;
}

export interface NotePage {
  /** 1-based, counting the cover. */
  number: number;
  kind: 'cover' | 'content';
  blocks: NoteBlock[];
}

export interface NoteDocument {
  title: string;
  subject: string;
  subjectIcon: string;
  author: string;
  exams: string[];
  tags: string[];
  updated: string;
  pages: NotePage[];
  /** Includes the cover. */
  totalPages: number;
  /** Filename a download should use. */
  fileName: string;
}

/**
 * How much of a sheet a piece of content eats.
 *
 * The unit is "one character of body text": an A4 page with 20mm margins fits
 * roughly 70 characters per line and 34 lines, so a page holds about 2,400 of
 * them. Headings, bullets and callouts are charged their text plus the vertical
 * space their chrome occupies. It is an estimate, but a stable one — the same
 * note always breaks in the same place.
 */
const PAGE_UNITS = 2400;
const HEADING_UNITS = 150;
const BULLET_CHROME = 55;
const CALLOUT_CHROME = 150;
const SECTION_GAP = 90;

const len = (text: Bilingual, lang: Lang): number => t(text, lang).length;

const sectionUnits = (section: NoteSection, lang: Lang): number => {
  let units = HEADING_UNITS + SECTION_GAP + len(section.heading, lang) + len(section.body, lang);
  for (const bullet of section.bullets ?? []) units += BULLET_CHROME + len(bullet, lang);
  if (section.callout) units += CALLOUT_CHROME + len(section.callout, lang);
  return units;
};

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'note';

/** Splits a note into a cover page plus as many content sheets as it needs. */
export function buildNoteDocument(note: Note, lang: Lang): NoteDocument {
  const pages: NotePage[] = [{ number: 1, kind: 'cover', blocks: [] }];

  let current: NoteBlock[] = [];
  let used = 0;

  note.sections.forEach((section, i) => {
    const units = sectionUnits(section, lang);
    // A section that cannot fit anywhere still gets its own sheet rather than
    // pushing an empty page ahead of it.
    if (current.length && used + units > PAGE_UNITS) {
      pages.push({ number: pages.length + 1, kind: 'content', blocks: current });
      current = [];
      used = 0;
    }
    current.push({ index: i + 1, section });
    used += units;
  });

  if (current.length) pages.push({ number: pages.length + 1, kind: 'content', blocks: current });

  const subject = getSubject(note.subjectId);
  const educator = getEducator(note.educatorId);
  const title = t(note.title, lang);

  return {
    title,
    subject: subject ? t(subject.name, lang) : '',
    subjectIcon: subject?.icon ?? '📄',
    author: educator ? educator.name : 'Adhyapak',
    exams: note.examIds.map((id) => getExam(id)?.shortName).filter(Boolean) as string[],
    tags: note.tags.map((tag) => t(tag, lang)),
    updated: formatDate(note.updatedAt, lang),
    pages,
    totalPages: pages.length,
    fileName: `${slug(t(note.title, 'en'))}-adhyapak.pdf`,
  };
}

/* ------------------------------------------------------------------ export */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The printable form of the same document.
 *
 * Used by the phone (handed to the OS print service, which writes a real PDF)
 * and by the browser (opened in a tab, where "Save as PDF" produces the same
 * file). Fonts are named rather than fetched so the document renders with no
 * network access — a downloaded note has to open on a train.
 */
export function noteToPdfHtml(note: Note, lang: Lang): string {
  const doc = buildNoteDocument(note, lang);
  const hi = lang === 'hi';

  const sheet = (inner: string, page: number) => `
    <section class="sheet">
      <header class="running head">
        <span>${escapeHtml(doc.subject)}</span>
        <span>${escapeHtml(doc.title)}</span>
      </header>
      ${inner}
      <footer class="running foot">
        <span>adhyapak · ${escapeHtml(doc.author)}</span>
        <span>${hi ? 'पृष्ठ' : 'Page'} ${page} / ${doc.totalPages}</span>
      </footer>
    </section>`;

  const cover = sheet(
    `<div class="cover">
       <div class="mark">${escapeHtml(doc.subjectIcon)}</div>
       <p class="eyebrow">${escapeHtml(doc.subject)}</p>
       <h1>${escapeHtml(doc.title)}</h1>
       <p class="byline">${escapeHtml(doc.author)} · ${escapeHtml(doc.updated)} · ${
         doc.totalPages
       } ${hi ? 'पृष्ठ' : 'pages'}</p>
       <div class="chips">${doc.exams
         .map((e) => `<span class="chip">${escapeHtml(e)}</span>`)
         .join('')}</div>
       <h2 class="toc-title">${hi ? 'विषय-सूची' : 'Contents'}</h2>
       <ol class="toc">
         ${doc.pages
           .filter((p) => p.kind === 'content')
           .flatMap((p) => p.blocks.map((b) => ({ b, page: p.number })))
           .map(
             ({ b, page }) =>
               `<li><span>${escapeHtml(t(b.section.heading, lang))}</span><span class="dots"></span><span>${page}</span></li>`,
           )
           .join('')}
       </ol>
     </div>`,
    1,
  );

  const content = doc.pages
    .filter((p) => p.kind === 'content')
    .map((p) =>
      sheet(
        p.blocks
          .map(
            ({ index, section }) => `
        <article class="block">
          <h2><span class="num">${index}.</span> ${escapeHtml(t(section.heading, lang))}</h2>
          <p>${escapeHtml(t(section.body, lang))}</p>
          ${
            section.bullets?.length
              ? `<ul>${section.bullets
                  .map((b) => `<li>${escapeHtml(t(b, lang))}</li>`)
                  .join('')}</ul>`
              : ''
          }
          ${
            section.callout
              ? `<aside><p class="label">${hi ? 'याद रखें' : 'Remember'}</p><p>${escapeHtml(
                  t(section.callout, lang),
                )}</p></aside>`
              : ''
          }
        </article>`,
          )
          .join(''),
        p.number,
      ),
    )
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #eef0f4;
    color: #14161c;
    font-family: "Hind", "Noto Sans Devanagari", -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5pt;
    line-height: 1.65;
  }
  .sheet {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 8mm auto;
    padding: 26mm 20mm 24mm;
    background: #fff;
    box-shadow: 0 2px 14px rgba(15, 23, 42, 0.14);
    page-break-after: always;
  }
  .sheet:last-child { page-break-after: auto; }
  .running {
    position: absolute;
    left: 20mm; right: 20mm;
    display: flex; justify-content: space-between; gap: 8mm;
    font-size: 8.5pt; color: #8a91a3; letter-spacing: .02em;
  }
  .running span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Both rules must name their own class: a :first-of-type selector here would
     also match the footer, pinning it to the top of the sheet. */
  .head { top: 14mm; border-bottom: .3mm solid #e3e6ee; padding-bottom: 2mm; }
  .foot { bottom: 12mm; border-top: .3mm solid #e3e6ee; padding-top: 2mm; }
  h1 { font-size: 26pt; line-height: 1.2; margin: 4mm 0 2mm; letter-spacing: -.01em; }
  h2 { font-size: 14pt; line-height: 1.35; margin: 0 0 2mm; }
  p { margin: 0 0 3mm; }
  .cover { padding-top: 22mm; }
  .mark { font-size: 34pt; }
  .eyebrow { font-size: 9.5pt; letter-spacing: .16em; text-transform: uppercase; color: #6d64f6; margin: 6mm 0 0; }
  .byline { color: #6b7280; font-size: 10pt; }
  .chips { display: flex; flex-wrap: wrap; gap: 2mm; margin: 4mm 0 0; }
  .chip { border: .3mm solid #d7dae4; border-radius: 20mm; padding: 1mm 3mm; font-size: 8.5pt; color: #4b5162; }
  .toc-title { margin-top: 16mm; font-size: 11pt; letter-spacing: .1em; text-transform: uppercase; color: #8a91a3; }
  .toc { list-style: none; padding: 0; margin: 4mm 0 0; }
  .toc li { display: flex; align-items: baseline; gap: 2mm; padding: 2mm 0; border-bottom: .2mm dotted #e3e6ee; font-size: 10.5pt; }
  .toc .dots { flex: 1; }
  .block { margin-bottom: 8mm; }
  .block .num { color: #a8adbd; }
  ul { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin-bottom: 1.6mm; }
  aside {
    border-left: 1.2mm solid #f0932b;
    background: #fff6e9;
    border-radius: 0 2mm 2mm 0;
    padding: 3mm 4mm;
    margin: 0 0 3mm;
  }
  aside p { margin: 0; font-size: 10.5pt; }
  aside .label { font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #c2761b; margin-bottom: 1mm; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>${cover}${content}</body>
</html>`;
}
