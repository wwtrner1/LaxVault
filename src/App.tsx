import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ToastProvider } from "./lib/toast";
import { PlaybookSync } from "./lib/playbookSync";
import { DocSync } from "./lib/docSync";
import { PhoneGate } from "./components/PhoneGate";
import { NewPassword } from "./components/NewPassword";
import { Landing } from "./pages/Landing";
import { Pricing } from "./pages/Pricing";
import { Builder } from "./pages/Builder";
import { Vault } from "./pages/Vault";
import { Playbooks } from "./pages/Playbooks";
import { Account } from "./pages/Account";
import { SignIn } from "./pages/SignIn";
import { NotFound } from "./pages/NotFound";
import { Help } from "./pages/Help";
import { Privacy, Terms } from "./pages/Legal";
import { Practice } from "./pages/Practice";
import { Drills } from "./pages/Drills";
import { LivePractice } from "./pages/LivePractice";
import { Admin } from "./pages/Admin";
import { useFreePrint } from "./lib/guard";
import { useTier } from "./lib/tier";
import { notePage } from "./lib/lastPage";
import { useVisitCounter } from "./lib/visits";
import { COMING_SOON, ComingSoon } from "./pages/ComingSoon";
import { Tools } from "./pages/Tools";

const TITLES: Record<string, string> = {
  "/": "LaxVault — Lacrosse Practice Planner",
  "/build": "Designer — LaxVault",
  "/vault": "The Vault — LaxVault",
  "/playbooks": "Playbooks — LaxVault",
  "/pricing": "Plans — LaxVault",
  "/account": "Your account — LaxVault",
  "/signin": "Sign in — LaxVault",
  "/help": "Help & feedback — LaxVault",
  "/privacy": "Privacy Policy — LaxVault",
  "/terms": "Terms of Use — LaxVault",
  "/drills": "Drills — LaxVault",
  "/practice": "Practice — LaxVault",
  "/practice/live": "Live practice — LaxVault",
  "/admin": "Admin — LaxVault",
  "/tools": "More tools — LaxVault",
  ...Object.fromEntries(Object.entries(COMING_SOON).map(([p, s]) => [p, `${s.title} — LaxVault`])),
};

const NAMES: Record<string, string> = {
  "/": "Home",
  "/build": "Designer",
  "/vault": "The Vault",
  "/playbooks": "Playbooks",
  "/pricing": "Plans",
  "/account": "Your account",
  "/signin": "Sign in",
  "/help": "Help & feedback",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Use",
  "/drills": "Drills",
  "/practice": "Practice",
  "/practice/live": "Live practice",
  "/admin": "Admin",
  "/tools": "More tools",
  ...Object.fromEntries(Object.entries(COMING_SOON).map(([p, s]) => [p, s.title])),
};

/**
 * A single-page app swaps the view without a page load, so a screen reader
 * gets no announcement. This sets the document title and speaks the new page
 * name through a live region.
 */
function RouteChrome() {
  const { pathname } = useLocation();
  const [spoken, setSpoken] = useState("");
  useVisitCounter();
  useEffect(() => {
    notePage(pathname);
    const key = pathname.startsWith("/build") ? "/build" : pathname;
    document.title = TITLES[key] ?? "LaxVault";
    setSpoken(`${NAMES[key] ?? "Page not found"} page`);
    if (!pathname.startsWith("/build")) window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {spoken}
    </p>
  );
}

export function App() {
  useFreePrint(useTier().watermark);
  return (
    <ToastProvider>
      <RouteChrome />
      <PlaybookSync />
      <DocSync />
      <PhoneGate />
      <NewPassword />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/build" element={<Builder />} />
        <Route path="/build/:id" element={<Builder />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/account" element={<Account />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/drills" element={<Drills />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/live" element={<LivePractice />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/tools" element={<Tools />} />
        {Object.keys(COMING_SOON).map((p) => (
          <Route key={p} path={p} element={<ComingSoon path={p} />} />
        ))}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}
