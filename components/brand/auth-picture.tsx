/**
 * Purpose: Cinematic studio photograph for the auth split layout.
 * Inputs: optional caption overlay.
 * Outputs: a full-bleed image with a gradient and a line of brand copy.
 */
import Image from "next/image";

type AuthPictureProps = {
  caption?: string;
  className?: string;
};

/**
 * The door into the studio — a Nairobi photographer at work, no logos, no UI chrome.
 */
export function AuthPicture({
  caption = "The work is loud. The proof should be too.",
  className,
}: AuthPictureProps) {
  return (
    <aside className={className ?? "relative h-56 overflow-hidden lg:h-auto lg:min-h-full"}>
      <Image
        src="/auth/studio-door.jpg"
        alt="A photographer working in a sunlit Nairobi studio"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
        <p className="max-w-sm font-serif text-3xl italic leading-tight text-white md:text-4xl">
          {caption}
        </p>
      </div>
    </aside>
  );
}
