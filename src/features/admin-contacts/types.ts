export type ContactStatus = 'NEW' | 'READ' | 'RESOLVED';

export type Contact = {
  id: string;
  fullName: string;
  email: string;
  content: string;
  status: ContactStatus;
  createdDate: string | Date;
  updatedDate: string | Date;
};

export type ContactListResult = {
  pageInfo: {
    page: number;
    size: number;
    total: number;
  };
  items: Contact[];
};

export type ListContactsQuery = {
  page?: number;
  size?: number;
  search?: string;
  status?: ContactStatus;
};

export type CreateContactPayload = {
  fullName: string;
  email: string;
  content: string;
};

export type UpdateContactPayload = {
  status?: ContactStatus;
};
