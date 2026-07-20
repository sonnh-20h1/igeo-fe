'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { ClipboardList, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
import type { QuestionDifficulty, QuestionType } from '@/features/admin-questions/types';
import { adminCategoriesApi } from '@/features/admin-categories/api';
import type { QuestionCategory } from '@/features/admin-categories/types';
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

type ExamSelectionMode = 'RANDOM' | 'DYNAMIC';

type CategoryConfigForm = {
  id: string; // unique local ID
  categoryId: string; // 'ALL' or CAT#####
  type: QuestionType;
  selectionMode: ExamSelectionMode;
  count: string;
  /** Minutes per question */
  durationMinutes: string;
  difficulty: QuestionDifficulty | 'ALL';
  tags: string;
};

type ExamFormState = {
  title: string;
  description: string;
  status: ExamStatus;
  maxAttempts: string;
  tags: string;
  configs: CategoryConfigForm[];
};

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function defaultDurationForType(type: QuestionType) {
  return type === 'ESSAY' ? 5 : 1;
}

function emptyCategoryConfig(type: QuestionType = 'MULTIPLE_CHOICE'): CategoryConfigForm {
  return {
    id: String(Date.now() + Math.random()),
    categoryId: 'ALL',
    type,
    selectionMode: 'RANDOM',
    count: type === 'ESSAY' ? '2' : '15',
    durationMinutes: String(defaultDurationForType(type)),
    difficulty: 'ALL',
    tags: '',
  };
}

const emptyForm = (): ExamFormState => ({
  title: '',
  description: '',
  status: 'DRAFT',
  maxAttempts: '1',
  tags: '',
  configs: [emptyCategoryConfig()],
});

function toForm(exam: Exam): ExamFormState {
  const next = emptyForm();
  next.title = exam.title ?? '';
  next.description = exam.description ?? '';
  next.status = exam.status ?? 'DRAFT';
  next.maxAttempts = String(exam.maxAttempts ?? 1);
  next.tags = (exam.tags ?? []).join(', ');

  // Each BE typeConfig (already single-type) maps 1:1 to a local config row.
  const configs: CategoryConfigForm[] = (exam.typeConfigs ?? []).map((config, index) => {
    const categoryId = config.categoryIds?.[0] || 'ALL';
    const selectionMode: ExamSelectionMode = config.selectionMode === 'DYNAMIC' ? 'DYNAMIC' : 'RANDOM';

    return {
      id: `${index}_${Date.now()}`,
      categoryId,
      type: config.type,
      selectionMode,
      count: String(config.count ?? config.shortIds?.length ?? 1),
      durationMinutes: String(config.durationMinutes ?? defaultDurationForType(config.type)),
      difficulty: config.difficulty ?? 'ALL',
      tags: (config.tags ?? []).join(', '),
    };
  });

  next.configs = configs.length ? configs : [emptyCategoryConfig()];
  return next;
}

