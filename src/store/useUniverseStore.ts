import { create } from "zustand";
import type {
  Citizen,
  Connection,
  ConstellationId,
  CosmicReaction,
  CosmicReactionType,
  DreamCategory,
  DreamFragment,
  DreamStar,
  FutureLetter,
  FutureLetterTrigger,
  GivenLight,
  GivenLightType,
  Light,
  LightReaction,
  LightType,
  Memory,
  MemoryArtifact,
  MemoryNebula,
  Milestone,
  Orbit,
  Person,
  Signal,
  SignalType,
  SignalVisibility,
  UnlockTrigger,
  UniverseData,
  UniverseUser,
  WisdomCategory,
  WisdomEntry,
} from "../types";
import { SELF_ID, emptyUniverse } from "../types";
import { repository, WORLD_PAGE_SIZE } from "../data/repository";
import type { SyncStatus } from "../data/repository";
import { ownerId } from "../data/identity";
import { useAuthStore } from "../data/auth";
import {
  loadConnections as loadConnectionsApi,
  respondToConnection,
  sendConnectionRequest as sendConnectionRequestApi,
  shareWhatsapp,
  subscribeConnections,
} from "../data/connectionsRepository";
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
  | { kind: "nebulaInterior"; nebulaId: string }
  | { kind: "createDream" }
  | { kind: "dreamDetail"; dreamId: string }
  | { kind: "starsAhead" }
  | { kind: "lightIGive" }
  | { kind: "libraryOfLight" }
  | { kind: "stargazing" }
  | { kind: "constellations" }
  | { kind: "guide" }
  | { kind: "northStar" }
  | { kind: "lightBridge" };

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
  dreams: DreamStar[];
  fragments: DreamFragment[];
  futureLetters: FutureLetter[];
  receivedEchoIds: string[];
  givenLights: GivenLight[];
  wisdom: WisdomEntry[];
  signals: Signal[];
  orbits: Orbit[];
  reactions: CosmicReaction[];
  constellations: ConstellationId[];

  // Shared world
  selfId: string;
  others: Citizen[]; // every other citizen, from the cloud (live)
  selectedCitizenId: string; // whose system the camera is exploring
  syncStatus: SyncStatus; // real-time channel health
  recentreSeq: number;   // incremented by recentre() to force a camera fly-back

  // Phase 9: Light Bridge
  connections: Connection[];

  load: () => Promise<void>;
  recentre: () => void;
  loadWorld: () => Promise<void>;
  loadConnections: () => Promise<void>;
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

  addDream: (input: { title: string; description?: string; category: DreamCategory }) => DreamStar;
  addFragment: (dreamId: string, title: string) => DreamFragment;
  completeFragment: (fragmentId: string) => void;
  addFutureLetter: (input: { dreamId: string; content: string; trigger: FutureLetterTrigger }) => void;
  addParticipantToDream: (dreamId: string, participantId: string) => void;

  setFutureEcho: (content: string) => void;
  setJourneyNote: (then: string, now: string) => void;
  receiveEcho: (fromOwnerId: string) => void;

  sendGivenLight: (input: Omit<GivenLight, "id" | "createdAt">) => GivenLight;
  addWisdom: (input: Omit<WisdomEntry, "id" | "createdAt">) => WisdomEntry;
  setOpenToLight: (open: boolean) => void;

  addSignal: (input: { type: SignalType; content: string; visibility: SignalVisibility; constellationId?: ConstellationId }) => Signal;
  addOrbit: (targetOwnerId: string) => void;
  removeOrbit: (targetOwnerId: string) => void;
  addCosmicReaction: (signalId: string, type: CosmicReactionType) => void;
  joinConstellation: (id: ConstellationId) => void;
  leaveConstellation: (id: ConstellationId) => void;

  openOverlay: (overlay: Overlay) => void;
  closeOverlay: () => void;
  focusPerson: (personId: string | null) => void;
  selectCitizen: (ownerId: string) => void;

  // Phase 9: Light Bridge
  setWhatsapp: (whatsapp: string) => void;
  requestConnection: (target: Citizen, message: string) => Promise<void>;
  acceptConnection: (id: string) => Promise<void>;
  declineConnection: (id: string) => Promise<void>;

  // Derived
  world: () => Citizen[]; // self (live) + others
  selfCitizen: () => Citizen | null;
}

