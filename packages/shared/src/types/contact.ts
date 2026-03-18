export interface Contact {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  portalToken: string | null;
  portalTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalData {
  contact: Pick<Contact, "id" | "name" | "email">;
  issues: PortalIssue[];
  projects: PortalProject[];
}

export interface PortalIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
}
