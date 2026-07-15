import type { ExamAttemptAdminDetail, ExamAttemptStatus } from '@/features/user-exam-attempts/types';
import type { jsPDF } from 'jspdf';

export type AttemptPdfLabels = {
  title: string;
  candidate: string;
  unknownUser: string;
  email: string;
  exam: string;
  examCode: string;
  status: string;
  startedAt: string;
  endedAt: string;
  questionLabel: string;
  typeMcq: string;
  typeEssay: string;
  userAnswer: string;
  correctAnswer: string;
  options: string;
  noAnswer: string;
  statusInProgress: string;
  statusSubmitted: string;
  statusGraded: string;
  statusExpired: string;
  statusLocked: string;
};

export function isAttemptExportable(status: ExamAttemptStatus) {
  return status !== 'IN_PROGRESS';
}

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function statusLabel(status: ExamAttemptStatus, labels: AttemptPdfLabels) {
  if (status === 'IN_PROGRESS') return labels.statusInProgress;
  if (status === 'SUBMITTED') return labels.statusSubmitted;
  if (status === 'GRADED') return labels.statusGraded;
  if (status === 'LOCKED') return labels.statusLocked;
  return labels.statusExpired;
}

function endedAt(attempt: ExamAttemptAdminDetail) {
  if (attempt.submittedAt) return attempt.submittedAt;
  if (attempt.lockedAt) return attempt.lockedAt;
  if (attempt.status === 'EXPIRED') return attempt.expiresAt;
  return null;
}

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

let fontCache: { regular: string; bold: string } | null = null;

async function loadNotoSansFonts() {
  if (fontCache) return fontCache;

  const [regularRes, boldRes] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf'),
    fetch('/fonts/NotoSans-Bold.ttf'),
  ]);

  if (!regularRes.ok || !boldRes.ok) {
    throw new Error('Unable to load PDF fonts');
  }

  const [regularBuf, boldBuf] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);

  fontCache = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
  return fontCache;
}

async function createPdfDoc() {
  const { jsPDF } = await import('jspdf');
  const fonts = await loadNotoSansFonts();
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

  doc.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
  doc.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');

  return doc;
}

type TextCursor = {
  doc: jsPDF;
  x: number;
  y: number;
  maxWidth: number;
  pageHeight: number;
  marginBottom: number;
  lineHeight: number;
};

function ensureSpace(cursor: TextCursor, needed: number) {
  if (cursor.y + needed <= cursor.pageHeight - cursor.marginBottom) return;
  cursor.doc.addPage();
  cursor.doc.setFont('NotoSans', 'normal');
  cursor.y = 48;
}

function writeWrapped(
  cursor: TextCursor,
  text: string,
  options?: { bold?: boolean; size?: number; color?: [number, number, number] },
) {
  const size = options?.size ?? 11;
  const bold = options?.bold ?? false;
  const color = options?.color ?? ([17, 17, 17] as [number, number, number]);

  cursor.doc.setFont('NotoSans', bold ? 'bold' : 'normal');
  cursor.doc.setFontSize(size);
  cursor.doc.setTextColor(color[0], color[1], color[2]);

  const lines = cursor.doc.splitTextToSize(text || '—', cursor.maxWidth) as string[];
  const lineGap = cursor.lineHeight * (size / 11);

  for (const line of lines) {
    ensureSpace(cursor, lineGap);
    cursor.doc.text(line, cursor.x, cursor.y);
    cursor.y += lineGap;
  }
}

function writeLabelValue(cursor: TextCursor, label: string, value: string) {
  ensureSpace(cursor, cursor.lineHeight);
  cursor.doc.setFont('NotoSans', 'bold');
  cursor.doc.setFontSize(11);
  cursor.doc.setTextColor(85, 85, 85);
  const labelText = `${label}: `;
  cursor.doc.text(labelText, cursor.x, cursor.y);

  const labelWidth = cursor.doc.getTextWidth(labelText);
  cursor.doc.setFont('NotoSans', 'normal');
  cursor.doc.setTextColor(17, 17, 17);
  const valueMaxWidth = cursor.maxWidth - labelWidth;
  const valueLines = cursor.doc.splitTextToSize(value || '—', Math.max(valueMaxWidth, 40)) as string[];

  if (valueLines.length === 0) {
    cursor.y += cursor.lineHeight;
    return;
  }

  cursor.doc.text(valueLines[0], cursor.x + labelWidth, cursor.y);
  cursor.y += cursor.lineHeight;

  for (let i = 1; i < valueLines.length; i += 1) {
    ensureSpace(cursor, cursor.lineHeight);
    cursor.doc.text(valueLines[i], cursor.x, cursor.y);
    cursor.y += cursor.lineHeight;
  }
}