function persist(get: () => UniverseState) {
  const { user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, futureLetters, receivedEchoIds, givenLights, wisdom, signals, orbits, reactions, constellations } = get();
  void repository.save({ user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, futureLetters, receivedEchoIds, givenLights, wisdom, signals, orbits, reactions, constellations });
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
let connectionsUnsub: (() => void) | null = null;

export const useUniverseStore = create<UniverseState>((set, get) => ({
  ...emptyUniverse(),
  loaded: false,
  overlay: { kind: "none" },
  focusedPersonId: null,
  openedLightId: null,
  arriving: [],
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

  selfId: SELF,
  others: [],
  selectedCitizenId: SELF,
  syncStatus: "connecting" as SyncStatus,
  recentreSeq: 0,
  connections: [],

  load: async () => {
    // Refresh selfId from identity — ownerId() may have changed since module
    // init (e.g. the user just signed in for the first time in this session).
    const currentSelfId = ownerId();
    set({ selfId: currentSelfId, selectedCitizenId: currentSelfId });

    const data = await repository.load();
    const lights = applyTimeUnlocks(data.lights ?? []);
    set({
      user: data.user,
      people: data.people,
      memories: data.memories,
      milestones: data.milestones ?? [],
      nebulas: data.nebulas ?? [],
      artifacts: data.artifacts ?? [],
      dreams: data.dreams ?? [],
      fragments: data.fragments ?? [],
      futureLetters: data.futureLetters ?? [],
      receivedEchoIds: data.receivedEchoIds ?? [],
      givenLights: data.givenLights ?? [],
      wisdom: data.wisdom ?? [],
      signals: data.signals ?? [],
      orbits: data.orbits ?? [],
      reactions: data.reactions ?? [],
      constellations: data.constellations ?? [],
      lights,
      loaded: true,
      overlay: data.user ? { kind: "none" } : { kind: "onboarding" },
    });
    persist(get);

    // Subscribe before the initial load so no change event is missed while
    // loadWorld() is in flight.
    if (!worldUnsub) {
      worldUnsub = repository.subscribeWorld({
        onUpsert: (citizen) => {
          if (citizen.ownerId === get().selfId) return;
          set((s) => {
            const idx = s.others.findIndex((c) => c.ownerId === citizen.ownerId);
            const next = [...s.others];
            if (idx >= 0) next[idx] = citizen;
            else next.push(citizen);
            return { others: next };
          });
        },
        onDelete: (id) => {
          if (id === get().selfId) return;
          set((s) => ({ others: s.others.filter((c) => c.ownerId !== id) }));
        },
        onStatus: (status) => {
          const prev = get().syncStatus;
          set({ syncStatus: status });
          // Re-fetch after reconnect to apply any changes missed during the gap.
          if (status === "live" && prev === "reconnecting") {
            void get().loadWorld();
          }
        },
      });
    }

    // Run the general world load and orbit-priority fetch in parallel.
    // Orbit citizens are guaranteed to appear immediately regardless of their
    // position in the activity-ordered pages.
    const orbitIds = (data.orbits ?? []).map((o) => o.targetOwnerId);
    const [, orbitCitizens] = await Promise.all([
      get().loadWorld(),
      orbitIds.length > 0 ? repository.loadCitizensByIds(orbitIds) : Promise.resolve([]),
    ]);

    if (orbitCitizens.length > 0) {
      set((s) => {
        const map = new Map(s.others.map((c) => [c.ownerId, c]));
        for (const c of orbitCitizens) {
          // Don't overwrite a citizen already loaded by loadWorld — that data is fresher.
          if (c.ownerId !== get().selfId && !map.has(c.ownerId)) map.set(c.ownerId, c);
        }
        return { others: Array.from(map.values()) };
      });
    }

    // Light Bridge requires Supabase Auth — guests stay local-only, same as
    // the rest of the shared world.
    if (useAuthStore.getState().status === "authenticated") {
      void get().loadConnections();
      if (!connectionsUnsub) {
        connectionsUnsub = subscribeConnections(currentSelfId, {
          onUpsert: (connection) => {
            set((s) => {
              const idx = s.connections.findIndex((c) => c.id === connection.id);
              const next = [...s.connections];
              if (idx >= 0) next[idx] = connection; else next.unshift(connection);
              return { connections: next };
            });
            // The original requester completes the mutual reveal once they
            // see the other side accepted.
            const self = get().selfId;
            const myWhatsapp = get().user?.whatsapp;
            if (
              connection.status === "accepted" &&
              myWhatsapp &&
              connection.fromId === self &&
              !connection.fromWhatsapp
            ) {
              void shareWhatsapp(connection.id, myWhatsapp, "from").then((updated) => {
                if (updated) {
                  set((s) => ({
                    connections: s.connections.map((c) => (c.id === updated.id ? updated : c)),
                  }));
                }
              });
            }
          },
        });
      }
    }
  },

  loadConnections: async () => {
    const list = await loadConnectionsApi(get().selfId);
    set({ connections: list });

    // Catch up on any reveals that happened while we were offline.
    const self = get().selfId;
    const myWhatsapp = get().user?.whatsapp;
    if (!myWhatsapp) return;
    for (const c of list) {
      if (c.status !== "accepted") continue;
      if (c.fromId === self && !c.fromWhatsapp) {
        const updated = await shareWhatsapp(c.id, myWhatsapp, "from");
        if (updated) set((s) => ({ connections: s.connections.map((x) => (x.id === updated.id ? updated : x)) }));
      } else if (c.toId === self && !c.toWhatsapp) {
        const updated = await shareWhatsapp(c.id, myWhatsapp, "to");
        if (updated) set((s) => ({ connections: s.connections.map((x) => (x.id === updated.id ? updated : x)) }));
      }
    }
  },

  loadWorld: async () => {
    // First page loads immediately — the app becomes interactive without waiting
    // for the full world. Remaining pages are fetched in the background and
    // merged into the store as they arrive.
    const first = await repository.loadWorld(0);
    const selfId = get().selfId;
    const toOthers = (cs: typeof first) => cs.filter((c) => c.ownerId !== selfId);

    set((s) => {
      // Merge over existing so a reconnect refresh doesn't flicker.
      const map = new Map(s.others.map((c) => [c.ownerId, c]));
      for (const c of toOthers(first)) map.set(c.ownerId, c);
      return { others: Array.from(map.values()) };
    });

    // Cap at 9 background pages (+ the first = 10 pages, 500 citizens total).
    // Realtime handles anything beyond that as users become active.
    const MAX_BG_PAGES = 9;
    if (first.length >= WORLD_PAGE_SIZE) {
      void (async () => {
        let offset = WORLD_PAGE_SIZE;
        for (let page = 0; page < MAX_BG_PAGES; page++) {
          const batch = await repository.loadWorld(offset);
          const citizens = toOthers(batch);
          if (citizens.length > 0) {
            set((s) => {
              const map = new Map(s.others.map((c) => [c.ownerId, c]));
              for (const c of citizens) map.set(c.ownerId, c);
              return { others: Array.from(map.values()) };
            });
          }
          if (batch.length < WORLD_PAGE_SIZE) break;
          offset += WORLD_PAGE_SIZE;
        }
      })();
    }
  },

  setUser: (user) => {
    set((s) => ({
      user: { ...user, joinedAt: user.joinedAt ?? Date.now() },
      overlay: { kind: "none" },
      selectedCitizenId: s.selfId,
    }));
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

  addDream: ({ title, description, category }) => {
    const dream: DreamStar = {
      id: uid(),
      title: title.trim(),
      description,
      category,
      participantIds: [],
      createdAt: Date.now(),
    };
    set((s) => ({ dreams: [...s.dreams, dream] }));
    persist(get);
    return dream;
  },

  addFragment: (dreamId, title) => {
    const fragment: DreamFragment = {
      id: uid(),
      dreamId,
      title: title.trim(),
      completed: false,
    };
    set((s) => ({ fragments: [...s.fragments, fragment] }));
    persist(get);
    return fragment;
  },

  completeFragment: (fragmentId) => {
    set((s) => ({
      fragments: s.fragments.map((f) =>
        f.id === fragmentId ? { ...f, completed: !f.completed, completedAt: f.completed ? undefined : Date.now() } : f,
      ),
    }));
    persist(get);
  },

  addFutureLetter: ({ dreamId, content, trigger }) => {
    const letter: FutureLetter = {
      id: uid(),
      dreamId,
      content,
      trigger,
      createdAt: Date.now(),
    };
    set((s) => ({ futureLetters: [...s.futureLetters, letter] }));
    persist(get);
  },

  addParticipantToDream: (dreamId, participantId) => {
    set((s) => ({
      dreams: s.dreams.map((d) =>
        d.id === dreamId && !d.participantIds.includes(participantId)
          ? { ...d, participantIds: [...d.participantIds, participantId] }
          : d,
      ),
    }));
    persist(get);
  },

  setFutureEcho: (content) => {
    set((s) => ({ user: s.user ? { ...s.user, futureEcho: content || undefined } : s.user }));
    persist(get);
  },

  setJourneyNote: (then, now) => {
    set((s) => ({
      user: s.user
        ? { ...s.user, journeyThen: then || undefined, journeyNow: now || undefined }
        : s.user,
    }));
    persist(get);
  },

  receiveEcho: (fromOwnerId) => {
    set((s) =>
      s.receivedEchoIds.includes(fromOwnerId)
        ? s
        : { receivedEchoIds: [...s.receivedEchoIds, fromOwnerId] },
    );
    persist(get);
  },

  sendGivenLight: (input) => {
    const light: GivenLight = { ...input, id: uid(), createdAt: Date.now() };
    set((s) => ({ givenLights: [...s.givenLights, light] }));
    persist(get);
    return light;
  },

  addWisdom: (input) => {
    const entry: WisdomEntry = { ...input, id: uid(), createdAt: Date.now() };
    set((s) => ({ wisdom: [...s.wisdom, entry] }));
    persist(get);
    return entry;
  },

  setOpenToLight: (open) => {
    set((s) => ({ user: s.user ? { ...s.user, openToLight: open } : s.user }));
    persist(get);
  },

  addSignal: (input) => {
    const signal: Signal = { ...input, id: uid(), authorId: get().selfId, createdAt: Date.now() };
    set((s) => ({ signals: [...s.signals, signal] }));
    persist(get);
    return signal;
  },

  addOrbit: (targetOwnerId) => {
    if (get().orbits.some((o) => o.targetOwnerId === targetOwnerId)) return;
    const orbit: Orbit = { id: uid(), targetOwnerId, createdAt: Date.now() };
    set((s) => ({ orbits: [...s.orbits, orbit] }));
    persist(get);
  },

  removeOrbit: (targetOwnerId) => {
    set((s) => ({ orbits: s.orbits.filter((o) => o.targetOwnerId !== targetOwnerId) }));
    persist(get);
  },

  addCosmicReaction: (signalId, type) => {
    if (get().reactions.some((r) => r.signalId === signalId && r.type === type)) return;
    const reaction: CosmicReaction = { id: uid(), signalId, type, createdAt: Date.now() };
    set((s) => ({ reactions: [...s.reactions, reaction] }));
    persist(get);
  },

  joinConstellation: (id) => {
    if (get().constellations.includes(id)) return;
    set((s) => ({ constellations: [...s.constellations, id] }));
    persist(get);
  },

  leaveConstellation: (id) => {
    set((s) => ({ constellations: s.constellations.filter((c) => c !== id) }));
    persist(get);
  },

  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: { kind: "none" } }),
  focusPerson: (personId) => set({ focusedPersonId: personId }),
  selectCitizen: (id) => set({ selectedCitizenId: id, focusedPersonId: null }),
  recentre: () => set((s) => ({ selectedCitizenId: s.selfId, focusedPersonId: null, recentreSeq: s.recentreSeq + 1 })),

  setWhatsapp: (whatsapp) => {
    set((s) => ({ user: s.user ? { ...s.user, whatsapp: whatsapp || undefined } : s.user }));
    persist(get);
  },

  requestConnection: async (target, message) => {
    const { user, selfId } = get();
    if (!user?.name) return;
    if (get().connections.some((c) => c.toId === target.ownerId || c.fromId === target.ownerId)) return;
    const connection = await sendConnectionRequestApi({
      fromId: selfId,
      toId: target.ownerId,
      fromName: user.name,
      fromColor: user.color ?? "#ffd27a",
      toName: target.user.name,
      fromMessage: message.trim(),
    });
    if (connection) set((s) => ({ connections: [connection, ...s.connections] }));
  },

  acceptConnection: async (id) => {
    const myWhatsapp = get().user?.whatsapp;
    const updated = await respondToConnection(id, "accepted", myWhatsapp);
    if (updated) set((s) => ({ connections: s.connections.map((c) => (c.id === id ? updated : c)) }));
  },

  declineConnection: async (id) => {
    const updated = await respondToConnection(id, "declined");
    if (updated) set((s) => ({ connections: s.connections.map((c) => (c.id === id ? updated : c)) }));
  },

  selfCitizen: () => {
    const { user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations } = get();
    if (!user?.name) return null;
    return { ownerId: get().selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations };
  },

  world: () => {
    const { signals, constellations } = get();
    const self = get().selfCitizen();
    if (self) {
      // Ensure live signals/constellations are always current on the self citizen
      const updatedSelf = { ...self, signals, constellations };
      return [updatedSelf, ...get().others];
    }
    return get().others;
  },
}));
