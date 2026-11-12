/**
 * Purpose: Plain-language guide copy for each CRAFT room (Kabla Karani pattern).
 * Inputs: a route key resolved from the pathname.
 * Outputs: say-line, steps, optional CTA — UI never invents money or evidence here.
 */

export type GuideCta = {
  label: string;
  href?: string;
};

export type GuideCue = {
  /** Session key — interrupt once per cue. */
  cue: string;
  /** Soft = no dim overlay (front door / onboarding). */
  soft?: boolean;
  title: string;
  say: string;
  steps: string[];
  cta?: GuideCta;
};

const CUES = {
  landing: {
    cue: "landing",
    soft: true,
    title: "Welcome",
    say: "CRAFT helps Kenyan creatives prove their work, get paid on PayPal, and answer freezes with vault proof. Start by creating a studio.",
    steps: [
      "Sign up or sign in with email.",
      "Stabilize your profile: verified link ownership and Work Proof Tokens.",
      "Clients scan your trust page before you bill. Money and Freeze Shield come after the trail exists.",
    ],
    cta: { label: "Get started", href: "/signup" },
  },
  login: {
    cue: "login",
    soft: true,
    title: "Sign in",
    say: "Welcome back. Sign in to open your studio profile, vault, and bills.",
    steps: [
      "Use the email and password you registered with.",
      "Judges can use judge@craft.demo after seeding.",
      "New here? Create a studio from Sign up.",
    ],
    cta: { label: "Create a studio", href: "/signup" },
  },
  signup: {
    cue: "signup",
    soft: true,
    title: "Create a studio",
    say: "Make an account, then onboarding will help you verify link ownership and set split rules.",
    steps: [
      "Pick an email you control.",
      "After signup you land in onboarding — steps are skippable.",
      "We say verified link ownership, never verified identity.",
    ],
  },
  onboarding: {
    cue: "onboarding",
    soft: true,
    title: "Stabilize your profile",
    say: "This is Layer 1 setup: who you are, PayPal marker, verify public links, split rules, and what clients see on your trust page.",
    steps: [
      "Add a public link and place the CRAFT challenge code, then verify.",
      "Split rules must add to 100% — computed in code.",
      "Set a public slug so clients can scan /t/your-slug.",
    ],
    cta: { label: "Open studio home", href: "/dashboard" },
  },
  dashboard: {
    cue: "dashboard",
    title: "Studio home",
    say: "This is your Layer 1 home: verified links, Work Proof Tokens, and a QR clients can scan. Bill only after they can verify you.",
    steps: [
      "Check verified link ownership and published proofs.",
      "Share the QR or trust URL with a client.",
      "Then open Projects to create a job and send a PayPal bill.",
    ],
    cta: { label: "Bill a client", href: "/projects" },
  },
  projects: {
    cue: "projects",
    title: "Layer 2 · Jobs",
    say: "Layer 2 starts here: create a job, let the client verify you, bill on PayPal, then deliver and collect confirmation.",
    steps: [
      "Add client, scope, and amount.",
      "Open the job and share the verify card before the invoice.",
      "When paid, the webhook funds the project and proposes splits.",
    ],
    cta: { label: "Open vault", href: "/vault" },
  },
  projectDetail: {
    cue: "project-detail",
    title: "Layer 2 · This job",
    say: "Layer 2 loop: verify card → PayPal bill → vault proof → deliver (hash = Work Proof Token) → client confirms at /c/token.",
    steps: [
      "Share scan-to-verify so the client trusts who you are.",
      "Send the sandbox invoice (US Business merchant if Kenya blocks invoicing).",
      "After funded, upload the deliverable, then send the confirm link.",
    ],
    cta: { label: "Studio home", href: "/dashboard" },
  },
  vault: {
    cue: "vault",
    title: "Layer 2 · Vault",
    say: "Layer 2 proof store: contracts, invoices, comms, deliverables — each with SHA-256 and a server timestamp. AI only reads uploads.",
    steps: [
      "Pick a project, then upload checklist types.",
      "Completeness is scored in code, not by the LLM.",
      "These files feed Work Proof Tokens and Freeze Shield.",
    ],
    cta: { label: "Freeze Shield", href: "/freeze-shield" },
  },
  freeze: {
    cue: "freeze-shield",
    title: "Layer 2 · Freeze Shield",
    say: "When PayPal limits funds, Layer 2 proof becomes your defence. Paste the notice; the fail-closed verifier blocks invented claims.",
    steps: [
      "Paste the limitation notice.",
      "Review covered vs missing evidence from the vault.",
      "Export the PDF only after every claim passes and you approve.",
    ],
  },
  money: {
    cue: "money",
    title: "Layer 2 · Money",
    say: "After jobs land, Money shows your income stability and trust score, cash-flow band, splits, and an educational investing range — all from code.",
    steps: [
      "Approve or reject proposed payment splits from funded jobs.",
      "Read the low–high forecast band, not a single promise.",
      "Safe-to-invest and the sim are educational only.",
    ],
    cta: { label: "Back to studio", href: "/dashboard" },
  },
  settings: {
    cue: "settings",
    title: "Trust visibility",
    say: "Choose what the public trust page shows: counts, portfolio, checkout. Private vault files never appear there.",
    steps: [
      "Toggle what clients may see.",
      "Mark which projects appear on /t/your-slug.",
      "Share that URL or QR before billing.",
    ],
    cta: { label: "Open public page", href: "/dashboard" },
  },
  copilot: {
    cue: "copilot",
    title: "Copilot",
    say: "Copilot is a placeholder for an explain layer. Money math stays in deterministic code — the LLM may only explain.",
    steps: [
      "Use Money and Vault for real numbers and proof.",
      "Any future explain feature must pass the verifier for outbound claims.",
    ],
    cta: { label: "Open Money", href: "/money" },
  },
  trust: {
    cue: "trust-public",
    soft: true,
    title: "Scan to verify",
    say: "You are on a public trust page. It shows verified link ownership and Work Proof Tokens — work provenance, not government identity.",
    steps: [
      "Check verified public links the creative proved they own.",
      "Read Work Proof Token hashes from delivered files.",
      "Client confirmations mean the client stamped receipt on CRAFT.",
    ],
  },
  confirm: {
    cue: "confirm-public",
    soft: true,
    title: "Confirm receipt",
    say: "One click tells the creative you received the delivery. No login. Private vault files stay hidden.",
    steps: [
      "Read the scope summary.",
      "Confirm only if you received the work.",
      "That stamp feeds their public trust page.",
    ],
  },
  default: {
    cue: "default",
    soft: true,
    title: "CRAFT",
    say: "Ask me any time — I explain what this room is for. Proof stays in your vault; money stays in code.",
    steps: [
      "Studio home holds your profile and QR.",
      "Projects bill clients after they can verify you.",
      "Freeze Shield and Money defend and plan around that trail.",
    ],
  },
} as const satisfies Record<string, GuideCue>;

export type GuidePageKey = keyof typeof CUES;

/**
 * Map a Next.js pathname onto a guide cue.
 */
export function guideForPath(pathname: string): GuideCue {
  if (pathname === "/") return CUES.landing;
  if (pathname.startsWith("/login")) return CUES.login;
  if (pathname.startsWith("/signup")) return CUES.signup;
  if (pathname.startsWith("/onboarding")) return CUES.onboarding;
  if (pathname.startsWith("/dashboard")) return CUES.dashboard;
  if (pathname.match(/^\/projects\/[^/]+/)) return CUES.projectDetail;
  if (pathname.startsWith("/projects")) return CUES.projects;
  if (pathname.startsWith("/vault")) return CUES.vault;
  if (pathname.startsWith("/freeze-shield")) return CUES.freeze;
  if (pathname.startsWith("/money")) return CUES.money;
  if (pathname.startsWith("/settings")) return CUES.settings;
  if (pathname.startsWith("/copilot")) return CUES.copilot;
  if (pathname.startsWith("/t/")) return CUES.trust;
  if (pathname.startsWith("/c/")) return CUES.confirm;
  return CUES.default;
}
