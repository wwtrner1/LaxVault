import { FORMATS, POSITIONS, byNumber, fullName, unitsFor, unused, type Lineup, type RosterPlayer } from "./roster";
import type { TeamBrand } from "./team";

/**
 * The lineup card as a PDF (letter, portrait): team band, game, every unit
 * with numbers and names, and the full roster down the side. Text only, so
 * it's sharp on any printer and small enough to text or AirDrop from a phone.
 * jsPDF is loaded only when a coach asks for the card.
 */
export async function lineupPdf(lineup: Lineup, players: RosterPlayer[], team: TeamBrand | null, foot?: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const byId = new Map(players.map((p) => [p.id, p]));
  const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;

  // Team band
  const band = team?.secondary ?? "#0B1524";
  doc.setFillColor(...hex(band));
  doc.rect(0, 0, W, 64, "F");
  doc.setFillColor(...hex(team?.primary ?? "#0FA8C4"));
  doc.rect(0, 64, W, 4, "F");
  let x = M;
  if (team?.logo) {
    try {
      doc.addImage(team.logo, team.logo.startsWith("data:image/png") ? "PNG" : team.logo.startsWith("data:image/jpeg") ? "JPEG" : "WEBP", M, 10, 44, 44);
      x = M + 54;
    } catch {
      /* a logo the PDF can't read: the card goes without it */
    }
  }
  const dark = (() => {
    const [r, g, b] = hex(band);
    return 0.299 * r + 0.587 * g + 0.114 * b < 140;
  })();
  doc.setTextColor(dark ? 255 : 11, dark ? 255 : 21, dark ? 255 : 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(team?.name || "Lineup card", x, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const game = [lineup.name, lineup.opponent ? `vs ${lineup.opponent}` : "", lineup.date ? new Date(`${lineup.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : ""].filter(Boolean).join("  ·  ");
  doc.text(game, x, 52);
  doc.text(FORMATS.find((f) => f.id === lineup.format)?.label ?? "", W - M, 52, { align: "right" });

  // Units in two columns, roster down the right third.
  const colW = (W - M * 2 - 24) * 0.66;
  const unitW = (colW - 16) / 2;
  const cols = [M, M + unitW + 16];
  const ys = [92, 92];
  doc.setTextColor(11, 21, 36);
  for (const unit of unitsFor(lineup.format)) {
    const filled = unit.slots.filter((s) => lineup.slots[s.key]);
    const rows = unit.starting ? unit.slots : filled;
    if (!rows.length) continue;
    const c = ys[0] <= ys[1] ? 0 : 1;
    let y = ys[c];
    const h = 22 + rows.length * 16;
    if (y + h > H - 50) continue;
    doc.setFillColor(238, 243, 247);
    doc.rect(cols[c], y, unitW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(unit.name.toUpperCase(), cols[c] + 6, y + 12.5);
    y += 18;
    doc.setFontSize(10.5);
    for (const slot of rows) {
      const p = byId.get(lineup.slots[slot.key]);
      y += 15;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(91, 112, 133);
      doc.text(slot.label, cols[c] + 6, y);
      doc.setTextColor(11, 21, 36);
      doc.setFont("helvetica", "bold");
      doc.text(p ? (p.number ? `#${p.number}` : "") : "", cols[c] + unitW * 0.42, y);
      doc.setFont("helvetica", "normal");
      doc.text(p ? fullName(p).slice(0, 22) : "____________", cols[c] + unitW * 0.42 + 30, y);
    }
    ys[c] = y + 14;
  }

  // Roster column
  const rx = M + colW + 24;
  const rw = W - M - rx;
  let ry = 92;
  doc.setFillColor(11, 21, 36);
  doc.rect(rx, ry, rw, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ROSTER", rx + 6, ry + 12.5);
  ry += 18;
  doc.setTextColor(11, 21, 36);
  doc.setFontSize(9.5);
  const short = (p: RosterPlayer) => p.pos.map((id) => POSITIONS.find((x) => x.id === id)?.short ?? id).join("/");
  for (const p of [...players].sort(byNumber)) {
    ry += 13;
    if (ry > H - 50) break;
    doc.setFont("helvetica", "bold");
    doc.text(p.number ? `#${p.number}` : "", rx + 6, ry);
    doc.setFont("helvetica", "normal");
    doc.text(`${fullName(p)}`.slice(0, 20), rx + 34, ry);
    doc.setTextColor(91, 112, 133);
    doc.text(p.status !== "active" ? p.status.toUpperCase() : short(p), rx + rw - 4, ry, { align: "right" });
    doc.setTextColor(11, 21, 36);
  }

  const out = unused(lineup, players);
  let ny = Math.max(...ys) + 4;
  if (out.length && ny < H - 70) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NOT IN THE LINEUP", M, ny);
    doc.setFont("helvetica", "normal");
    ny += 14;
    doc.text(doc.splitTextToSize(out.map((p) => `#${p.number} ${fullName(p)}`).join(",  "), colW), M, ny);
  }
  if (lineup.note) {
    ny += 28;
    if (ny < H - 50) {
      doc.setFont("helvetica", "bold");
      doc.text("NOTES", M, ny);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(lineup.note, colW), M, ny + 14);
    }
  }
  if (foot) {
    doc.setFontSize(8);
    doc.setTextColor(91, 112, 133);
    doc.text(foot, W / 2, H - 20, { align: "center" });
  }
  return doc.output("blob");
}

/** A file name a coach can find in Downloads. */
export const lineupFileName = (l: Lineup) => `${[l.name, l.opponent ? `vs ${l.opponent}` : "", l.date ?? ""].filter(Boolean).join(" ").replace(/[^\w -]+/g, "").trim() || "Lineup"}.pdf`;
