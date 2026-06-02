import type { Citizen, UniverseData } from "../types";
import { localRepository } from "./localRepository";
import { makeSupabaseRepository } from "./supabaseRepository";

// Data access is hidden behind this interface so the persistence backend can be
// swapped without touching the UI.
export interface UniverseRepository {
  // This citizen's own universe.
  load(): Promise<UniverseData>;
  save(data: UniverseData): Promise<void>;

  // The shared world: every citizen, kept live.
  loadWorld(): Promise<Citizen[]>;
  subscribeWorld(onChange: () => void): () => void;
}

// When Supabase credentials are present, the universe is shared and synced.
// Otherwise the app runs solo on localStorage.
export const repository: UniverseRepository =
  makeSupabaseRepository() ?? localRepository;
