/**
 * Purpose: A scrolling craft-name border used to separate landing sections.
 * Inputs: optional reverse direction so stacked borders do not move as one.
 * Outputs: a faded marquee row of studio trades.
 */
const CRAFTS = [
  "photographer",
  "illustrator",
  "producer",
  "designer",
  "writer",
  "filmmaker",
  "musician",
  "stylist",
  "animator",
  "fashion house",
];

type CraftMarqueeProps = {
  reverse?: boolean;
};

/**
 * Decorative section rule. Duplicated list is required for a seamless loop.
 */
export function CraftMarquee({ reverse = false }: CraftMarqueeProps) {
  const names = [...CRAFTS, ...CRAFTS];

  return (
    <div className="marquee py-3" aria-hidden="true">
      <div
        className={`marquee-track font-display text-xs uppercase tracking-[0.28em] text-foreground/40 md:text-sm ${
          reverse ? "marquee-track-reverse" : ""
        }`}
      >
        {names.map((craft, index) => (
          <span key={`${craft}-${index}`} className="flex items-center gap-8">
            {craft}
            <span className="size-1.5 rounded-full bg-accent/80" />
          </span>
        ))}
      </div>
    </div>
  );
}
