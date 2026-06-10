import type {
  ArtifactType,
  ConstellationId,
  CosmicReactionType,
  DreamCategory,
  EmotionTag,
  FutureLetterTrigger,
  JourneyStage,
  LightForm,
  LightReaction,
  LightType,
  MilestoneType,
  OrbitParams,
  RelationshipKind,
  SignalType,
  UnlockTrigger,
  UserRole,
  WisdomCategory,
} from "./types";

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

// Warm, hopeful palette — golds, soft purples, gentle blues. Never clinical.
const BODY_COLORS = [
  "#ffd27a", // warm gold
  "#f7b267", // amber
  "#c8a2ff", // soft violet
  "#9bb8ff", // gentle blue
  "#ff9ecd", // rose
  "#8be8d8", // aqua
  "#ffc4a3", // peach
];

// People closer to the heart tend to orbit nearer the center.
const RELATIONSHIP_INTIMACY: Record<string, number> = {
  Partner: 0.9,
  Mother: 0.85,
  Father: 0.85,
  Child: 0.85,
  Sister: 0.7,
  Brother: 0.7,
  Friend: 0.55,
  Mentor: 0.5,
  Other: 0.45,
};

// Deterministic-ish but varied orbit so every relationship has its own place.
export function makeOrbit(
  relationship: string,
  index: number,
): OrbitParams {
  const intimacy = RELATIONSHIP_INTIMACY[relationship] ?? 0.5;
  // Nearer for intimate relationships, with spacing so bodies don't overlap.
  const baseRadius = 6 + (1 - intimacy) * 7;
  const radius = baseRadius + index * 2.2 + Math.random() * 1.5;
  return {
    radius,
    speed: (0.04 + Math.random() * 0.05) * (Math.random() > 0.5 ? 1 : -1),
    phase: Math.random() * Math.PI * 2,
    inclination: (Math.random() - 0.5) * 0.6,
    size: 0.7 + intimacy * 0.6,
    color: BODY_COLORS[index % BODY_COLORS.length],
  };
}

// Position of an orbiting body at a given time, including a gentle tilt.
export function orbitPosition(
  orbit: OrbitParams,
  t: number,
): [number, number, number] {
  const angle = orbit.phase + t * orbit.speed;
  const x = Math.cos(angle) * orbit.radius;
  const z = Math.sin(angle) * orbit.radius;
  const y = Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination);
  return [x, y, z];
}

export function relationshipColor(kind: RelationshipKind): string {
  return RELATIONSHIP_INTIMACY[kind] !== undefined
    ? BODY_COLORS[Math.floor(RELATIONSHIP_INTIMACY[kind] * BODY_COLORS.length) % BODY_COLORS.length]
    : "#ffd27a";
}

// Read a File into a data URL (photos, voice notes).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Phase 2: Light visuals & orbits ────────────────────────────────────────

// Each light type carries its own colour and form so the universe reads at a
// glance — without a single label.
const LIGHT_COLORS: Record<LightType, string> = {
  text: "#ffd27a", // a warm note
  voice: "#8be8d8", // a voice, alive and shimmering
  photo: "#9bb8ff", // a remembered image
  future: "#c8a2ff", // a sealed capsule waiting for its moment
};

const LIGHT_FORMS: Record<LightType, LightForm> = {
  text: "orb",
  voice: "firefly",
  photo: "fragment",
  future: "lantern",
};

export function lightColor(type: LightType): string {
  return LIGHT_COLORS[type];
}

export function lightForm(type: LightType): LightForm {
  return LIGHT_FORMS[type];
}

// Deterministic hash of an id → orbit params, so a light always returns to the
// same place around the star (and the camera can find it to focus).
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

// Stable 0..1 value from an id — used to give each planet its own type & seed.
export function seedFrom(id: string): number {
  return hashId(id);
}

// A stable home for each citizen's solar system, scattered across a galactic
// disk so systems never overlap and the galaxy feels vast. Deterministic from
// the owner id, so a person is always in the same place for everyone.
export function galaxyPosition(ownerId: string): [number, number, number] {
  const h1 = hashId(ownerId);
  const h2 = hashId(ownerId + "::y");
  const h3 = hashId(ownerId + "::a");
  // Golden-angle spiral keeps systems evenly spread; radius grows outward but
  // stays well inside the starfield so the sky always reads as background.
  const ring = Math.floor(h1 * 6); // 0..5 rough distance bands
  const radius = 34 + ring * 26 + h2 * 18;
  const angle = h3 * Math.PI * 2 + ring * 2.399963; // golden angle per ring
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = (h2 - 0.5) * 26; // gentle vertical scatter
  return [x, y, z];
}

