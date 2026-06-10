// Domain model for Universe.
// The person is always the center. Nothing here references illness or diagnosis.

export type UserRole = "patient" | "survivor" | "caregiver" | "supporter";

export type JourneyStage = "diagnosis" | "treatment" | "remission" | "survivorship";

export type MilestoneType =
  | "treatment_started"
  | "surgery_done"
  | "chemo_complete"
  | "radiation_done"
  | "first_clear_scan"
  | "one_year_clear"
  | "five_year_clear"
  | "treatment_complete"
  | "custom";

export interface Milestone {
  id: string;
  type: MilestoneType;
  title: string;
  description?: string;
  date: string; // ISO date
  createdAt: number;
  isPublic: boolean;
}

// ─── Phase 4: Memory Nebulas ─────────────────────────────────────────────────
// Nebulas are places, not galleries. Each is a chapter of life shaped by a
// single emotion, filled with artifacts that float like stars inside a cloud.

export type EmotionTag = "joy" | "love" | "proud" | "adventure" | "hope" | "peace";

export type ArtifactType = "photo" | "voice" | "story" | "video";

export interface MemoryNebula {
  id: string;
  title: string;
  emotion: EmotionTag;
  createdAt: number;
  echoCount: number;
  participantIds: string[]; // other ownerIds who co-own this memory place
  // Runtime-only — set when this nebula was injected from another citizen's universe.
  // Never persisted.
  sharedFromId?: string;
}

export interface MemoryArtifact {
  id: string;
  nebulaId: string;
  type: ArtifactType;
  content: string; // text (story) or data URL (photo/voice/video)
  caption: string;
  date: string; // ISO date
  createdAt: number;
  linkedArtifactId?: string; // memory trail link
}

// ─── Phase 5: Dream Galaxy ────────────────────────────────────────────────────
// Dreams live beyond the known universe — distant stars calling you forward.
// Not goals. Not tasks. Experiences you still want to live.

export type DreamCategory = "adventure" | "creativity" | "family" | "purpose";

export type FutureLetterTrigger = "dream_completed" | "one_year" | "five_years";

export interface DreamStar {
  id: string;
  title: string;
  description?: string;
  category: DreamCategory;
  participantIds: string[]; // others who share this dream
  createdAt: number;
  // Runtime-only — set when injected from another citizen. Never persisted.
  sharedFromId?: string;
}

// A small step toward a dream — orbits the dream star like a moon.
export interface DreamFragment {
  id: string;
  dreamId: string;
  title: string;
  completed: boolean;
  completedAt?: number;
}

// A letter to your future self, held until the dream comes true or time passes.
export interface FutureLetter {
  id: string;
  dreamId: string;
  content: string;
  trigger: FutureLetterTrigger;
  createdAt: number;
  openedAt?: number;
}

// ─── Phase 8: Shared Universe ────────────────────────────────────────────────

export type SignalType = "dream" | "memory" | "milestone" | "reflection" | "hope";
export type SignalVisibility = "public" | "constellation" | "orbiters";
export type CosmicReactionType = "light" | "relate" | "inspired" | "thanks";

export type ConstellationId =
  | "artists"
  | "readers"
  | "musicians"
  | "travelers"
  | "developers"
  | "gardeners"
  | "photographers"
  | "walkers";

// A short moment shared with the universe. Public by default. Not a post.
export interface Signal {
  id: string;
  authorId: string;
  type: SignalType;
  content: string;
  visibility: SignalVisibility;
  constellationId?: ConstellationId;
  createdAt: number;
}

// Private — who this user is orbiting (not stored in Citizen).
export interface Orbit {
  id: string;
  targetOwnerId: string;
  createdAt: number;
}

// Private — reactions this user has sent (no public counts ever).
export interface CosmicReaction {
  id: string;
  signalId: string;
  type: CosmicReactionType;
  createdAt: number;
}

// ─── Phase 9: Light Bridge ───────────────────────────────────────────────────
// A consensual bridge between two citizens. Lives in its own Supabase table
// (not in UniverseData) since both parties read and write the same row.

export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  status: ConnectionStatus;
  fromName: string;
  fromColor: string;
  toName: string;
  fromMessage: string;
  // Set by each owner only after `status` becomes "accepted" — never exposed
  // to the other side before mutual consent.
  fromWhatsapp?: string;
  toWhatsapp?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Phase 7: Light I Give ────────────────────────────────────────────────────
// The moment a person discovers they can contribute — giving light to those
// still finding their way. Not because they are experts. Because they are human.

export type WisdomCategory =
  | "fear"
  | "hope"
  | "relationships"
  | "work"
  | "dreams"
  | "recovery"
  | "identity";

export type GivenLightType = "encouragement" | "story" | "advice";

