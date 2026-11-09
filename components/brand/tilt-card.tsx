/**
 * Purpose: Pointer-tilt glass card for the landing rooms.
 * Inputs: children and className; pointer position on the card.
 * Outputs: a 3D-tilted glass panel that resets on leave.
 */
"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Subtle perspective follow. Reduced motion users still get the glass, not the tilt.
 */
export function TiltCard({ children, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) {
      return;
    }
    const box = node.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    node.style.transform = `perspective(1100px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
  }

  function onLeave() {
    if (ref.current) {
      ref.current.style.transform = "perspective(1100px) rotateY(0deg) rotateX(0deg)";
    }
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "glass rounded-[28px] transition-transform duration-200 ease-out will-change-transform",
        className,
      )}
    >
      {children}
    </div>
  );
}
