import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { FieldBackground } from "./field";
import { drawOrder, MarkerDefs, NodeLayer, strokeColors } from "./render";
import { frameScene } from "./frames";
import { sportOf } from "./fieldUnits";
import { attackGoal, goalsFor, yardScale, type BallState, type Goal } from "./filmLab";
import { isBall } from "./runPlay";
import { CANVAS_H, CANVAS_W, type PlayerNode, type Point, type Scene } from "./types";

/**
 * Film Lab's 3D stage: the drawing stood up on a lacrosse field in three.js.
 * The field and the lines are the Designer's own drawing, painted onto the
 * grass, so every field (men's, women's, box) and line looks as coaches drew
 * it. Players are built here from simple shapes (no model files) in their
 * token colors, with sticks, and run, cradle, pass and shoot as Run play's
 * clock moves them. One world unit is one yard; y is up.
 */

export type CameraKind = "standard" | "wide" | "overhead" | "sideline" | "endline" | "goalie" | "eyes" | "ball" | "free";
export const CAMERAS: { id: CameraKind; label: string; hint: string }[] = [
  { id: "standard", label: "Standard", hint: "Behind the attack, the way a coach films from the stands." },
  { id: "wide", label: "Wide", hint: "High behind the play: all twenty players and the spacing." },
  { id: "overhead", label: "Overhead", hint: "Straight down, like the whiteboard." },
  { id: "sideline", label: "Sideline", hint: "From the sideline at field level, like a broadcast." },
  { id: "endline", label: "End line", hint: "High behind the cage, looking out at the attack." },
  { id: "goalie", label: "Goalie's eyes", hint: "What the goalie sees from the crease." },
  { id: "eyes", label: "Player's eyes", hint: "From the picked player's helmet." },
  { id: "ball", label: "Follow the ball", hint: "The camera rides with the ball." },
  { id: "free", label: "Free look", hint: "Drag to turn, scroll or pinch to zoom." },
];

export type StageOptions = { lines: boolean; labels: boolean };
export type StageState = { spots: Map<string, Point>; ball: BallState };

const GROUND = 0.02;
const LONG = new Set(["D", "L", "LSM", "DL"]);
const PIPE = "#E8562A";

type Rig = {
  id: string;
  node: PlayerNode;
  root: THREE.Group;
  hips: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  stick: THREE.Group;
  pocket: THREE.Object3D;
  label: THREE.Sprite;
  heading: number;
  phase: number;
  speed: number;
  last: THREE.Vector2 | null;
  goalie: boolean;
};

const mat = (color: string, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

/** A capsule hanging from its top, so it swings from a hip or shoulder. */
function limb(r: number, len: number, m: THREE.Material) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
  mesh.position.y = -len / 2 - r;
  mesh.castShadow = true;
  g.add(mesh);
  return g;
}

