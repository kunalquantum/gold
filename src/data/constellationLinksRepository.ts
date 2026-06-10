import { supabase } from "./supabaseClient";
import type { ConstellationId } from "../types";

const TABLE = "constellation_links";

// constellation id → WhatsApp group invite URL (crowd-sourced).
export type ConstellationLinks = Partial<Record<ConstellationId, string>>;

export async function loadConstellationLinks(): Promise<ConstellationLinks> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from(TABLE).select("id, whatsapp_url");
    if (error) throw error;
    const out: ConstellationLinks = {};
    for (const row of data ?? []) {
      const id = row.id as ConstellationId;
      const url = row.whatsapp_url as string | null;
      if (url) out[id] = url;
    }
    return out;
  } catch (err) {
    console.warn("Constellations: could not load WhatsApp group links", err);
    return {};
  }
}

export async function setConstellationLink(id: ConstellationId, whatsappUrl: string, updatedBy: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id, whatsapp_url: whatsappUrl, updated_by: updatedBy, updated_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Constellations: could not save WhatsApp group link", err);
    return false;
  }
}