export interface LightOrbit {
  radius: number;
  speed: number;
  phase: number;
  inclination: number;
}

// Lights pool in a soft shell around the user's star — near enough to feel
// present, far enough to surround. Sealed capsules drift a little further out.
export function lightOrbit(
  id: string,
  base: number,
  sealed: boolean,
): LightOrbit {
  const h = hashId(id);
  const h2 = hashId(id + "~");
  const radius = (sealed ? 13 : 7.5) + h * 6 + (sealed ? 2 : 0);
  return {
    radius,
    speed: (0.03 + h2 * 0.04) * (h > 0.5 ? 1 : -1),
    phase: base * Math.PI * 2 + h2 * 0.6,
    inclination: (h2 - 0.5) * 1.1,
  };
}

export function lightPosition(
  o: LightOrbit,
  t: number,
): [number, number, number] {
  const a = o.phase + t * o.speed;
  const x = Math.cos(a) * o.radius;
  const z = Math.sin(a) * o.radius;
  const y = Math.sin(a) * o.radius * Math.sin(o.inclination);
  return [x, y, z];
}

export const REACTION_LABELS: Record<LightReaction, string> = {
  thank_you: "Thank you",
  this_helped: "This helped",
  saved_for_later: "Saved for later",
};

export const UNLOCK_LABELS: Record<UnlockTrigger, string> = {
  scared: "When you feel scared",
  lonely: "When you feel lonely",
  motivation: "When you need motivation",
  birthday: "On your birthday",
  treatment_complete: "When treatment is complete",
  one_year: "One year from now",
};

// Emotions the user can summon support for; occasions arrive in life.
export const FEELING_TRIGGERS: UnlockTrigger[] = ["scared", "lonely", "motivation"];
export const OCCASION_TRIGGERS: UnlockTrigger[] = ["birthday", "treatment_complete"];

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// A sealed light is openable when its time has come (one_year) or when the user
// summons the moment it was kept for (emotions/occasions, via the door).
export function unlockTimeFor(trigger: UnlockTrigger, from: number): number | undefined {
  return trigger === "one_year" ? from + YEAR_MS : undefined;
}

// ─── Phase 4: Memory Nebulas ─────────────────────────────────────────────────

export interface EmotionPalette {
  primary: string;
  secondary: string;
  glow: string;
  bg: string; // interior background tint
}

export const EMOTION_PALETTES: Record<EmotionTag, EmotionPalette> = {
  joy:       { primary: "#ffd27a", secondary: "#f7b267", glow: "#ffb347", bg: "#080500" },
  love:      { primary: "#ff9ecd", secondary: "#ffd27a", glow: "#ff6eb4", bg: "#080104" },
  proud:     { primary: "#ffd27a", secondary: "#eaeaf2", glow: "#ffe9b8", bg: "#080700" },
  adventure: { primary: "#9bb8ff", secondary: "#c8a2ff", glow: "#7090ee", bg: "#010408" },
  hope:      { primary: "#8be8d8", secondary: "#ffd27a", glow: "#5ecfba", bg: "#010806" },
  peace:     { primary: "#aabfff", secondary: "#d0deff", glow: "#6080cc", bg: "#010408" },
};

export const EMOTION_LABELS: Record<EmotionTag, string> = {
  joy: "Joy", love: "Love", proud: "Proud",
  adventure: "Adventure", hope: "Hope", peace: "Peace",
};

export const EMOTION_GLYPHS: Record<EmotionTag, string> = {
  joy: "✦", love: "♡", proud: "★",
  adventure: "◈", hope: "✧", peace: "◎",
};

export interface ArtifactDef {
  type: ArtifactType;
  label: string;
  glyph: string;
  description: string;
}

