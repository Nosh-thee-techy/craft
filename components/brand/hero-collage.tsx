/**
 * Purpose: Fill the empty side of the landing hero with overlapping studio photos.
 * Inputs: none.
 * Outputs: a small pictured cluster that hints at the map below.
 */
import Image from "next/image";

const SHOTS = [
  {
    src: "/map/start.jpg",
    alt: "Opening a studio notebook",
    className: "left-0 top-6 w-[58%] rotate-[-9deg]",
  },
  {
    src: "/map/pay.jpg",
    alt: "Sending a PayPal bill",
    className: "right-0 top-0 w-[54%] rotate-[7deg]",
  },
  {
    src: "/map/vault.jpg",
    alt: "Proof stored in a drawer",
    className: "bottom-0 left-[18%] w-[62%] rotate-[-2deg]",
  },
] as const;

/**
 * Polaroid stack so the hero is not a blank dusk field.
 */
export function HeroCollage() {
  return (
    <div className="relative mx-auto h-[260px] w-full max-w-md md:h-[420px] md:max-w-none">
      {SHOTS.map((shot) => (
        <div
          key={shot.src}
          className={`glass absolute overflow-hidden rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.28)] ${shot.className}`}
        >
          <div className="relative aspect-[4/3] w-full">
            <Image src={shot.src} alt={shot.alt} fill sizes="40vw" className="object-cover" />
          </div>
        </div>
      ))}
    </div>
  );
}
