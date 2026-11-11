import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Note = { id: string; userId: string | null; email: string; area: string; rating: number | null; note: string; page: string; at: string };

/** Help & feedback notes, newest first. Refund requests under the 14-day guarantee arrive here too. */
export function FeedbackTab() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.admin<{ notes: Note[] }>("feedback").then((r) => setNotes(r.notes)).catch((e) => setError(e instanceof Error ? e.message : "The notes didn't load."));
  }, []);
  if (error) return <p className="adm-note adm-bad">{error}</p>;
  if (!notes) return <p className="hint">Loading feedback…</p>;
  return (
    <div className="adm-scroll">
      <table className="adm-table">
        <thead><tr><th>When</th><th>Area</th><th>Rating</th><th>Reply to</th><th>Note</th><th>Page</th></tr></thead>
        <tbody>
          {notes.map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.at).toLocaleString()}</td>
              <td>{n.area}</td>
              <td>{n.rating ?? ""}</td>
              <td>{n.email ? <a href={`mailto:${n.email}`}>{n.email}</a> : "—"}{n.userId ? " (signed in)" : ""}</td>
              <td style={{ whiteSpace: "pre-wrap", minWidth: 260 }}>{n.note}</td>
              <td><code>{n.page}</code></td>
            </tr>
          ))}
          {notes.length === 0 && <tr><td colSpan={6}>No notes yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
