'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { adminExamAttemptsApi } from '@/features/admin-exam-attempts/api';
import type { ExamAttemptStatus, ExamAttemptSummary } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

export default function AdminExamAttemptsPage() {
  const { dictionary } = useI18n();
  const copy = dictionary.adminExamAttempts;
  const { error: notifyError } = useNotification();

  const [items, setItems] = useState<ExamAttemptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ExamAttemptStatus | 'ALL'>('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await adminExamAttemptsApi.list({
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
              <ClipboardCheck className='size-5 text-primary' />
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
              <SelectItem value='PENDING_REVIEW'>{copy.statusPendingReview}</SelectItem>
              <SelectItem value='GRADED'>{copy.statusGraded}</SelectItem>
              <SelectItem value='SUBMITTED'>{copy.statusSubmitted}</SelectItem>
              <SelectItem value='IN_PROGRESS'>{copy.statusInProgress}</SelectItem>
              <SelectItem value='EXPIRED'>{copy.statusExpired}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className='space-y-4'>
          {loading ? (
            <p className='py-10 text-center text-muted-foreground'>{dictionary.common.loading}</p>
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
                      <p className='font-mono text-sm font-semibold text-primary'>{attempt.shortId}</p>
                      <Badge variant='outline'>{statusLabel(attempt.status)}</Badge>
                    </div>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {copy.examCode}: {attempt.examId}
                    </p>
                    <p className='mt-1 text-sm'>
                      {copy.scoreLabel
                        .replace('{total}', String(attempt.totalScore))
                        .replace('{max}', String(attempt.maxScore))}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/admin/exam-attempts/${attempt.id}`}>{copy.review}</Link>
                  </Button>
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
    </div>
  );
}