function computeSuggestedDuration(form: ExamFormState) {
  let total = 0;
  for (const config of form.configs) {
    const count = Number(config.count) || 0;
    const perQuestion = Number(config.durationMinutes) || defaultDurationForType(config.type);
    total += count * perQuestion;
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
  const fixedQuestions = exam.questions ?? [];
  const fixedCount = fixedQuestions.length;
  const fixedScore = fixedQuestions.reduce((sum, item) => sum + (Number(item.score) || 0), 0);

  const dynamicConfigs = (exam.typeConfigs ?? []).filter(
    (config) => config.selectionMode === 'DYNAMIC',
  );
  const dynamicCount = dynamicConfigs.reduce((sum, config) => sum + getConfigQuestionCount(config), 0);
  const dynamicScore = dynamicConfigs.reduce(
    (sum, config) => sum + getConfigQuestionCount(config) * (Number(config.score) || 1),
    0,
  );

  if (fixedCount > 0 || dynamicCount > 0) {
    return {
      questionCount: fixedCount + dynamicCount,
      totalScore: fixedScore + dynamicScore,
    };
  }

  return (exam.typeConfigs ?? []).reduce(
    (acc, config) => {
      const count = getConfigQuestionCount(config);
      acc.questionCount += count;
      acc.totalScore += count * (Number(config.score) || 1);
      return acc;
    },
    { questionCount: exam.questionCount ?? 0, totalScore: exam.totalScore ?? 0 },
  );
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
  const [categories, setCategories] = useState<QuestionCategory[]>([]);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const result = await adminCategoriesApi.list({ page: 1, size: 200 });
        if (cancelled) return;
        setCategories(result.items ?? []);
      } catch {
        // Category filter still usable without the list.
      }
    }
    void loadCategories();
    return () => {
      cancelled = true;
    };
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

  function buildTypeConfigs(): ExamTypeConfigPayload[] | null {
    const configs: ExamTypeConfigPayload[] = [];

    for (const config of form.configs) {
      const count = Number(config.count) || 0;
      if (count <= 0) {
        setFormError(copy.invalidCount);
        return null;
      }

      const durationMinutes = Number(config.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
        setFormError(copy.invalidQuestionDuration);
        return null;
      }

      const categoryIds = config.categoryId !== 'ALL' ? [config.categoryId] : undefined;
      const difficulty = config.difficulty !== 'ALL' ? config.difficulty : undefined;
      const tags = parseTags(config.tags).length ? parseTags(config.tags) : undefined;

      configs.push({
        type: config.type,
        selectionMode: config.selectionMode,
        durationMinutes: Math.floor(durationMinutes),
        count,
        difficulty,
        tags,
        categoryIds,
      });
    }

    if (!configs.length) {
      setFormError(copy.requiredTypeConfigs);
      return null;
    }

    return configs;
  }

  function addConfigRow() {
    setForm((current) => ({
      ...current,
      configs: [...current.configs, emptyCategoryConfig()],
    }));
  }

  function removeConfigRow(id: string) {
    setForm((current) => ({
      ...current,
      configs: current.configs.filter((c) => c.id !== id),
    }));
  }

  function updateConfigRow(id: string, patch: Partial<CategoryConfigForm>) {
    setForm((current) => ({
      ...current,
      configs: current.configs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError(copy.requiredTitle);
      return;
    }

    const maxAttempts = Number(form.maxAttempts);
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
      setFormError(copy.invalidMaxAttempts);
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
          maxAttempts: Math.floor(maxAttempts),
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
          maxAttempts: Math.floor(maxAttempts),
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
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
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
              <Button type='submit' variant='outline' className='shrink-0'>
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
              <SelectTrigger className='w-full sm:w-[200px] shrink-0'>
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
          <div className='overflow-x-auto rounded-xl border border-border/70 scrollbar-thin'>
            <Table className='min-w-[1000px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colShortId}</TableHead>
                  <TableHead>{copy.colTitle}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colDuration}</TableHead>
                  <TableHead>{copy.colMaxAttempts}</TableHead>
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
                    <TableCell colSpan={10} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='py-10 text-center text-muted-foreground'>
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
                      <TableCell className='whitespace-nowrap'>
                        <span className='font-mono text-sm font-semibold text-primary'>{exam.shortId}</span>
                      </TableCell>
                      <TableCell className='min-w-[200px] max-w-sm'>
                        <p className='font-medium line-clamp-2'>{exam.title}</p>
                        {exam.description ? (
                          <p className='mt-1 line-clamp-1 text-sm text-muted-foreground'>{exam.description}</p>
                        ) : null}
                        {hasDynamic ? (
                          <Badge variant='outline' className='mt-1'>
                            DYNAMIC
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <Badge variant='outline'>{statusLabel(exam.status)}</Badge>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>{copy.minutes.replace('{n}', String(exam.durationMinutes))}</TableCell>
                      <TableCell className='whitespace-nowrap'>{exam.maxAttempts ?? 1}</TableCell>
                      <TableCell className='whitespace-nowrap'>{stats.questionCount}</TableCell>
                      <TableCell className='whitespace-nowrap'>{stats.totalScore}</TableCell>
                      <TableCell className='min-w-[120px]'>
                        <div className='flex flex-wrap gap-1'>
                          {(exam.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant='outline' className='whitespace-nowrap'>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(exam.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        <div className='inline-flex gap-2'>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void openEdit(exam)}
                            aria-label={copy.edit}
                            className='shrink-0'
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void handleDelete(exam)}
                            aria-label={copy.delete}
                            className='shrink-0'
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

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label>{copy.fieldDuration}</Label>
                <div className='flex h-10 items-center rounded-sm border border-border/60 bg-white px-3 text-sm text-foreground/80 sm:h-11'>
                  {copy.minutes.replace('{n}', String(computeSuggestedDuration(form)))}
                </div>
                <p className='text-xs text-muted-foreground'>{copy.durationAutoHint}</p>
              </div>
              <div className='space-y-2'>
                <Label>{copy.fieldMaxAttempts}</Label>
                <Input
                  type='number'
                  min={1}
                  step={1}
                  value={form.maxAttempts}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxAttempts: event.target.value }))
                  }
                  required
                />
                <p className='text-xs text-muted-foreground'>{copy.maxAttemptsHint}</p>
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

            <div className='space-y-4'>
              <div className='flex items-center justify-between gap-2'>
                <Label className='text-base font-semibold'>{copy.fieldQuestions}</Label>
                <Button type='button' variant='outline' size='sm' onClick={addConfigRow} className='gap-1'>
                  <Plus className='size-3.5' />
                  {copy.addCategoryConfig}
                </Button>
              </div>

              <div className='space-y-4'>
                {form.configs.map((config, index) => (
                  <div key={config.id} className='relative space-y-3 rounded-xl border border-border/70 p-4 bg-muted/10'>
                    <div className='flex items-center justify-between gap-4'>
                      <span className='text-sm font-semibold text-primary'>
                        # {index + 1}
                      </span>
                      {form.configs.length > 1 ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-7 text-red-600 hover:bg-red-50 hover:text-red-700'
                          onClick={() => removeConfigRow(config.id)}
                          aria-label={copy.removeCategoryConfig}
                          title={copy.removeCategoryConfig}
                        >
                          <X className='size-4' />
                        </Button>
                      ) : null}
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div className='space-y-1'>
                        <Label>{copy.categoriesLabel}</Label>
                        {categories.length === 0 ? (
                          <p className='text-sm text-muted-foreground'>{copy.noCategoriesAvailable}</p>
                        ) : (
                          <Select
                            value={config.categoryId}
                            onValueChange={(val) => updateConfigRow(config.id, { categoryId: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='ALL'>{copy.categoriesAll}</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.shortId}>
                                  {cat.name} ({cat.shortId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className='space-y-1'>
                        <Label>{copy.selectionMode}</Label>
                        <Select
                          value={config.selectionMode}
                          onValueChange={(val) => updateConfigRow(config.id, { selectionMode: val as ExamSelectionMode })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='RANDOM'>{copy.modeRandom}</SelectItem>
                            <SelectItem value='DYNAMIC'>{copy.modeDynamic}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='space-y-1'>
                        <Label>{copy.fieldQuestionType}</Label>
                        <Select
                          value={config.type}
                          onValueChange={(val) =>
                            updateConfigRow(config.id, {
                              type: val as QuestionType,
                              durationMinutes: String(defaultDurationForType(val as QuestionType)),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='MULTIPLE_CHOICE'>{copy.typeMultipleChoice}</SelectItem>
                            <SelectItem value='ESSAY'>{copy.typeEssay}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-1'>
                        <Label>{copy.fieldCount}</Label>
                        <Input
                          type='number'
                          min={1}
                          value={config.count}
                          onChange={(e) => updateConfigRow(config.id, { count: e.target.value })}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label>{copy.fieldDurationPerQuestion}</Label>
                        <Input
                          type='number'
                          min={1}
                          step={1}
                          value={config.durationMinutes}
                          onChange={(e) => updateConfigRow(config.id, { durationMinutes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div className='space-y-1'>
                        <Label>{copy.fieldDifficulty}</Label>
                        <Select
                          value={config.difficulty}
                          onValueChange={(val) =>
                            updateConfigRow(config.id, {
                              difficulty: val as QuestionDifficulty | 'ALL',
                            })
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
                          onChange={(e) => updateConfigRow(config.id, { tags: e.target.value })}
                          placeholder={copy.tagsPlaceholder}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2 rounded-xl border border-dashed border-border/80 p-4'>
              <Label>
                {copy.resolvedPreview.replace('{count}', String(resolvedQuestions.length))}
              </Label>
              {form.configs.some((c) => c.selectionMode === 'DYNAMIC') ? (
                <p className='text-sm text-muted-foreground'>{copy.resolvedDynamicNote}</p>
              ) : null}
              {resolvedQuestions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>{copy.resolvedEmpty}</p>
              ) : (
                <div className='space-y-2'>
                  {resolvedQuestions.map((item) => (
                    <div key={`${item.shortId}-${item.order}`} className='rounded-lg border border-border/60 p-3 bg-card'>
                      <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span className='font-mono font-semibold text-primary'>{item.shortId}</span>
                        <Badge variant='outline'>{typeLabel(item.type)}</Badge>
                        <span>
                          {dictionary.adminQuestions.colScore}: {item.score}
                        </span>
                        <span>
                          {copy.fieldDurationPerQuestion}:{' '}
                          {item.durationMinutes}
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
    </div>
  );
}
