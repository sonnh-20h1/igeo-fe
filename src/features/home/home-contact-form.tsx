'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { publicContactsApi } from '@/features/admin-contacts/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/ui/notification';

type ContactCopy = {
  formName: string;
  formEmail: string;
  formMessage: string;
  formSubmit: string;
  formHint: string;
  formSuccessTitle: string;
  formSuccess: string;
  formSuccessClose: string;
  formFailed: string;
  formSubmitting: string;
};

export function HomeContactForm({ copy }: { copy: ContactCopy }) {
  const { error: notifyError } = useNotification();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await publicContactsApi.submit({
        fullName: name,
        email,
        content: message,
      });
      setName('');
      setEmail('');
      setMessage('');
      setSuccessOpen(true);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.formFailed, copy.formFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)} className='space-y-4'>
        <div>
          <label className='mb-1.5 block text-sm font-medium text-[#022648]'>{copy.formName}</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={200}
            disabled={submitting}
            className='border-[#022648]/20 bg-white/80'
          />
        </div>
        <div>
          <label className='mb-1.5 block text-sm font-medium text-[#022648]'>{copy.formEmail}</label>
          <Input
            type='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={submitting}
            className='border-[#022648]/20 bg-white/80'
          />
        </div>
        <div>
          <label className='mb-1.5 block text-sm font-medium text-[#022648]'>{copy.formMessage}</label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            minLength={5}
            maxLength={5000}
            rows={5}
            disabled={submitting}
            className='border-[#022648]/20 bg-white/80'
          />
        </div>
        <Button
          type='submit'
          disabled={submitting}
          className='bg-[#022648] text-white hover:bg-[#022648]/90'
        >
          {submitting ? copy.formSubmitting : copy.formSubmit}
        </Button>
        <p className='text-sm text-[#022648]/65'>{copy.formHint}</p>
      </form>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className='border-[#022648]/15 sm:max-w-md'>
          <DialogHeader className='items-center text-center'>
            <div className='mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[#022648]/8 text-[#022648]'>
              <CheckCircle2 className='size-7' />
            </div>
            <DialogTitle className='text-[#022648]'>{copy.formSuccessTitle}</DialogTitle>
            <DialogDescription className='text-[#022648]/75'>{copy.formSuccess}</DialogDescription>
          </DialogHeader>
          <Button
            type='button'
            className='w-full bg-[#022648] text-white hover:bg-[#022648]/90'
            onClick={() => setSuccessOpen(false)}
          >
            {copy.formSuccessClose}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
