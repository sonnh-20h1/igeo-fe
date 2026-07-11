'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SUPPORT_EMAIL } from '@/lib/app-config';

type ContactCopy = {
  formName: string;
  formEmail: string;
  formMessage: string;
  formSubmit: string;
  formHint: string;
};

export function HomeContactForm({ copy }: { copy: ContactCopy }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const subject = encodeURIComponent(`GEC contact — ${name || email}`);
    const body = encodeURIComponent(
      [`Name: ${name}`, `Email: ${email}`, '', message].join('\n'),
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={onSubmit} className='space-y-4'>
      <div>
        <label className='mb-1.5 block text-sm font-medium text-[#022648]'>{copy.formName}</label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
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
          className='border-[#022648]/20 bg-white/80'
        />
      </div>
      <div>
        <label className='mb-1.5 block text-sm font-medium text-[#022648]'>{copy.formMessage}</label>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={5}
          className='border-[#022648]/20 bg-white/80'
        />
      </div>
      <Button type='submit' className='bg-[#022648] text-white hover:bg-[#022648]/90'>
        {copy.formSubmit}
      </Button>
      <p className='text-sm text-[#022648]/65'>{copy.formHint}</p>
    </form>
  );
}