function letterSprite(text: string, fill: string, ink: string, square: boolean) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = fill;
  x.strokeStyle = "#ffffff";
  x.lineWidth = 8;
  x.beginPath();
  if (square) x.roundRect(14, 14, 100, 100, 18);
  else x.arc(64, 64, 52, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = ink;
  x.font = `700 ${text.length > 2 ? 40 : 56}px "Saira Condensed", system-ui, sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text.slice(0, 3), 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.55, 0.55, 1);
  s.renderOrder = 10;
  return s;
}

/** A player in his token's colors: helmet (not on the women's field, where field players wear goggles), stick sized for his position. */
function buildPlayer(node: PlayerNode, womens: boolean): Rig {
  const goalie = /^G$/i.test(node.label) || /goal/i.test(node.name ?? "");
  // Offense wears the token color; the defense wears white with the token color on the helmet and shorts, so the two teams read apart.
  const d = node.side === "defense";
  const jersey = mat(d ? "#EEF1F4" : node.fill || "#2B6CB0");
  const shorts = mat(d ? shade(node.fill || "#2B6CB0", 0.8) : shade(node.fill || "#2B6CB0", 0.45));
  const skin = mat("#C99B77", 0.8);
  const dark = mat("#14161A", 0.5);
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.98;
  root.add(hips);
  const legL = limb(0.1, 0.7, shorts);
  const legR = limb(0.1, 0.7, shorts);
  legL.position.set(-0.11, 0, 0);
  legR.position.set(0.11, 0, 0);
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), dark);
    shoe.position.set(0, -0.93, 0.05);
    shoe.castShadow = true;
    leg.add(shoe);
  }
  hips.add(legL, legR);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(goalie ? 0.24 : 0.2, 0.42, 4, 12), jersey);
  torso.position.y = 0.36;
  torso.scale.set(1, 1, 0.72);
  torso.castShadow = true;
  hips.add(torso);
  const armL = limb(0.072, 0.46, jersey);
  const armR = limb(0.072, 0.46, jersey);
  armL.position.set(-0.27, 0.6, 0);
  armR.position.set(0.27, 0.6, 0);
  for (const arm of [armL, armR]) {
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), dark);
    glove.position.y = -0.64;
    arm.add(glove);
  }
  hips.add(armL, armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
  head.position.y = 0.82;
  head.castShadow = true;
  hips.add(head);
  if (!womens || goalie) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(shade(node.fill || "#2B6CB0", d ? 1 : 0.7), 0.35));
    shell.position.y = 0.84;
    shell.rotation.x = -0.25;
    shell.castShadow = true;
    hips.add(shell);
    const mask = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 16, Math.PI), mat("#D9DEE5", 0.3));
    mask.position.set(0, 0.79, 0.11);
    mask.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI);
    hips.add(mask);
  } else {
    const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.133, 0.014, 6, 24), dark);
    goggles.position.y = 0.84;
    goggles.rotation.x = Math.PI / 2;
    hips.add(goggles);
  }
  // The stick: shaft from the hands up past the right shoulder, the head (and pocket) on top.
  const long = LONG.has(node.label.toUpperCase()) && node.side === "offense" ? true : /^(L|LSM|DL)$/i.test(node.label);
  const shaftLen = goalie ? 1.15 : long ? 1.75 : 1.05;
  const stick = new THREE.Group();
  stick.position.set(0.2, 0.42, 0.18);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, shaftLen, 8), mat(long ? "#C9CED6" : "#1E2228", 0.35));
  shaft.position.y = shaftLen / 2 - 0.25;
  stick.add(shaft);
  const headW = goalie ? 0.2 : 0.09;
  const headL = goalie ? 0.26 : 0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 6, 20), mat("#F4F6F8", 0.4));
  ring.scale.set(headW, headL, headW);
  ring.position.y = shaftLen - 0.25 + headL * 0.9;
  stick.add(ring);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshStandardMaterial({ color: "#E9E2D0", transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  mesh.scale.set(headW * 0.9, headL * 0.9, 1);
  mesh.position.copy(ring.position);
  stick.add(mesh);
  const pocket = new THREE.Object3D();
  pocket.position.set(0, ring.position.y, 0.03);
  stick.add(pocket);
  stick.rotation.set(-0.15, 0, -0.32);
  hips.add(stick);
  const label = letterSprite(node.label || "•", node.fill || "#2B6CB0", node.textColor || "#ffffff", d);
  label.position.y = 2.45;
  root.add(label);
  if (goalie) root.scale.setScalar(1.04);
  root.traverse((o) => (o.userData.playerId = node.id));
  return { id: node.id, node, root, hips, legL, legR, armL, armR, stick, pocket, label, heading: 0, phase: 0, speed: 0, last: null, goalie };
}

/** A goal: two pipes and a crossbar on the goal line, the frame sloping back to the net's point behind it. */
function buildGoal(goal: Goal, upy: number, box: boolean) {
  const g = new THREE.Group();
  const w = box ? 4 / 3 : 2;
  const h = box ? 1.5 : 2;
  const back = box ? 1.1 : 7 / 3;
  const pipe = mat(PIPE, 0.4);
  const tube = (a: THREE.Vector3, b: THREE.Vector3, r = 0.04) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), pipe);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true;
    return m;
  };
  const L = new THREE.Vector3(-w / 2, 0, 0);
  const R = new THREE.Vector3(w / 2, 0, 0);
  const LT = new THREE.Vector3(-w / 2, h, 0);
  const RT = new THREE.Vector3(w / 2, h, 0);
  const B = new THREE.Vector3(0, 0, -back);
  g.add(tube(L, LT), tube(R, RT), tube(LT, RT), tube(LT, B, 0.025), tube(RT, B, 0.025), tube(L, B, 0.025), tube(R, B, 0.025));
  const netGeo = new THREE.BufferGeometry().setFromPoints([L, LT, B, LT, RT, B, RT, R, B, L, R, B]);
  netGeo.computeVertexNormals();
  const net = new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.45 }));
  const netFill = new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  g.add(net, netFill);
  g.position.set(goal.at.x / upy, 0, goal.at.y / upy);
  // The mouth faces midfield (`out`); local +z points there.
  g.rotation.y = Math.atan2(goal.out.x, goal.out.y);
  return g;
}

/** The field and (when on) the lines, painted the way the Designer draws them, as an image for the grass. */
async function fieldImage(scene: Scene, lines: boolean): Promise<HTMLCanvasElement> {
  const nodes = lines ? drawOrder(scene.nodes).filter((n) => n.kind === "path" || n.kind === "shape") : [];
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}`, width: CANVAS_W * 2, height: CANVAS_H * 2 },
      createElement(MarkerDefs, { colors: strokeColors(scene.nodes) }),
      scene.view === "blank"
        ? createElement(Fragment, null, createElement("rect", { width: CANVAS_W, height: CANVAS_H, fill: "#3F7D3A" }))
        : createElement(FieldBackground, { view: scene.view, losY: scene.losY }),
      ...nodes.map((n) => createElement(NodeLayer, { key: n.id, node: n, opacity: 0.85 })),
    ),
  );
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = CANVAS_W * 2;
  c.height = CANVAS_H * 2;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const lerpAngle = (a: number, b: number, k: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

export class FilmStage {
  readonly renderer: THREE.WebGLRenderer;
  private three = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 900);
  private controls: OrbitControls;
  private world = new THREE.Group();
  private rigs = new Map<string, Rig>();
  private ball: THREE.Mesh;
  private field: THREE.Mesh | null = null;
  private scene: Scene | null = null;
  private upy = 11;
  private goal: Goal = { at: { x: 520, y: 40 }, out: { x: 0, y: 1 } };
  private kind: CameraKind = "standard";
  private who: string | null = null;
  private state: StageState = { spots: new Map(), ball: { at: null, flight: null } };
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private snap = true;
  private raf = 0;
  private clock = new THREE.Clock();
  private opts: StageOptions = { lines: true, labels: true };
  private loadId = 0;
  private holder: string | null = null;
  private release = new Map<string, number>();

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.background = new THREE.Color("#8FB8DE");
    this.three.fog = new THREE.Fog("#8FB8DE", 120, 320);
    this.three.add(new THREE.HemisphereLight("#DDEBFF", "#3B5B2E", 1.1));
    const sun = new THREE.DirectionalLight("#FFF4E0", 2.1);
    sun.position.set(-40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 220 });
    sun.shadow.bias = -0.0004;
    this.three.add(sun, sun.target);
    const surround = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: "#34612F", roughness: 1 }));
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.01;
    surround.receiveShadow = true;
    this.three.add(surround, this.world);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: "#F7D23E", roughness: 0.5, emissive: "#3A2E00" }));
    this.ball.castShadow = true;
    this.three.add(this.ball);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 160;
    this.loop();
  }

  /** Stand a drawing up on the field. Resolves once the grass is painted. */
  async load(scene: Scene, opts: StageOptions) {
    const id = ++this.loadId;
    const s = frameScene(scene);
    this.scene = s;
    this.opts = opts;
    this.upy = yardScale(s.view);
    this.goal = attackGoal(scene);
    for (const r of this.rigs.values()) this.world.remove(r.root);
    this.rigs.clear();
    this.world.clear();
    this.release.clear();
    const womens = sportOf(s.view) === "womens_field";
    const box = sportOf(s.view) === "box";
    for (const n of s.nodes) {
      if (n.kind !== "player" || n.hidden || n.side === "ball" || n.ghostOf) continue;
      const rig = buildPlayer(n, womens);
      rig.label.visible = opts.labels;
      this.rigs.set(n.id, rig);
      this.world.add(rig.root);
    }
    // Cones stay cones.
    for (const n of s.nodes) {
      if (n.kind !== "player" || n.hidden || n.side !== "ball" || isBall(n)) continue;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 14), mat("#F28C28", 0.6));
      cone.position.set(n.x / this.upy, 0.19, n.y / this.upy);
      cone.castShadow = true;
      this.world.add(cone);
    }
    for (const g of goalsFor(s.view)) this.world.add(buildGoal(g, this.upy, box));
    this.ball.visible = s.nodes.some((n) => n.kind === "player" && isBall(n));
    await this.paint();
    if (id !== this.loadId) return;
    this.snap = true;
  }

  private async paint() {
    if (!this.scene) return;
    const img = await fieldImage(this.scene, this.opts.lines);
    const tex = new THREE.CanvasTexture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const w = CANVAS_W / this.upy;
    const h = CANVAS_H / this.upy;
    if (this.field) {
      this.three.remove(this.field);
      (this.field.material as THREE.MeshStandardMaterial).map?.dispose();
    }
    this.field = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    this.field.rotation.x = -Math.PI / 2;
    this.field.position.set(w / 2, GROUND - 0.015, h / 2);
    this.field.receiveShadow = true;
    this.three.add(this.field);
  }

  async setOptions(opts: StageOptions) {
    const repaint = opts.lines !== this.opts.lines;
    this.opts = opts;
    for (const r of this.rigs.values()) r.label.visible = opts.labels;
    if (repaint) await this.paint();
  }

  setCamera(kind: CameraKind, who: string | null = this.who) {
    this.kind = kind;
    this.who = who;
    this.controls.enabled = kind === "free";
    if (kind === "free") this.controls.target.copy(this.camLook);
  }

  /** Where everyone is now; the stage turns and animates them on the next frames. */
  setState(state: StageState) {
    this.state = state;
  }

  players() {
    return [...this.rigs.values()].map((r) => ({ id: r.id, label: r.node.label || "?", side: r.node.side, fill: r.node.fill }));
  }

  /** The player under a tap, if any. */
  pick(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.camera);
    const hit = ray.intersectObjects([...this.rigs.values()].map((r) => r.root), true).find((h) => h.object.userData.playerId);
    return hit ? (hit.object.userData.playerId as string) : null;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.renderer.dispose();
  }

  private world3(p: Point, y = 0) {
    return new THREE.Vector3(p.x / this.upy, y, p.y / this.upy);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    this.animate(dt);
    this.aim(dt);
    this.renderer.render(this.three, this.camera);
  };

  private animate(dt: number) {
    const { spots, ball } = this.state;
    // Who has the ball: nobody while it flies; else whoever is within a stick's reach.
    let holder: string | null = ball.holder !== undefined && !ball.flight ? ball.holder : null;
    if (holder && !this.rigs.has(holder)) holder = null;
    if (ball.holder === undefined && ball.at && !ball.flight) {
      let best = 1.6 * this.upy;
      for (const r of this.rigs.values()) {
        const p = spots.get(r.id) ?? r.node;
        const d = Math.hypot(p.x - ball.at.x, p.y - ball.at.y);
        if (d < best) (best = d), (holder = r.id);
      }
    }
    if (this.holder && !holder && ball.flight) this.release.set(this.holder, performance.now());
    this.holder = holder;
    const goal3 = this.world3(this.goal.at);
    const ball3 = ball.at ? this.world3(ball.at) : goal3;
    for (const r of this.rigs.values()) {
      const p = spots.get(r.id) ?? r.node;
      const now = new THREE.Vector2(p.x / this.upy, p.y / this.upy);
      const moved = r.last ? now.distanceTo(r.last) : 0;
      // A jump (scrubbing, a new play) isn't running.
      const run = moved > 1.5 ? 0 : moved / Math.max(dt, 1e-3);
      r.speed += (Math.min(9, run) - r.speed) * Math.min(1, dt * 8);
      let want = r.heading;
      if (r.speed > 0.6 && r.last && moved > 1e-4) want = Math.atan2(now.x - r.last.x, now.y - r.last.y);
      else {
        const target = r.id === holder ? goal3 : ball3;
        want = Math.atan2(target.x - now.x, target.z - now.y);
      }
      r.heading = moved > 1.5 ? want : lerpAngle(r.heading, want, Math.min(1, dt * 7));
      r.last = now;
      r.phase += r.speed * dt * 1.25;
      const stride = Math.min(1, r.speed / 6);
      const swing = Math.sin(r.phase * Math.PI) * 0.75 * stride;
      r.legL.rotation.x = swing;
      r.legR.rotation.x = -swing;
      r.armL.rotation.x = -swing * 0.8;
      const ready = r.speed < 0.6;
      // Defenders sit in a stance; the goalie lower still.
      const crouch = ready ? (r.goalie ? 0.16 : r.node.side === "defense" ? 0.1 : 0.04) : 0.02;
      r.hips.position.y = 0.98 - crouch + Math.abs(Math.sin(r.phase * Math.PI)) * 0.05 * stride;
      r.hips.rotation.x = ready ? crouch * 1.4 : 0.18 * stride;
      r.legL.rotation.z = ready ? -crouch : 0;
      r.legR.rotation.z = ready ? crouch : 0;
      // The stick: cradled up by the ear with the ball, held across the body on defense, swung through on a release.
      const thrown = this.release.get(r.id);
      const since = thrown ? (performance.now() - thrown) / 1000 : 9;
      if (since < 0.45) {
        const k = Math.sin((since / 0.45) * Math.PI);
        r.stick.rotation.set(-0.15 + k * 1.4, 0, -0.32 + k * 0.25);
        r.armR.rotation.x = -k * 1.6;
      } else if (r.id === holder) {
        const cradle = Math.sin(performance.now() / 160) * 0.12;
        r.stick.rotation.set(-0.25 + cradle, 0, -0.18);
        r.armR.rotation.x = -0.9 - cradle;
        r.armL.rotation.x = -0.5;
      } else if (r.node.side === "defense" || r.goalie) {
        r.stick.rotation.set(r.goalie ? 0.1 : 0.55, 0, r.goalie ? -0.05 : -0.55);
        r.armR.rotation.x = -0.7;
        if (ready) r.armL.rotation.x = -0.6;
      } else {
        r.stick.rotation.set(-0.15, 0, -0.32);
        r.armR.rotation.x = -0.5 + swing * 0.3;
      }
      r.root.position.set(now.x, 0, now.y);
      r.root.rotation.y = r.heading;
    }
    // The ball: in the pocket, in the air on a pass or shot, or on the grass.
    if (ball.flight) {
      const f = ball.flight;
      const a = this.world3(f.from);
      const b = this.world3(f.to);
      const len = a.distanceTo(b);
      const h0 = 2.0;
      const h1 = f.shot ? 0.7 : 1.9;
      const lift = f.shot ? 0.25 : Math.min(2.2, len * 0.07);
      const y = h0 + (h1 - h0) * f.k + Math.sin(Math.PI * f.k) * lift;
      this.ball.position.set(a.x + (b.x - a.x) * f.k, y, a.z + (b.z - a.z) * f.k);
    } else if (holder) {
      this.rigs.get(holder)!.pocket.getWorldPosition(this.ball.position);
    } else if (ball.at) {
      // A shot that ends at the cage sits in the back of the net.
      const at = this.world3(ball.at, 0.08);
      const G = this.world3(this.goal.at);
      if (at.distanceTo(G) < 2.5 && goalsFor(this.scene?.view ?? "blank").length) at.copy(G).addScaledVector(new THREE.Vector3(this.goal.out.x, 0, this.goal.out.y), -0.8).setY(0.35);
      this.ball.position.copy(at);
    }
  }

  /** Where the camera wants to be for its kind, and what it looks at. */
  private desired(): { pos: THREE.Vector3; look: THREE.Vector3; rate: number } {
    const { spots } = this.state;
    const pts = [...this.rigs.values()].map((r) => spots.get(r.id) ?? r.node);
    const c = pts.length ? { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length } : { x: CANVAS_W / 2, y: CANVAS_H / 2 };
    const C = this.world3(c);
    const G = this.world3(this.goal.at);
    const out = new THREE.Vector3(this.goal.out.x, 0, this.goal.out.y);
    const right = new THREE.Vector3(this.goal.out.y, 0, -this.goal.out.x);
    const B = this.ball.visible ? this.ball.position.clone() : C.clone();
    const up = (v: THREE.Vector3, y: number) => v.clone().setY(y);
    const spread = Math.max(12, ...pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y) / this.upy));
    switch (this.kind) {
      case "wide":
        return { pos: up(C.clone().addScaledVector(out, spread * 2.1 + 12), spread * 1.3 + 10), look: up(C.clone().addScaledVector(out, -2), 0), rate: 3 };
      case "overhead":
        return { pos: up(C.clone().addScaledVector(out, 0.5), spread * 2.4 + 12), look: C, rate: 3 };
      case "sideline":
        return { pos: up(C.clone().addScaledVector(right, -(spread * 1.6 + 12)), 7), look: up(C, 1), rate: 3 };
      case "endline":
        return { pos: up(G.clone().addScaledVector(out, -9), 9), look: up(C, 1), rate: 3 };
      case "goalie":
      {
        // He tracks the ball; once it's past him (in the net, behind the cage) he looks back out at the play.
        const front = B.clone().sub(G).dot(out) > 2.5;
        return { pos: up(G.clone().addScaledVector(out, 1.4), 1.65), look: front ? up(B, Math.max(0.8, B.y)) : up(C, 1), rate: 5 };
      }
      case "ball":
        return { pos: up(B.clone().addScaledVector(out, 7).addScaledVector(right, -2.5), 3.6), look: B, rate: 4 };
      case "eyes": {
        const r = this.who ? this.rigs.get(this.who) : undefined;
        if (r) {
          const eye = new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading));
          // Just behind and above his helmet, so the man guarding him doesn't fill the shot.
          const pos = r.root.position.clone().setY(2.1).addScaledVector(eye, -0.7);
          const look = this.holder === r.id ? up(G, 1) : B.clone().setY(Math.max(1, B.y));
          return { pos, look, rate: 14 };
        }
        break;
      }
      case "free":
        return { pos: this.camera.position.clone(), look: this.controls.target.clone(), rate: 0 };
    }
    return { pos: up(C.clone().addScaledVector(out, spread * 1.45 + 8), spread * 0.85 + 6), look: up(C.clone().lerp(G, 0.1), 0), rate: 3 };
  }

  /** The player whose eyes the camera is in, hidden so his own helmet and stick don't fill the shot. */
  private hideSelf() {
    let me: string | null = null;
    if (this.kind === "eyes") me = this.who;
    if (this.kind === "goalie") {
      let best = 4;
      const G = this.world3(this.goal.at);
      for (const r of this.rigs.values()) {
        const d = r.root.position.distanceTo(G);
        if (r.goalie && d < best) (best = d), (me = r.id);
      }
    }
    for (const r of this.rigs.values()) {
      r.root.visible = r.id !== me;
      // A letter right in front of the lens would cover the field.
      r.label.visible = this.opts.labels && r.root.position.distanceTo(this.camera.position) > 6;
    }
  }

  private aim(dt: number) {
    this.hideSelf();
    if (this.kind === "free") {
      this.controls.update();
      this.camLook.copy(this.controls.target);
      this.camPos.copy(this.camera.position);
      return;
    }
    const d = this.desired();
    const k = this.snap ? 1 : 1 - Math.exp(-dt * d.rate);
    this.snap = false;
    this.camPos.lerp(d.pos, k);
    this.camLook.lerp(d.look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }
}
