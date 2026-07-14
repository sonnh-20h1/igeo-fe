'use client';

import { startTransition, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, History, LogOut, Pencil, Play } from 'lucide-react';
import type { ExamPeriodCurrent, ExamPeriodExamItem } from '@/features/admin-exam-periods/types';
import {
  clearExamSession,
  hasExamSession,
  readExamCandidate,
  writeExamCandidate,
  writeExamSession,
  type ExamCandidateProfile,
} from '@/features/exam-session/storage';
import { userExamPeriodsApi } from '@/features/user-exam-periods/api';
import {
  toExamCandidateProfile,
  userExamCandidatesApi,
} from '@/features/user-exam-candidates/api';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import type { ExamAttemptStatus, ExamAttemptSummary } from '@/features/user-exam-attempts/types';
import { HomeHeader } from '@/features/home/home-header';
import { useI18n } from '@/features/i18n/provider';
import { formatMessage } from '@/features/i18n/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

type EntryForm = {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneLocal: string;
  cccd: string;
  dob: string;
  className: string;
  school: string;
};

const PHONE_COUNTRY_OPTIONS = [
  { code: '+84', nameVi: 'Việt Nam', nameEn: 'Vietnam' },
  { code: '+66', nameVi: 'Thái Lan', nameEn: 'Thailand' },
  { code: '+855', nameVi: 'Campuchia', nameEn: 'Cambodia' },
  { code: '+856', nameVi: 'Lào', nameEn: 'Laos' },
  { code: '+62', nameVi: 'Indonesia', nameEn: 'Indonesia' },
  { code: '+60', nameVi: 'Malaysia', nameEn: 'Malaysia' },
  { code: '+65', nameVi: 'Singapore', nameEn: 'Singapore' },
  { code: '+63', nameVi: 'Philippines', nameEn: 'Philippines' },
  { code: '+81', nameVi: 'Nhật Bản', nameEn: 'Japan' },
  { code: '+82', nameVi: 'Hàn Quốc', nameEn: 'South Korea' },
  { code: '+86', nameVi: 'Trung Quốc', nameEn: 'China' },
  { code: '+91', nameVi: 'Ấn Độ', nameEn: 'India' },
  { code: '+1', nameVi: 'Hoa Kỳ / Canada', nameEn: 'USA / Canada' },
  { code: '+44', nameVi: 'Anh', nameEn: 'United Kingdom' },
  { code: '+61', nameVi: 'Úc', nameEn: 'Australia' },
] as const;

const emptyEntryForm = (): EntryForm => ({
  fullName: '',
  email: '',
  phoneCountryCode: '+84',
  phoneLocal: '',
  cccd: '',
  dob: '',
  className: '',
  school: '',
});

