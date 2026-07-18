'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Pencil, Plus, Search, Trash2, Upload, Eye, FileText, Image, Music } from 'lucide-react';
import { adminQuestionsApi } from '@/features/admin-questions/api';
import type {
  CreateQuestionPayload,
  Question,
  QuestionDifficulty,
  QuestionImportResult,
  QuestionOption,
  QuestionType,
  UpdateQuestionPayload,
} from '@/features/admin-questions/types';
import { createEmptyMcqOptions, normalizeQuestionOptions } from '@/features/admin-questions/types';
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
import { cn } from '@/lib/utils';
import { CategoriesPanel } from './categories-panel';
import { Tooltip } from '@/components/ui/tooltip';


function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type QuestionsTab = 'questions' | 'categories';

type QuestionFormState = {
  content: string;
  type: QuestionType;
  imageUrl: string;
  audioUrl: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: QuestionDifficulty;
  score: string;
  categoryId: string;
  tags: string;
};

const emptyForm = (): QuestionFormState => ({
  content: '',
  type: 'MULTIPLE_CHOICE',
  imageUrl: '',
  audioUrl: '',
  options: createEmptyMcqOptions(),
  correctAnswer: '',
  explanation: '',
  difficulty: 'MEDIUM',
  score: '1',
  categoryId: '',
  tags: '',
});

