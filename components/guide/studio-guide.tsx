/**
 * Purpose: Kabla-style bottom-right guide for CRAFT rooms (Rehema).
 * Inputs: pathname via usePathname; copy from lib/guide/cues.ts.
 * Outputs: interrupt-once card, then a corner badge. Soft pages skip the dim overlay.
 *
 * WHY: a pinned footer helper fell below the fold in Kabla — same fix here.
 * State resets via `key={guide.cue}` so we never sync open/steps from an effect.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { guideForPath, type GuideCue } from "@/lib/guide/cues";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "craft-rehema-seen";
const VOICE_KEY = "craft-rehema-voice";

/**
 * Resolve which cues this browser session already dismissed.
 */
function seenCues(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Remember a cue so Rehema does not interrupt again this session.
 */
function markSeen(cue: string): void {
  const next = seenCues();
  next.add(cue);
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
}

/**
 * Studio guide — explains the current room in plain words.
 */
export function StudioGuide() {
  const pathname = usePathname() || "/";
  const guide = guideForPath(pathname);
  return <StudioGuideCard key={guide.cue} guide={guide} />;
}

/**
 * One cue's card. Remounts when the cue changes so open/steps start fresh.
 */
function StudioGuideCard({ guide }: { guide: GuideCue }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!seenCues().has(guide.cue)) {
      markSeen(guide.cue);
      return true;
    }
    return false;
  });
  const [steps, setSteps] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(VOICE_KEY) === "on";
  });
  const [speaking, setSpeaking] = useState(false);

  const hush = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    hush();
    if (!("speechSynthesis" in window)) return;
    setSpeaking(true);
    const utter = new SpeechSynthesisUtterance(guide.say);
    utter.lang = "en-KE";
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [guide.say, hush]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => hush(), 0);
      return () => window.clearTimeout(timer);
    }
    if (!voiceOn) return;
    const timer = window.setTimeout(() => speak(), 0);
    return () => window.clearTimeout(timer);
  }, [open, voiceOn, speak, hush]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    localStorage.setItem(VOICE_KEY, next ? "on" : "off");
    if (!next) hush();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-panel fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 shadow-lg transition hover:-translate-y-0.5"
        aria-label="Ask Rehema"
        data-testid="rehema-button"
      >
        <RehemaFace size={36} />
        <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Ask Rehema</span>
      </button>
    );
  }

  return (
    <>
      {!guide.soft ? (
        <div
          className="fixed inset-0 z-40 bg-background/50 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}
      <section
        role={guide.soft ? "region" : "dialog"}
        aria-modal={guide.soft ? undefined : true}
        aria-labelledby="rehema-title"
        data-testid="rehema-card"
        className="glass-panel fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] shadow-xl"
      >
        <div className="flex items-start gap-3 p-4">
          <RehemaFace size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p
                id="rehema-title"
                className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary"
              >
                Rehema · studio guide
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={speak}
                  className={`rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest ${speaking ? "bg-primary text-primary-foreground" : ""}`}
                  aria-label="Hear it"
                >
                  {speaking ? "…" : "▶"} Hear
                </button>
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-pressed={voiceOn}
                  className={`rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest ${voiceOn ? "bg-teal/20 text-teal" : "opacity-60"}`}
                >
                  {voiceOn ? "Voice on" : "Voice off"}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {guide.title}
            </p>
            <p className="mt-1.5 text-sm leading-snug">{guide.say}</p>
            <button
              type="button"
              className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
              aria-expanded={steps}
              onClick={() => setSteps(!steps)}
            >
              {steps ? "Hide steps" : "Show steps"}
            </button>
            {steps ? (
              <ol className="mt-2 space-y-1 border-t border-border/60 pt-2">
                {guide.steps.map((line, index) => (
                  <li key={line} className="text-xs leading-snug text-muted-foreground">
                    <span className="mr-1.5 font-mono text-primary">{index + 1}.</span>
                    {line}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Later
          </button>
          {guide.cta?.href ? (
            <Button asChild size="sm" autoFocus={!guide.soft}>
              <Link href={guide.cta.href} onClick={() => setOpen(false)}>
                {guide.cta.label} →
              </Link>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setOpen(false)} autoFocus={!guide.soft}>
              Got it →
            </Button>
          )}
        </div>
      </section>
      {guide.soft ? <div className="h-64 sm:hidden" aria-hidden /> : null}
    </>
  );
}

/**
 * Rehema's mark: warm studio face with gold band — distinct from Kabla's Karani kofia.
 */
function RehemaFace({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="shrink-0">
      <circle cx="24" cy="26" r="15" fill="#F4E6C8" stroke="#2A241c" strokeWidth="1.5" />
      <path
        d="M10 18 Q24 6 38 18"
        fill="none"
        stroke="#C9A227"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="18" cy="26" r="3.6" fill="none" stroke="#2A241c" strokeWidth="1.4" />
      <circle cx="30" cy="26" r="3.6" fill="none" stroke="#2A241c" strokeWidth="1.4" />
      <line x1="21.7" y1="26" x2="26.3" y2="26" stroke="#2A241c" strokeWidth="1.4" />
      <circle cx="18" cy="26" r="1.1" fill="#2A241c" />
      <circle cx="30" cy="26" r="1.1" fill="#2A241c" />
      <path
        d="M19 34 Q24 37.5 29 34"
        fill="none"
        stroke="#2A241c"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
