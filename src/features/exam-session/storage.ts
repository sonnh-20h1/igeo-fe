export type ExamCandidateProfile = {
  id: string;
  email?: string;
  fullName: string;
  phone: string;
  cccd: string;
  dob?: string | Date | null;
  className: string;
  school: string;
};

const EXAM_SESSION_KEY = 'igeo:examSession';
const EXAM_CANDIDATE_KEY = 'igeo:examCandidate';

export function readExamSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(EXAM_SESSION_KEY);
  } catch {
    return null;
  }
}

export function readExamCandidate(): ExamCandidateProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EXAM_CANDIDATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamCandidateProfile;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function writeExamSession(sessionToken: string, candidate: ExamCandidateProfile) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(EXAM_SESSION_KEY, sessionToken);
  localStorage.setItem(EXAM_CANDIDATE_KEY, JSON.stringify(candidate));
}

export function writeExamCandidate(candidate: ExamCandidateProfile) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(EXAM_CANDIDATE_KEY, JSON.stringify(candidate));
}

export function clearExamSession() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(EXAM_SESSION_KEY);
  localStorage.removeItem(EXAM_CANDIDATE_KEY);
}

export function hasExamSession() {
  return Boolean(readExamSessionToken());
}

export function requireExamSessionToken() {
  const token = readExamSessionToken();
  if (!token) throw new Error('Exam session expired');
  return token;
}
