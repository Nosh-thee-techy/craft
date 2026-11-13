/**
 * Purpose: Create and send a PayPal sandbox invoice from a CRAFT project.
 * Inputs: signed-in user id + project id.
 * Outputs: local invoice row + PayPal invoice id; project status becomes `invoiced`.
 *
 * Confirmed 2026-11-09 against https://developer.paypal.com/api/invoicing :
 * - Create draft: POST /v2/invoicing/invoices
 * - Send: POST /v2/invoicing/invoices/{invoice_id}/send
 * Send body uses send_to_recipient + send_to_invoicer (docs sample).
 */
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, projects, users } from "@/lib/db/schema";
import { paypalFetch, paypalErrorMessage, PayPalApiError } from "@/lib/paypal/client";
import { formatMoney } from "@/lib/projects/service";
import {
  buildSellerLocationSnapshot,
  snapshotToPayPalAddress,
} from "@/lib/readiness/seller-snapshot";

type CreateInvoiceResponse = {
  id?: string;
  href?: string;
  status?: string;
  links?: Array<{ href?: string; rel?: string }>;
};

type SendInvoiceResponse = {
  href?: string;
};

/**
 * Pull INV2-… from a PayPal create response (body.id, href, or links).
 */
function extractInvoiceId(response: CreateInvoiceResponse, locationHeader?: string | null): string | null {
  if (typeof response.id === "string" && response.id.startsWith("INV2-")) {
    return response.id;
  }
  const candidates = [
    response.href,
    locationHeader ?? undefined,
    ...(response.links ?? []).map((link) => link.href),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/INV2-[A-Z0-9-]+/i);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  return null;
}

/**
 * Create a PayPal draft invoice and send it to the project's client email.
 *
 * WHY PayPal-Request-Id = project id: retries must not mint a second draft.
 * If invoicing is disabled for the merchant country (common for Kenya accounts),
 * PayPalApiError 403 is translated into the documented workaround.
 */
export async function createAndSendInvoice(userId: string, projectId: string): Promise<{
  paypalInvoiceId: string;
  invoiceId: string;
}> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== userId) {
    throw new Error("Project not found.");
  }
  if (project.status === "funded" || project.status === "delivered" || project.status === "closed") {
    throw new Error("This project is already funded or closed.");
  }

  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .limit(1);

  if (existing?.paypalInvoiceId && existing.status !== "draft") {
    return { paypalInvoiceId: existing.paypalInvoiceId, invoiceId: existing.id };
  }

  const [owner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const displayName = owner?.legalName || owner?.name || "Creative CRAFT";
  const givenName = displayName.split(" ")[0] ?? "Creative";
  const surname = displayName.split(" ").slice(1).join(" ") || "CRAFT";
  const sellerSnapshot = buildSellerLocationSnapshot({
    legalName: owner?.legalName,
    name: owner?.name,
    country: owner?.country,
    addressEstate: owner?.addressEstate,
    addressRoad: owner?.addressRoad,
    addressBuilding: owner?.addressBuilding,
    addressLandmark: owner?.addressLandmark,
    addressTown: owner?.addressTown,
    addressCounty: owner?.addressCounty,
    plusCode: owner?.plusCode,
  });
  const invoicerAddress = snapshotToPayPalAddress(sellerSnapshot);

  let paypalInvoiceId = existing?.paypalInvoiceId ?? null;

  try {
    if (!paypalInvoiceId) {
      const created = await paypalFetch<CreateInvoiceResponse>("/v2/invoicing/invoices", {
        method: "POST",
        paypalRequestId: `craft-invoice-${project.id}`,
        body: {
          detail: {
            currency_code: project.currency,
            reference: project.id,
            note: project.scope,
            memo: `CRAFT project ${project.id}`,
          },
          invoicer: {
            name: {
              given_name: givenName.slice(0, 140),
              surname: surname.slice(0, 140),
            },
            ...(invoicerAddress ? { address: invoicerAddress } : {}),
          },
          primary_recipients: [
            {
              billing_info: {
                email_address: project.clientEmail,
                name: { full_name: project.clientName.slice(0, 300) },
              },
            },
          ],
          items: [
            {
              name: project.scope.slice(0, 200),
              quantity: "1",
              unit_amount: {
                currency_code: project.currency,
                value: formatMoney(Number(project.amount)),
              },
            },
          ],
        },
      });
      paypalInvoiceId = extractInvoiceId(created);
      if (!paypalInvoiceId) {
        throw new Error("PayPal created an invoice but returned no INV2 id.");
      }
    }

    await paypalFetch<SendInvoiceResponse>(
      `/v2/invoicing/invoices/${paypalInvoiceId}/send`,
      {
        method: "POST",
        body: {
          send_to_recipient: true,
          send_to_invoicer: true,
        },
      },
    );
  } catch (error) {
    throw new Error(paypalErrorMessage(error instanceof PayPalApiError ? error : error));
  }

  const now = new Date();
  let invoiceId = existing?.id;

  if (existing) {
    // seller_location_snapshot is immutable — set only if the draft row has none yet.
    await db
      .update(invoices)
      .set({
        paypalInvoiceId,
        status: "sent",
        sentAt: now,
        updatedAt: now,
        ...(existing.sellerLocationSnapshot
          ? {}
          : { sellerLocationSnapshot: sellerSnapshot }),
      })
      .where(eq(invoices.id, existing.id));
    invoiceId = existing.id;
  } else {
    const [inserted] = await db
      .insert(invoices)
      .values({
        projectId: project.id,
        paypalInvoiceId,
        status: "sent",
        amount: project.amount,
        currency: project.currency,
        sellerLocationSnapshot: sellerSnapshot,
        sentAt: now,
      })
      .returning();
    invoiceId = inserted?.id;
  }

  await db
    .update(projects)
    .set({ status: "invoiced", updatedAt: now })
    .where(eq(projects.id, project.id));

  if (!invoiceId || !paypalInvoiceId) {
    throw new Error("Invoice was sent but not saved locally.");
  }

  return { paypalInvoiceId, invoiceId };
}
