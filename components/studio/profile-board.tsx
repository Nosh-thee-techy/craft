/**
 * Purpose: Calm studio home — one next step, verify QR, three clear doors.
 * Inputs: StudioProfile from lib/studio/profile.ts.
 * Outputs: short hero + primary CTAs. No Layer essays on first paint.
 */
import Link from "next/link";
import { Archive, FolderKanban, Wallet } from "lucide-react";
import type { StudioProfile } from "@/lib/studio/profile";
import { VerifyQr } from "@/components/studio/verify-qr";
import { Button } from "@/components/ui/button";

type ProfileBoardProps = {
  profile: StudioProfile;
};

/**
 * Creative home after login — prove, then bill. Keep copy short.
 */
export function ProfileBoard({ profile }: ProfileBoardProps) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/14 via-transparent to-teal/10 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Do this next</p>
            <h2 className="mt-2 font-serif text-3xl italic leading-tight md:text-4xl">
              {profile.nextStep.title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{profile.nextStep.body}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={profile.nextStep.href}>{profile.nextStep.title}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/projects">Bill a client</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {profile.stats.verifiedLinkCount} verified links · {profile.workProofs.length} work
              proofs
            </p>
          </div>

          {profile.qrDataUrl && profile.trustUrl ? (
            <div className="rounded-[24px] border border-border/50 bg-background/40 p-4 backdrop-blur">
              <VerifyQr dataUrl={profile.qrDataUrl} label="Client verify" size={128} />
            </div>
          ) : (
            <div className="max-w-[14rem] rounded-[24px] border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
              No public page yet.
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/onboarding">Finish setup</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Door href="/projects" icon={FolderKanban} title="Projects" copy="Bill and deliver." />
        <Door href="/vault" icon={Archive} title="Vault" copy="Keep proof private." />
        <Door href="/money" icon={Wallet} title="Money" copy="Score and splits." />
      </section>
    </div>
  );
}

/**
 * One quiet room link — no marketing paragraph.
 */
function Door({
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
    <Link href={href} className="glass glass-hover rounded-[24px] p-4 transition">
      <Icon className="mb-3 size-5 text-primary" strokeWidth={1.6} />
      <h3 className="font-display text-lg tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
    </Link>
  );
}
