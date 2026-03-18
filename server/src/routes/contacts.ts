import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createContactSchema,
  updateContactSchema,
  generatePortalTokenSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { contactService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

export function contactRoutes(db: Db) {
  const router = Router();
  const svc = contactService(db);

  // List contacts for a company
  router.get("/companies/:companyId/contacts", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.list(companyId);
    res.json(result);
  });

  // Create a contact
  router.post("/companies/:companyId/contacts", validate(createContactSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const contact = await svc.create(companyId, req.body);
    res.status(201).json(contact);
  });

  // Get a specific contact
  router.get("/contacts/:contactId", async (req, res) => {
    const contactId = req.params.contactId as string;
    const contact = await svc.getById(contactId);
    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    assertCompanyAccess(req, contact.companyId);
    res.json(contact);
  });

  // Update a contact
  router.patch("/contacts/:contactId", validate(updateContactSchema), async (req, res) => {
    const contactId = req.params.contactId as string;
    const existing = await svc.getById(contactId);
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const updated = await svc.update(contactId, req.body);
    res.json(updated);
  });

  // Delete a contact
  router.delete("/contacts/:contactId", async (req, res) => {
    const contactId = req.params.contactId as string;
    const existing = await svc.getById(contactId);
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    await svc.delete(contactId);
    res.status(204).send();
  });

  // Generate a portal token for a contact
  router.post("/contacts/:contactId/portal-token", validate(generatePortalTokenSchema), async (req, res) => {
    const contactId = req.params.contactId as string;
    const existing = await svc.getById(contactId);
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const updated = await svc.generatePortalToken(contactId, req.body.expiresInDays ?? 30);
    res.json(updated);
  });

  // Revoke a portal token
  router.delete("/contacts/:contactId/portal-token", async (req, res) => {
    const contactId = req.params.contactId as string;
    const existing = await svc.getById(contactId);
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const updated = await svc.revokePortalToken(contactId);
    res.json(updated);
  });

  // Public portal data endpoint — no auth required, only token
  router.get("/portal/:token", async (req, res) => {
    const token = req.params.token as string;
    const data = await svc.getPortalData(token);
    if (!data) {
      res.status(404).json({ error: "Portal not found or token expired" });
      return;
    }
    res.json(data);
  });

  return router;
}
