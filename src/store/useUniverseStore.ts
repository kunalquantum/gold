import { create } from "zustand";
import type {
  Citizen,
  Light,
  LightReaction,
  LightType,
  Memory,
  MemoryArtifact,
  MemoryNebula,
  Milestone,
  Person,
  UnlockTrigger,
  UniverseData,
  UniverseUser,
} from "../types";
import { SELF_ID, emptyUniverse } from "../types";
import { repository } from "../data/repository";
import { ownerId } from "../data/identity";
import {
  lightColor,
  lightForm,
  makeOrbit,
  uid,
  unlockTimeFor,
} from "../utils";

export type Overlay =
  | { kind: "none" }
  | { kind: "onboarding" }
  | { kind: "addPerson" }
  | { kind: "personDetail"; personId: string }
  | { kind: "feelingDoor" }
  | { kind: "community" }
  | { kind: "milestone" }
  | { kind: "createNebula" }
  | { kind: "nebulaInterior"; nebulaId: string };

export interface NewLight {
  senderId: string;
  type: LightType;
  content: string;
  mediaUrl?: string;
  unlockTrigger?: UnlockTrigger;
}

const SELF = ownerId();

interface UniverseState extends UniverseData {
  loaded: boolean;
  overlay: Overlay;
  focusedPersonId: string | null;
  openedLightId: string | null;
  arriving: string[];
  milestones: Milestone[];
  nebulas: MemoryNebula[];
  artifacts: MemoryArtifact[];

  // Shared world
  selfId: string;
  others: Citizen[]; // every other citizen, from the cloud (live)
  selectedCitizenId: string; // whose system the camera is exploring

  load: () => Promise<void>;
  loadWorld: () => Promise<void>;
  setUser: (user: UniverseUser) => void;

  addPerson: (input: { name: string; relationship: string; photo?: string }) => Person;
  removePerson: (personId: string) => void;

  addLight: (input: NewLight) => Light;
  openLight: (lightId: string) => void;
  closeLight: () => void;
  reactToLight: (lightId: string, reaction: LightReaction) => void;
  markArrived: (lightId: string) => void;
  unlockByTrigger: (trigger: UnlockTrigger) => Light[];

  addMemory: (input: Omit<Memory, "id" | "createdAt">) => void;

  addMilestone: (input: Omit<Milestone, "id" | "createdAt">) => void;
  setPrivacy: (isPublic: boolean) => void;
  setRoleAndStage: (updates: Pick<UniverseUser, "role" | "stage">) => void;

  addNebula: (input: Omit<MemoryNebula, "id" | "createdAt" | "echoCount" | "sharedFromId">) => MemoryNebula;
  addArtifact: (input: Omit<MemoryArtifact, "id" | "createdAt">) => MemoryArtifact;
  echoNebula: (nebulaId: string) => void;
  addParticipantToNebula: (nebulaId: string, participantId: string) => void;

  openOverlay: (overlay: Overlay) => void;
  closeOverlay: () => void;
  focusPerson: (personId: string | null) => void;
  selectCitizen: (ownerId: string) => void;

  // Derived
  world: () => Citizen[]; // self (live) + others
  selfCitizen: () => Citizen | null;
}

function persist(get: () => UniverseState) {
  const { user, people, lights, memories, milestones, nebulas, artifacts } = get();
  void repository.save({ user, people, lights, memories, milestones, nebulas, artifacts });
}

function buildLight(input: NewLight): Light {
  const sealed = input.type === "future" && !!input.unlockTrigger;
  const unlockAt = input.unlockTrigger
    ? unlockTimeFor(input.unlockTrigger, Date.now())
    : undefined;
  return {
    id: uid(),
    senderId: input.senderId,
    receiverId: SELF_ID,
    type: input.type,
    content: input.content,
    mediaUrl: input.mediaUrl,
    createdAt: Date.now(),
    sealed,
    unlockTrigger: input.unlockTrigger,
    unlockAt,
    opened: false,
    orbitPosition: Math.random(),
    color: lightColor(input.type),
    form: lightForm(input.type),
  };
}

function applyTimeUnlocks(lights: Light[]): Light[] {
  const now = Date.now();
  return lights.map((l) =>
    l.sealed && l.unlockAt && l.unlockAt <= now ? { ...l, sealed: false } : l,
  );
}

let worldUnsub: (() => void) | null = null;

