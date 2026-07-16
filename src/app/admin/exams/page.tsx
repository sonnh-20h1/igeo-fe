'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { ClipboardList, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminExamsApi } from '@/features/admin-exams/api';
import type {
  CreateExamPayload,
  Exam,
  ExamQuestionEntry,
  ExamQuestionSelectionMode,
  ExamStatus,
  ExamTypeConfigPayload,
  UpdateExamPayload,
} from '@/features/admin-exams/types';
import { adminQuestionsApi } from '@/features/admin-questions/api';
import type { Question, QuestionDifficulty, QuestionType } from '@/features/admin-questions/types';
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

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

import { cn } from '@/lib/utils';

type TypeConfigForm = {
  enabled: boolean;
  selectionMode: ExamQuestionSelectionMode;
  score: string;
  /** Minutes per question */
  durationMinutes: string;
  count: string;
  difficulty: QuestionDifficulty | 'ALL';
  tags: string;
  shortIds: string[];
};

type ExamFormState = {
  title: string;
  description: string;
  status: ExamStatus;
  tags: string;
  mc: TypeConfigForm;
  essay: TypeConfigForm;
};

const QUESTION_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'ESSAY'];

function defaultDurationForType(type: QuestionType) {
  return type === 'ESSAY' ? 5 : 1;
}

const emptyTypeConfig = (
  mode: ExamQuestionSelectionMode = 'RANDOM',
  type: QuestionType = 'MULTIPLE_CHOICE',
): TypeConfigForm => ({
  enabled: false,
  selectionMode: mode,
  score: '1',
  durationMinutes: String(defaultDurationForType(type)),
  count: '10',
  difficulty: 'ALL',
  tags: '',
  shortIds: [],
});

const emptyForm = (): ExamFormState => ({
  title: '',
  description: '',
  status: 'DRAFT',
  tags: '',
  mc: {
    ...emptyTypeConfig('RANDOM', 'MULTIPLE_CHOICE'),
    enabled: true,
    count: '15',
    score: '1',
    durationMinutes: '1',
  },
  essay: {
    ...emptyTypeConfig('MANUAL', 'ESSAY'),
    score: '5',
    count: '2',
    durationMinutes: '5',
  },
});

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getConfig(form: ExamFormState, type: QuestionType): TypeConfigForm {
  return type === 'MULTIPLE_CHOICE' ? form.mc : form.essay;
}

function setConfig(
  form: ExamFormState,
  type: QuestionType,
  patch: Partial<TypeConfigForm>,
): ExamFormState {
  if (type === 'MULTIPLE_CHOICE') {
    return { ...form, mc: { ...form.mc, ...patch } };
  }
  return { ...form, essay: { ...form.essay, ...patch } };
}

function toForm(exam: Exam): ExamFormState {
  const next = emptyForm();
  next.title = exam.title ?? '';
  next.description = exam.description ?? '';
  next.status = exam.status ?? 'DRAFT';
  next.tags = (exam.tags ?? []).join(', ');
  next.mc = emptyTypeConfig('RANDOM', 'MULTIPLE_CHOICE');
  next.essay = emptyTypeConfig('MANUAL', 'ESSAY');

  for (const config of exam.typeConfigs ?? []) {
    const mapped: TypeConfigForm = {
      enabled: true,
      selectionMode: config.selectionMode,
      score: String(config.score ?? 1),
      durationMinutes: String(
        config.durationMinutes ?? defaultDurationForType(config.type),
      ),
      count: String(config.count ?? 1),
      difficulty: config.difficulty ?? 'ALL',
      tags: (config.tags ?? []).join(', '),
      shortIds: [...(config.shortIds ?? [])],
    };
    if (config.type === 'MULTIPLE_CHOICE') next.mc = mapped;
    if (config.type === 'ESSAY') next.essay = mapped;
  }

  return next;
}

