/**
 * Purpose: Signed-in home — a studio landing inside the product.
 * Inputs: Auth.js session (via layout).
 * Outputs: welcome copy plus doors into live and upcoming rooms.
 */
import Link from "next/link";
import { Archive, FolderKanban, Shield, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";

const DOORS = [
  {
    href: "/projects",
    icon: FolderKanban,
    kicker: "Live",
    title: "Projects",
    copy: "Name the job and send a PayPal bill.",
  },
  {
    href: "/vault",
    icon: Archive,
    kicker: "Live",
    title: "Vault",
    copy: "Save files with a hash so you can prove the work.",
  },
  {
    href: "/settings",
    icon: Sparkles,
    kicker: "Live",
    title: "Trust page",
    copy: "Choose what clients see. Share a confirm link after delivery.",
  },
  {
    href: "/freeze-shield",
    icon: Shield,
    kicker: "Soon",
    title: "Freeze Shield",
    copy: "If PayPal holds your money, answer with your vault files.",
  },
] as const;

/**
 * Dashboard. Phase 1 live: create a project and send a sandbox invoice.
 */
export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user.name?.split(" ")[0] ?? "creative";

  return (
    <div>
      <PageHeader
        kicker="Studio"
        title={`Hey ${firstName}.`}
        lede="Send bills, save proof, and see what to do next. Start with a project."
        action={
          <Button asChild>
            <Link href="/projects">Open projects</Link>
          </Button>
        }
      />

      <div className="mb-8 overflow-hidden rounded-[24px] border border-primary/25 bg-gradient-to-br from-primary/18 via-accent/10 to-teal/10 p-5 md:rounded-[28px] md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Do this next</p>
        <h2 className="mt-3 max-w-xl font-serif text-2xl italic leading-tight md:text-4xl">
          Make a project. Send a PayPal bill. Get paid.
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          Signed in as {session?.user.email}. If sending a bill fails in Kenya, use a US
          sandbox Business account to send and a Personal buyer to pay.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOORS.map((door) => (
          <Link
            key={door.href}
            href={door.href}
            className="glass glass-hover group rounded-[28px] p-6"
          >
            <door.icon className="mb-5 size-5 text-primary transition group-hover:scale-110" strokeWidth={1.6} />
            <p className="text-xs uppercase tracking-[0.22em] text-accent">{door.kicker}</p>
            <h3 className="mt-2 font-display text-2xl tracking-tight">{door.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{door.copy}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
