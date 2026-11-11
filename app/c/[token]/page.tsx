/**
 * Purpose: Public one-click receipt confirmation. No login required.
 * Inputs: route param `token`.
 * Outputs: confirm view with server-stamped client_confirmed_at.
 */
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/brand/public-chrome";
import { ConfirmButton } from "@/components/delivery/confirm-button";
import { getConfirmView } from "@/lib/delivery/confirm";

type ConfirmPageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Client confirms delivery. Private vault files are never linked here.
 */
export default async function ConfirmReceiptPage({ params }: ConfirmPageProps) {
  const { token } = await params;
  const view = await getConfirmView(token);
  if (!view) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-5 py-12">
      <PublicChrome />
      <section className="glass rounded-[28px] p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">Confirm receipt</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight md:text-5xl">
          {view.creativeName ? `${view.creativeName} delivered work` : "Work was delivered"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          For {view.clientName}. One click records the time you received it.
        </p>
        <p className="mt-6 text-sm leading-relaxed">{view.scope}</p>
        {view.deliveredAt ? (
          <p className="mt-4 text-xs text-muted-foreground">Delivered at {view.deliveredAt}</p>
        ) : null}
        {view.publishLinks.length > 0 ? (
          <ul className="mt-6 space-y-2 text-sm">
            {view.publishLinks.map((link) => (
              <li key={link}>
                <a className="text-primary underline" href={link} rel="noreferrer" target="_blank">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8">
          <ConfirmButton token={token} alreadyConfirmedAt={view.clientConfirmedAt} />
        </div>
      </section>
    </main>
  );
}
