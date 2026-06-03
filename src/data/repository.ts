import type { Citizen, UniverseData } from "../types";
import { localRepository } from "./localRepository";
import { makeSupabaseRepository } from "./supabaseRepository";

export type SyncStatus = "connecting" | "live" | "reconnecting" | "offline";

// How many citizens are fetched per loadWorld() call. The store auto-fetches
// subsequent pages in the background until the world is fully loaded.
export const WORLD_PAGE_SIZE = 50;

export interface WorldCallbacks {
  /** A citizen row was inserted or updated. */
  onUpsert(citizen: Citizen): void;
  /** A citizen row was deleted (or their profile became invalid). */
  onDelete(id: string): void;
  /** The real-time channel connection status changed. */
  onStatus(status: SyncStatus): void;
}

// Data access is hidden behind this interface so the persistence backend can be
// swapped without touching the UI.
export interface UniverseRepository {
  // This citizen's own universe.
  load(): Promise<UniverseData>;
  save(data: UniverseData): Promise<void>;

  // The shared world: every citizen, kept live.
  // offset: row offset for pagination (default 0). The caller keeps fetching
  // with increasing offsets until a page shorter than WORLD_PAGE_SIZE is returned.
  loadWorld(offset?: number): Promise<Citizen[]>;
  subscribeWorld(callbacks: WorldCallbacks): () => void;
}

// When Supabase credentials are present, the universe is shared and synced.
// Otherwise the app runs solo on localStorage.
export const repository: UniverseRepository =
  makeSupabaseRepository() ?? localRepository;
