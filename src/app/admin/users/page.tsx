'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminUsersApi } from '@/features/admin-users/api';
import type { CreateUserPayload, ManagedUser, UpdateUserPayload } from '@/features/admin-users/types';
import { formatDob } from '@/features/auth/types';
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
import { useNotification } from '@/components/ui/notification';

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type UserFormState = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  cccd: string;
  dob: string;
  className: string;
  school: string;
  activated: boolean;
  blocked: boolean;
};

const emptyForm = (): UserFormState => ({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  cccd: '',
  dob: '',
  className: '',
  school: '',
  activated: true,
  blocked: false,
});

function toForm(user: ManagedUser): UserFormState {
  return {
    email: user.email ?? '',
    password: '',
    fullName: user.fullName ?? '',
    phone: user.phone ?? '',
    cccd: user.cccd ?? '',
    dob: formatDob(user.dob) ?? '',
    className: user.className ?? '',
    school: user.school ?? '',
    activated: user.activated ?? true,
    blocked: user.blocked ?? false,
  };
}

export default function AdminUsersPage() {
  const { dictionary, locale } = useI18n();
  const { success, error: notifyError } = useNotification();
  const copy = dictionary.adminUsers;

  const [items, setItems] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });

      try {
        const result = await adminUsersApi.list({
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

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notifyError, page, pageSize, reloadKey, search]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setForm(toForm(user));
    setFormError(null);
    setDialogOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.email.trim() || !form.fullName.trim() || !form.phone.trim() || !form.cccd.trim()) {
      setFormError(copy.requiredFields);
      return;
    }
    if (!form.dob || !form.className.trim() || !form.school.trim()) {
      setFormError(copy.requiredFields);
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setFormError(copy.passwordRequired);
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cccd: form.cccd.trim(),
          dob: form.dob,
          className: form.className.trim(),
          school: form.school.trim(),
          activated: form.activated,
          blocked: form.blocked,
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        await adminUsersApi.update(editingUser.id, payload);
        success(copy.updated);
      } else {
        const payload: CreateUserPayload = {
          email: form.email.trim().toLowerCase(),
          password: form.password.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cccd: form.cccd.trim(),
          dob: form.dob,
          className: form.className.trim(),
          school: form.school.trim(),
        };
        await adminUsersApi.create(payload);
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

  async function handleDelete(user: ManagedUser) {
    const confirmed = window.confirm(
      copy.deleteConfirm.replace('{name}', user.fullName || user.email || ''),
    );
    if (!confirmed) return;

    try {
      await adminUsersApi.remove(user.id);
      success(copy.deleted);
      refresh();
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
        <Button onClick={openCreate} className='gap-2'>
          <Plus className='size-4' />
          {copy.create}
        </Button>
      </div>

      <Card>
        <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>{copy.listTitle}</CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
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
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colName}</TableHead>
                  <TableHead>{copy.colEmail}</TableHead>
                  <TableHead>{copy.colPhone}</TableHead>
                  <TableHead>{copy.colClass}</TableHead>
                  <TableHead>{copy.colSchool}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colCreatedAt}</TableHead>
                  <TableHead className='text-right'>{copy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-10 text-center text-muted-foreground'>
                      {copy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className='font-medium'>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.className}</TableCell>
                      <TableCell>{user.school}</TableCell>
                      <TableCell>
                        {user.blocked
                          ? copy.statusBlocked
                          : user.activated
                            ? copy.statusActive
                            : copy.statusInactive}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(user.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='inline-flex gap-2'>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => openEdit(user)}
                            aria-label={copy.edit}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => void handleDelete(user)}
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
            <DialogTitle>{editingUser ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>
              {editingUser ? copy.editDescription : copy.createDescription}
            </DialogDescription>
          </DialogHeader>

          <form className='space-y-4' onSubmit={(event) => void submitForm(event)}>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2 sm:col-span-2'>
                <Label>{dictionary.common.email}</Label>
                <Input
                  type='email'
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <Label>
                  {dictionary.common.password}
                  {editingUser ? ` (${copy.passwordOptional})` : ''}
                </Label>
                <Input
                  type='password'
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  minLength={editingUser ? undefined : 4}
                  required={!editingUser}
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.common.name}</Label>
                <Input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.profile.phone}</Label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.profile.cccd}</Label>
                <Input
                  value={form.cccd}
                  onChange={(event) => setForm((current) => ({ ...current, cccd: event.target.value }))}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.profile.dob}</Label>
                <Input
                  type='date'
                  value={form.dob}
                  onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.profile.className}</Label>
                <Input
                  value={form.className}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, className: event.target.value }))
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>{dictionary.profile.school}</Label>
                <Input
                  value={form.school}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, school: event.target.value }))
                  }
                  required
                />
              </div>
              {editingUser ? (
                <>
                  <label className='flex items-center gap-2 text-sm'>
                    <input
                      type='checkbox'
                      checked={form.activated}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, activated: event.target.checked }))
                      }
                    />
                    {copy.activated}
                  </label>
                  <label className='flex items-center gap-2 text-sm'>
                    <input
                      type='checkbox'
                      checked={form.blocked}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, blocked: event.target.checked }))
                      }
                    />
                    {copy.blocked}
                  </label>
                </>
              ) : null}
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
