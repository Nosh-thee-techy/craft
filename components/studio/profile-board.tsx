/**
 * Purpose: Layer 1 dashboard — stable profile, work proofs, scan-to-verify, then bill CTA.
 * Inputs: StudioProfile from lib/studio/profile.ts.
 * Outputs: profile-first studio home (not a generic door grid).
 */
import Link from "next/link";
import { Archive, FolderKanban, Shield, Wallet } from "lucide-react";
import type { StudioProfile } from "@/lib/studio/profile";
import { VerifyQr } from "@/components/studio/verify-qr";
import { Button } from "@/components/ui/button";

type ProfileBoardProps = {
  profile: StudioProfile;
};

/**
 * Creative home: verify surface first, money/freeze as secondary rooms.
 */
export function ProfileBoard({ profile }: ProfileBoardProps) {
  const displayName = profile.name?.split(" ")[0] ?? "creative";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-primary/25 bg-gradient-to-br from-primary/18 via-accent/10 to-teal/10 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Layer 1 · Studio profile</p>
            <h2 className="mt-3 font-serif text-3xl italic leading-tight md:text-5xl">
              {displayName}, prove the work first.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">
              Stabilize your profile and Work Proof Tokens (hash-bound certificates). Clients scan to
              verify link ownership and provenance — then you bill, deliver, and collect confirmation.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Wording: verified link ownership and work provenance — never verified identity.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={profile.nextStep.href}>{profile.nextStep.title}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/projects">Bill a client</Link>
              </Button>
              {profile.trustUrl ? (
                <Button asChild variant="ghost">
                  <Link href={profile.trustUrl} target="_blank" rel="noreferrer">
                    Open public verify page
                  </Link>
                </Button>
              ) : null}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{profile.nextStep.body}</p>
          </div>
          {profile.qrDataUrl && profile.trustUrl ? (
            <div className="rounded-[24px] border border-border/50 bg-background/40 p-4 backdrop-blur">
              <VerifyQr dataUrl={profile.qrDataUrl} label="Client scan-to-verify" size={148} />
              <p className="mt-3 max-w-[11rem] break-all font-mono text-[10px] text-muted-foreground">
                {profile.trustUrl}
              </p>
            </div>
          ) : (
            <div className="max-w-xs rounded-[24px] border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              Finish onboarding visibility to mint your public verify QR.
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/onboarding">Open onboarding</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Verified links" value={String(profile.stats.verifiedLinkCount)} />
        <Stat label="Work proofs" value={String(profile.workProofs.length)} />
        <Stat label="Published proofs" value={String(profile.stats.publishedProofCount)} />
        <Stat label="Client confirms" value={String(profile.stats.confirmedCount)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="glass rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Verified link ownership</p>
          <h3 className="mt-2 font-display text-2xl tracking-tight">Stable profile links</h3>
          {profile.verifiedLinks.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No verified links yet. Add GitHub / YouTube / RSS in onboarding and place the challenge code.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {profile.verifiedLinks.map((link) => (
                <li
                  key={`${link.platform}-${link.handle}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="capitalize">{link.platform}</p>
                    <p className="text-xs text-muted-foreground">@{link.handle}</p>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Work Proof Tokens</p>
          <h3 className="mt-2 font-display text-2xl tracking-tight">Hash-bound certificates</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Educational provenance certificates from vault SHA-256 + delivery stamps. Not tradeable
            NFTs and not a promised return — proof of work only.
          </p>
          {profile.workProofs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Deliver a funded project to mint your first Work Proof Token from the file hash.
            </p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {profile.workProofs.slice(0, 8).map((proof) => (
                <li key={proof.id} className="rounded-2xl border border-border/60 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-primary">{proof.proofToken}</span>
                    {proof.clientConfirmed ? (
                      <span className="text-[11px] uppercase tracking-[0.14em] text-teal">
                        Client confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Awaiting confirm
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{proof.clientLabel}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{proof.scope}</p>
                  <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                    sha256:{proof.sha256}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Room href="/projects" icon={FolderKanban} title="Bill a client" copy="Share verify QR, then send the PayPal bill." />
        <Room href="/vault" icon={Archive} title="Vault" copy="Keep contracts, comms, and hashes private." />
        <Room href="/freeze-shield" icon={Shield} title="Freeze Shield" copy="If PayPal holds funds, answer with proofs." />
        <Room href="/money" icon={Wallet} title="Money" copy="Score and plan after the work trail exists." />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[24px] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight">{value}</p>
    </div>
  );
}

function Room({
  href,
  icon: Icon,
  title,
  copy,
}: {
  href: string;
  icon: typeof FolderKanban;
  title: string;
  copy: string;
}) {
  return (
    <Link href={href} className="glass glass-hover group rounded-[28px] p-5">
      <Icon className="mb-4 size-5 text-primary transition group-hover:scale-110" strokeWidth={1.6} />
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </Link>
  );
}