export const ARTIFACT_DEFS: ArtifactDef[] = [
  { type: "photo",  label: "Photo",         glyph: "◇", description: "A glowing crystal" },
  { type: "voice",  label: "Voice memory",  glyph: "◉", description: "A floating sound orb" },
  { type: "story",  label: "Written story", glyph: "≡", description: "An ancient scroll" },
  { type: "video",  label: "Video",         glyph: "▷", description: "A moving light prism" },
];

// Position of a memory nebula near its owner's solar system.
// Nebulas float 22–42 units from the owner star — beyond the planetary system.
export function nebulaGalaxyPosition(
  nebulaId: string,
  ownerPos: [number, number, number],
): [number, number, number] {
  const h1 = hashId(nebulaId + "::na");
  const h2 = hashId(nebulaId + "::nb");
  const h3 = hashId(nebulaId + "::nc");
  const dist = 22 + h1 * 20;
  const angle = h2 * Math.PI * 2;
  return [
    ownerPos[0] + Math.cos(angle) * dist,
    ownerPos[1] + (h3 - 0.5) * 14,
    ownerPos[2] + Math.sin(angle) * dist,
  ];
}

// Stable floating position of an artifact inside a nebula (local space, centered at origin).
export function artifactInteriorPosition(artifactId: string): [number, number, number] {
  const h1 = hashId(artifactId + "::ix");
  const h2 = hashId(artifactId + "::iy");
  const h3 = hashId(artifactId + "::iz");
  const phi = Math.acos(2 * h2 - 1);
  const theta = h1 * Math.PI * 2;
  const r = 3 + h3 * 8;
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi) * 0.45,
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: "On the journey",
  survivor: "Survivor",
  caregiver: "Caregiver",
  supporter: "Supporter",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  patient: "#ffd27a",
  survivor: "#ffd27a",
  caregiver: "#9bb8ff",
  supporter: "#8be8d8",
};

export const STAGE_LABELS: Record<JourneyStage, string> = {
  diagnosis: "Diagnosis",
  treatment: "In treatment",
  remission: "Remission",
  survivorship: "Survivorship",
};

export interface MilestoneDef {
  type: MilestoneType;
  glyph: string;
  label: string;
  defaultTitle: string;
}

export const MILESTONE_DEFS: MilestoneDef[] = [
  { type: "treatment_started", glyph: "✦", label: "Treatment started", defaultTitle: "Treatment began" },
  { type: "surgery_done", glyph: "◈", label: "Surgery complete", defaultTitle: "Surgery complete" },
  { type: "chemo_complete", glyph: "◎", label: "Chemo complete", defaultTitle: "Chemo is done" },
  { type: "radiation_done", glyph: "◉", label: "Radiation done", defaultTitle: "Radiation complete" },
  { type: "first_clear_scan", glyph: "✧", label: "First clear scan", defaultTitle: "First clear scan" },
  { type: "treatment_complete", glyph: "✺", label: "Treatment complete", defaultTitle: "Treatment is complete" },
  { type: "one_year_clear", glyph: "★", label: "One year clear", defaultTitle: "One year clear" },
  { type: "five_year_clear", glyph: "✵", label: "Five years clear", defaultTitle: "Five years clear" },
  { type: "custom", glyph: "·", label: "My own moment", defaultTitle: "" },
];

// ─── Phase 5: Dream Galaxy ────────────────────────────────────────────────────

export interface DreamCategoryPalette {
  star: string;   // main star color
  glow: string;   // halo glow color
  core: string;   // inner bright core
}

export const DREAM_CATEGORY_PALETTES: Record<DreamCategory, DreamCategoryPalette> = {
  adventure: { star: "#f7a741", glow: "#f76c1a", core: "#ffe0a0" },
  creativity: { star: "#f76d8d", glow: "#f72a6c", core: "#ffc0d8" },
  family:     { star: "#ffd27a", glow: "#ffa930", core: "#fff4cc" },
  purpose:    { star: "#5bc8e8", glow: "#2ab0cc", core: "#c0f0ff" },
};

export const DREAM_CATEGORY_LABELS: Record<DreamCategory, string> = {
  adventure: "Adventure",
  creativity: "Creativity",
  family: "Family",
  purpose: "Purpose",
};

export const DREAM_CATEGORY_GLYPHS: Record<DreamCategory, string> = {
  adventure: "◈",
  creativity: "✦",
  family: "♡",
  purpose: "✺",
};

