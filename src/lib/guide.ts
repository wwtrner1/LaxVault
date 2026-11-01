/**
 * The Guide page (/guide): step-by-step tutorials and a reference of every
 * button, by screen. Keep it in step with the screens: when a button moves or
 * is renamed, change it here too.
 */
export type Tutorial = { id: string; title: string; minutes: number; who: string; steps: { text: string; to?: string; cta?: string }[] };
export type ButtonRef = { name: string; where: string; does: string };
export type ScreenRef = { id: string; screen: string; to: string; intro: string; buttons: ButtonRef[] };

export const TUTORIALS: Tutorial[] = [
  {
    id: "first-practice",
    title: "Run your first practice in ten minutes",
    minutes: 10,
    who: "Every coach, first night",
    steps: [
      { text: "Open Tonight's practice from the side menu. Pick who you coach (U8 to U10 up to high school), the kind of night (a normal practice, game tomorrow, or first practice) and how long you have the field, then press Make this tonight's practice.", to: "/tonight", cta: "Build tonight's practice" },
      { text: "You land on Practice with tonight's script: timed periods fitted to your minutes, a note for each, and the drills that go with them. Those drills land in your Drills library with their setup, coaching points and diagram. Prefer to pick a whole plan yourself? Practice → Start from a plan lists all six." },
      { text: "Change anything to fit your team. Rename a period, change its minutes, or use Add a drill… on a period to swap in another one. Set a start time and every period gets its clock time." },
      { text: "Press Print script for the one-page plan for your clipboard, and Print drill cards for one card per drill to hand to assistants at each station." },
      { text: "At the field, press Run live. One big clock runs each period, with the drill, setup and coaching points under it. It sounds a horn at zero and moves on when you press Next.", to: "/practice/live", cta: "Open live mode" },
    ],
  },
  {
    id: "first-play",
    title: "Draw your first play",
    minutes: 5,
    who: "Coaches putting in a set or a slide",
    steps: [
      { text: "Open the Designer. A new drawing starts on the half field with the goal at the top. Coach girls or box? Pick Women's half field or Box half floor under Extras → Field once, and new drawings open on it from then on.", to: "/build", cta: "Open the Designer" },
      { text: "In the tools panel on the left, open the Sets tab and tap a set, for example 2-3-1. Six offensive players land around the goal. Tap Man to man and a defender lands goal side of each one." },
      { text: "Pick Cut on the floating toolbar (or press 1) and click from a player along the path of the cut. Double-click or press Enter to finish. Use Pass for the ball, Dodge for a player carrying it, and Pick where a pick is set." },
      { text: "Click any player or line to select it. A popup says what it is and gives the moves you need most: draw a cut from here, add a note, duplicate, delete, and More for everything else." },
      { text: "Open Details on the top bar to name the play, choose its set and type (offense, defense, man-up, man-down, clear or ride, face-off) and add labels. Then press Save play." },
      { text: "Press Run play to watch it step by step: players run their cuts and dodges, then the ball flies on the pass. A line that starts where another ends runs a step later, and the Designer numbers each line's step. To change one, select the line and set Run play step and Moves in the Selection panel." },
      { text: "Export to print it or download a picture or PDF." },
    ],
  },
  {
    id: "player-link",
    title: "Put the playbook on your players' phones",
    minutes: 3,
    who: "Coach plan and up",
    steps: [
      { text: "Open Playbooks and press Players on the playbook you want the team to learn.", to: "/playbooks", cta: "Open Playbooks" },
      { text: "Press Create the player link. Send the link in the team chat, or put the QR code up at practice. Players need no account." },
      { text: "Each player taps their position (A, M, D, G…) and sees their job on every play, running step by step, with any film you attached to the play." },
      { text: "The Play quiz asks what they do on each play and which play is which. Their scores come back to the same Players box. Change a play, then press Update with my latest plays; the link stays the same." },
    ],
  },
  {
    id: "team-film",
    title: "Add your team's logo, colors and film",
    minutes: 3,
    who: "Coach plan and up for the logo and colors; film links on every plan",
    steps: [
      { text: "Account → Your team: type the team name, add your logo and pick two colors. They go on the printed script and drill cards, playbook PDFs, the live mode header and the player link.", to: "/account", cta: "Open Account" },
      { text: "On Drills, edit a drill and paste a Hudl or YouTube link under Film, with the time it starts. YouTube plays right on the drill and in live mode; Hudl opens in a new tab.", to: "/drills", cta: "Open Drills" },
      { text: "For a play, open Run play in the Designer and paste the link there. Players see it on the player link too." },
    ],
  },
  {
    id: "starters",
    title: "Start from the starter library",
    minutes: 3,
    who: "Coaches who want a head start",
    steps: [
      { text: "Drills → Starter drills has the drills youth and high-school programs run most. Filter by category and level, then press Add to my drills, or Add all shown.", to: "/drills", cta: "Open Drills" },
      { text: "The Vault → Starter plays has sets, slides, man-up and man-down, clears, a ride, a face-off play and a fast break. Copy one to your Vault to change it, or Copy all to file them in a Starter plays playbook.", to: "/vault", cta: "Open the Vault" },
      { text: "Anything you add is yours: edit the setup, coaching points or the diagram, and it stays on every device once you're signed in." },
    ],
  },
  {
    id: "playbook",
    title: "Build a playbook for the season",
    minutes: 5,
    who: "Head coaches and coordinators",
    steps: [
      { text: "Open Playbooks and make one for each group you coach, for example Varsity offense or Man-down.", to: "/playbooks", cta: "Open Playbooks" },
      { text: "Add plays from your Vault, or press + next to a playbook in the side menu to draw a new play straight into it." },
      { text: "In the Designer, the Plays tab (folder icon) shows your playbooks as a tree. Drag a play onto a folder to file it. Prev and Next on the top bar step through the plays in that playbook." },
      { text: "Pick several plays in the Vault and Export them together for a printed packet, one or more plays per page." },
    ],
  },
  {
    id: "devices",
    title: "Keep everything on every device",
    minutes: 2,
    who: "Coaches who plan on a laptop and coach from a phone",
    steps: [
      { text: "Sign in. Everything you made in this browser comes with you: plays, playbooks, drills and the practice script.", to: "/signin", cta: "Sign in" },
      { text: "Sign in on your phone or tablet with the same email. Changes copy over a moment after you make them, and again when you come back to the tab." },
      { text: "Live mode keeps the right time through a locked screen or a reload, and keeps the screen awake while the clock runs." },
    ],
  },
];

