import { DOCS_LOCAL, DOCS_REMOTE } from "./drills";

/**
 * The coach's team: name, logo and two colors. Shown on practice scripts,
 * drill cards and playbook PDFs, the live practice header and the player
 * link (Coach and up, `gateBranding`). Kept in this browser and copied to the
 * account as doc kind "team" (lib/docSync.ts); the newer save wins. The logo
 * is shrunk in the browser to a small image held as a data URL, so it needs
 * no file storage and works offline at the field.
 */
export type TeamBrand = {
  name: string;
  /** data:image/webp|png|jpeg;base64,… at most LOGO_MAX characters. */
  logo?: string;
  primary: string;
  secondary: string;
  updatedAt: number;
};

const KEY = "laxvault.brand.v1";
/** Largest logo kept, in characters of data URL (about 90 KB of image). */
export const LOGO_MAX = 120_000;
/** Longest side of a stored logo, in pixels. */
export const LOGO_PX = 256;

export const DEFAULT_TEAM: TeamBrand = { name: "", primary: "#0FA8C4", secondary: "#0B1524", updatedAt: 0 };

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** A team doc from anywhere (storage, the account, a player link), cleaned; null when it isn't one. */
export function cleanTeam(raw: unknown): TeamBrand | null {
  const r = raw as Partial<TeamBrand> | null;
  if (!r || typeof r !== "object") return null;
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
  const logo = typeof r.logo === "string" && r.logo.length <= LOGO_MAX && LOGO.test(r.logo) ? r.logo : undefined;
  return {
    name,
    ...(logo ? { logo } : {}),
    primary: typeof r.primary === "string" && HEX.test(r.primary) ? r.primary : DEFAULT_TEAM.primary,
    secondary: typeof r.secondary === "string" && HEX.test(r.secondary) ? r.secondary : DEFAULT_TEAM.secondary,
    updatedAt: Number.isFinite(r.updatedAt) ? Number(r.updatedAt) : 0,
  };
}

export function loadTeam(): TeamBrand {
  try {
    return cleanTeam(JSON.parse(localStorage.getItem(KEY) ?? "null")) ?? DEFAULT_TEAM;
  } catch {
    return DEFAULT_TEAM;
  }
}

/** Has the coach set anything up? A blank team draws nothing on prints. */
export const hasTeam = (t: TeamBrand) => !!(t.name || t.logo);

/** Save the team here; `remote` means the copy came from the account, so it isn't sent back. */
export function saveTeam(team: TeamBrand, remote = false) {
  const next = remote ? team : { ...team, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the team still shows this visit */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(remote ? DOCS_REMOTE : DOCS_LOCAL));
  return next;
}

/** Shrink a picked image to LOGO_PX on its longest side and keep it as WebP (PNG where WebP can't be made). */
export async function logoFromFile(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) throw new Error("Pick a PNG, JPG, WebP or SVG image of your logo.");
  if (file.size > 8_000_000) throw new Error("That image is over 8 MB. Pick a smaller copy of your logo.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image couldn't be opened. Try a PNG or JPG."));
      el.src = url;
    });
    const w = img.naturalWidth || LOGO_PX;
    const h = img.naturalHeight || LOGO_PX;
    const k = Math.min(1, LOGO_PX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't resize images. Try another browser.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const [type, q] of [["image/webp", 0.86], ["image/webp", 0.7], ["image/png", undefined]] as const) {
      const out = canvas.toDataURL(type, q);
      if (out.startsWith(`data:${type}`) && out.length <= LOGO_MAX) return out;
    }
    throw new Error("That logo is too detailed to keep. Try a simpler or smaller version.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Black or white text, whichever reads on a team color. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#0B1524" : "#FFFFFF";
}
