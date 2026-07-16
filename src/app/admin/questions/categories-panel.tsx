'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/ui/notification';

type CategoryFormState = {
  name: string;
  description: string;
};

const emptyForm = (): CategoryFormState => ({
  name: '',
  description: '',
});

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function CategoriesPanel() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminCategories;
  const { success, error: notifyError } = useNotification();

  const [items, setItems] = useState<QuestionCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await adminCategoriesApi.list({
          page,
          size: pageSize,
          search: search.trim() || undefined,
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
  }, [copy.loadFailed, notifyError, page, pageSize, reloadKey, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(category: QuestionCategory) {
    setEditing(category);
    setForm({
      name: category.name ?? '',
      description: category.description ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError(copy.requiredName);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await adminCategoriesApi.update(editing.id, {
          name,
          description: form.description.trim() ? form.description.trim() : null,
        });
        success(copy.updated);
      } else {
        await adminCategoriesApi.create({
          name,
          description: form.description.trim() || undefined,
        });
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

  async function handleDelete(category: QuestionCategory) {
    const confirmed = window.confirm(copy.deleteConfirm.replace('{name}', category.name));
    if (!confirmed) return;
    try {
      await adminCategoriesApi.remove(category.id);
      success(copy.deleted);
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.deleteFailed, copy.deleteFailed);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-end'>
        <Button type='button' className='gap-2' onClick={openCreate}>
          <Plus className='size-4' />
          {copy.create}
        </Button>
      </div>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <FolderOpen className='size-5 text-primary' />
              {copy.listTitle}
            </CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
          <form
            className='flex flex-1 gap-2 sm:max-w-md'
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className='flex-1'
            />
            <Button type='submit' variant='outline' className='gap-2'>
              <Search className='size-4' />
              {copy.search}
            </Button>
          </form>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colShortId}</TableHead>
                  <TableHead>{copy.colName}</TableHead>
                  <TableHead>{copy.colDescription}</TableHead>
                  <TableHead>{copy.colCreatedAt}</TableHead>
                  <TableHead className='text-right'>{copy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10 text-center text-muted-foreground'>
                      {copy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <span className='font-mono text-sm font-semibold text-primary'>
                          {category.shortId}
                        </span>
                      </TableCell>
                      <TableCell className='font-medium'>{category.name}</TableCell>
                      <TableCell className='max-w-xs text-sm text-muted-foreground'>
                        {category.description?.trim() || '—'}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(category.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='gap-1'
                            onClick={() => openEdit(category)}
                          >
                            <Pencil className='size-3.5' />
                            {copy.edit}
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className='gap-1 text-destructive'
                            onClick={() => void handleDelete(category)}
                          >
                            <Trash2 className='size-3.5' />
                            {copy.delete}
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
            {editing ? (
              <div className='space-y-1'>
                <Label className='text-foreground/55'>{copy.fieldShortId}</Label>
                <Input value={editing.shortId} readOnly disabled />
              </div>
            ) : null}
            <div className='space-y-1'>
              <Label htmlFor='categoryName'>{copy.fieldName}</Label>
              <Input
                id='categoryName'
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='categoryDescription'>{copy.fieldDescription}</Label>
              <Textarea
                id='categoryDescription'
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={copy.descriptionPlaceholder}
              />
            </div>
            {formError ? <p className='text-sm text-destructive'>{formError}</p> : null}
            <Button type='submit' className='w-full' disabled={saving}>
              {saving ? dictionary.common.loading : editing ? copy.save : copy.create}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
