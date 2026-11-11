/**
 * Purpose: Verified link ownership challenges for GitHub, YouTube, and RSS/oEmbed.
 * Inputs: platform + handle/URL; optional uploaded export text for fallback.
 * Outputs: a short challenge code, then pass/fail after a public fetch.
 *
 * Official sources only. We never scrape pages that prohibit it. Wording is
 * always "verified link ownership", never identity or authorship.
 */
import "server-only";
import { env } from "@/lib/env";
import {
  checkExportChallenge,
  generateChallengeCode,
} from "@/lib/verify/challenge-core";

export type ChallengePlatform = "github" | "youtube" | "rss" | "export";

export type ChallengeCheckResult = {
  passed: boolean;
  reason: string;
  publicData?: Record<string, unknown>;
};

export { generateChallengeCode };

/**
 * Normalize handles/URLs into a fetchable public URL for the platform.
 */
export function resolvePublicUrl(
  platform: ChallengePlatform,
  handle: string,
  explicitUrl?: string,
): string {
  if (explicitUrl) {
    return explicitUrl;
  }
  const trimmed = handle.trim().replace(/^@/, "");
  switch (platform) {
    case "github":
      return `https://github.com/${trimmed}`;
    case "youtube":
      if (trimmed.startsWith("http")) {
        return trimmed;
      }
      return `https://www.youtube.com/@${trimmed}`;
    case "rss":
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    case "export":
      return "upload://export";
    default:
      return trimmed;
  }
}

/**
 * Check that the challenge code appears in the official public surface.
 */
export async function checkChallenge(input: {
  platform: ChallengePlatform;
  handle: string;
  url: string;
  challengeCode: string;
  exportText?: string;
}): Promise<ChallengeCheckResult> {
  const code = input.challengeCode.trim().toUpperCase();

  if (input.platform === "export") {
    return checkExportChallenge(code, input.exportText);
  }

  if (input.platform === "github") {
    return checkGitHub(input.handle, code);
  }
  if (input.platform === "youtube") {
    return checkYouTube(input.handle, input.url, code);
  }
  return checkRssOrOEmbed(input.url, code);
}

/**
 * GitHub: prefer API bio/readme; fall back to public profile HTML only as last resort
 * is avoided — we use the API and public README via raw.githubusercontent when possible.
 */
