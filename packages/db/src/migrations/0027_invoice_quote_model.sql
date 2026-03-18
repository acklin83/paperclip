CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid,
	"invoice_type" text NOT NULL DEFAULT 'invoice',
	"status" text NOT NULL DEFAULT 'draft',
	"invoice_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"line_items" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"subtotal_cents" integer NOT NULL DEFAULT 0,
	"vat_rate_bps" integer NOT NULL DEFAULT 810,
	"vat_amount_cents" integer NOT NULL DEFAULT 0,
	"total_cents" integer NOT NULL DEFAULT 0,
	"portal_token" text,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_company_idx" ON "invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "invoices_contact_idx" ON "invoices" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "invoices_company_status_idx" ON "invoices" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_unique_idx" ON "invoices" USING btree ("company_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_portal_token_idx" ON "invoices" USING btree ("portal_token");