function writeSpacer(cursor: TextCursor, amount = 10) {
  ensureSpace(cursor, amount);
  cursor.y += amount;
}

export async function exportAttemptPdf(
  attempt: ExamAttemptAdminDetail,
  labels: AttemptPdfLabels,
  locale: string,
) {
  if (!isAttemptExportable(attempt.status)) {
    throw new Error('Attempt is still in progress');
  }

  const doc = await createPdfDoc();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const maxWidth = pageWidth - marginX * 2;

  const cursor: TextCursor = {
    doc,
    x: marginX,
    y: 48,
    maxWidth,
    pageHeight,
    marginBottom: 48,
    lineHeight: 16,
  };

  const candidate = attempt.userFullName || labels.unknownUser;
  const answers = [...(attempt.answers ?? [])].sort((a, b) => a.order - b.order);

  writeWrapped(cursor, labels.title, { bold: true, size: 16 });
  writeSpacer(cursor, 8);
  writeLabelValue(cursor, labels.candidate, candidate);
  writeLabelValue(cursor, labels.email, attempt.userEmail || '—');
  writeLabelValue(cursor, labels.exam, attempt.examTitle || attempt.examId);
  writeLabelValue(cursor, labels.examCode, `${attempt.examId} · ${attempt.shortId}`);
  writeLabelValue(cursor, labels.status, statusLabel(attempt.status, labels));
  writeLabelValue(cursor, labels.startedAt, formatDateTime(attempt.startedAt, locale));
  writeLabelValue(cursor, labels.endedAt, formatDateTime(endedAt(attempt), locale));

  writeSpacer(cursor, 8);

  answers.forEach((item, index) => {
    writeSpacer(cursor, 6);
    ensureSpace(cursor, 8);
    doc.setDrawColor(200, 200, 200);
    doc.line(cursor.x, cursor.y, cursor.x + maxWidth, cursor.y);
    cursor.y += 14;

    const typeLabel = item.type === 'MULTIPLE_CHOICE' ? labels.typeMcq : labels.typeEssay;
    writeWrapped(
      cursor,
      `${labels.questionLabel.replace('{n}', String(index + 1))} · ${item.questionShortId} · ${typeLabel}`,
      { bold: true, size: 12 },
    );
    writeSpacer(cursor, 4);
    writeWrapped(cursor, item.question?.content || '—');

    if (item.type === 'MULTIPLE_CHOICE' && item.question?.options?.length) {
      writeSpacer(cursor, 4);
      writeWrapped(cursor, `${labels.options}:`, { bold: true });
      for (const opt of item.question.options) {
        writeWrapped(cursor, `${opt.key}. ${opt.text}`);
      }
    }

    writeSpacer(cursor, 4);
    writeLabelValue(
      cursor,
      labels.userAnswer,
      item.userAnswer?.trim() ? item.userAnswer : labels.noAnswer,
    );

    if (item.type === 'MULTIPLE_CHOICE') {
      writeLabelValue(cursor, labels.correctAnswer, item.question?.correctAnswer || '—');
    }
  });

  const candidatePart = sanitizeFilename(attempt.userFullName || attempt.shortId || 'candidate');
  doc.save(`bai-thi-${attempt.shortId}-${candidatePart}.pdf`);
}

export function buildAttemptPdfLabelsFromCopy(copy: {
  detailTitle: string;
  colCandidate: string;
  unknownUser: string;
  candidateEmail: string;
  colExam: string;
  examCode: string;
  colStatus: string;
  colStartedAt: string;
  colEndedAt: string;
  questionLabel: string;
  userAnswer: string;
  correctAnswer: string;
  statusInProgress: string;
  statusSubmitted: string;
  statusGraded: string;
  statusExpired: string;
  statusLocked: string;
  pdfTypeMcq: string;
  pdfTypeEssay: string;
  pdfOptions: string;
  pdfNoAnswer: string;
}): AttemptPdfLabels {
  return {
    title: copy.detailTitle,
    candidate: copy.colCandidate,
    unknownUser: copy.unknownUser,
    email: copy.candidateEmail,
    exam: copy.colExam,
    examCode: copy.examCode,
    status: copy.colStatus,
    startedAt: copy.colStartedAt,
    endedAt: copy.colEndedAt,
    questionLabel: copy.questionLabel,
    typeMcq: copy.pdfTypeMcq,
    typeEssay: copy.pdfTypeEssay,
    userAnswer: copy.userAnswer,
    correctAnswer: copy.correctAnswer,
    options: copy.pdfOptions,
    noAnswer: copy.pdfNoAnswer,
    statusInProgress: copy.statusInProgress,
    statusSubmitted: copy.statusSubmitted,
    statusGraded: copy.statusGraded,
    statusExpired: copy.statusExpired,
    statusLocked: copy.statusLocked,
  };
}