export const useUniverseStore = create<UniverseState>((set, get) => ({
  ...emptyUniverse(),
  loaded: false,
  overlay: { kind: "none" },
  focusedPersonId: null,
  openedLightId: null,
  arriving: [],

  selfId: SELF,
  others: [],
  selectedCitizenId: SELF,

  load: async () => {
    const data = await repository.load();
    const lights = applyTimeUnlocks(data.lights ?? []);
    set({
      user: data.user,
      people: data.people,
      memories: data.memories,
      milestones: data.milestones ?? [],
      nebulas: data.nebulas ?? [],
      artifacts: data.artifacts ?? [],
      lights,
      loaded: true,
      overlay: data.user ? { kind: "none" } : { kind: "onboarding" },
    });
    persist(get);

    // Bring in the rest of the shared universe and keep it live.
    await get().loadWorld();
    if (!worldUnsub) {
      worldUnsub = repository.subscribeWorld(() => {
        void get().loadWorld();
      });
    }
  },

  loadWorld: async () => {
    const all = await repository.loadWorld();
    set({ others: all.filter((c) => c.ownerId !== SELF) });
  },

  setUser: (user) => {
    set({
      user: { ...user, joinedAt: user.joinedAt ?? Date.now() },
      overlay: { kind: "none" },
      selectedCitizenId: SELF,
    });
    persist(get);
  },

  addPerson: ({ name, relationship, photo }) => {
    const person: Person = {
      id: uid(),
      name: name.trim(),
      relationship,
      photo,
      orbit: makeOrbit(relationship, get().people.length),
      createdAt: Date.now(),
    };
    set((s) => ({ people: [...s.people, person] }));
    persist(get);
    return person;
  },

  removePerson: (personId) => {
    set((s) => ({
      people: s.people.filter((p) => p.id !== personId),
      lights: s.lights.filter((l) => l.senderId !== personId),
      memories: s.memories.filter((m) => m.personId !== personId),
      focusedPersonId: s.focusedPersonId === personId ? null : s.focusedPersonId,
      overlay:
        s.overlay.kind === "personDetail" && s.overlay.personId === personId
          ? { kind: "none" }
          : s.overlay,
    }));
    persist(get);
  },

  addLight: (input) => {
    const light = buildLight(input);
    set((s) => ({
      lights: [...s.lights, light],
      arriving: light.sealed ? s.arriving : [...s.arriving, light.id],
    }));
    persist(get);
    return light;
  },

  openLight: (lightId) => {
    set((s) => ({
      openedLightId: lightId,
      lights: s.lights.map((l) =>
        l.id === lightId && !l.sealed ? { ...l, opened: true } : l,
      ),
    }));
    persist(get);
  },

  closeLight: () => set({ openedLightId: null }),

  reactToLight: (lightId, reaction) => {
    set((s) => ({
      lights: s.lights.map((l) =>
        l.id === lightId
          ? { ...l, reaction: l.reaction === reaction ? undefined : reaction }
          : l,
      ),
    }));
    persist(get);
  },

  markArrived: (lightId) =>
    set((s) => ({ arriving: s.arriving.filter((id) => id !== lightId) })),

  unlockByTrigger: (trigger) => {
    const unlocked = get().lights.filter(
      (l) => l.sealed && l.unlockTrigger === trigger,
    );
    if (unlocked.length === 0) return [];
    const ids = new Set(unlocked.map((l) => l.id));
    set((s) => ({
      lights: s.lights.map((l) => (ids.has(l.id) ? { ...l, sealed: false } : l)),
      arriving: [...s.arriving, ...unlocked.map((l) => l.id)],
    }));
    persist(get);
    return unlocked;
  },

  addMemory: (input) => {
    const memory: Memory = { ...input, id: uid(), createdAt: Date.now() };
    set((s) => ({ memories: [...s.memories, memory] }));
    persist(get);
  },

  addMilestone: (input) => {
    const milestone: Milestone = { ...input, id: uid(), createdAt: Date.now() };
    set((s) => ({ milestones: [...s.milestones, milestone] }));
    persist(get);
  },

  setPrivacy: (isPublic) => {
    set((s) => ({ user: s.user ? { ...s.user, isPublic } : s.user }));
    persist(get);
  },

  setRoleAndStage: (updates) => {
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : s.user }));
    persist(get);
  },

  addNebula: (input) => {
    const nebula: MemoryNebula = { ...input, id: uid(), createdAt: Date.now(), echoCount: 0 };
    set((s) => ({ nebulas: [...s.nebulas, nebula] }));
    persist(get);
    return nebula;
  },

  addArtifact: (input) => {
    const artifact: MemoryArtifact = { ...input, id: uid(), createdAt: Date.now() };
    set((s) => ({ artifacts: [...s.artifacts, artifact] }));
    persist(get);
    return artifact;
  },

  echoNebula: (nebulaId) => {
    set((s) => ({
      nebulas: s.nebulas.map((n) =>
        n.id === nebulaId ? { ...n, echoCount: n.echoCount + 1 } : n,
      ),
    }));
    persist(get);
  },

  addParticipantToNebula: (nebulaId, participantId) => {
    set((s) => ({
      nebulas: s.nebulas.map((n) =>
        n.id === nebulaId && !n.participantIds.includes(participantId)
          ? { ...n, participantIds: [...n.participantIds, participantId] }
          : n,
      ),
    }));
    persist(get);
  },

  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: { kind: "none" } }),
  focusPerson: (personId) => set({ focusedPersonId: personId }),
  selectCitizen: (id) => set({ selectedCitizenId: id, focusedPersonId: null }),

  selfCitizen: () => {
    const { user, people, lights, memories, milestones, nebulas, artifacts } = get();
    if (!user?.name) return null;
    return { ownerId: SELF, user, people, lights, memories, milestones, nebulas, artifacts };
  },

  world: () => {
    const self = get().selfCitizen();
    const others = get().others;
    return self ? [self, ...others] : others;
  },
}));
