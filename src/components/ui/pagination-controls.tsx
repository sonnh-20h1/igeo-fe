'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/features/i18n/provider';
import { formatMessage } from '@/features/i18n/format';

type PaginationControlsProps = {
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems: number;
};

export function PaginationControls({
  currentPage,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  totalItems,
}: PaginationControlsProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.common;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const start = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const end = Math.min(safeCurrentPage * pageSize, totalItems);

  const summary =
    totalItems === 0
      ? formatMessage(copy.paginationEmpty, { itemLabel })
      : formatMessage(copy.paginationShowing, {
          start,
          end,
          total: totalItems,
          itemLabel,
        });

  return (
    <div className='flex flex-col gap-3 border-t border-border/70 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between'>
      <div className='text-muted-foreground'>{summary}</div>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>{copy.paginationPerPage}</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className='w-[88px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
          >
            {copy.paginationPrevious}
          </Button>
          <span className='min-w-[88px] text-center text-muted-foreground'>
            {formatMessage(copy.paginationPage, {
              current: safeCurrentPage,
              total: totalPages,
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
          >
            {copy.paginationNext}
          </Button>
        </div>
      </div>
    </div>
  );
}
