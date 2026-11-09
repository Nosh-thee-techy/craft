/**
 * Purpose: Project detail — status, invoices, payments, send-invoice control.
 * Inputs: route param `id` owned by the current user.
 * Outputs: the round-trip UI for one project.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { getProjectForUser, listInvoices, listPayments } from "@/lib/projects/service";
import { SendInvoiceButton } from "@/components/projects/send-invoice-button";
import { StatusPill } from "@/components/brand/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectDetailProps = {
  params: Promise<{ id: string }>;
};

/**
 * Show one project and its PayPal invoice/payment trail.
 */
export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const project = await getProjectForUser(userId, id);
  if (!project) {
    notFound();
  }

  const [invoiceRows, paymentRows] = await Promise.all([
    listInvoices(project.id),
    listPayments(project.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projects"
            className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            All projects
          </Link>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">{project.clientName}</h1>
          <p className="mt-2 text-muted-foreground">{project.clientEmail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/vault">Open vault</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">Back to the ledger</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.22em] text-accent">The brief</p>
            <CardTitle>Work</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-2xl italic text-foreground">
                {project.currency} {project.amount}
              </span>
              <StatusPill status={project.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed">{project.scope}</p>
            <dl className="grid gap-1 text-sm">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trust slug</dt>
              <dd className="font-mono text-xs text-primary">{project.trustSlug}</dd>
            </dl>
            <SendInvoiceButton
              projectId={project.id}
              disabled={
                project.status === "funded" ||
                project.status === "delivered" ||
                project.status === "closed"
              }
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Kenya-based PayPal accounts often cannot create invoices. If send fails, use a US
              sandbox Business app as the merchant and a sandbox Personal buyer to pay.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.22em] text-teal">The trail</p>
            <CardTitle>PayPal</CardTitle>
            <CardDescription>
              Invoices and payments recorded from the sandbox round trip. Nothing here is invented.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Invoices
              </h2>
              {invoiceRows.length === 0 ? (
                <p className="text-muted-foreground">None yet — send one when the brief is ready.</p>
              ) : (
                <ul className="space-y-2">
                  {invoiceRows.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/50 p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {invoice.currency} {invoice.amount}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {invoice.paypalInvoiceId ?? "waiting on PayPal id"}
                        </p>
                      </div>
                      <StatusPill status={invoice.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Payments
              </h2>
              {paymentRows.length === 0 ? (
                <p className="text-muted-foreground">
                  None yet. Paying the invoice as the sandbox buyer should create one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {paymentRows.map((payment) => (
                    <li
                      key={payment.id}
                      className="rounded-2xl border border-teal/25 bg-teal/8 p-4"
                    >
                      <p className="font-medium">
                        {payment.currency} {payment.amount} · {payment.source}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {payment.paypalCaptureId}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