export const FUTURE_LETTER_LABELS: Record<FutureLetterTrigger, string> = {
  dream_completed: "When this dream comes true",
  one_year: "One year from now",
  five_years: "Five years from now",
};

// Dream stars live in deep space — far beyond nebulas and the planetary system.
// Radius 80–160 units from the owner's star, generous vertical spread.
export function dreamGalaxyPosition(
  dreamId: string,
  ownerPos: [number, number, number],
): [number, number, number] {
  const h1 = hashId(dreamId + "::da");
  const h2 = hashId(dreamId + "::db");
  const h3 = hashId(dreamId + "::dc");
  const dist = 80 + h1 * 80;
  const angle = h2 * Math.PI * 2;
  return [
    ownerPos[0] + Math.cos(angle) * dist,
    ownerPos[1] + (h3 - 0.5) * 70,
    ownerPos[2] + Math.sin(angle) * dist,
  ];
}

export const WISDOM_CATEGORY_LABELS: Record<WisdomCategory, string> = {
  fear: "Fear",
  hope: "Hope",
  relationships: "Relationships",
  work: "Work",
  dreams: "Dreams",
  recovery: "Recovery",
  identity: "Identity",
};

export const WISDOM_CATEGORY_GLYPHS: Record<WisdomCategory, string> = {
  fear: "◌",
  hope: "✦",
  relationships: "♡",
  work: "◈",
  dreams: "✨",
  recovery: "◉",
  identity: "◎",
};

// ─── Phase 8: Shared Universe ────────────────────────────────────────────────

export const CONSTELLATION_LABELS: Record<ConstellationId, string> = {
  artists: "Artists",
  readers: "Readers",
  musicians: "Musicians",
  travelers: "Travelers",
  developers: "Developers",
  gardeners: "Gardeners",
  photographers: "Photographers",
  walkers: "Walkers",
};

export const CONSTELLATION_GLYPHS: Record<ConstellationId, string> = {
  artists: "🎨",
  readers: "📚",
  musicians: "🎸",
  travelers: "✈",
  developers: "💻",
  gardeners: "🌱",
  photographers: "📷",
  walkers: "🏃",
};

export const CONSTELLATION_DESCRIPTIONS: Record<ConstellationId, string> = {
  artists: "People who create with their hands and hearts",
  readers: "People who find whole worlds between pages",
  musicians: "People for whom music is medicine",
  travelers: "People who dream of new horizons",
  developers: "People who build things that didn't exist before",
  gardeners: "People who know how to coax life from soil",
  photographers: "People who notice what others miss",
  walkers: "People who find clarity in movement",
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  dream: "Dream",
  memory: "Memory",
  milestone: "Milestone",
  reflection: "Reflection",
  hope: "Hope",
};

export const SIGNAL_TYPE_GLYPHS: Record<SignalType, string> = {
  dream: "✨",
  memory: "◈",
  milestone: "★",
  reflection: "◎",
  hope: "✶",
};

export const COSMIC_REACTION_LABELS: Record<CosmicReactionType, string> = {
  light: "Sending Light",
  relate: "I Relate",
  inspired: "Inspired Me",
  thanks: "Thank You",
};

export const COSMIC_REACTION_GLYPHS: Record<CosmicReactionType, string> = {
  light: "✨",
  relate: "🌙",
  inspired: "☀",
  thanks: "⭐",
};

export function formatDate(value?: string | number): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Phase 9: Light Bridge ────────────────────────────────────────────────────

// Strips everything but digits, dropping a leading 00 (international prefix
// written as 00) since wa.me expects a bare country code + number.
export function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

export function isValidWhatsapp(raw: string): boolean {
  const digits = normalizeWhatsapp(raw);
  return digits.length >= 8 && digits.length <= 15;
}

// A warm, ready-to-send introduction — both sides see the same text so the
// first WhatsApp message never feels like a cold open.
export function craftIntroMessage(opts: { fromName: string; toName: string; note?: string }): string {
  const { fromName, toName, note } = opts;
  const base = `Hi ${toName} — it's ${fromName} 🌌 We connected through Gold.`;
  return note?.trim() ? `${base} ${note.trim()}` : `${base} Glad to be in touch.`;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(message)}`;
}
