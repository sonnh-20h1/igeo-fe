'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarRange, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { adminExamPeriodsApi } from '@/features/admin-exam-periods/api';
import type {
  CreateExamPeriodPayload,
  ExamPeriod,
  ExamPeriodStatus,
  UpdateExamPeriodPayload,
} from '@/features/admin-exam-periods/types';
import { adminExamsApi } from '@/features/admin-exams/api';
import type { Exam } from '@/features/admin-exams/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/ui/notification';
import { Badge } from '@/components/ui/badge';

type FormState = {
  title: string;
  description: string;
  examId: string;
  startAt: string;
  endAt: string;
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  examId: '',
  startAt: '',
  endAt: '',
});

function toLocalInputValue(value: string | Date | undefined | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function formatDateTime(value: string | Date, locale: string) {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function periodExamLabel(period: ExamPeriod) {
  if (period.examTitles?.length) return period.examTitles.join(', ');
  if (period.examTitle) return period.examTitle;
  if (period.examIds?.length) return period.examIds.join(', ');
  return period.examId || '—';
}

function periodExamCodes(period: ExamPeriod) {
  if (period.examIds?.length) return period.examIds.join(', ');
  return period.examId || '';
}

function primaryExamId(period: ExamPeriod) {
  return period.examIds?.[0] || period.examId || '';
}

export default function AdminExamPeriodsPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminExamPeriods;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();

  const [items, setItems] = useState<ExamPeriod[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ExamPeriodStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamPeriod | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishedExams, setPublishedExams] = useState<Exam[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await adminExamPeriodsApi.list({
          page,
          size: pageSize,
          search: search.trim() || undefined,
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
  }, [copy.loadFailed, notifyError, page, pageSize, search, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadExams() {
      try {
        const result = await adminExamsApi.list({ page: 1, size: 100, status: 'PUBLISHED' });
        if (!cancelled) setPublishedExams(result.items ?? []);
      } catch {
        if (!cancelled) setPublishedExams([]);
      }
    }
    void loadExams();
    return () => {
      cancelled = true;
    };
  }, []);

  function statusLabel(status: ExamPeriodStatus) {
    if (status === 'DRAFT') return copy.statusDraft;
    if (status === 'ACTIVE') return copy.statusActive;
    return copy.statusClosed;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(period: ExamPeriod) {
    setEditing(period);
    setForm({
      title: period.title ?? '',
      description: period.description ?? '',
      examId: primaryExamId(period),
      startAt: toLocalInputValue(period.startAt),
      endAt: toLocalInputValue(period.endAt),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function reloadList(nextPage = page) {
    const result = await adminExamPeriodsApi.list({
      page: nextPage,
      size: pageSize,
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
    setItems(result.items ?? []);
    setTotal(result.pageInfo?.total ?? 0);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError(copy.requiredTitle);
      return;
    }
    if (!form.examId) {
      setFormError(copy.requiredExam);
      return;
    }
    if (!form.startAt || !form.endAt) {
      setFormError(copy.requiredWindow);
      return;
    }
    const startIso = toIsoFromLocal(form.startAt);
    const endIso = toIsoFromLocal(form.endAt);
    if (!startIso || !endIso || new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError(copy.invalidWindow);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const payload: UpdateExamPeriodPayload = {
          title: form.title.trim(),
          description: form.description.trim() ? form.description.trim() : null,
          examIds: [form.examId],
          startAt: startIso,
          endAt: endIso,
        };
        await adminExamPeriodsApi.update(editing.id, payload);
        success(copy.updated);
      } else {
        const payload: CreateExamPeriodPayload = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          examIds: [form.examId],
          startAt: startIso,
          endAt: endIso,
          status: 'DRAFT',
        };
        await adminExamPeriodsApi.create(payload);
        success(copy.created);
      }
      setDialogOpen(false);
      setPage(1);
      await reloadList(1);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.saveFailed, copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(period: ExamPeriod) {
    if (!window.confirm(copy.activateConfirm.replace('{name}', period.title))) return;
    try {
      await adminExamPeriodsApi.activate(period.id);
      success(copy.activated);
      await reloadList();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.activateFailed, copy.activateFailed);
    }
  }

  async function handleDelete(period: ExamPeriod) {
    if (!window.confirm(copy.deleteConfirm.replace('{name}', period.title))) return;
    try {
      await adminExamPeriodsApi.remove(period.id);
      success(copy.deleted);
      await reloadList();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.deleteFailed, copy.deleteFailed);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
          <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
          <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
        </div>
        <Button className='gap-2' onClick={openCreate}>
          <Plus className='size-4' />
          {copy.create}
        </Button>
      </div>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <CalendarRange className='size-5 text-primary' />
              {copy.listTitle}
            </CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
            <form
              className='flex w-full max-w-md gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setSearch(searchInput);
              }}
            >
              <div className='relative flex-1'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                />
              </div>
              <Button type='submit' variant='outline'>
                {copy.search}
              </Button>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as ExamPeriodStatus | 'ALL');
              }}
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
                <SelectItem value='DRAFT'>{copy.statusDraft}</SelectItem>
                <SelectItem value='ACTIVE'>{copy.statusActive}</SelectItem>
                <SelectItem value='CLOSED'>{copy.statusClosed}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colShortId}</TableHead>
                  <TableHead>{copy.colTitle}</TableHead>
                  <TableHead>{copy.colExam}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colWindow}</TableHead>
                  <TableHead className='text-right'>{copy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-10 text-center text-muted-foreground'>
                      {copy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((period) => (
                    <TableRow
                      key={period.id}
                      className='cursor-pointer hover:bg-muted/40'
                      onClick={() => router.push(`/admin/exam-periods/${period.id}`)}
                    >
                      <TableCell>
                        <span className='font-mono text-sm font-semibold text-primary'>{period.shortId}</span>
                      </TableCell>
                      <TableCell className='max-w-xs'>
                        <p className='font-medium'>{period.title}</p>
                        {period.description ? (
                          <p className='mt-1 line-clamp-1 text-sm text-muted-foreground'>{period.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p className='text-sm'>{periodExamLabel(period)}</p>
                        <p className='font-mono text-xs text-muted-foreground'>{periodExamCodes(period)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{statusLabel(period.status)}</Badge>
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        <p>{formatDateTime(period.startAt, locale)}</p>
                        <p>→ {formatDateTime(period.endAt, locale)}</p>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='inline-flex gap-2' onClick={(event) => event.stopPropagation()}>
                          {period.status !== 'ACTIVE' ? (
                            <Button
                              size='icon'
                              variant='outline'
                              onClick={() => void handleActivate(period)}
                              aria-label={copy.activate}
                              title={copy.activate}
                            >
                              <Power className='size-4' />
                            </Button>
                          ) : null}
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => openEdit(period)}
                            aria-label={copy.edit}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void handleDelete(period)}
                            aria-label={copy.delete}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editing ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>
              {editing ? copy.editDescription : copy.createDescription}
            </DialogDescription>
          </DialogHeader>
          <form className='space-y-4' onSubmit={(event) => void submitForm(event)}>
            <div className='space-y-1'>
              <Label>{copy.fieldTitle}</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>{copy.fieldDescription}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label>{copy.fieldExam}</Label>
              <Select
                value={form.examId || undefined}
                onValueChange={(value) => setForm((current) => ({ ...current, examId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.examPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {publishedExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.shortId}>
                      {exam.title} ({exam.shortId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {publishedExams.length === 0 ? (
                <p className='text-xs text-muted-foreground'>{copy.noPublishedExams}</p>
              ) : null}
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label>{copy.fieldStartAt}</Label>
                <Input
                  type='datetime-local'
                  value={form.startAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                />
              </div>
              <div className='space-y-1'>
                <Label>{copy.fieldEndAt}</Label>
                <Input
                  type='datetime-local'
                  value={form.endAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                />
              </div>
            </div>
            {formError ? <p className='text-sm text-red-600'>{formError}</p> : null}
            <div className='flex justify-end gap-3 pt-2'>
              <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
                {dictionary.profile.cancel}
              </Button>
              <Button type='submit' disabled={saving}>
                {saving ? dictionary.common.loading : dictionary.common.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
