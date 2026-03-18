import type { Contact, PortalData } from "@paperclipai/shared";
import { api } from "./client";

export const contactsApi = {
  list: (companyId: string) => api.get<Contact[]>(`/companies/${companyId}/contacts`),

  get: (id: string) => api.get<Contact>(`/contacts/${id}`),

  create: (companyId: string, data: { name: string; email?: string | null }) =>
    api.post<Contact>(`/companies/${companyId}/contacts`, data),

  update: (id: string, data: { name?: string; email?: string | null }) =>
    api.patch<Contact>(`/contacts/${id}`, data),

  delete: (id: string) => api.delete<void>(`/contacts/${id}`),

  generatePortalToken: (id: string, expiresInDays: number = 30) =>
    api.post<Contact>(`/contacts/${id}/portal-token`, { expiresInDays }),

  revokePortalToken: (id: string) => api.delete<Contact>(`/contacts/${id}/portal-token`),

  getPortalData: (token: string) => api.get<PortalData>(`/portal/${token}`),
};
