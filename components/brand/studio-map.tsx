/**
 * Purpose: Picture-map of how CRAFT works, with nodes and paths.
 * Inputs: none.
 * Outputs: a mobile stack and a desktop node map, in plain language.
 */
import Image from "next/image";
import Link from "next/link";

const NODES = [
  {
    id: "start",
    step: "1",
    title: "Make a studio",
    copy: "Sign up. Tell us your craft. This is your home in CRAFT.",
    next: "Then you name a job.",
    image: "/map/start.jpg",
    alt: "A notebook opening on a studio table",
    href: "/signup",
    area: "start",
  },
  {
    id: "pay",
    step: "2",
    title: "Send the bill",
    copy: "Add the client and the work. CRAFT sends a PayPal invoice for you.",
    next: "When they pay, the job is marked paid.",
    image: "/map/pay.jpg",
    alt: "A person sending a payment from a laptop",
    href: "/projects",
    area: "pay",
  },
  {
    id: "vault",
    step: "3",
    title: "Save the proof",
    copy: "Put contracts, pictures, and chats in the vault. Each file gets a hash and a time.",
    next: "You can show this later. Nobody can fake it here.",
    image: "/map/vault.jpg",
    alt: "Prints and papers stored in a wooden drawer",
    href: "/vault",
    area: "vault",
  },
  {
    id: "trust",
    step: "4",
    title: "Show clients",
    copy: "A public page with only what you choose to share. Jobs done. Proof you deliver.",
    next: "Usual path: paid work → proof → this page.",
    image: "/map/trust.jpg",
    alt: "A creative and a client looking at a portfolio together",
    href: "/t/demo",
    area: "trust",
  },
  {
    id: "freeze",
    step: "If stuck",
    title: "PayPal holds the money",
    copy: "Paste the notice. CRAFT maps it to your vault and helps you answer with real files.",
    next: "Other path: if PayPal freezes you, come here.",
    image: "/map/freeze.jpg",
    alt: "A creative calmly sorting papers at a desk",
    href: "/freeze-shield",
    area: "freeze",
  },
  {
    id: "money",
    step: "Plan",
    title: "Split the cash",
    copy: "See a simple picture of tax, savings, and spend. No promises. Just a plan you can follow.",
    next: "After you get paid, decide where the money goes.",
    image: "/map/money.jpg",
    alt: "Hands sorting cash into small bowls",
    href: "/money",
    area: "money",
  },
] as const;

/**
 * A studio map: six rooms, two paths (the usual one, and the stuck-money one).
 */
export function StudioMap() {
  return (
    <section className="w-full min-w-0">
      <div className="mb-6 max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">The map</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">How CRAFT works</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Follow the gold path when a job goes well. Take the pink path if PayPal holds your
          money. Every room is a real page in the app.
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

      <ol className="studio-map grid list-none gap-3 md:grid-cols-3 md:gap-4">
        {NODES.map((node) => (
          <li key={node.id} className={`studio-map-${node.area} min-w-0`}>
            <Link
              href={node.href}
              className="glass glass-hover group flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] no-underline"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={node.image}
                  alt={node.alt}
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  {node.step}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4 md:p-5">
                <h3 className="font-display text-xl tracking-tight">{node.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{node.copy}</p>
                <p className="mt-auto pt-3 text-xs text-primary">{node.next}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
