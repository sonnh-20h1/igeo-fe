'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import type { User } from '@/features/auth/types';
import { isAdminRole } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/provider';

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  cccd: string;
  dob: string;
  className: string;
  school: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfilePage() {
  const { user, updateProfile, changePassword, signing } = useAuth();
  if (!user) {
    return null;
  }

  return (
    <ProfilePageContent
      user={user}
      updateProfile={updateProfile}
      changePassword={changePassword}
      signing={signing}
    />
  );
}

type ProfilePageContentProps = {
  user: User;
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
  changePassword: ReturnType<typeof useAuth>['changePassword'];
  signing: boolean;
};

function ProfilePageContent({
  user,
  updateProfile,
  changePassword,
  signing,
}: ProfilePageContentProps) {
  const { dictionary } = useI18n();
  const isAdmin = isAdminRole(user.role);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const roleLabel = isAdmin ? dictionary.common.admin : dictionary.common.user;
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: user.fullName ?? user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    cccd: user.cccd ?? '',
    dob: user.dob ?? '',
    className: user.className ?? '',
    school: user.school ?? '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  async function submitProfile() {
    if (!profileForm.name.trim()) {
      setFeedback(dictionary.profile.requiredName);
      return;
    }

    setFeedback(null);
    try {
      await updateProfile({
        fullName: profileForm.name.trim(),
        phone: profileForm.phone.trim() || undefined,
        cccd: profileForm.cccd.trim() || undefined,
        dob: profileForm.dob || undefined,
        className: profileForm.className.trim() || undefined,
        school: profileForm.school.trim() || undefined,
      });
      setFeedback(dictionary.profile.updatedProfile);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : dictionary.profile.cannotUpdate);
    }
  }

  async function submitPassword() {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) {
      setPasswordFeedback(dictionary.profile.requiredPassword);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback(dictionary.profile.passwordMin);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback(dictionary.profile.passwordMismatch);
      return;
    }

    setPasswordFeedback(null);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
      setPasswordFeedback(dictionary.profile.updatedPassword);
    } catch (error) {
      setPasswordFeedback(
        error instanceof Error ? error.message : dictionary.profile.cannotChangePassword,
      );
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>
          {dictionary.profile.eyebrow}
        </p>
        <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{dictionary.profile.title}</h1>
        <p className='mt-2 max-w-2xl text-muted-foreground'>
          {isAdmin ? dictionary.profile.adminReadOnly : dictionary.profile.description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dictionary.profile.basicTitle}</CardTitle>
          <CardDescription>{dictionary.profile.basicDescription}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {feedback ? <p className='text-sm text-primary'>{feedback}</p> : null}
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>{dictionary.common.role}</Label>
              <Input value={roleLabel} readOnly disabled />
            </div>
            <div className='space-y-2'>
              <Label>{dictionary.common.name}</Label>
              <Input
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
                readOnly={isAdmin}
                disabled={isAdmin}
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label>{dictionary.profile.loginEmail}</Label>
              <Input value={profileForm.email} readOnly disabled />
            </div>
            <div className='space-y-2'>
              <Label>{dictionary.profile.phone}</Label>
              <Input
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
                readOnly={isAdmin}
                disabled={isAdmin}
              />
            </div>
            {!isAdmin ? (
              <>
                <div className='space-y-2'>
                  <Label>{dictionary.profile.cccd}</Label>
                  <Input
                    value={profileForm.cccd}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, cccd: event.target.value }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label>{dictionary.profile.dob}</Label>
                  <Input
                    type='date'
                    value={profileForm.dob}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, dob: event.target.value }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label>{dictionary.profile.className}</Label>
                  <Input
                    value={profileForm.className}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, className: event.target.value }))
                    }
                  />
                </div>
                <div className='space-y-2 md:col-span-2'>
                  <Label>{dictionary.profile.school}</Label>
                  <Input
                    value={profileForm.school}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, school: event.target.value }))
                    }
                  />
                </div>
              </>
            ) : null}
          </div>
          {!isAdmin ? (
            <div className='flex justify-end'>
              <Button disabled={signing} onClick={() => void submitProfile()}>
                {signing ? dictionary.profile.saving : dictionary.profile.saveInfo}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.profile.passwordTitle}</CardTitle>
            <CardDescription>{dictionary.profile.passwordDescription}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {passwordFeedback ? <p className='text-sm text-primary'>{passwordFeedback}</p> : null}
            {!showPasswordForm ? (
              <div className='flex justify-start'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setPasswordFeedback(null);
                    setShowPasswordForm(true);
                  }}
                >
                  {dictionary.profile.changePassword}
                </Button>
              </div>
            ) : (
              <>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2 md:col-span-2'>
                    <Label>{dictionary.profile.currentPassword}</Label>
                    <Input
                      type='password'
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>{dictionary.profile.newPassword}</Label>
                    <Input
                      type='password'
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>{dictionary.profile.confirmPassword}</Label>
                    <Input
                      type='password'
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className='flex justify-end gap-3'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordFeedback(null);
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                  >
                    {dictionary.profile.cancel}
                  </Button>
                  <Button disabled={signing} onClick={() => void submitPassword()}>
                    {signing ? dictionary.profile.saving : dictionary.profile.updatePassword}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
