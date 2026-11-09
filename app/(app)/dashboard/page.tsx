/**
 * Purpose: Signed-in home — a studio landing inside the product.
 * Inputs: Auth.js session (via layout).
 * Outputs: welcome copy plus doors into live and upcoming rooms.
 */
import Link from "next/link";
import { Archive, FolderKanban, Shield, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";

const DOORS = [
  {
    href: "/projects",
    icon: FolderKanban,
    kicker: "Live",
    title: "Projects",
    copy: "Draft work, send a PayPal invoice, watch it fund.",
  },
  {
    href: "/vault",
    icon: Archive,
    kicker: "Live",
    title: "Vault",
    copy: "Hashes and timestamps for the work nobody else can fake.",
  },
  {
    href: "/freeze-shield",
    icon: Shield,
    kicker: "Soon",
    title: "Freeze Shield",
    copy: "When PayPal limits you, walk in with evidence — not panic.",
  },
  {
    href: "/money",
    icon: Wallet,
    kicker: "Soon",
    title: "Money",
    copy: "Splits, a cash-flow band, and a score you can actually explain.",
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
        lede="The work is already happening. This is the room where proof, PayPal, and the next invoice live together."
        action={
          <Button asChild>
            <Link href="/projects">Open projects</Link>
          </Button>
        }
      />

      <div className="mb-10 overflow-hidden rounded-[28px] border border-primary/25 bg-gradient-to-br from-primary/18 via-accent/10 to-teal/10 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Tonight’s move</p>
        <h2 className="mt-3 max-w-xl font-serif text-3xl italic leading-tight md:text-4xl">
          Create a project. Send a sandbox invoice. Get paid on the record.
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          Signed in as {session?.user.email}. Kenya-based PayPal accounts often cannot
          invoice — use a US sandbox Business merchant if send fails.
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
