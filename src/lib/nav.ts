export type NavItem = { to: string; icon: string; label: string; hint: string };

/**
 * The side menu, the same on every signed-in page. The home page lists the
 * same items, so a tool added here shows up in both places.
 */
export const PLAYBOOK_NAV: NavItem[] = [
  {
    to: "/vault",
    icon: "folder",
    label: "The Vault",
    hint: "Every play you have drawn, the starter plays, and plays other coaches made public.",
  },
  {
    to: "/playbooks",
    icon: "board",
    label: "Playbooks",
    hint: "Group plays into a set you can reuse — a unit, a season, a theme.",
  },
  {
    to: "/drills",
    icon: "board",
    label: "Drills",
    hint: "Keep the drills you run, with setup, equipment, coaching points and a diagram.",
  },
  {
    to: "/practice",
    icon: "board",
    label: "Practice",
    hint: "Build tonight's practice in timed blocks and print the script and drill cards.",
  },
  {
    to: "/tools",
    icon: "grid",
    label: "More tools",
    hint: "Lacrosse sets, saved play formats and other Designer shortcuts in one place.",
  },
  {
    to: "/guide",
    icon: "help",
    label: "Guide",
    hint: "Step-by-step tutorials and what every button does, screen by screen.",
  },
];
