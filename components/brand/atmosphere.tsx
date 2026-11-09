/**
 * Purpose: Shared dusk sky — gold, rose, and teal orbs that follow the pointer.
 * Inputs: pointer position on the window.
 * Outputs: a fixed, non-interactive backdrop used on every route.
 */
"use client";

import { useEffect, useRef } from "react";

/**
 * Paint the studio atmosphere. Motion is transform-only so it stays cheap.
 */
export function Atmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 28;
      const y = (event.clientY / window.innerHeight - 0.5) * 28;
      node.style.setProperty("--mx", `${x}px`);
      node.style.setProperty("--my", `${y}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={rootRef} className="atmosphere" aria-hidden="true">
      <div className="orb orb-gold" />
      <div className="orb orb-rose" />
      <div className="orb orb-teal" />
      <div className="orb orb-gold orb-extra" />
    </div>
  );
}
