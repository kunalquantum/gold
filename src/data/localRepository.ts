import type { Citizen, UniverseData } from "../types";
import { emptyUniverse } from "../types";
import type { UniverseRepository } from "./repository";
import { ownerId } from "./identity";

export const STORAGE_KEY = "universe.v1";

// Local-first adapter: persists the whole universe to localStorage. Photos and
// voice notes are stored as data URLs, so everything works fully offline. The
// Supabase adapter uses this as its instant, offline-safe cache.
export class LocalRepository implements UniverseRepository {
  async load(): Promise<UniverseData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyUniverse();
      const parsed = JSON.parse(raw) as UniverseData;
      return {
        user: parsed.user ?? null,
        people: parsed.people ?? [],
        lights: parsed.lights ?? [],
        memories: parsed.memories ?? [],
        milestones: parsed.milestones ?? [],
        nebulas: parsed.nebulas ?? [],
        artifacts: parsed.artifacts ?? [],
        dreams: parsed.dreams ?? [],
        fragments: parsed.fragments ?? [],
        futureLetters: parsed.futureLetters ?? [],
        messages: parsed.messages ?? [],
      };
    } catch {
      return emptyUniverse();
    }
  }

  async save(data: UniverseData): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("Universe: could not persist to localStorage", err);
    }
  }

  // With no cloud, the "world" is just this person.
  async loadWorld(): Promise<Citizen[]> {
    const data = await this.load();
    if (!data.user?.name) return [];
    return [
      {
        ownerId: ownerId(),
        user: data.user,
        people: data.people,
        lights: data.lights,
        memories: data.memories,
        milestones: data.milestones,
        nebulas: data.nebulas,
        artifacts: data.artifacts,
        dreams: data.dreams,
        fragments: data.fragments,
      },
    ];
  }

  subscribeWorld(): () => void {
    return () => {};
  }
}

export const localRepository = new LocalRepository();