function getTypeFormQuestionCount(config: TypeConfigForm) {
  if (config.selectionMode === 'MANUAL') {
    return config.shortIds.length;
  }
  const count = Number(config.count);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function computeSuggestedDuration(form: ExamFormState) {
  let total = 0;
  for (const type of QUESTION_TYPES) {
    const config = getConfig(form, type);
    if (!config.enabled) continue;
    const count = getTypeFormQuestionCount(config);
    const perQuestion = Number(config.durationMinutes);
    const duration =
      Number.isFinite(perQuestion) && perQuestion >= 1
        ? Math.floor(perQuestion)
        : defaultDurationForType(type);
    total += count * duration;
  }
  return Math.max(1, total || 1);
}

function getConfigQuestionCount(config: { selectionMode: ExamQuestionSelectionMode; count?: number | null; shortIds?: string[] }) {
  if (config.selectionMode === 'MANUAL') {
    return config.shortIds?.length || config.count || 0;
  }
  return config.count || 0;
}

function getExamDisplayStats(exam: Exam) {
  const configs = exam.typeConfigs ?? [];
  if (!configs.length) {
    return { questionCount: exam.questionCount, totalScore: exam.totalScore };
  }
  return configs.reduce(
    (acc, config) => {
      const count = getConfigQuestionCount(config);
      acc.questionCount += count;
      acc.totalScore += count * (Number(config.score) || 0);
      return acc;
    },
    { questionCount: 0, totalScore: 0 },
  );
}

function expectedPrefix(type: QuestionType) {
  return type === 'MULTIPLE_CHOICE' ? 'MC' : 'WE';
}

export default function AdminExamsPage() {
  const { dictionary, locale } = useI18n();
  const { success, error: notifyError } = useNotification();
  const copy = dictionary.adminExams;

  const [items, setItems] = useState<Exam[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [resolvedQuestions, setResolvedQuestions] = useState<ExamQuestionEntry[]>([]);
  const [form, setForm] = useState<ExamFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerItems, setPickerItems] = useState<Question[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });

      try {
        const result = await adminExamsApi.list({
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

    void loadExams();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notifyError, page, pageSize, reloadKey, search, statusFilter]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;

    async function loadPicker() {
      startTransition(() => {
        if (!cancelled) setPickerLoading(true);
      });
      try {
        const result = await adminQuestionsApi.list({
          page: 1,
          size: 20,
          search: pickerSearch.trim() || undefined,
          type: pickerType,
        });
        if (cancelled) return;
        startTransition(() => {
          setPickerItems(result.items ?? []);
          setPickerLoading(false);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setPickerItems([]);
          setPickerLoading(false);
        });
      }
    }

    const timer = window.setTimeout(() => {
      void loadPicker();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pickerOpen, pickerSearch, pickerType]);

  function openCreate() {
    setEditingExam(null);
    setResolvedQuestions([]);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  async function openEdit(exam: Exam) {
    setFormError(null);
    setDialogOpen(true);
    setEditingExam(exam);
    setForm(toForm(exam));
    setResolvedQuestions(exam.questions ?? []);
    try {
      const detail = await adminExamsApi.getById(exam.id);
      setEditingExam(detail);
      setForm(toForm(detail));
      setResolvedQuestions(detail.questions ?? []);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
    }
  }

  function openPicker(type: QuestionType) {
    setPickerType(type);
    setPickerSearch('');
    setPickerOpen(true);
  }

  function addShortId(type: QuestionType, shortId?: string) {
    const normalized = (shortId ?? '').trim().toUpperCase();
    setForm((current) => {
      const config = getConfig(current, type);
      if (normalized && config.shortIds.includes(normalized)) return current;
      return setConfig(current, type, {
        shortIds: [...config.shortIds, normalized],
      });
    });
  }

  function removeShortId(type: QuestionType, index: number) {
    setForm((current) => {
      const config = getConfig(current, type);
      return setConfig(current, type, {
        shortIds: config.shortIds.filter((_, i) => i !== index),
      });
    });
  }

  function buildTypeConfigs(): ExamTypeConfigPayload[] | null {
    const configs: ExamTypeConfigPayload[] = [];

    for (const type of QUESTION_TYPES) {
      const config = getConfig(form, type);
      if (!config.enabled) continue;

      const score = Number(config.score);
      if (!Number.isFinite(score) || score <= 0) {
        setFormError(copy.invalidScore);
        return null;
      }

      const durationMinutes = Number(config.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
        setFormError(copy.invalidQuestionDuration);
        return null;
      }

      if (config.selectionMode === 'RANDOM' || config.selectionMode === 'DYNAMIC') {
        const count = Number(config.count);
        if (!Number.isFinite(count) || count < 1) {
          setFormError(copy.invalidCount);
          return null;
        }
        configs.push({
          type,
          selectionMode: config.selectionMode,
          score,
          durationMinutes: Math.floor(durationMinutes),
          count,
          difficulty: config.difficulty === 'ALL' ? undefined : config.difficulty,
          tags: parseTags(config.tags).length ? parseTags(config.tags) : undefined,
        });
        continue;
      }

      const shortIds = config.shortIds.map((id) => id.trim().toUpperCase()).filter(Boolean);
      if (!shortIds.length) {
        setFormError(copy.invalidShortIds);
        return null;
      }
      const prefix = expectedPrefix(type);
      if (shortIds.some((id) => !id.startsWith(prefix))) {
        setFormError(copy.invalidShortIdPrefix);
        return null;
      }
      configs.push({
        type,
        selectionMode: 'MANUAL',
        score,
        durationMinutes: Math.floor(durationMinutes),
        shortIds,
      });
    }

    if (!configs.length) {
      setFormError(copy.requiredTypeConfigs);
      return null;
    }

    return configs;
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError(copy.requiredTitle);
      return;
    }

    const typeConfigs = buildTypeConfigs();
    if (!typeConfigs) return;

    setSaving(true);
    try {
      const tags = parseTags(form.tags);
      // Omit durationMinutes so BE auto-sums from typeConfigs (count × minutes/question).
      if (editingExam) {
        const payload: UpdateExamPayload = {
          title: form.title.trim(),
          description: form.description.trim() ? form.description.trim() : null,
          status: form.status,
          tags: tags.length ? tags : [],
          typeConfigs,
        };
        const updated = await adminExamsApi.update(editingExam.id, payload);
        setEditingExam(updated);
        setForm(toForm(updated));
        setResolvedQuestions(updated.questions ?? []);
        success(copy.updated);
      } else {
        const payload: CreateExamPayload = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          tags: tags.length ? tags : undefined,
          typeConfigs,
        };
        await adminExamsApi.create(payload);
        success(copy.created);
        setDialogOpen(false);
      }
      refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(exam: Exam) {
    const confirmed = window.confirm(copy.deleteConfirm.replace('{name}', exam.title));
    if (!confirmed) return;

    try {
      await adminExamsApi.remove(exam.id);
      success(copy.deleted);
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.deleteFailed, copy.deleteFailed);
    }
  }

  function statusLabel(status: ExamStatus) {
    if (status === 'PUBLISHED') return copy.statusPublished;
    if (status === 'ARCHIVED') return copy.statusArchived;
    return copy.statusDraft;
  }

  function typeLabel(type: QuestionType) {
    return type === 'MULTIPLE_CHOICE' ? copy.typeMultipleChoice : copy.typeEssay;
  }

  const selectedShortIds = new Set(getConfig(form, pickerType).shortIds.map((id) => id.toUpperCase()));

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
          <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
          <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
        </div>
        <Button onClick={openCreate} className='gap-2'>
          <Plus className='size-4' />
          {copy.create}
        </Button>
      </div>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <ClipboardList className='size-5 text-primary' />
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
                setStatusFilter(value as ExamStatus | 'ALL');
              }}
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue placeholder={copy.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
                <SelectItem value='DRAFT'>{copy.statusDraft}</SelectItem>
                <SelectItem value='PUBLISHED'>{copy.statusPublished}</SelectItem>
                <SelectItem value='ARCHIVED'>{copy.statusArchived}</SelectItem>
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
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colDuration}</TableHead>
                  <TableHead>{copy.colQuestionCount}</TableHead>
                  <TableHead>{copy.colTotalScore}</TableHead>
                  <TableHead>{copy.colTags}</TableHead>
                  <TableHead>{copy.colCreatedAt}</TableHead>
                  <TableHead className='text-right'>{copy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='py-10 text-center text-muted-foreground'>
                      {copy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((exam) => {
                    const stats = getExamDisplayStats(exam);
                    const hasDynamic = (exam.typeConfigs ?? []).some(
                      (config) => config.selectionMode === 'DYNAMIC',
                    );
                    return (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <span className='font-mono text-sm font-semibold text-primary'>{exam.shortId}</span>
                      </TableCell>
                      <TableCell className='max-w-sm'>
                        <p className='font-medium'>{exam.title}</p>
                        {exam.description ? (
                          <p className='mt-1 line-clamp-1 text-sm text-muted-foreground'>{exam.description}</p>
                        ) : null}
                        {hasDynamic ? (
                          <Badge variant='outline' className='mt-1'>
                            DYNAMIC
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{statusLabel(exam.status)}</Badge>
                      </TableCell>
                      <TableCell>{copy.minutes.replace('{n}', String(exam.durationMinutes))}</TableCell>
                      <TableCell>{stats.questionCount}</TableCell>
                      <TableCell>{stats.totalScore}</TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {(exam.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant='outline'>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(exam.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='inline-flex gap-2'>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void openEdit(exam)}
                            aria-label={copy.edit}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void handleDelete(exam)}
                            aria-label={copy.delete}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
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
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{editingExam ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>
              {editingExam ? copy.editDescription : copy.createDescription}
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={(event) => void submitForm(event)}>
            <div className='space-y-2'>
              <Label>{copy.fieldTitle}</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label>{copy.fieldDescription}</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label>{copy.fieldDuration}</Label>
                <div className='flex h-10 items-center rounded-sm border border-border/60 bg-[#faf8f5] px-3 text-sm text-foreground/80 sm:h-11'>
                  {copy.minutes.replace('{n}', String(computeSuggestedDuration(form)))}
                </div>
                <p className='text-xs text-muted-foreground'>{copy.durationAutoHint}</p>
              </div>
              <div className='space-y-2'>
                <Label>{copy.fieldStatus}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as ExamStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='DRAFT'>{copy.statusDraft}</SelectItem>
                    <SelectItem value='PUBLISHED'>{copy.statusPublished}</SelectItem>
                    <SelectItem value='ARCHIVED'>{copy.statusArchived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label>{copy.fieldTags}</Label>
              <Input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder={copy.tagsPlaceholder}
              />
            </div>

            <div className='space-y-3'>
              <Label>{copy.fieldQuestions}</Label>
              {QUESTION_TYPES.map((type) => {
                const config = getConfig(form, type);
                return (
                  <div key={type} className='space-y-3 rounded-xl border border-border/70 p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <label className='flex items-center gap-2 text-sm font-semibold'>
                        <input
                          type='checkbox'
                          checked={config.enabled}
                          onChange={(event) =>
                            setForm((current) =>
                              setConfig(current, type, { enabled: event.target.checked }),
                            )
                          }
                        />
                        {copy.typeConfigTitle.replace('{type}', typeLabel(type))}
                      </label>
                      <span className='text-xs text-muted-foreground'>{copy.enableType}</span>
                    </div>

                    {config.enabled ? (
                      <>
                        <div className='grid gap-2 sm:grid-cols-3'>
                          <button
                            type='button'
                            className={cn(
                              'rounded-xl border px-3 py-2 text-left text-sm transition',
                              config.selectionMode === 'MANUAL'
                                ? 'border-primary bg-primary/5'
                                : 'border-border/70 hover:bg-muted/40',
                            )}
                            onClick={() =>
                              setForm((current) => setConfig(current, type, { selectionMode: 'MANUAL' }))
                            }
                          >
                            <p className='font-semibold'>{copy.modeManual}</p>
                            <p className='mt-1 text-xs text-muted-foreground'>{copy.modeManualHint}</p>
                          </button>
                          <button
                            type='button'
                            className={cn(
                              'rounded-xl border px-3 py-2 text-left text-sm transition',
                              config.selectionMode === 'RANDOM'
                                ? 'border-primary bg-primary/5'
                                : 'border-border/70 hover:bg-muted/40',
                            )}
                            onClick={() =>
                              setForm((current) => setConfig(current, type, { selectionMode: 'RANDOM' }))
                            }
                          >
                            <p className='font-semibold'>{copy.modeRandom}</p>
                            <p className='mt-1 text-xs text-muted-foreground'>{copy.modeRandomHint}</p>
                          </button>
                          <button
                            type='button'
                            className={cn(
                              'rounded-xl border px-3 py-2 text-left text-sm transition',
                              config.selectionMode === 'DYNAMIC'
                                ? 'border-primary bg-primary/5'
                                : 'border-border/70 hover:bg-muted/40',
                            )}
                            onClick={() =>
                              setForm((current) => setConfig(current, type, { selectionMode: 'DYNAMIC' }))
                            }
                          >
                            <p className='font-semibold'>{copy.modeDynamic}</p>
                            <p className='mt-1 text-xs text-muted-foreground'>{copy.modeDynamicHint}</p>
                          </button>
                        </div>

                        <div className='grid gap-3 sm:grid-cols-3'>
                          <div className='space-y-1'>
                            <Label>{copy.fieldScorePerQuestion}</Label>
                            <Input
                              type='number'
                              min={0.1}
                              step={0.1}
                              value={config.score}
                              onChange={(event) =>
                                setForm((current) =>
                                  setConfig(current, type, { score: event.target.value }),
                                )
                              }
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label>{copy.fieldDurationPerQuestion}</Label>
                            <Input
                              type='number'
                              min={1}
                              step={1}
                              value={config.durationMinutes}
                              onChange={(event) =>
                                setForm((current) =>
                                  setConfig(current, type, {
                                    durationMinutes: event.target.value,
                                  }),
                                )
                              }
                            />
                          </div>
                          {config.selectionMode === 'RANDOM' || config.selectionMode === 'DYNAMIC' ? (
                            <div className='space-y-1'>
                              <Label>{copy.fieldCount}</Label>
                              <Input
                                type='number'
                                min={1}
                                value={config.count}
                                onChange={(event) =>
                                  setForm((current) =>
                                    setConfig(current, type, { count: event.target.value }),
                                  )
                                }
                              />
                            </div>
                          ) : null}
                        </div>

                        {config.selectionMode === 'RANDOM' || config.selectionMode === 'DYNAMIC' ? (
                          <div className='grid gap-3 sm:grid-cols-2'>
                            <div className='space-y-1'>
                              <Label>{copy.fieldDifficulty}</Label>
                              <Select
                                value={config.difficulty}
                                onValueChange={(value) =>
                                  setForm((current) =>
                                    setConfig(current, type, {
                                      difficulty: value as QuestionDifficulty | 'ALL',
                                    }),
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='ALL'>{copy.difficultyAll}</SelectItem>
                                  <SelectItem value='EASY'>{copy.difficultyEasy}</SelectItem>
                                  <SelectItem value='MEDIUM'>{copy.difficultyMedium}</SelectItem>
                                  <SelectItem value='HARD'>{copy.difficultyHard}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className='space-y-1'>
                              <Label>{copy.fieldTypeTags}</Label>
                              <Input
                                value={config.tags}
                                onChange={(event) =>
                                  setForm((current) =>
                                    setConfig(current, type, { tags: event.target.value }),
                                  )
                                }
                                placeholder={copy.tagsPlaceholder}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <Label>{copy.shortIdsLabel}</Label>
                              <div className='flex gap-2'>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  onClick={() => openPicker(type)}
                                >
                                  {copy.pickQuestion}
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  onClick={() => addShortId(type)}
                                >
                                  {copy.addShortId}
                                </Button>
                              </div>
                            </div>
                            {config.shortIds.length === 0 ? (
                              <p className='text-sm text-muted-foreground'>{copy.invalidShortIds}</p>
                            ) : (
                              <div className='space-y-2'>
                                {config.shortIds.map((shortId, index) => (
                                  <div key={`${shortId}-${index}`} className='flex gap-2'>
                                    <Input
                                      value={shortId}
                                      className='font-mono'
                                      placeholder={
                                        type === 'MULTIPLE_CHOICE' ? 'MC00001' : 'WE00001'
                                      }
                                      onChange={(event) => {
                                        const value = event.target.value.toUpperCase();
                                        setForm((current) => {
                                          const nextIds = [...getConfig(current, type).shortIds];
                                          nextIds[index] = value;
                                          return setConfig(current, type, { shortIds: nextIds });
                                        });
                                      }}
                                    />
                                    <Button
                                      type='button'
                                      size='icon'
                                      variant='outline'
                                      onClick={() => removeShortId(type, index)}
                                      aria-label={copy.removeQuestion}
                                    >
                                      <Trash2 className='size-4' />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className='space-y-2 rounded-xl border border-dashed border-border/80 p-4'>
              <Label>
                {copy.resolvedPreview.replace('{count}', String(resolvedQuestions.length))}
              </Label>
              {(form.mc.enabled && form.mc.selectionMode === 'DYNAMIC') ||
              (form.essay.enabled && form.essay.selectionMode === 'DYNAMIC') ? (
                <p className='text-sm text-muted-foreground'>{copy.resolvedDynamicNote}</p>
              ) : null}
              {resolvedQuestions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>{copy.resolvedEmpty}</p>
              ) : (
                <div className='space-y-2'>
                  {resolvedQuestions.map((item) => (
                    <div key={`${item.shortId}-${item.order}`} className='rounded-lg border border-border/60 p-3'>
                      <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span className='font-mono font-semibold text-primary'>{item.shortId}</span>
                        <Badge variant='outline'>{typeLabel(item.type)}</Badge>
                        <span>
                          {copy.fieldScorePerQuestion}: {item.score}
                        </span>
                        <span>
                          {copy.fieldDurationPerQuestion}:{' '}
                          {item.durationMinutes ?? defaultDurationForType(item.type)}
                        </span>
                      </div>
                      {item.question?.content ? (
                        <p className='mt-1 line-clamp-2 text-sm'>{item.question.content}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{copy.pickerTitle}</DialogTitle>
            <DialogDescription>
              {copy.pickerDescription} ({typeLabel(pickerType)})
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='relative'>
              <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                className='pl-9'
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
                placeholder={copy.pickerSearch}
              />
            </div>
            <div className='space-y-2'>
              {pickerLoading ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>{dictionary.common.loading}</p>
              ) : pickerItems.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>{copy.pickerEmpty}</p>
              ) : (
                pickerItems.map((question) => {
                  const added = selectedShortIds.has(question.shortId.toUpperCase());
                  return (
                    <div
                      key={question.id}
                      className='flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3'
                    >
                      <div className='min-w-0'>
                        <p className='font-mono text-xs font-semibold text-primary'>{question.shortId}</p>
                        <p className='mt-1 line-clamp-2 text-sm'>{question.content}</p>
                      </div>
                      <Button
                        type='button'
                        size='sm'
                        variant={added ? 'outline' : 'default'}
                        disabled={added}
                        onClick={() => addShortId(pickerType, question.shortId)}
                      >
                        {added ? copy.pickerAdded : copy.pickerAdd}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