function toForm(question: Question): QuestionFormState {
  return {
    content: question.content ?? '',
    type: question.type,
    imageUrl: question.imageUrl ?? '',
    audioUrl: question.audioUrl ?? '',
    options: normalizeQuestionOptions(question.options),
    correctAnswer: question.correctAnswer ?? '',
    explanation: question.explanation ?? '',
    difficulty: question.difficulty ?? 'MEDIUM',
    score: String(question.score ?? 1),
    categoryId: question.categoryId ?? '',
    tags: (question.tags ?? []).join(', '),
  };
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AdminQuestionsPage() {
  const { dictionary, locale } = useI18n();
  const { success, error: notifyError } = useNotification();
  const copy = dictionary.adminQuestions;

  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'ALL'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<QuestionImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<QuestionsTab>('questions');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [formTab, setFormTab] = useState<'content' | 'media'>('content');

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await adminQuestionsApi.uploadFile(file, 'questions');
      setForm((current) => ({ ...current, imageUrl: res.url }));
      success(copy.uploadSuccess);
    } catch (err: any) {
      notifyError(
        err instanceof Error ? err.message : copy.uploadFailed,
        copy.uploadFailed,
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAudioUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingAudio(true);
    try {
      const res = await adminQuestionsApi.uploadFile(file, 'questions');
      setForm((current) => ({ ...current, audioUrl: res.url }));
      success(copy.uploadSuccess);
    } catch (err: any) {
      notifyError(
        err instanceof Error ? err.message : copy.uploadFailed,
        copy.uploadFailed,
      );
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await adminQuestionsApi.downloadImportTemplate();
      success(copy.templateDownloaded);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : copy.templateDownloadFailed,
        copy.templateDownloadFailed,
      );
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      notifyError(copy.importOnlyXlsx, copy.importFailed);
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const result = await adminQuestionsApi.importFromExcel(file);
      setImportResult(result);
      if (result.failedCount > 0) {
        notifyError(
          copy.importPartial
            .replace('{success}', String(result.successCount))
            .replace('{failed}', String(result.failedCount)),
          copy.importDone,
        );
      } else {
        success(
          copy.importSuccess.replace('{success}', String(result.successCount)),
          copy.importDone,
        );
      }
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.importFailed, copy.importFailed);
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const result = await adminCategoriesApi.list({ page: 1, size: 200 });
        if (cancelled) return;
        setCategories(result.items ?? []);
      } catch {
        // Category filter/form still usable without list
      }
    }
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });

      try {
        const result = await adminQuestionsApi.list({
          page,
          size: pageSize,
          search: search.trim() || undefined,
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          difficulty: difficultyFilter === 'ALL' ? undefined : difficultyFilter,
          categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
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

    void loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [
    categoryFilter,
    copy.loadFailed,
    difficultyFilter,
    notifyError,
    page,
    pageSize,
    reloadKey,
    search,
    typeFilter,
  ]);

  function openCreate() {
    setEditingQuestion(null);
    setForm(emptyForm());
    setFormError(null);
    setFormTab('content');
    setDialogOpen(true);
  }

  function openEdit(question: Question) {
    setEditingQuestion(question);
    setForm(toForm(question));
    setFormError(null);
    setFormTab('content');
    setDialogOpen(true);
  }

  function updateOptionText(key: string, text: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) => (option.key === key ? { ...option, text } : option)),
    }));
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.content.trim()) {
      setFormError(copy.requiredFields);
      return;
    }

    const cleanedOptions = form.options.map((option) => ({
      key: option.key,
      text: option.text.trim(),
    }));

    if (form.type === 'MULTIPLE_CHOICE') {
      if (cleanedOptions.length !== 4 || cleanedOptions.some((option) => !option.text)) {
        setFormError(copy.optionsMin);
        return;
      }
      if (!form.correctAnswer.trim() || !cleanedOptions.some((option) => option.key === form.correctAnswer)) {
        setFormError(copy.correctAnswerInvalid);
        return;
      }
    }

    const score = Number(form.score);
    if (!Number.isFinite(score) || score < 0.1) {
      setFormError(copy.invalidScore);
      return;
    }

    setSaving(true);
    try {
      const tags = parseTags(form.tags);
      const basePayload = {
        content: form.content.trim(),
        type: form.type,
        difficulty: form.difficulty,
        score,
        explanation: form.explanation.trim() || undefined,
        tags: tags.length ? tags : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        audioUrl: form.audioUrl.trim() || undefined,
        options: form.type === 'MULTIPLE_CHOICE' ? cleanedOptions : undefined,
        correctAnswer: form.type === 'MULTIPLE_CHOICE' ? form.correctAnswer.trim() : undefined,
        categoryId: form.categoryId.trim() || undefined,
      };

      if (editingQuestion) {
        const payload: UpdateQuestionPayload = {
          ...basePayload,
          imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
          audioUrl: form.audioUrl.trim() ? form.audioUrl.trim() : null,
          options: form.type === 'MULTIPLE_CHOICE' ? cleanedOptions : [],
          correctAnswer: form.type === 'MULTIPLE_CHOICE' ? form.correctAnswer.trim() : undefined,
          categoryId: form.categoryId.trim() ? form.categoryId.trim() : null,
        };
        await adminQuestionsApi.update(editingQuestion.id, payload);
        success(copy.updated);
      } else {
        const payload: CreateQuestionPayload = basePayload;
        await adminQuestionsApi.create(payload);
        success(copy.created);
      }
      setDialogOpen(false);
      refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(question: Question) {
    const preview = question.shortId || question.content.slice(0, 60);
    const confirmed = window.confirm(copy.deleteConfirm.replace('{name}', preview));
    if (!confirmed) return;

    try {
      await adminQuestionsApi.remove(question.id);
      success(copy.deleted);
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.deleteFailed, copy.deleteFailed);
    }
  }

  function typeLabel(type: QuestionType) {
    return type === 'MULTIPLE_CHOICE' ? copy.typeMultipleChoice : copy.typeEssay;
  }

  function difficultyLabel(difficulty: QuestionDifficulty) {
    if (difficulty === 'EASY') return copy.difficultyEasy;
    if (difficulty === 'HARD') return copy.difficultyHard;
    return copy.difficultyMedium;
  }

  function categoryLabel(categoryId?: string | null) {
    if (!categoryId) return copy.noCategory;
    const found = categories.find(
      (item) => item.shortId === categoryId || item.id === categoryId,
    );
    return found?.name || categoryId;
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
          <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
          <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
        </div>
        {activeTab === 'questions' ? (
          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='outline' className='gap-2' onClick={() => void handleDownloadTemplate()}>
              <Download className='size-4' />
              {copy.downloadTemplate}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='gap-2'
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className='size-4' />
              {importing ? copy.importing : copy.importExcel}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              className='hidden'
              onChange={(event) => void handleImportFile(event)}
            />
            <Button onClick={openCreate} className='gap-2'>
              <Plus className='size-4' />
              {copy.create}
            </Button>
          </div>
        ) : null}
      </div>

      <div className='flex gap-1 rounded-xl border border-border/70 bg-muted/30 p-1 sm:w-fit'>
        <Button
          type='button'
          size='sm'
          variant={activeTab === 'questions' ? 'default' : 'ghost'}
          className={cn('flex-1 sm:flex-none', activeTab !== 'questions' && 'text-muted-foreground')}
          onClick={() => setActiveTab('questions')}
        >
          {copy.tabQuestions}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          className={cn('flex-1 sm:flex-none', activeTab !== 'categories' && 'text-muted-foreground')}
          onClick={() => setActiveTab('categories')}
        >
          {copy.tabCategories}
        </Button>
      </div>

      {activeTab === 'categories' ? <CategoriesPanel /> : null}

      {activeTab === 'questions' ? (
        <>
      {importResult ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.importResultTitle}</CardTitle>
            <CardDescription>
              {copy.importResultSummary
                .replace('{total}', String(importResult.total))
                .replace('{success}', String(importResult.successCount))
                .replace('{failed}', String(importResult.failedCount))}
            </CardDescription>
          </CardHeader>
          {importResult.errors?.length ? (
            <CardContent className='space-y-2'>
              {importResult.errors.slice(0, 8).map((item) => (
                <p key={`${item.row}-${item.message}`} className='text-sm text-red-600'>
                  {copy.importRowError
                    .replace('{row}', String(item.row))
                    .replace('{message}', item.message)}
                </p>
              ))}
              {importResult.errors.length > 8 ? (
                <p className='text-sm text-muted-foreground'>
                  {copy.importMoreErrors.replace('{count}', String(importResult.errors.length - 8))}
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <BookOpen className='size-5 text-primary' />
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
            <div className='flex flex-wrap gap-2'>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setTypeFilter(value as QuestionType | 'ALL');
                }}
              >
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder={copy.filterType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>{copy.filterAllTypes}</SelectItem>
                  <SelectItem value='MULTIPLE_CHOICE'>{copy.typeMultipleChoice}</SelectItem>
                  <SelectItem value='ESSAY'>{copy.typeEssay}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={difficultyFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setDifficultyFilter(value as QuestionDifficulty | 'ALL');
                }}
              >
                <SelectTrigger className='w-[160px]'>
                  <SelectValue placeholder={copy.filterDifficulty} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>{copy.filterAllDifficulties}</SelectItem>
                  <SelectItem value='EASY'>{copy.difficultyEasy}</SelectItem>
                  <SelectItem value='MEDIUM'>{copy.difficultyMedium}</SelectItem>
                  <SelectItem value='HARD'>{copy.difficultyHard}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setCategoryFilter(value);
                }}
              >
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder={copy.filterCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>{copy.filterAllCategories}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.shortId}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[110px]'>{copy.colShortId}</TableHead>
                  <TableHead>{copy.colContent}</TableHead>
                  <TableHead>{copy.colType}</TableHead>
                  <TableHead>{copy.colDifficulty}</TableHead>
                  <TableHead>{copy.colScore}</TableHead>
                  <TableHead>{copy.colCategory}</TableHead>
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
                  items.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <span className='font-mono text-xs font-semibold tracking-wide text-primary'>
                          {question.shortId || '—'}
                        </span>
                      </TableCell>
                      <TableCell className='max-w-md'>
                        <p className='line-clamp-2 font-medium'>{question.content}</p>
                      </TableCell>
                      <TableCell>{typeLabel(question.type)}</TableCell>
                      <TableCell>{difficultyLabel(question.difficulty)}</TableCell>
                      <TableCell>{question.score ?? 1}</TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {categoryLabel(question.categoryId)}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {(question.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant='outline'>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(question.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='inline-flex gap-2'>
                          <Tooltip content={locale === 'en' ? 'Preview' : 'Xem trước'}>
                            <Button
                              size='icon'
                              variant='outline'
                              onClick={() => setPreviewQuestion(question)}
                              aria-label={locale === 'en' ? 'Preview' : 'Xem trước'}
                            >
                              <Eye className='size-4' />
                            </Button>
                          </Tooltip>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => openEdit(question)}
                            aria-label={copy.edit}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void handleDelete(question)}
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
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{editingQuestion ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? copy.editDescription : copy.createDescription}
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={(event) => void submitForm(event)}>
            {/* Tabs Header inside the Dialog */}
            <div className='flex bg-muted/60 p-1 rounded-xl gap-1 mb-5 border border-border/20'>
              <Button
                type='button'
                variant='ghost'
                className={cn(
                  'flex-1 py-2 h-auto rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 shadow-none border-none hover:bg-background/40',
                  formTab === 'content'
                    ? 'bg-background text-[#022648] shadow-sm hover:bg-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setFormTab('content')}
              >
                <FileText className='size-4' />
                {copy.tabQuestionInfo}
              </Button>
              <Button
                type='button'
                variant='ghost'
                className={cn(
                  'flex-1 py-2 h-auto rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 shadow-none border-none hover:bg-background/40',
                  formTab === 'media'
                    ? 'bg-background text-[#022648] shadow-sm hover:bg-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setFormTab('media')}
              >
                <Image className='size-4' />
                {copy.tabMedia}
                {(form.imageUrl || form.audioUrl) && (
                  <Badge variant='secondary' className='px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border-none shrink-0 font-bold'>
                    ✓
                  </Badge>
                )}
              </Button>
            </div>

            {formTab === 'content' && (
              <div className='space-y-4 animate-in fade-in duration-200'>
                {editingQuestion?.shortId ? (
                  <div className='space-y-2'>
                    <Label>{copy.fieldShortId}</Label>
                    <Input value={editingQuestion.shortId} readOnly className='font-mono bg-muted/30' />
                  </div>
                ) : null}

                <div className='space-y-2'>
                  <Label className='font-semibold text-sm text-[#022648]'>{copy.fieldContent}</Label>
                  <Textarea
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    rows={4}
                    required
                    className='focus-visible:ring-primary'
                  />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label className='font-semibold text-xs sm:text-sm text-[#022648]'>{copy.fieldType}</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          type: value as QuestionType,
                          options:
                            value === 'MULTIPLE_CHOICE'
                              ? normalizeQuestionOptions(current.options)
                              : current.options,
                        }))
                      }
                    >
                      <SelectTrigger className='focus:ring-primary'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='MULTIPLE_CHOICE'>{copy.typeMultipleChoice}</SelectItem>
                        <SelectItem value='ESSAY'>{copy.typeEssay}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label className='font-semibold text-xs sm:text-sm text-[#022648]'>{copy.fieldDifficulty}</Label>
                    <Select
                      value={form.difficulty}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, difficulty: value as QuestionDifficulty }))
                      }
                    >
                      <SelectTrigger className='focus:ring-primary'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='EASY'>{copy.difficultyEasy}</SelectItem>
                        <SelectItem value='MEDIUM'>{copy.difficultyMedium}</SelectItem>
                        <SelectItem value='HARD'>{copy.difficultyHard}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2 sm:col-span-2'>
                    <Label className='font-semibold text-xs sm:text-sm text-[#022648]'>{copy.fieldScore}</Label>
                    <Input
                      type='number'
                      min={0.1}
                      step={0.1}
                      value={form.score}
                      onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
                      required
                      className='focus-visible:ring-primary'
                    />
                    <p className='text-xs text-muted-foreground'>{copy.scoreHint}</p>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='font-semibold text-sm text-[#022648]'>{copy.fieldCategory}</Label>
                  <Select
                    value={form.categoryId || 'NONE'}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        categoryId: value === 'NONE' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger className='focus:ring-primary'>
                      <SelectValue placeholder={copy.filterCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='NONE'>{copy.noCategory}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.shortId}>
                          {category.name} ({category.shortId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.type === 'MULTIPLE_CHOICE' ? (
                  <div className='space-y-4 rounded-xl border border-border p-4 bg-muted/10'>
                    <div className='flex items-center justify-between border-b border-border/60 pb-2 mb-2'>
                      <Label className='font-semibold text-sm text-[#022648] flex items-center gap-1.5'>
                        <BookOpen className='size-4 text-primary' />
                        {copy.fieldOptions}
                      </Label>
                    </div>
                    <div className='grid gap-3'>
                      {form.options.map((option) => (
                        <div key={option.key} className='flex items-center gap-2.5'>
                          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-sm font-bold text-[#022648] shadow-sm'>
                            {option.key}
                          </div>
                          <Input
                            value={option.text}
                            onChange={(event) => updateOptionText(option.key, event.target.value)}
                            placeholder={`${copy.optionPlaceholder} ${option.key}`}
                            className='bg-background shadow-none border-border/80 focus-visible:ring-primary'
                          />
                        </div>
                      ))}
                    </div>
                    <div className='space-y-2 pt-2 border-t border-border/60 mt-3'>
                      <Label className='text-xs font-semibold text-muted-foreground'>{copy.fieldCorrectAnswer}</Label>
                      <Select
                        value={form.correctAnswer || undefined}
                        onValueChange={(value) => setForm((current) => ({ ...current, correctAnswer: value }))}
                      >
                        <SelectTrigger className='bg-background border-border/80 shadow-none focus:ring-primary'>
                          <SelectValue placeholder={copy.selectCorrectAnswer} />
                        </SelectTrigger>
                        <SelectContent>
                          {form.options.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              <span className='font-bold mr-1.5'>{option.key}</span>
                              {option.text.trim() ? ` — ${option.text.trim()}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}

                <div className='space-y-2'>
                  <Label className='font-semibold text-sm text-[#022648]'>{copy.fieldExplanation}</Label>
                  <Textarea
                    value={form.explanation}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, explanation: event.target.value }))
                    }
                    rows={3}
                    className='focus-visible:ring-primary'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='font-semibold text-sm text-[#022648]'>{copy.fieldTags}</Label>
                  <Input
                    value={form.tags}
                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                    placeholder={copy.tagsPlaceholder}
                    className='focus-visible:ring-primary'
                  />
                </div>
              </div>
            )}

            {formTab === 'media' && (
              <div className='space-y-6 animate-in fade-in duration-200'>
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                />
                <input
                  type='file'
                  accept='audio/*'
                  className='hidden'
                  ref={audioInputRef}
                  onChange={handleAudioUpload}
                />

                {/* Image Section */}
                <div className='space-y-3 rounded-xl border border-border/80 p-5 bg-background shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <Label className='font-bold text-sm text-[#022648] flex items-center gap-1.5'>
                      <Image className='size-4 text-primary' />
                      {locale === 'en' ? 'Image' : 'Hình ảnh'}
                    </Label>
                    {form.imageUrl ? (
                      <div className='flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          disabled={uploadingImage}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Upload className='mr-1 size-3.5' />
                          {uploadingImage ? copy.uploadingFile : (locale === 'en' ? 'Replace' : 'Đổi ảnh')}
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2'
                          onClick={() => setForm((current) => ({ ...current, imageUrl: '' }))}
                        >
                          <Trash2 className='mr-1 size-3.5' />
                          {locale === 'en' ? 'Remove' : 'Xóa'}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {form.imageUrl ? (
                    <div className='overflow-hidden rounded-xl border border-border bg-black/[0.02] p-3 flex items-center justify-center min-h-[160px] max-h-[300px]'>
                      <img
                        src={form.imageUrl}
                        alt='Uploaded preview'
                        className='max-h-[260px] object-contain rounded-lg'
                      />
                    </div>
                  ) : (
                    <button
                      type='button'
                      disabled={uploadingImage}
                      onClick={() => imageInputRef.current?.click()}
                      className='w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 p-8 text-center text-muted-foreground min-h-[160px] disabled:opacity-60'
                    >
                      <div className='rounded-full bg-primary/5 p-3 mb-2 text-primary'>
                        {uploadingImage ? (
                          <Upload className='size-6 animate-pulse' />
                        ) : (
                          <Image className='size-6' />
                        )}
                      </div>
                      <p className='text-sm font-semibold text-foreground mb-1'>
                        {uploadingImage
                          ? copy.uploadingFile
                          : locale === 'en'
                            ? 'Click to upload image'
                            : 'Nhấp để tải ảnh lên'}
                      </p>
                      <p className='text-xs text-muted-foreground max-w-[280px]'>
                        {locale === 'en'
                          ? 'JPEG, PNG, GIF, WEBP, SVG · max 10MB'
                          : 'JPEG, PNG, GIF, WEBP, SVG · tối đa 10MB'}
                      </p>
                    </button>
                  )}
                </div>

                {/* Audio Section */}
                <div className='space-y-3 rounded-xl border border-border/80 p-5 bg-background shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <Label className='font-bold text-sm text-[#022648] flex items-center gap-1.5'>
                      <Music className='size-4 text-primary' />
                      {locale === 'en' ? 'Audio' : 'Âm thanh'}
                    </Label>
                    {form.audioUrl ? (
                      <div className='flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          disabled={uploadingAudio}
                          onClick={() => audioInputRef.current?.click()}
                        >
                          <Upload className='mr-1 size-3.5' />
                          {uploadingAudio ? copy.uploadingFile : (locale === 'en' ? 'Replace' : 'Đổi audio')}
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2'
                          onClick={() => setForm((current) => ({ ...current, audioUrl: '' }))}
                        >
                          <Trash2 className='mr-1 size-3.5' />
                          {locale === 'en' ? 'Remove' : 'Xóa'}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {form.audioUrl ? (
                    <div className='rounded-xl border border-border bg-black/[0.02] p-4'>
                      <audio controls src={form.audioUrl} className='w-full' />
                    </div>
                  ) : (
                    <button
                      type='button'
                      disabled={uploadingAudio}
                      onClick={() => audioInputRef.current?.click()}
                      className='w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 p-8 text-center text-muted-foreground min-h-[140px] disabled:opacity-60'
                    >
                      <div className='rounded-full bg-primary/5 p-3 mb-2 text-primary'>
                        {uploadingAudio ? (
                          <Upload className='size-6 animate-pulse' />
                        ) : (
                          <Music className='size-6' />
                        )}
                      </div>
                      <p className='text-sm font-semibold text-foreground mb-1'>
                        {uploadingAudio
                          ? copy.uploadingFile
                          : locale === 'en'
                            ? 'Click to upload audio'
                            : 'Nhấp để tải âm thanh lên'}
                      </p>
                      <p className='text-xs text-muted-foreground max-w-[280px]'>
                        {locale === 'en'
                          ? 'MP3, WAV, OGG, M4A, AAC · max 10MB'
                          : 'MP3, WAV, OGG, M4A, AAC · tối đa 10MB'}
                      </p>
                    </button>
                  )}
                </div>
              </div>
            )}

            {formError ? <p className='text-sm text-red-600'>{formError}</p> : null}

            <div className='flex justify-end gap-3 pt-4 border-t border-border/60 mt-6'>
              <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
                {dictionary.profile.cancel}
              </Button>
              <Button type='submit' disabled={saving} className='bg-[#022648] hover:bg-[#022648]/90 text-white'>
                {saving ? dictionary.common.loading : dictionary.common.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-xl font-semibold text-[#022648]'>
              <Eye className='size-5 text-primary' />
              {locale === 'en' ? 'Question Preview' : 'Xem trước câu hỏi'}
            </DialogTitle>
            <DialogDescription>
              {locale === 'en'
                ? 'Below is exactly how this question appears to students during an exam.'
                : 'Dưới đây là giao diện hiển thị thực tế của câu hỏi này đối với học sinh.'}
            </DialogDescription>
          </DialogHeader>

          {previewQuestion ? (
            <div className='mt-4 space-y-6'>
              {/* Question metadata strip similar to student view */}
              <div className='flex items-center justify-between gap-3 border-b border-[#022648]/10 bg-[rgba(2,38,72,0.03)] px-5 py-3 rounded-xl'>
                <div>
                  <p className='text-[10px] font-mono font-medium uppercase tracking-[0.18em] text-[#4a6480]'>
                    {previewQuestion.shortId || 'QUESTION'}
                  </p>
                  <p className='mt-0.5 truncate text-xs text-[#022648]'>
                    {previewQuestion.type === 'MULTIPLE_CHOICE'
                      ? (locale === 'en' ? 'Multiple choice' : 'Trắc nghiệm')
                      : (locale === 'en' ? 'Essay' : 'Tự luận')}
                    <span className='mx-2 text-[#4a6480]'>·</span>
                    {locale === 'en' ? 'Score' : 'Điểm'}: {previewQuestion.score ?? 1}
                    <span className='mx-2 text-[#4a6480]'>·</span>
                    {locale === 'en' ? 'Difficulty' : 'Độ khó'}: {difficultyLabel(previewQuestion.difficulty)}
                  </p>
                </div>
                <Badge variant='outline' className='border-[#022648]/15 bg-white text-[#022648] text-[11px] font-medium'>
                  {locale === 'en' ? 'Student View' : 'Học sinh thấy'}
                </Badge>
              </div>

              {/* Question content */}
              <div className='space-y-4 rounded-2xl border border-[#022648]/10 bg-white p-5 shadow-sm'>
                <p className='whitespace-pre-wrap text-base leading-7 text-[#022648] font-medium'>
                  {previewQuestion.content}
                </p>

                {previewQuestion.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewQuestion.imageUrl}
                    alt=''
                    draggable={false}
                    className='pointer-events-none max-h-80 w-full select-none rounded-xl border border-[#022648]/15 object-contain bg-[#f7efe4]'
                  />
                ) : null}

                {previewQuestion.audioUrl ? (
                  <audio controls className='w-full' src={previewQuestion.audioUrl}>
                    <track kind='captions' />
                  </audio>
                ) : null}

                {/* Options/Answers section */}
                {previewQuestion.type === 'MULTIPLE_CHOICE' ? (
                  <div className='space-y-2.5 pt-2'>
                    {(previewQuestion.options ?? []).map((option) => {
                      const isCorrect = previewQuestion.correctAnswer === option.key;
                      return (
                        <div
                          key={option.key}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border px-4 py-3.5 transition',
                            isCorrect
                              ? 'border-[#022648] bg-[rgba(2,38,72,0.04)] shadow-sm'
                              : 'border-[#022648]/10 bg-white opacity-85',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                              isCorrect
                                ? 'border-[#022648] bg-[#022648] text-white'
                                : 'border-[#022648]/35 text-[#022648]',
                            )}
                          >
                            {option.key}
                          </span>
                          <div className='pt-0.5 flex-1'>
                            <span className='text-[#022648] font-medium'>{option.text}</span>
                            {isCorrect ? (
                              <Badge className='ml-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[10px] h-4 px-1.5 rounded-full'>
                                {locale === 'en' ? 'Correct Answer' : 'Đáp án đúng'}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className='space-y-2 pt-2'>
                    <Label className='text-[#022648] font-semibold'>
                      {locale === 'en' ? 'Student Answer Box' : 'Khung trả lời của học sinh'}
                    </Label>
                    <Textarea
                      rows={4}
                      disabled
                      placeholder={locale === 'en' ? 'Enter essay answer here...' : 'Nhập câu trả lời tự luận tại đây...'}
                      className='border-[#022648]/15 bg-slate-50/50'
                    />
                  </div>
                )}
              </div>

              {/* Correct Explanation / Solution Guideline (visible only in Admin preview mode) */}
              {previewQuestion.explanation || (previewQuestion.type === 'ESSAY' && previewQuestion.correctAnswer) ? (
                <div className='rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-2'>
                  <p className='text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1'>
                    💡 {locale === 'en' ? 'Grading & Explanation' : 'Gợi ý chấm điểm & Giải thích'}
                  </p>
                  {previewQuestion.type === 'ESSAY' && previewQuestion.correctAnswer ? (
                    <div className='text-sm text-[#022648]'>
                      <p className='font-semibold text-amber-900'>{locale === 'en' ? 'Sample Answer:' : 'Đáp án mẫu:'}</p>
                      <p className='whitespace-pre-wrap mt-1 bg-white p-3 rounded-lg border border-amber-200/50'>{previewQuestion.correctAnswer}</p>
                    </div>
                  ) : null}
                  {previewQuestion.explanation ? (
                    <div className='text-sm text-[#022648] pt-1'>
                      <p className='font-semibold text-amber-900'>{locale === 'en' ? 'Explanation:' : 'Giải thích chi tiết:'}</p>
                      <p className='whitespace-pre-wrap mt-1'>{previewQuestion.explanation}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className='mt-6 flex justify-end gap-3 border-t border-border/50 pt-4'>
            <Button type='button' variant='outline' onClick={() => setPreviewQuestion(null)}>
              {locale === 'en' ? 'Close Preview' : 'Đóng xem trước'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      ) : null}
    </div>
  );
}
