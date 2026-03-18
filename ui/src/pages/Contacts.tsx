import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Copy, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { contactsApi } from "../api/contacts";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import type { Contact } from "@paperclipai/shared";

function portalUrl(token: string) {
  return `${window.location.origin}/portal/${token}`;
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "Never";
  const date = new Date(expiresAt);
  const now = new Date();
  if (date < now) return "Expired";
  return date.toLocaleDateString();
}

interface NewContactDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
}

function NewContactDialog({ open, onClose, companyId }: NewContactDialogProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => contactsApi.create(companyId, { name, email: email || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.list(companyId) });
      setName("");
      setEmail("");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Name *</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ContactRowProps {
  contact: Contact;
  companyId: string;
}

function ContactRow({ contact, companyId }: ContactRowProps) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const generateToken = useMutation({
    mutationFn: () => contactsApi.generatePortalToken(contact.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts.list(companyId) }),
  });

  const revokeToken = useMutation({
    mutationFn: () => contactsApi.revokePortalToken(contact.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts.list(companyId) }),
  });

  const deleteContact = useMutation({
    mutationFn: () => contactsApi.delete(contact.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.list(companyId) });
      setConfirmDelete(false);
    },
  });

  const handleCopy = async () => {
    if (!contact.portalToken) return;
    await navigator.clipboard.writeText(portalUrl(contact.portalToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{contact.name}</span>
          {contact.email && (
            <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {contact.portalToken ? (
            <>
              <span className="text-xs text-muted-foreground">
                Expires: {formatExpiry(contact.portalTokenExpiresAt)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleCopy}
                title="Copy portal link"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied && <span className="ml-1 text-xs">Copied!</span>}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => window.open(portalUrl(contact.portalToken!), "_blank")}
                title="Open portal"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                onClick={() => revokeToken.mutate()}
                disabled={revokeToken.isPending}
                title="Revoke token"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => generateToken.mutate()}
              disabled={generateToken.isPending}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Generate Link
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            title="Delete contact"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{contact.name}</strong>? This will revoke their
            portal access permanently.
          </p>
          {deleteContact.error && (
            <p className="text-sm text-destructive">{(deleteContact.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteContact.mutate()}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Contacts() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Contacts" }]);
  }, [setBreadcrumbs]);

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: queryKeys.contacts.list(selectedCompanyId!),
    queryFn: () => contactsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Users} message="Select a company to view contacts." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage client contacts and portal access links.
        </p>
        <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {contacts && contacts.length === 0 && (
        <EmptyState
          icon={Users}
          message="No contacts yet. Add a client to generate a portal link."
          action="Add Contact"
          onAction={() => setNewOpen(true)}
        />
      )}

      {contacts && contacts.length > 0 && (
        <div className="border border-border rounded-sm">
          {contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} companyId={selectedCompanyId} />
          ))}
        </div>
      )}

      <NewContactDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
