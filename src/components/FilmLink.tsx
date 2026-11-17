import { useState } from "react";
import { clock, linkAt, linkStart, youtubeEmbed, youtubeId } from "../lib/runPlay";
import { Modal } from "./Modal";

/** Who made a linked video, shown under it so the credit stays with the maker. */
export type FilmCredit = { title: string; channel: string; note?: string };

/**
 * A drill's or play's film: Hudl opens in a new tab (it needs the team's
 * Hudl sign-in); YouTube can also play right here in the privacy-enhanced
 * player, from the start time the coach set, or pop out into a big player.
 * `credit` marks an example video we link but didn't make.
 */
export function FilmLink({ film, title = "Film", big = false, credit }: { film: { link: string; startAt?: number }; title?: string; big?: boolean; credit?: FilmCredit }) {
  const [open, setOpen] = useState(false);
  const [popped, setPopped] = useState(false);
  const id = youtubeId(film.link);
  const start = film.startAt ?? linkStart(film.link);
  const from = start ? ` from ${clock(start)}` : "";
  const label = credit ? "example video" : "film";
  const frame = (id: string) => (
    <div className="film-frame">
      <iframe src={youtubeEmbed(id, start)} title={credit ? `${credit.title} (${credit.channel})` : title} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    </div>
  );
  return (
    <div className={`film${big ? " film-big" : ""}`}>
      <div className="film-acts">
        {id && (
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? `Hide ${label}` : `▶ Play ${label}${from}`}
          </button>
        )}
        {id && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => (setOpen(false), setPopped(true))} aria-label={`Pop out the ${label} into a big player`}>
            ⤢ Pop out
          </button>
        )}
        <a className="btn btn-quiet btn-sm" href={linkAt(film.link, start)} target="_blank" rel="noopener noreferrer">
          {id ? "Open in YouTube ↗" : `Watch on Hudl${from} ↗`}
        </a>
      </div>
      {credit && <Credit credit={credit} />}
      {open && id && frame(id)}
      {popped && id && (
        <Modal title={credit ? "Example video" : title} onClose={() => setPopped(false)} maxWidth={1100}>
          {frame(id)}
          {credit && <Credit credit={credit} />}
        </Modal>
      )}
    </div>
  );
}

function Credit({ credit }: { credit: FilmCredit }) {
  return (
    <p className="film-credit">
      {credit.note && <span className="film-note">{credit.note} </span>}
      “{credit.title}” by <b>{credit.channel}</b> on YouTube. Shared as an example; not made by or connected with LaxVault.
    </p>
  );
}
