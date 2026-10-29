import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { TIERS, YEARLY } from "../lib/plan";
import { UPGRADE_EVENT, type UpgradeAsk } from "../lib/upgrade";

/** The dialog behind `askUpgrade`: what the limit was, what Coach adds, and the yearly price. */
export function UpgradePrompt() {
  const [ask, setAsk] = useState<UpgradeAsk | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const on = (e: Event) => setAsk((e as CustomEvent<UpgradeAsk>).detail);
    window.addEventListener(UPGRADE_EVENT, on);
    return () => window.removeEventListener(UPGRADE_EVENT, on);
  }, []);
  if (!ask) return null;
  const coach = TIERS.solo;
  const year = YEARLY.solo;
  const close = () => setAsk(null);
  return (
    <Modal
      title="Room to grow"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Not now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              close();
              navigate("/pricing");
            }}
          >
            {ask.cta || "See plans"}
          </button>
        </>
      }
    >
      <p>{ask.reason}</p>
      <p>
        <b>{coach.name}</b> is {year ? `${year.price} a year (${year.saves.split(",")[0]})` : `${coach.price} ${coach.cadence}`} or {coach.price} a month:
      </p>
      <ul>
        {coach.perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="hint">Everything you've made stays yours on every plan. Nothing is deleted when you hit a limit.</p>
    </Modal>
  );
}
