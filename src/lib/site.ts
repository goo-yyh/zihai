export const SITE_NAME = "zihAI";
export const SITE_DESCRIPTION =
  "Discover independent AI products and support the builders behind them.";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
