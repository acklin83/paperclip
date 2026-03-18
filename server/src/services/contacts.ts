import { randomBytes } from "node:crypto";
import { and, eq, isNull, or, gte } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { contacts, issues, projects } from "@paperclipai/db";
import type { PortalData } from "@paperclipai/shared";
import { notFound } from "../errors.js";

function mapContact(row: typeof contacts.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    email: row.email,
    portalToken: row.portalToken,
    portalTokenExpiresAt: row.portalTokenExpiresAt ? row.portalTokenExpiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function contactService(db: Db) {
  return {
    list: async (companyId: string) => {
      const rows = await db
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, companyId))
        .orderBy(contacts.createdAt);
      return rows.map(mapContact);
    },

    getById: async (id: string) => {
      const row = await db.select().from(contacts).where(eq(contacts.id, id)).then((r) => r[0] ?? null);
      return row ? mapContact(row) : null;
    },

    getByToken: async (token: string) => {
      const now = new Date();
      const row = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.portalToken, token),
            or(isNull(contacts.portalTokenExpiresAt), gte(contacts.portalTokenExpiresAt, now)),
          ),
        )
        .then((r) => r[0] ?? null);
      return row ? mapContact(row) : null;
    },

    create: async (companyId: string, data: { name: string; email?: string | null }) => {
      const [row] = await db
        .insert(contacts)
        .values({
          companyId,
          name: data.name,
          email: data.email ?? null,
        })
        .returning();
      return mapContact(row);
    },

    update: async (id: string, data: { name?: string; email?: string | null }) => {
      const [row] = await db
        .update(contacts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(contacts.id, id))
        .returning();
      if (!row) throw notFound("Contact not found");
      return mapContact(row);
    },

    delete: async (id: string) => {
      await db.delete(contacts).where(eq(contacts.id, id));
    },

    generatePortalToken: async (id: string, expiresInDays: number) => {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const [row] = await db
        .update(contacts)
        .set({ portalToken: token, portalTokenExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(contacts.id, id))
        .returning();
      if (!row) throw notFound("Contact not found");
      return mapContact(row);
    },

    revokePortalToken: async (id: string) => {
      const [row] = await db
        .update(contacts)
        .set({ portalToken: null, portalTokenExpiresAt: null, updatedAt: new Date() })
        .where(eq(contacts.id, id))
        .returning();
      if (!row) throw notFound("Contact not found");
      return mapContact(row);
    },

    getPortalData: async (token: string): Promise<PortalData | null> => {
      const now = new Date();
      const contactRow = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.portalToken, token),
            or(isNull(contacts.portalTokenExpiresAt), gte(contacts.portalTokenExpiresAt, now)),
          ),
        )
        .then((r) => r[0] ?? null);

      if (!contactRow) return null;

      // Fetch all issues for this company (visible to client)
      const issueRows = await db
        .select({
          id: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          description: issues.description,
          status: issues.status,
          priority: issues.priority,
          projectId: issues.projectId,
          createdAt: issues.createdAt,
          updatedAt: issues.updatedAt,
        })
        .from(issues)
        .where(and(eq(issues.companyId, contactRow.companyId), isNull(issues.hiddenAt)));

      // Fetch projects
      const projectRows = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          color: projects.color,
        })
        .from(projects)
        .where(eq(projects.companyId, contactRow.companyId));

      const projectMap = new Map(projectRows.map((p) => [p.id, p]));

      return {
        contact: {
          id: contactRow.id,
          name: contactRow.name,
          email: contactRow.email,
        },
        issues: issueRows.map((issue) => ({
          id: issue.id,
          identifier: issue.identifier ?? "",
          title: issue.title,
          description: issue.description,
          status: issue.status,
          priority: issue.priority,
          projectId: issue.projectId,
          projectName: issue.projectId ? (projectMap.get(issue.projectId)?.name ?? null) : null,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
        })),
        projects: projectRows.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          color: p.color,
        })),
      };
    },
  };
}