async function checkGitHub(handle: string, code: string): Promise<ChallengeCheckResult> {
  const user = handle.replace(/^@/, "").split("/")[0] ?? handle;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CRAFT-link-ownership",
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const profileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, {
    headers,
    next: { revalidate: 0 },
  });
  if (!profileRes.ok) {
    return {
      passed: false,
      reason: `GitHub API returned ${profileRes.status}. Check the handle.`,
    };
  }
  const profile = (await profileRes.json()) as {
    login?: string;
    bio?: string | null;
    blog?: string | null;
    html_url?: string;
  };
  const haystacks: string[] = [profile.bio ?? "", profile.blog ?? "", profile.login ?? ""];

  // Optional README on the profile repo (user/user) — public API, not banned scraping.
  const readmeRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(user)}/readme`,
    { headers: { ...headers, Accept: "application/vnd.github.raw" }, next: { revalidate: 0 } },
  );
  if (readmeRes.ok) {
    haystacks.push(await readmeRes.text());
  }

  const blob = haystacks.join("\n").toUpperCase();
  if (!blob.includes(code)) {
    return {
      passed: false,
      reason: "Challenge code not found in the GitHub bio or profile README.",
      publicData: { login: profile.login, htmlUrl: profile.html_url },
    };
  }
  return {
    passed: true,
    reason: "Verified link ownership on GitHub.",
    publicData: {
      login: profile.login,
      bio: profile.bio,
      htmlUrl: profile.html_url,
    },
  };
}

/**
 * YouTube: Data API snippet description when a key is set; otherwise oEmbed title only
 * cannot carry the code, so we fail closed with a clear message.
 */
async function checkYouTube(
  handle: string,
  url: string,
  code: string,
): Promise<ChallengeCheckResult> {
  const key = env.YOUTUBE_API_KEY;
  if (!key) {
    return {
      passed: false,
      reason:
        "Set YOUTUBE_API_KEY to verify YouTube link ownership, or use the export upload fallback.",
    };
  }

  const cleaned = handle.replace(/^@/, "");
  const search = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(cleaned)}&key=${key}`,
    { next: { revalidate: 0 } },
  );
  if (!search.ok) {
    return { passed: false, reason: `YouTube API search failed (${search.status}).` };
  }
  const searchJson = (await search.json()) as {
    items?: { snippet?: { channelId?: string; channelTitle?: string; description?: string } }[];
  };
  const channelId = searchJson.items?.[0]?.snippet?.channelId;
  if (!channelId) {
    return { passed: false, reason: "No YouTube channel found for that handle." };
  }

  const channels = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id=${channelId}&key=${key}`,
    { next: { revalidate: 0 } },
  );
  if (!channels.ok) {
    return { passed: false, reason: `YouTube channel lookup failed (${channels.status}).` };
  }
  const channelJson = (await channels.json()) as {
    items?: {
      snippet?: { title?: string; description?: string; customUrl?: string };
      brandingSettings?: { channel?: { description?: string } };
    }[];
  };
  const item = channelJson.items?.[0];
  const blob = [
    item?.snippet?.description ?? "",
    item?.brandingSettings?.channel?.description ?? "",
    searchJson.items?.[0]?.snippet?.description ?? "",
  ]
    .join("\n")
    .toUpperCase();

  if (!blob.includes(code)) {
    return {
      passed: false,
      reason: "Challenge code not found in the YouTube channel description.",
      publicData: {
        title: item?.snippet?.title,
        customUrl: item?.snippet?.customUrl,
        url,
      },
    };
  }
  return {
    passed: true,
    reason: "Verified link ownership on YouTube.",
    publicData: {
      title: item?.snippet?.title,
      customUrl: item?.snippet?.customUrl,
      description: item?.snippet?.description?.slice(0, 400),
    },
  };
}

/**
 * RSS feed or oEmbed endpoint — official structured surfaces only.
 */
async function checkRssOrOEmbed(url: string, code: string): Promise<ChallengeCheckResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": "CRAFT-link-ownership", Accept: "application/rss+xml, application/xml, text/xml, application/json, text/html" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return { passed: false, reason: `Could not fetch the feed/page (${res.status}).` };
  }
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  const upper = body.toUpperCase();

  const looksLikeFeed =
    contentType.includes("xml") ||
    contentType.includes("rss") ||
    contentType.includes("atom") ||
    body.includes("<rss") ||
    body.includes("<feed");

  if (!looksLikeFeed) {
    // Try oEmbed discovery for WordPress-like blogs that publish oEmbed.
    const oembed = await tryOEmbed(url);
    if (oembed && oembed.toUpperCase().includes(code)) {
      return {
        passed: true,
        reason: "Verified link ownership via oEmbed.",
        publicData: { source: "oembed", url },
      };
    }
    return {
      passed: false,
      reason:
        "That URL is not an RSS/Atom feed or oEmbed source we can check. Use a feed URL or the export fallback.",
    };
  }

  if (!upper.includes(code)) {
    return {
      passed: false,
      reason: "Challenge code not found in the RSS/Atom feed.",
      publicData: { url },
    };
  }
  return {
    passed: true,
    reason: "Verified link ownership via RSS/Atom.",
    publicData: { url, chars: body.length },
  };
}

/**
 * Best-effort oEmbed fetch for blog platforms that advertise it.
 */
async function tryOEmbed(url: string): Promise<string | null> {
  const candidates = [
    `https://wordpress.com/wp-json/oembed/1.0/?url=${encodeURIComponent(url)}`,
    `https://medium.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  ];
  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        headers: { "User-Agent": "CRAFT-link-ownership" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        continue;
      }
      return await res.text();
    } catch {
      // Try the next official oEmbed host.
    }
  }
  return null;
}
