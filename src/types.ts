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
  radius: number; // distance from the central body
  speed: number; // angular velocity (radians/sec)
  phase: number; // starting angle
  inclination: number; // tilt of the orbital plane
  size: number; // body radius
  color: string; // body hue
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
// A Light is support made permanent — a message that would have vanished into a
// chat thread, kept instead as a glowing object orbiting your star.

export type LightType = "text" | "voice" | "photo" | "future";

// The resting visual form a light settles into. ("Comet" is not a form — it's
// the entrance animation every light plays once on arrival.)
export type LightForm = "orb" | "lantern" | "firefly" | "fragment";

// Calm, human responses — never likes, hearts, or counts.
export type LightReaction = "thank_you" | "this_helped" | "saved_for_later";

// What a Future Light Capsule waits for. Some are moments you feel; some are
// occasions that arrive; "one_year" simply waits for time to pass.
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
  senderId: string; // personId it's from, or SELF_ID
  receiverId: string; // SELF_ID for now (the universe owner)
  type: LightType;
  content: string; // text body or photo caption
  mediaUrl?: string; // data URL (voice note or photo)
  createdAt: number;

  // Future Light Capsule: sealed until its moment arrives.
  sealed: boolean;
  unlockTrigger?: UnlockTrigger; // emotion/occasion this capsule opens for
  unlockAt?: number; // time-based unlock (e.g. one year from now)

  // State
  opened: boolean; // has the user read this light yet
  reaction?: LightReaction;

  // Visual
  orbitPosition: number; // stable base angle in [0,1)
  color: string;
  form: LightForm;
}

// A "Memory Star" — a moment that orbits the person it belongs to.
export interface Memory {
  id: string;
  personId: string;
  title: string;
  description?: string;
  photo?: string; // data URL
  date?: string; // ISO date (the day the memory happened)
  createdAt: number;
}

export interface UniverseUser {
  name: string;
  color: string;
  joinedAt?: number;
  role?: UserRole;
  stage?: JourneyStage;
  isPublic?: boolean; // opt-in to appear in the community cosmos
}

// One person's whole presence in the shared universe — their star and the
// system around it. The shared world is the set of all citizens.
export interface Citizen {
  ownerId: string;
  user: UniverseUser;
  people: Person[];
  lights: Light[];
  memories: Memory[];
  milestones: Milestone[];
  nebulas: MemoryNebula[];
  artifacts: MemoryArtifact[];
}

// Legacy Phase 1 message shape — kept only so existing data can be migrated
// into the Light model on load. New code should never write this.
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
  messages?: LegacyMessage[]; // legacy; migrated then ignored
}

export const emptyUniverse = (): UniverseData => ({
  user: null,
  people: [],
  lights: [],
  memories: [],
  milestones: [],
  nebulas: [],
  artifacts: [],
});
