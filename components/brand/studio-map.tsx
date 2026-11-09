/**
 * Purpose: A pictured map of CRAFT — rooms in document flow so the board
 * cannot collapse, gold/pink paths on top of photos.
 * Inputs: none.
 * Outputs: one map on every screen size; 1 column on phones, 3×2 on desktop.
 */
import Image from "next/image";
import Link from "next/link";

type PathKind = "usual" | "stuck";

type Node = {
  id: string;
  step: string;
  title: string;
  copy: string;
  image: string;
  alt: string;
  href: string;
  path: PathKind;
  /** Tailwind order so mobile reads as a story and desktop is a 3×2 map. */
  order: string;
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
    path: "usual",
    order: "order-1",
  },
  {
    id: "pay",
    step: "2",
    title: "Send the bill",
    copy: "CRAFT sends a PayPal invoice.",
    image: "/map/pay.jpg",
    alt: "A person sending a payment from a laptop",
    href: "/projects",
    path: "usual",
    order: "order-2",
  },
  {
    id: "vault",
    step: "3",
    title: "Save the proof",
    copy: "Each file gets a hash and a time.",
    image: "/map/vault.jpg",
    alt: "Prints and papers stored in a wooden drawer",
    href: "/vault",
    path: "usual",
    order: "order-3",
  },
  {
    id: "trust",
    step: "4",
    title: "Show clients",
    copy: "A public page with only what you share.",
    image: "/map/trust.jpg",
    alt: "A creative and a client looking at a portfolio together",
    href: "/t/demo",
    path: "usual",
    // Phone: after vault. Desktop: bottom-right of the 3×2 board.
    order: "order-4 md:order-6",
  },
  {
    id: "freeze",
    step: "If stuck",
    title: "Money is held",
    copy: "Paste the PayPal notice. Answer with vault files.",
    image: "/map/freeze.jpg",
    alt: "A creative calmly sorting papers at a desk",
    href: "/freeze-shield",
    path: "stuck",
    order: "order-5",
  },
  {
    id: "money",
    step: "Plan",
    title: "Split the cash",
    copy: "Tax, savings, spend — no promised returns.",
    image: "/map/money.jpg",
    alt: "Hands sorting cash into small bowls",
    href: "/money",
    path: "stuck",
    // Phone: last. Desktop: bottom-left of the 3×2 board.
    order: "order-6 md:order-4",
  },
];

/**
 * Map board: rooms sit in a CSS grid (real height). SVG paths sit behind them.
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

      <div className="studio-map-board relative grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-3 md:gap-x-8 md:gap-y-12 md:p-8">
        <MapPaths />
        {NODES.map((node) => (
          <div key={node.id} className={`relative z-10 min-w-0 ${node.order}`}>
            <MapCard node={node} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Gold usual path and pink stuck path. Hidden on phones where the grid is a list.
 */
function MapPaths() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M 17 24 H 50 H 83"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="0.7"
        strokeDasharray="1.6 1.2"
        opacity="0.9"
      />
      <path
        d="M 83 28 V 76"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="0.7"
        strokeDasharray="1.6 1.2"
        opacity="0.9"
      />
      <path
        d="M 50 28 V 76 H 17"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.7"
        strokeDasharray="1.6 1.2"
        opacity="0.95"
      />
    </svg>
  );
}

/**
 * One map room: photo, title, one-line what happens.
 */
function MapCard({ node }: { node: Node }) {
  const ring =
    node.path === "stuck"
      ? "ring-1 ring-accent/45"
      : "ring-1 ring-primary/35";

  return (
    <Link
      href={node.href}
      className={`glass glass-hover group flex min-w-0 flex-col overflow-hidden rounded-[22px] no-underline ${ring}`}
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
