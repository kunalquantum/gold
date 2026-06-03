import type { Citizen, UniverseData } from "../types";
import type { UniverseRepository, WorldCallbacks } from "./repository";
import { localRepository } from "./localRepository";
import { ownerId } from "./identity";
import { SUPABASE_CONFIGURED, supabase } from "./supabaseClient";

const TABLE = "universes";
const SAVE_DEBOUNCE_MS = 700;

// Cloud-synced, local-first repository for the shared universe:
//   • your own universe reads/writes locally first, then syncs (debounced)
//   • the whole world (every citizen) is read from Supabase and kept live
class SupabaseRepository implements UniverseRepository {
  // Getter so auth changes (setAuthUserId) are picked up without
  // re-instantiating the repository.
  private get id() { return ownerId(); }
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: UniverseData | null = null;

  async load(): Promise<UniverseData> {
    if (!supabase) return localRepository.load();
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("data")
        .eq("id", this.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.data) {
        const remote = data.data as UniverseData;
        await localRepository.save(remote);
        return remote;
      }

      const local = await localRepository.load();
      if (local.user || local.people.length || local.lights.length) {
        await this.flush(local);
      }
      return local;
    } catch (err) {
      console.warn("Universe: Supabase load failed — using local cache", err);
      return localRepository.load();
    }
  }

  async save(data: UniverseData): Promise<void> {
    await localRepository.save(data);
    this.pending = data;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pending) void this.flush(this.pending);
    }, SAVE_DEBOUNCE_MS);
  }

  private async flush(data: UniverseData): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from(TABLE).upsert({
        id: this.id,
        data,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (err) {
      console.warn("Universe: Supabase save failed — kept locally", err);
    }
  }

  // Every citizen in the shared universe, including this one.
  async loadWorld(): Promise<Citizen[]> {
    if (!supabase) return localRepository.loadWorld();
    try {
      const { data, error } = await supabase.from(TABLE).select("id, data");
      if (error) throw error;
      return (data ?? [])
        .map((row) => toCitizen(row.id as string, row.data as UniverseData))
        .filter((c): c is Citizen => c !== null);
    } catch (err) {
      console.warn("Universe: could not load the shared world", err);
      return localRepository.loadWorld();
    }
  }

  // Subscribes to row-level changes and delivers surgical updates via callbacks.
  // Uses the real-time payload directly — no full table re-fetch on every change.
  subscribeWorld(callbacks: WorldCallbacks): () => void {
    const client = supabase;
    if (!client) {
      callbacks.onStatus("offline");
      return () => {};
    }

    const channel = client
      .channel("shared-universe")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Record<string, unknown>).id as string | undefined;
            if (id) callbacks.onDelete(id);
          } else {
            const row = payload.new as Record<string, unknown>;
            const id = row.id as string | undefined;
            if (!id) return;
            const data = row.data as UniverseData | undefined;
            const citizen = data ? toCitizen(id, data) : null;
            if (citizen) callbacks.onUpsert(citizen);
            else callbacks.onDelete(id); // Row present but no valid profile yet
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          callbacks.onStatus("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          callbacks.onStatus("reconnecting");
        } else if (status === "CLOSED") {
          callbacks.onStatus("offline");
        }
      });

    return () => { void client.removeChannel(channel); };
  }
}

// A row only becomes a visible citizen once it has a named person.
function toCitizen(id: string, data: UniverseData): Citizen | null {
  if (!data?.user?.name) return null;
  return {
    ownerId: id,
    user: data.user,
    people: data.people ?? [],
    lights: data.lights ?? [],
    memories: data.memories ?? [],
    milestones: data.milestones ?? [],
    nebulas: data.nebulas ?? [],
    artifacts: data.artifacts ?? [],
    dreams: data.dreams ?? [],
    fragments: data.fragments ?? [],
    wisdom: data.wisdom ?? [],
    signals: data.signals ?? [],
    constellations: data.constellations ?? [],
  };
}

export function makeSupabaseRepository(): UniverseRepository | null {
  return SUPABASE_CONFIGURED ? new SupabaseRepository() : null;
}
