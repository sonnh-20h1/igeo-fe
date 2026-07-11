'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotificationVariant = 'success' | 'error' | 'info';

type NotificationItem = {
  id: string;
  title?: string;
  message: string;
  variant: NotificationVariant;
};

type NotifyInput = {
  title?: string;
  message: string;
  variant?: NotificationVariant;
  durationMs?: number;
};

type NotificationContextValue = {
  notify: (input: NotifyInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

function createNotificationId() {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function NotificationIcon({ variant }: { variant: NotificationVariant }) {
  if (variant === 'success') return <CheckCircle2 className='size-5 text-emerald-600' />;
  if (variant === 'error') return <AlertTriangle className='size-5 text-destructive' />;
  return <Info className='size-5 text-primary' />;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const timersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = React.useCallback(
    ({ title, message, variant = 'info', durationMs = 4200 }: NotifyInput) => {
      if (!message.trim()) return;
      const id = createNotificationId();
      setItems((current) => [...current, { id, title, message, variant }].slice(-4));
      const timer = setTimeout(() => remove(id), durationMs);
      timersRef.current.set(id, timer);
    },
    [remove],
  );

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = React.useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (message, title) => notify({ message, title, variant: 'success' }),
      error: (message, title) => notify({ message, title, variant: 'error', durationMs: 6200 }),
      info: (message, title) => notify({ message, title, variant: 'info' }),
    }),
    [notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6'>
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto rounded-lg border bg-card p-4 shadow-xl',
              item.variant === 'success' && 'border-emerald-200',
              item.variant === 'error' && 'border-destructive/30',
              item.variant === 'info' && 'border-primary/20',
            )}
            role='status'
          >
            <div className='flex items-start gap-3'>
              <NotificationIcon variant={item.variant} />
              <div className='min-w-0 flex-1'>
                {item.title ? <p className='font-semibold'>{item.title}</p> : null}
                <p className='text-sm leading-6 text-muted-foreground'>{item.message}</p>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='-mr-2 -mt-2 size-8 shrink-0'
                onClick={() => remove(item.id)}
              >
                <X className='size-4' />
                <span className='sr-only'>Dismiss notification</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
