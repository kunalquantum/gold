import type { Citizen, LightForm, LightType, UniverseData } from "../types";
import type { UniverseRepository, WorldCallbacks } from "./repository";
import { localRepository } from "./localRepository";
import { ownerId } from "./identity";
import { SUPABASE_CONFIGURED, supabase } from "./supabaseClient";

// Must match WORLD_PAGE_SIZE in repository.ts.
const PAGE_SIZE = 50;

const PRIVATE_TABLE = "universes";
const PUBLIC_TABLE  = "universe_public";
const SAVE_DEBOUNCE_MS = 700;

// Sanitised shape stored in universe_public. No content, no photos, no private identifiers.
interface PublicRow {
  user: UniverseData["user"];
  people: Array<{ id: string; name: string; relationship: string; orbit: unknown; createdAt: number }>;
  lights: Array<{ id: string; senderId: string; receiverId: string; type: LightType; content: string; sealed: boolean; opened: boolean; createdAt: number; orbitPosition: number; color: string; form: LightForm }>;
  milestones: UniverseData["milestones"];
  nebulas: UniverseData["nebulas"];
  artifacts: UniverseData["artifacts"];
  dreams: UniverseData["dreams"];
  fragments: UniverseData["fragments"];
  wisdom: UniverseData["wisdom"];
  signals: UniverseData["signals"];
  constellations: UniverseData["constellations"];
}

function toPublicRow(data: UniverseData): PublicRow {
  return {
    user: data.user,
    // Strip photo — keeps name/relationship for planet labels in the 3D scene.
    people: (data.people ?? []).map(({ id, name, relationship, orbit, createdAt }) => ({ id, name, relationship, orbit, createdAt })),
    // Strip content/media/sender/receiver — visual orbit parameters only.
    lights: (data.lights ?? []).map(({ id, orbitPosition, color, form, sealed }) => ({
      id, orbitPosition, color, form, sealed,
      senderId: "", receiverId: "", type: "text" as LightType, content: "", opened: false, createdAt: 0,
    })),
    milestones: (data.milestones ?? []).filter((m) => m.isPublic),
    nebulas:        data.nebulas        ?? [],
    artifacts:      data.artifacts      ?? [],
    dreams:         data.dreams         ?? [],
    fragments:      data.fragments      ?? [],
    wisdom:         data.wisdom         ?? [],
    signals:        (data.signals ?? []).filter((s) => s.visibility === "public"),
    constellations: data.constellations ?? [],
  };
}

// Cloud-synced, local-first repository for the shared universe:
//   • your own universe reads/writes locally first, then syncs (debounced)
//   • private data (lights, people, memories) stays in `universes` — owner-only
//   • public data (visual params, public signals, nebulas) mirrors to `universe_public`
//   • the world is loaded from and subscribed via `universe_public` only
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
        .from(PRIVATE_TABLE)
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
      const now = new Date().toISOString();
      const [privateResult, publicResult] = await Promise.all([
        supabase.from(PRIVATE_TABLE).upsert({ id: this.id, data, updated_at: now }),
        supabase.from(PUBLIC_TABLE).upsert({ id: this.id, data: toPublicRow(data), updated_at: now }),
      ]);
      if (privateResult.error) throw privateResult.error;
      if (publicResult.error) throw publicResult.error;
    } catch (err) {
      console.warn("Universe: Supabase save failed — kept locally", err);
    }
  }

  // One page of the shared world — always via PostgREST so we get live data
  // with correct RLS (no CDN staleness hiding recently-joined users).
  async loadWorld(offset = 0): Promise<Citizen[]> {
    if (!supabase) return localRepository.loadWorld(offset);
    return this.loadWorldPostgREST(offset);
  }

  // Direct PostgREST fallback — used until the Edge Function is deployed.
  private async loadWorldPostgREST(offset = 0): Promise<Citizen[]> {
    if (!supabase) return offset === 0 ? localRepository.loadWorld() : [];
    try {
      const { data, error } = await supabase
        .from(PUBLIC_TABLE)
        .select("id, data")
        .order("updated_at", { ascending: false })
        .order("id",         { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      const rawCount = data?.length ?? 0;
      const citizens = (data ?? [])
        .map((row) => toCitizen(row.id as string, row.data as PublicRow))
        .filter((c): c is Citizen => c !== null);

      // Diagnostic — visible in DevTools so we can confirm RLS / row counts in
      // production. Tag is searchable; keep until shared-galaxy issues settle.
      console.info(
        `[Universe] loadWorld(offset=${offset}): ${rawCount} rows from PostgREST → ${citizens.length} named citizens`,
        { selfId: this.id, ids: (data ?? []).map((r) => r.id) },
      );

      return citizens;
    } catch (err) {
      console.warn("[Universe] loadWorld failed", err);
      return offset === 0 ? localRepository.loadWorld() : [];
    }
  }

  // Fetch specific citizens by ID — used for orbit-priority loading.
  async loadCitizensByIds(ids: string[]): Promise<Citizen[]> {
    if (!supabase || ids.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from(PUBLIC_TABLE)
        .select("id, data")
        .in("id", ids);
      if (error) throw error;
      return (data ?? [])
        .map((row) => toCitizen(row.id as string, row.data as PublicRow))
        .filter((c): c is Citizen => c !== null);
    } catch (err) {
      console.warn("Universe: could not load orbited citizens", err);
      return [];
    }
  }

  // Subscribes to row-level changes in universe_public and delivers surgical
  // updates via callbacks. No full table re-fetch on every change.
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
        { event: "*", schema: "public", table: PUBLIC_TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Record<string, unknown>).id as string | undefined;
            if (id) callbacks.onDelete(id);
          } else {
            const row = payload.new as Record<string, unknown>;
            const id = row.id as string | undefined;
            if (!id) return;
            const data = row.data as PublicRow | undefined;
            const citizen = data ? toCitizen(id, data) : null;
            if (citizen) callbacks.onUpsert(citizen);
            else callbacks.onDelete(id);
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

// A row only becomes a visible citizen once it has a named profile.
function toCitizen(id: string, data: PublicRow): Citizen | null {
  if (!data?.user?.name) return null;
  return {
    ownerId: id,
    user: data.user!,
    // PublicRow.people omits `photo` — that field is optional in Person so this is safe.
    people: (data.people ?? []) as Citizen["people"],
    // PublicRow.lights have empty content/sender/receiver — visual rendering only uses
    // orbitPosition, color, form, sealed, id. All present.
    lights: (data.lights ?? []) as Citizen["lights"],
    memories:       [],
    milestones:     data.milestones     ?? [],
    nebulas:        data.nebulas        ?? [],
    artifacts:      data.artifacts      ?? [],
    dreams:         data.dreams         ?? [],
    fragments:      data.fragments      ?? [],
    wisdom:         data.wisdom         ?? [],
    signals:        data.signals        ?? [],
    constellations: data.constellations ?? [],
  };
}

export function makeSupabaseRepository(): UniverseRepository | null {
  return SUPABASE_CONFIGURED ? new SupabaseRepository() : null;
}