export const SCREENS: ScreenRef[] = [
  {
    id: "designer-top",
    screen: "Designer · top bar",
    to: "/build",
    intro: "Across the top of the Designer. On a narrow screen, Details, Run play and Export move into Extras.",
    buttons: [
      { name: "Tools", where: "Far left, phones and tablets only", does: "Opens the tools panel as a sheet." },
      { name: "Prev / Next", where: "Beside the play name", does: "Steps through the plays in the playbook you opened from. Unsaved changes are saved first. Keys [ and ]." },
      { name: "Designer · Playbook", where: "Work tabs", does: "Switch between drawing and the playbook this play belongs to." },
      { name: "Zoom slider and Fit", where: "Right side", does: "Zooms the field. Fit sizes it to the screen again. Ctrl + scroll or a pinch also zooms." },
      { name: "Details", where: "Right side", does: "Shows or hides the right panel: Selection (whatever you picked) and Play (name, set, type, labels, notes)." },
      { name: "Run play", where: "Right side", does: "Runs the play step by step: cuts and dodges, then the ball on the pass. ‹ Step and Step › move between steps, Stop after each step pauses so you can talk it through, and a YouTube link plays beside it." },
      { name: "Export", where: "Right side", does: "Print the play, or download it as a picture, PDF or PowerPoint slide, at index card to full page sizes." },
      { name: "Save play", where: "Right side", does: "Saves to your Vault. Signed in, it also goes to your account. Shows Saved once there's nothing new." },
      { name: "Extras", where: "Far right", does: "Undo and redo, clean up lines, change the field, Field controls (grid and snapping), go to another page, and Help: the Designer tour, show or hide tool groups, and coach tips on or off." },
    ],
  },
  {
    id: "designer-rail",
    screen: "Designer · tools panel",
    to: "/build",
    intro: "The panel on the left. The teal Tools tab on its edge tucks it away for more field and brings it back. Ctrl+\\ hides or shows both side panels.",
    buttons: [
      { name: "Select", where: "Top of the panel", does: "The pointer. Click to pick, drag a box across several, drag to move. Key V." },
      { name: "Modes", where: "Under Select", does: "Multi-select, Duplicate (drag a copy), Click-through (pick something under something else), Rotate and Scale." },
      { name: "Draw tab", where: "Panel tabs", does: "Lines: Cut, Pass, Pick, Dodge, 3-point arc, Freehand, Auto-connect, Bezier pen. Shapes and zones: Polygon, Zone, Rectangle, Ellipse, Text." },
      { name: "Sets tab", where: "Panel tabs", does: "Drop a whole offense (2-3-1, 1-4-1, 2-2-2, 1-3-2, man-up 3-3) or defense (man to man, man-down box, backer zone). A new set replaces the last one for that side." },
      { name: "Players tab", where: "Panel tabs", does: "Single tokens to place: attack, midfield, defense, goalie, long stick, face-off, ball and cone for the offense; triangles for the defense." },
      { name: "Layers tab", where: "Panel tabs", does: "Everything on the field as a list. Pick locked or hidden items here, since they can't be picked on the field." },
      { name: "Plays tab (folder)", where: "Panel tabs", does: "Your playbooks as a tree. Open a play, start a new one in a folder, or drag a play onto a folder." },
      { name: "Style card", where: "Bottom of the panel", does: "Color, weight and line look for the next line, or for the lines you've selected." },
    ],
  },
  {
    id: "designer-field",
    screen: "Designer · on the field",
    to: "/build",
    intro: "What appears over the field while you draw.",
    buttons: [
      { name: "Floating toolbar", where: "Over the field, drag it by its grip", does: "Select, Cut, Pass, Pick and Text; look colors (1st look, 2nd look, Outlet); weights; any color; Undo and Redo. Home puts it back in the corner." },
      { name: "Selection popup", where: "Above whatever you select", does: "Says what you picked and how to use it, with its most used actions and More for the full menu. × closes it for that selection; Turn off tips stops all tips." },
      { name: "Right-click menu", where: "Right-click a player, line or empty field", does: "Everything you can do to the selection: line style, weight, color, ends, first look, line tag, clean up, copy, duplicate, group, flip, lock, delete. On empty field: paste, select all, clean up all lines." },
      { name: "Selection bar", where: "Bottom of the screen on phones and tablets", does: "Duplicate, Delete, Details, Group and Lock for what you've selected, since there's no right-click." },
      { name: "Selection · Play tab", where: "Right edge of the field", does: "Tucks the right panel away and brings it back." },
      { name: "Run play step / Moves", where: "Selection panel, with a line picked", does: "Which step the line runs in (Auto works it out from the drawing) and whether it moves a player or the ball. A shot is a solid line set to move the ball." },
      { name: "Step numbers", where: "On each line", does: "Show once a play runs in more than one step, so you can see the order before you run it." },
    ],
  },
  {
    id: "practice",
    screen: "Practice",
    to: "/practice",
    intro: "Tonight's practice script: timed periods with drills and plays.",
    buttons: [
      { name: "Build tonight's practice", where: "Top right, and the side menu", does: "Three choices (age group, kind of night, minutes) make a timed script fitted to the time you have, with drills for every period." },
      { name: "Save practice", where: "Top right", does: "Keeps the script on screen under its name so you can run it again. Same name updates it, a new name saves a copy. Sideline keeps 3; Coach keeps every one." },
      { name: "Saved practices", where: "Top right", does: "Lists the practices you saved. Open puts one on screen as tonight's script (after asking if it would replace one); Delete removes it from the list." },
      { name: "Start from a plan", where: "Top right", does: "Opens the ready-made plans. Picking one replaces the script (after asking) and adds its drills to your library." },
      { name: "Print drill cards", where: "Top right", does: "Prints one card per drill and play in the script, with the diagram, setup and coaching points." },
      { name: "Print script", where: "Top right", does: "Prints the one-page script with clock times." },
      { name: "Run live", where: "Top right", does: "Opens live mode for the field." },
      { name: "Add a drill… / Add a play… / Add a whole playbook…", where: "Under each period", does: "Puts a drill, a play or every play in a playbook into that period. × takes one out." },
      { name: "Start time", where: "Top of the script", does: "Gives every period its clock time." },
    ],
  },
  {
    id: "live",
    screen: "Live practice mode",
    to: "/practice/live",
    intro: "Big type and big buttons for the field. It never changes your script.",
    buttons: [
      { name: "Start / Pause / Resume", where: "Middle of the bottom bar", does: "Runs the period clock. Space bar on a laptop." },
      { name: "−1 / +1", where: "Bottom bar", does: "Takes a minute off or adds one." },
      { name: "‹ Prev / Next ›", where: "Bottom bar", does: "Moves to the previous or next period. Arrow keys on a laptop." },
      { name: "Drill tabs", where: "Above the diagram", does: "When a period has more than one drill or play, switch between them." },
      { name: "Run it", where: "On the diagram", does: "Plays the drill's diagram step by step once, then it settles back." },
      { name: "Play film / Watch on Hudl", where: "Under the coaching points", does: "The drill's or play's film. YouTube plays here; Hudl opens in a new tab." },
      { name: "Start over", where: "Top right", does: "Back to the first period with a fresh clock." },
    ],
  },
  {
    id: "drills",
    screen: "Drills",
    to: "/drills",
    intro: "Your drill library, plus the starter drills.",
    buttons: [
      { name: "Your drills / Starter drills", where: "Tabs at the top", does: "Your own library, or the ready-made drills to add from." },
      { name: "Add to my drills / Add all shown", where: "Starter drills tab", does: "Copies starter drills into your library. Each keeps its diagram." },
      { name: "New drill", where: "Top right", does: "Write your own: name, category, minutes, players, setup, gear, coaching points, a Hudl or YouTube film link and a diagram from your Vault." },
      { name: "Edit / Delete", where: "On each drill", does: "Change or remove a drill in your library." },
      { name: "Show / Level", where: "Filters", does: "Narrow the list by category, and by level on the starter tab." },
    ],
  },
  {
    id: "vault",
    screen: "The Vault",
    to: "/vault",
    intro: "Every play you've drawn, the starter plays, and plays other coaches shared.",
    buttons: [
      { name: "Your plays / Starter plays / Shared by coaches", where: "Tabs at the top", does: "Switch between your plays, the ready-made ones and the public ones." },
      { name: "Copy to my Vault / Copy all", where: "Starter and shared tabs", does: "Makes your own copy to change. Copy all files every starter play in a Starter plays playbook." },
      { name: "Open / Export / Delete", where: "On each of your plays", does: "Open in the Designer, print or download it, or delete it." },
      { name: "Search, set, type and sort", where: "Filters row", does: "Find a play by name, set, type or label." },
      { name: "Tick box", where: "Top left of each card", does: "Pick several plays to export or add to a playbook together." },
    ],
  },
  {
    id: "account",
    screen: "Account and League",
    to: "/account",
    intro: "Your plan, billing, invites and the League pack.",
    buttons: [
      { name: "See plans / Manage billing", where: "Your plan card", does: "Change plan, or open Stripe to cancel, change a card or get receipts." },
      { name: "Copy link", where: "Invite a coach card", does: "Your invite link. A coach who joins through it gets the first paid month free; you get a free month when they pay." },
      { name: "Your team", where: "Your team card", does: "Team name, logo and two colors for prints, live mode and the player link (Coach and up). Clear removes them." },
      { name: "Open League", where: "League pack card", does: "Run a League pack: name it, copy the invite link for up to 15 coaches, and remove a coach to free a seat. A coach in a league sees whose it is and can leave." },
    ],
  },
];