function normalizePhoneLocal(value: string) {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

function buildInternationalPhone(countryCode: string, local: string) {
  const digits = normalizePhoneLocal(local);
  if (!digits) return '';
  return `${countryCode}${digits}`;
}

/** Age 16–19 as of Aug 1 of the current year; range shifts +1 year each calendar year. */
function getEligibleDobRange(reference = new Date()) {
  const year = reference.getFullYear();
  const min = `${year - 19}-08-01`;
  const max = `${year - 16}-08-01`;
  return { min, max, year };
}

function formatDobDisplay(ymd: string, locale: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isDobInEligibleRange(dobYmd: string, range = getEligibleDobRange()) {
  return Boolean(dobYmd) && dobYmd >= range.min && dobYmd <= range.max;
}

function formatDateTime(value: string | Date, locale: string) {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function ExamPublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className='home-page min-h-screen bg-[#F2E5D2]/40 text-[#022648]'>
      <HomeHeader hideAuth solid brandHref='/' sectionBase='/' />
      <div className='pt-20 sm:pt-24'>{children}</div>
    </div>
  );
}

export default function UserExamsPage() {
  return <UserExamsPageContent />;
}

function UserExamsPageContent() {
  const { dictionary, locale } = useI18n();
  const examsCopy = dictionary.userExams;
  const attemptsCopy = dictionary.userAttempts;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();
  const dobRange = getEligibleDobRange();
  const dobHint = formatMessage(examsCopy.fieldDobHint, {
    year: dobRange.year,
    min: formatDobDisplay(dobRange.min, locale),
    max: formatDobDisplay(dobRange.max, locale),
  });
  const dobInvalid = formatMessage(examsCopy.fieldDobInvalid, {
    year: dobRange.year,
    min: formatDobDisplay(dobRange.min, locale),
    max: formatDobDisplay(dobRange.max, locale),
  });

  const [ready, setReady] = useState(false);
  const [candidate, setCandidate] = useState<ExamCandidateProfile | null>(null);
  const [current, setCurrent] = useState<ExamPeriodCurrent | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntryForm);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ className: '', school: '' });
  const [savingSchool, setSavingSchool] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!hasExamSession()) {
        if (!cancelled) {
          setCandidate(null);
          setCurrent(null);
          setReady(true);
        }
        return;
      }

      const stored = readExamCandidate();
      setCandidate(stored);
      setLoadingCurrent(true);
      try {
        const [result, profile] = await Promise.all([
          userExamPeriodsApi.getCurrentForSession(),
          userExamCandidatesApi.getMe().catch(() => null),
        ]);
        if (cancelled) return;

        if (profile) {
          const nextProfile = toExamCandidateProfile(profile);
          writeExamCandidate(nextProfile);
          setCandidate(nextProfile);
        }

        startTransition(() => {
          setCurrent(result);
          setLoadingCurrent(false);
          setReady(true);
        });
      } catch {
        if (cancelled) return;
        clearExamSession();
        startTransition(() => {
          setCandidate(null);
          setCurrent(null);
          setLoadingCurrent(false);
          setReady(true);
        });
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    setEntryError(null);

    const phone = buildInternationalPhone(entryForm.phoneCountryCode, entryForm.phoneLocal);

    if (
      !entryForm.fullName.trim() ||
      !entryForm.email.trim() ||
      !phone ||
      !entryForm.cccd.trim() ||
      !entryForm.dob ||
      !entryForm.className.trim() ||
      !entryForm.school.trim()
    ) {
      setEntryError(examsCopy.entryRequired);
      return;
    }

    if (!isDobInEligibleRange(entryForm.dob, dobRange)) {
      setEntryError(dobInvalid);
      return;
    }

    setSubmitting(true);
    try {
      const result = await userExamPeriodsApi.submitEntry({
        fullName: entryForm.fullName.trim(),
        email: entryForm.email.trim().toLowerCase(),
        phone,
        cccd: entryForm.cccd.trim(),
        dob: new Date(entryForm.dob).toISOString(),
        className: entryForm.className.trim(),
        school: entryForm.school.trim(),
      });

      const profile: ExamCandidateProfile = {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        phone: result.user.phone,
        cccd: result.user.cccd,
        dob: result.user.dob,
        className: result.user.className,
        school: result.user.school,
      };
      writeExamSession(result.sessionToken, profile);
      setCandidate(profile);
      setLoadingCurrent(true);
      setCurrent(result.current);

      try {
        const fresh = await userExamPeriodsApi.getCurrentForSession();
        setCurrent(fresh ?? result.current);
      } catch {
        setCurrent(result.current);
      } finally {
        setLoadingCurrent(false);
      }

      success(examsCopy.entrySuccess);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : examsCopy.entryFailed,
        examsCopy.entryFailed,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openSchoolDialog() {
    if (!candidate) return;
    setSchoolForm({
      className: candidate.className || '',
      school: candidate.school || '',
    });
    setSchoolDialogOpen(true);
  }

  function exitAccount() {
    clearExamSession();
    setSchoolDialogOpen(false);
    setCandidate(null);
    setCurrent(null);
    setEntryForm(emptyEntryForm());
    setEntryError(null);
  }

  async function saveSchoolAndClass(event: React.FormEvent) {
    event.preventDefault();
    if (!schoolForm.className.trim() || !schoolForm.school.trim()) {
      notifyError(examsCopy.entryRequired, examsCopy.schoolClassUpdateFailed);
      return;
    }
    setSavingSchool(true);
    try {
      const updated = await userExamCandidatesApi.updateSchoolAndClass({
        className: schoolForm.className.trim(),
        school: schoolForm.school.trim(),
      });
      const nextProfile = toExamCandidateProfile(updated);
      writeExamCandidate(nextProfile);
      setCandidate(nextProfile);
      setSchoolDialogOpen(false);
      success(examsCopy.schoolClassUpdated);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : examsCopy.schoolClassUpdateFailed,
        examsCopy.schoolClassUpdateFailed,
      );
    } finally {
      setSavingSchool(false);
    }
  }

  if (!ready) {
    return (
      <ExamPublicChrome>
        <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>
      </ExamPublicChrome>
    );
  }

  if (!candidate) {
    return (
      <ExamPublicChrome>
        <div className='mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-6'>
          <div>
            <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>
              {examsCopy.eyebrow}
            </p>
            <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{examsCopy.pageTitle}</h1>
            <p className='mt-2 text-muted-foreground'>{examsCopy.pageDescription}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{examsCopy.entryTitle}</CardTitle>
              <CardDescription>{examsCopy.entryDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={(event) => void submitEntry(event)}>
                <div className='space-y-1'>
                  <Label htmlFor='fullName'>{examsCopy.fieldFullName}</Label>
                  <Input
                    id='fullName'
                    value={entryForm.fullName}
                    onChange={(event) =>
                      setEntryForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    autoComplete='name'
                  />
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='email'>{examsCopy.fieldEmail}</Label>
                  <Input
                    id='email'
                    type='email'
                    value={entryForm.email}
                    onChange={(event) =>
                      setEntryForm((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete='email'
                  />
                </div>
                  <div className='space-y-1'>
                  <Label htmlFor='phoneLocal'>{examsCopy.fieldPhone}</Label>
                  <div className='flex gap-2'>
                    <Select
                      value={entryForm.phoneCountryCode}
                      onValueChange={(value) =>
                        setEntryForm((current) => ({ ...current, phoneCountryCode: value }))
                      }
                    >
                      <SelectTrigger
                        className='w-[7rem] shrink-0 font-medium'
                        aria-label={examsCopy.fieldPhoneCountry}
                      >
                        <span>{entryForm.phoneCountryCode}</span>
                      </SelectTrigger>
                      <SelectContent className='min-w-[14rem]'>
                        {PHONE_COUNTRY_OPTIONS.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {locale === 'en' ? item.nameEn : item.nameVi} ({item.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id='phoneLocal'
                      inputMode='numeric'
                      autoComplete='tel-national'
                      placeholder={examsCopy.fieldPhonePlaceholder}
                      value={entryForm.phoneLocal}
                      onChange={(event) =>
                        setEntryForm((current) => ({
                          ...current,
                          phoneLocal: event.target.value.replace(/[^\d]/g, ''),
                        }))
                      }
                      onBlur={() =>
                        setEntryForm((current) => ({
                          ...current,
                          phoneLocal: normalizePhoneLocal(current.phoneLocal),
                        }))
                      }
                      className='flex-1'
                    />
                  </div>
                  <p className='text-xs text-muted-foreground'>{examsCopy.fieldPhoneHint}</p>
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='cccd'>{examsCopy.fieldCccd}</Label>
                  <Input
                    id='cccd'
                    value={entryForm.cccd}
                    onChange={(event) =>
                      setEntryForm((current) => ({ ...current, cccd: event.target.value }))
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='dob'>{examsCopy.fieldDob}</Label>
                  <Input
                    id='dob'
                    type='date'
                    min={dobRange.min}
                    max={dobRange.max}
                    value={entryForm.dob}
                    onChange={(event) =>
                      setEntryForm((current) => ({ ...current, dob: event.target.value }))
                    }
                  />
                  <p className='text-xs text-muted-foreground'>{dobHint}</p>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label htmlFor='className'>{examsCopy.fieldClassName}</Label>
                    <Input
                      id='className'
                      value={entryForm.className}
                      onChange={(event) =>
                        setEntryForm((current) => ({ ...current, className: event.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='school'>{examsCopy.fieldSchool}</Label>
                    <Input
                      id='school'
                      value={entryForm.school}
                      onChange={(event) =>
                        setEntryForm((current) => ({ ...current, school: event.target.value }))
                      }
                    />
                  </div>
                </div>
                {entryError ? <p className='text-sm text-red-600'>{entryError}</p> : null}
                <Button type='submit' className='w-full' disabled={submitting}>
                  {submitting ? dictionary.common.loading : examsCopy.entrySubmit}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ExamPublicChrome>
    );
  }

  return (
    <ExamPublicChrome>
      <div className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>
              {examsCopy.eyebrow}
            </p>
            <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>
              {examsCopy.greeting.replace('{name}', candidate.fullName)}
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              {formatMessage(examsCopy.candidateMeta, {
                className: candidate.className || '—',
                school: candidate.school || '—',
              })}
            </p>
            <p className='mt-2 max-w-2xl text-muted-foreground'>{examsCopy.description}</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' className='gap-2' onClick={openSchoolDialog}>
              <Pencil className='size-4' />
              {examsCopy.editSchoolClass}
            </Button>
            <Button variant='outline' className='gap-2' onClick={exitAccount}>
              <LogOut className='size-4' />
              {examsCopy.exitAccount}
            </Button>
          </div>
        </div>

        <CurrentPeriodPanel
          copy={examsCopy}
          locale={locale}
          loading={loadingCurrent}
          loadingLabel={dictionary.common.loading}
          current={current}
          notifyError={notifyError}
          success={success}
          onStarted={(attemptId) => router.push(`/attempts/${attemptId}`)}
        />

        <AttemptsHistoryTab
          copy={attemptsCopy}
          loadingLabel={dictionary.common.loading}
          notifyError={notifyError}
        />
      </div>

      <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{examsCopy.editSchoolClass}</DialogTitle>
            <DialogDescription>{examsCopy.editProfileHint}</DialogDescription>
          </DialogHeader>
          <form className='space-y-4' onSubmit={(event) => void saveSchoolAndClass(event)}>
            <div className='space-y-1'>
              <Label htmlFor='viewFullName' className='text-foreground/55'>
                {examsCopy.fieldFullName}
              </Label>
              <Input id='viewFullName' value={candidate.fullName} readOnly disabled />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='viewEmail' className='text-foreground/55'>
                {examsCopy.fieldEmail}
              </Label>
              <Input id='viewEmail' value={candidate.email || '—'} readOnly disabled />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='viewPhone' className='text-foreground/55'>
                {examsCopy.fieldPhone}
              </Label>
              <Input id='viewPhone' value={candidate.phone || '—'} readOnly disabled />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='viewCccd' className='text-foreground/55'>
                {examsCopy.fieldCccd}
              </Label>
              <Input id='viewCccd' value={candidate.cccd || '—'} readOnly disabled />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='viewDob' className='text-foreground/55'>
                {examsCopy.fieldDob}
              </Label>
              <Input
                id='viewDob'
                value={
                  candidate.dob
                    ? formatDobDisplay(
                        typeof candidate.dob === 'string'
                          ? candidate.dob.slice(0, 10)
                          : new Date(candidate.dob).toISOString().slice(0, 10),
                        locale,
                      )
                    : '—'
                }
                readOnly
                disabled
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='editClassName'>{examsCopy.fieldClassName}</Label>
              <Input
                id='editClassName'
                value={schoolForm.className}
                onChange={(event) =>
                  setSchoolForm((current) => ({ ...current, className: event.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='editSchool'>{examsCopy.fieldSchool}</Label>
              <Input
                id='editSchool'
                value={schoolForm.school}
                onChange={(event) =>
                  setSchoolForm((current) => ({ ...current, school: event.target.value }))
                }
              />
            </div>
            <Button type='submit' className='w-full' disabled={savingSchool}>
              {savingSchool ? dictionary.common.loading : examsCopy.saveSchoolClass}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </ExamPublicChrome>
  );
}

function CurrentPeriodPanel({
  copy,
  locale,
  loading,
  loadingLabel,
  current,
  notifyError,
  success,
  onStarted,
}: {
  copy: ReturnType<typeof useI18n>['dictionary']['userExams'];
  locale: string;
  loading: boolean;
  loadingLabel: string;
  current: ExamPeriodCurrent | null;
  notifyError: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  onStarted: (attemptId: string) => void;
}) {
  const [startingId, setStartingId] = useState<string | null>(null);
  const period = current?.period ?? null;
  const exams: ExamPeriodExamItem[] =
    current?.exams?.length
      ? current.exams
      : current?.exam
        ? [current.exam]
        : [];

  async function startExam(exam: ExamPeriodExamItem) {
    setStartingId(exam.id);
    try {
      const attempt = await userExamAttemptsApi.start(exam.id);
      success(copy.started);
      onStarted(attempt.id);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.startFailed, copy.startFailed);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <ClipboardList className='size-5 text-primary' />
          {copy.listTitle}
        </CardTitle>
        <CardDescription>{copy.listDescription}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <p className='py-10 text-center text-muted-foreground'>{loadingLabel}</p>
        ) : !period || exams.length === 0 ? (
          <p className='py-10 text-center text-muted-foreground'>{copy.noOpenPeriod}</p>
        ) : (
          <div className='space-y-4 rounded-2xl border border-border/70 bg-card p-4'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='outline'>{copy.openPeriodLabel}</Badge>
                <span className='text-base font-semibold'>{period.title}</span>
              </div>
              {period.description ? (
                <p className='text-sm text-muted-foreground'>{period.description}</p>
              ) : null}
              <p className='text-xs text-muted-foreground'>
                {copy.windowLabel}: {formatDateTime(period.startAt, locale)} →{' '}
                {formatDateTime(period.endAt, locale)}
              </p>
            </div>

            <div className='space-y-3 border-t border-border/60 pt-4'>
              {exams.map((exam) => (
                <div
                  key={exam.id || exam.shortId}
                  className='flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='text-base font-semibold'>{exam.title}</h3>
                      <Badge variant='outline' className='font-mono text-[11px]'>
                        {exam.shortId}
                      </Badge>
                      {exam.hasAttempted ? (
                        <Badge className='bg-secondary text-foreground'>{copy.attempted}</Badge>
                      ) : null}
                      {exam.hasDynamicQuestions ? (
                        <Badge variant='outline'>{copy.dynamicBadge}</Badge>
                      ) : null}
                    </div>
                    {exam.description ? (
                      <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>
                        {exam.description}
                      </p>
                    ) : null}
                    <div className='mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground'>
                      <span>{copy.minutes.replace('{n}', String(exam.durationMinutes))}</span>
                      <span>{copy.questions.replace('{n}', String(exam.questionCount))}</span>
                      <span>{copy.totalScore.replace('{n}', String(exam.totalScore))}</span>
                    </div>
                    {exam.hasDynamicQuestions ? (
                      <p className='mt-2 text-xs text-muted-foreground'>{copy.dynamicHint}</p>
                    ) : null}
                  </div>
                  <div className='flex gap-2'>
                    <Button asChild variant='outline'>
                      <Link href={`/exams/${exam.id}`}>{copy.view}</Link>
                    </Button>
                    <Button
                      className='gap-2'
                      disabled={startingId === exam.id}
                      onClick={() => void startExam(exam)}
                    >
                      <Play className='size-4' />
                      {startingId === exam.id
                        ? loadingLabel
                        : exam.hasAttempted
                          ? copy.retake
                          : copy.start}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttemptsHistoryTab({
  copy,
  loadingLabel,
  notifyError,
}: {
  copy: ReturnType<typeof useI18n>['dictionary']['userAttempts'];
  loadingLabel: string;
  notifyError: (message: string, title?: string) => void;
}) {
  const [items, setItems] = useState<ExamAttemptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ExamAttemptStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await userExamAttemptsApi.list({
          page,
          size: pageSize,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        if (cancelled) return;
        startTransition(() => {
          setItems(result.items ?? []);
          setTotal(result.pageInfo?.total ?? 0);
          setLoading(false);
        });
      } catch (error) {
        if (cancelled) return;
        startTransition(() => setLoading(false));
        notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notifyError, page, pageSize, statusFilter]);

  function statusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return copy.statusInProgress;
    if (status === 'SUBMITTED') return copy.statusSubmitted;
    if (status === 'PENDING_REVIEW') return copy.statusPendingReview;
    if (status === 'GRADED') return copy.statusGraded;
    return copy.statusExpired;
  }

  return (
    <Card>
      <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <History className='size-5 text-primary' />
            {copy.listTitle}
          </CardTitle>
          <CardDescription>{copy.listDescription}</CardDescription>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1);
            setStatusFilter(value as ExamAttemptStatus | 'ALL');
          }}
        >
          <SelectTrigger className='w-[220px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
            <SelectItem value='IN_PROGRESS'>{copy.statusInProgress}</SelectItem>
            <SelectItem value='SUBMITTED'>{copy.statusSubmitted}</SelectItem>
            <SelectItem value='PENDING_REVIEW'>{copy.statusPendingReview}</SelectItem>
            <SelectItem value='GRADED'>{copy.statusGraded}</SelectItem>
            <SelectItem value='EXPIRED'>{copy.statusExpired}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <p className='py-10 text-center text-muted-foreground'>{loadingLabel}</p>
        ) : items.length === 0 ? (
          <p className='py-10 text-center text-muted-foreground'>{copy.empty}</p>
        ) : (
          <div className='space-y-3'>
            {items.map((attempt) => (
              <div
                key={attempt.id}
                className='flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-medium'>{attempt.examTitle || attempt.examId}</p>
                    <Badge variant='outline'>{statusLabel(attempt.status)}</Badge>
                  </div>
                  <p className='mt-1 font-mono text-xs text-muted-foreground'>{attempt.shortId}</p>
                </div>
                <div>
                  {attempt.status === 'IN_PROGRESS' ? (
                    <Button asChild>
                      <Link href={`/attempts/${attempt.id}`}>{copy.resume}</Link>
                    </Button>
                  ) : (
                    <Badge variant='outline'>{copy.submittedDone}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          itemLabel={copy.itemLabel}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </CardContent>
    </Card>
  );
}
