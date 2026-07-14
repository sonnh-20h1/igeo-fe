'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { Mail, Search, Trash2 } from 'lucide-react';
import { adminContactsApi } from '@/features/admin-contacts/api';
import type { Contact, ContactStatus } from '@/features/admin-contacts/types';
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
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNotification } from '@/components/ui/notification';

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function previewContent(content: string, max = 80) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

export default function AdminContactsPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminContacts;
  const { error: notifyError, success } = useNotification();

  const [items, setItems] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

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
        const result = await adminContactsApi.list({
          page,
          size: pageSize,
          search: search || undefined,
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
  }, [copy.loadFailed, notifyError, page, pageSize, reloadKey, search, statusFilter]);

  function statusLabel(status: ContactStatus) {
    if (status === 'NEW') return copy.statusNew;
    if (status === 'READ') return copy.statusRead;
    return copy.statusResolved;
  }

  async function openDetail(contact: Contact) {
    setSelected(contact);
    if (contact.status !== 'NEW') return;
    try {
      const updated = await adminContactsApi.update(contact.id, { status: 'READ' });
      setSelected(updated);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      // Keep dialog open even if auto-mark fails.
    }
  }

  async function updateStatus(status: ContactStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await adminContactsApi.update(selected.id, { status });
      setSelected(updated);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      success(copy.statusUpdated);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.updateFailed, copy.updateFailed);
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(contact: Contact) {
    const confirmed = window.confirm(copy.deleteConfirm.replace('{name}', contact.fullName));
    if (!confirmed) return;
    try {
      await adminContactsApi.delete(contact.id);
      if (selected?.id === contact.id) setSelected(null);
      success(copy.deleted);
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.deleteFailed, copy.deleteFailed);
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
        <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
        <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
      </div>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='size-5 text-primary' />
              {copy.listTitle}
            </CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
            <form
              className='flex flex-1 gap-2 sm:max-w-sm'
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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as ContactStatus | 'ALL');
              }}
            >
              <SelectTrigger className='w-[220px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
                <SelectItem value='NEW'>{copy.statusNew}</SelectItem>
                <SelectItem value='READ'>{copy.statusRead}</SelectItem>
                <SelectItem value='RESOLVED'>{copy.statusResolved}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colName}</TableHead>
                  <TableHead>{copy.colEmail}</TableHead>
                  <TableHead>{copy.colContent}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colCreatedAt}</TableHead>
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
                  items.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className='font-medium'>{contact.fullName}</TableCell>
                      <TableCell className='text-sm text-muted-foreground'>{contact.email}</TableCell>
                      <TableCell className='max-w-xs text-sm text-muted-foreground'>
                        {previewContent(contact.content)}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{statusLabel(contact.status)}</Badge>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(contact.createdDate, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button size='sm' variant='outline' onClick={() => void openDetail(contact)}>
                            {copy.view}
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => void removeContact(contact)}
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{copy.detailTitle}</DialogTitle>
            <DialogDescription>{copy.detailDescription}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className='space-y-4'>
              <div className='space-y-1'>
                <Label className='text-muted-foreground'>{copy.colName}</Label>
                <p className='font-medium'>{selected.fullName}</p>
              </div>
              <div className='space-y-1'>
                <Label className='text-muted-foreground'>{copy.colEmail}</Label>
                <a
                  href={`mailto:${selected.email}`}
                  className='block font-medium text-primary underline-offset-4 hover:underline'
                >
                  {selected.email}
                </a>
              </div>
              <div className='space-y-1'>
                <Label className='text-muted-foreground'>{copy.colCreatedAt}</Label>
                <p className='text-sm'>{formatDateTime(selected.createdDate, locale)}</p>
              </div>
              <div className='space-y-1'>
                <Label className='text-muted-foreground'>{copy.colStatus}</Label>
                <Select
                  value={selected.status}
                  disabled={saving}
                  onValueChange={(value) => void updateStatus(value as ContactStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NEW'>{copy.statusNew}</SelectItem>
                    <SelectItem value='READ'>{copy.statusRead}</SelectItem>
                    <SelectItem value='RESOLVED'>{copy.statusResolved}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1'>
                <Label className='text-muted-foreground'>{copy.colContent}</Label>
                <p className='whitespace-pre-wrap rounded-md border border-border/70 bg-muted/30 p-3 text-sm leading-relaxed'>
                  {selected.content}
                </p>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' className='gap-2' onClick={() => void removeContact(selected)}>
                  <Trash2 className='size-4' />
                  {copy.delete}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
