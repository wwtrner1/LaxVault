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
    hint: "Every play you have drawn, plus the plays other coaches made public.",
  },
  {
    to: "/playbooks",
    icon: "board",
    label: "Playbooks",
    hint: "Group plays into an install order — base, red zone, third down.",
  },
  {
    to: "/practice",
    icon: "board",
    label: "Practice",
    hint: "Build tonight's practice script and print scout cards for the plays you'll rep.",
  },
  {
    to: "/starters",
    icon: "sparkle",
    label: "Starter plays",
    hint: "Fifty-six ready-made plays you can copy and edit as your own.",
  },
  {
    to: "/language",
    icon: "language",
    label: "Playbook language",
    hint: "Your own names for formations, routes and calls.",
  },
  {
    to: "/tools",
    icon: "grid",
    label: "More tools",
    hint: "Formation and defense libraries, the route tree and the other Designer tools in one place.",
  },
];
