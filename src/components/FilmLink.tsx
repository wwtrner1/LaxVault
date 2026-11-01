import { useState } from "react";
import { clock, linkAt, linkStart, youtubeEmbed, youtubeId } from "../lib/runPlay";

/**
 * A drill's or play's film: Hudl opens in a new tab (it needs the team's
 * Hudl sign-in); YouTube can also play right here in the privacy-enhanced
 * player, from the start time the coach set.
 */
export function FilmLink({ film, title = "Film", big = false }: { film: { link: string; startAt?: number }; title?: string; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = youtubeId(film.link);
  const start = film.startAt ?? linkStart(film.link);
  const from = start ? ` from ${clock(start)}` : "";
  return (
    <div className={`film${big ? " film-big" : ""}`}>
      <div className="film-acts">
        {id && (
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide film" : `▶ Play film${from}`}
          </button>
        )}
        <a className="btn btn-quiet btn-sm" href={linkAt(film.link, start)} target="_blank" rel="noopener noreferrer">
          {id ? "Open in YouTube ↗" : `Watch on Hudl${from} ↗`}
        </a>
      </div>
      {open && id && (
        <div className="film-frame">
          <iframe src={youtubeEmbed(id, start)} title={title} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
      )}
    </div>
  );
}
