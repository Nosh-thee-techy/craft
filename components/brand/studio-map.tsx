/**
 * Purpose: A map of CRAFT — nodes, gold/pink paths, photos.
 * Inputs: none.
 * Outputs: a timeline on small screens and a connected map on desktop.
 */
import Image from "next/image";
import Link from "next/link";

type Node = {
  id: string;
  step: string;
  title: string;
  copy: string;
  image: string;
  alt: string;
  href: string;
  /** Percent positions on the desktop map board. */
  x: number;
  y: number;
};

const NODES: Node[] = [
  {
    id: "start",
    step: "1",
    title: "Make a studio",
    copy: "Sign up and name your craft.",
    image: "/map/start.jpg",
    alt: "A notebook opening on a studio table",
    href: "/signup",
    x: 4,
    y: 8,
  },
  {
    id: "pay",
    step: "2",
    title: "Send the bill",
    copy: "CRAFT sends a PayPal invoice.",
    image: "/map/pay.jpg",
    alt: "A person sending a payment from a laptop",
    href: "/projects",
    x: 36,
    y: 4,
  },
  {
    id: "vault",
    step: "3",
    title: "Save the proof",
    copy: "Each file gets a hash and a time.",
    image: "/map/vault.jpg",
    alt: "Prints and papers stored in a wooden drawer",
    href: "/vault",
    x: 68,
    y: 10,
  },
  {
    id: "trust",
    step: "4",
    title: "Show clients",
    copy: "A public page with only what you share.",
    image: "/map/trust.jpg",
    alt: "A creative and a client looking at a portfolio together",
    href: "/t/demo",
    x: 68,
    y: 54,
  },
  {
    id: "freeze",
    step: "If stuck",
    title: "Money is held",
    copy: "Paste the PayPal notice. Answer with vault files.",
    image: "/map/freeze.jpg",
    alt: "A creative calmly sorting papers at a desk",
    href: "/freeze-shield",
    x: 36,
    y: 52,
  },
  {
    id: "money",
    step: "Plan",
    title: "Split the cash",
    copy: "Tax, savings, spend — no promised returns.",
    image: "/map/money.jpg",
    alt: "Hands sorting cash into small bowls",
    href: "/money",
    x: 4,
    y: 56,
  },
];

/**
 * Map board: usual path in gold, stuck-money path in pink.
 */
export function StudioMap() {
  return (
    <section id="map" className="w-full min-w-0 scroll-mt-6">
      <div className="mb-5 max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">The map</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">How CRAFT works</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Gold is the usual job. Pink is if PayPal holds your money. Tap a room to open it.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Usual path
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            If money is stuck
          </span>
        </div>
      </div>

      <div className="relative md:hidden">
        <div className="absolute bottom-6 left-[15px] top-6 w-px bg-gradient-to-b from-primary via-accent to-teal" />
        <ol className="list-none space-y-3">
          {NODES.map((node) => (
            <li key={node.id} className="relative pl-10">
              <span className="absolute left-[11px] top-7 size-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
              <MapCard node={node} />
            </li>
          ))}
        </ol>
      </div>

      <div className="studio-map-board relative hidden min-h-[42rem] overflow-hidden rounded-[32px] md:block">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 16 22 C 28 18, 36 16, 48 18 C 58 20, 66 24, 80 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.55"
            strokeDasharray="1.4 1.1"
            opacity="0.85"
          />
          <path
            d="M 80 28 C 80 40, 80 48, 80 62"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.55"
            strokeDasharray="1.4 1.1"
            opacity="0.85"
          />
          <path
            d="M 48 26 C 48 40, 48 50, 48 64"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.55"
            strokeDasharray="1.4 1.1"
            opacity="0.9"
          />
          <path
            d="M 48 68 C 36 72, 24 74, 16 72"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.55"
            strokeDasharray="1.4 1.1"
            opacity="0.9"
          />
        </svg>
        {NODES.map((node) => (
          <div
            key={node.id}
            className="absolute w-[28%]"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <MapCard node={node} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One map room: photo, title, one-line what happens.
 */
function MapCard({ node }: { node: Node }) {
  return (
    <Link
      href={node.href}
      className="glass glass-hover group flex min-w-0 flex-col overflow-hidden rounded-[22px] no-underline"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={node.image}
          alt={node.alt}
          fill
          sizes="(min-width: 768px) 28vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          {node.step}
        </span>
      </div>
      <div className="p-3 md:p-4">
        <h3 className="font-display text-lg tracking-tight">{node.title}</h3>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{node.copy}</p>
      </div>
    </Link>
  );
}