// A piece of human wisdom shared with the Library of Light.
export interface WisdomEntry {
  id: string;
  category: WisdomCategory;
  content: string;
  fromStage?: string;
  anonymous: boolean;
  createdAt: number;
}

// A light sent from one community member to another.
// Private — stored in UniverseData only, never included in Citizen.
export interface GivenLight {
  id: string;
  toOwnerId: string;
  type: GivenLightType;
  content: string;
  anonymous: boolean;
  createdAt: number;
}

export type RelationshipKind =
  | "Mother"
  | "Father"
  | "Partner"
  | "Brother"
  | "Sister"
  | "Friend"
  | "Mentor"
  | "Child"
  | "Other";

export const RELATIONSHIP_KINDS: RelationshipKind[] = [
  "Mother",
  "Father",
  "Partner",
  "Brother",
  "Sister",
  "Friend",
  "Mentor",
  "Child",
  "Other",
];

// Stable visual parameters so a celestial body always appears in the same
// place in the user's universe. Generated once when a person is created.
export interface OrbitParams {
  radius: number;
  speed: number;
  phase: number;
  inclination: number;
  size: number;
  color: string;
}

export interface Person {
  id: string;
  name: string;
  relationship: string;
  photo?: string; // data URL
  orbit: OrbitParams;
  createdAt: number;
}

// ─── Phase 2: Messages of Light ──────────────────────────────────────────────

export type LightType = "text" | "voice" | "photo" | "future";
export type LightForm = "orb" | "lantern" | "firefly" | "fragment";
export type LightReaction = "thank_you" | "this_helped" | "saved_for_later";
export type UnlockTrigger =
  | "scared"
  | "lonely"
  | "motivation"
  | "birthday"
  | "treatment_complete"
  | "one_year";

export const SELF_ID = "self";

export interface Light {
  id: string;
  senderId: string;
  receiverId: string;
  type: LightType;
  content: string;
  mediaUrl?: string;
  createdAt: number;
  sealed: boolean;
  unlockTrigger?: UnlockTrigger;
  unlockAt?: number;
  opened: boolean;
  reaction?: LightReaction;
  orbitPosition: number;
  color: string;
  form: LightForm;
}

export interface Memory {
  id: string;
  personId: string;
  title: string;
  description?: string;
  photo?: string;
  date?: string;
  createdAt: number;
}

export interface UniverseUser {
  name: string;
  color: string;
  joinedAt?: number;
  role?: UserRole;
  stage?: JourneyStage;
  isPublic?: boolean;
  // Phase 6: Stars Ahead — public profile story
  journeyThen?: string;
  journeyNow?: string;
  futureEcho?: string;
  // Phase 7: Light I Give — opt in to receive light from community
  openToLight?: boolean;
  // Phase 9: Light Bridge — private. Only ever sent to Supabase after a
  // connection is mutually accepted, never included in universe_public.
  whatsapp?: string;
}

// One person's whole presence in the shared universe — their star and the
// system around it. futureLetters are private and not included here.
export interface Citizen {
  ownerId: string;
  user: UniverseUser;
  people: Person[];
  lights: Light[];
  memories: Memory[];
  milestones: Milestone[];
  nebulas: MemoryNebula[];
  artifacts: MemoryArtifact[];
  dreams: DreamStar[];
  fragments: DreamFragment[];
  wisdom: WisdomEntry[];
  signals: Signal[];
  constellations: ConstellationId[];
}

export interface LegacyMessage {
  id: string;
  personId: string;
  kind: "text" | "image" | "voice";
  text?: string;
  image?: string;
  audio?: string;
  createdAt: number;
}

export interface UniverseData {
  user: UniverseUser | null;
  people: Person[];
  lights: Light[];
  memories: Memory[];
  milestones: Milestone[];
  nebulas: MemoryNebula[];
  artifacts: MemoryArtifact[];
  dreams: DreamStar[];
  fragments: DreamFragment[];
  futureLetters: FutureLetter[];
  receivedEchoIds: string[];
  givenLights: GivenLight[];       // private — lights I've sent to others
  wisdom: WisdomEntry[];            // public — my Library of Light contributions
  signals: Signal[];                // public — cosmic signals I've broadcast
  orbits: Orbit[];                  // private — who I'm orbiting
  reactions: CosmicReaction[];      // private — reactions I've sent
  constellations: ConstellationId[]; // public — community memberships
  messages?: LegacyMessage[];
}

export const emptyUniverse = (): UniverseData => ({
  user: null,
  people: [],
  lights: [],
  memories: [],
  milestones: [],
  nebulas: [],
  artifacts: [],
  dreams: [],
  fragments: [],
  futureLetters: [],
  receivedEchoIds: [],
  givenLights: [],
  wisdom: [],
  signals: [],
  orbits: [],
  reactions: [],
  constellations: [],
  messages: [],
});
