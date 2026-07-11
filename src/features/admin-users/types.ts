import type { AccountResponseDto } from '@/features/auth/types';

export type ManagedUser = AccountResponseDto;

export type UserListResult = {
  pageInfo: {
    page: number;
    size: number;
    total: number;
  };
  items: ManagedUser[];
};

export type ListUsersQuery = {
  page?: number;
  size?: number;
  search?: string;
  className?: string;
  school?: string;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  cccd: string;
  dob: string;
  className: string;
  school: string;
  avatar?: string;
};

export type UpdateUserPayload = {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  cccd?: string;
  dob?: string;
  className?: string;
  school?: string;
  avatar?: string;
  activated?: boolean;
  blocked?: boolean;
};
