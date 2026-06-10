import { supabase } from "./supabaseClient";
import type { Connection, ConnectionStatus } from "../types";

const TABLE = "connections";

interface ConnectionRow {
  id: string;
  from_id: string;
  to_id: string;
  status: ConnectionStatus;
  from_name: string;
  from_color: string;
  to_name: string;
  from_message: string;
  from_whatsapp: string | null;
  to_whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(r: ConnectionRow): Connection {
  return {
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    status: r.status,
    fromName: r.from_name,
    fromColor: r.from_color,
    toName: r.to_name,
    fromMessage: r.from_message,
    fromWhatsapp: r.from_whatsapp ?? undefined,
    toWhatsapp: r.to_whatsapp ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

// Every connection involving `selfId`, either direction.
export async function loadConnections(selfId: string): Promise<Connection[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .or(`from_id.eq.${selfId},to_id.eq.${selfId}`)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => fromRow(r as ConnectionRow));
  } catch (err) {
    console.warn("Light Bridge: could not load connections", err);
    return [];
  }
}

export async function sendConnectionRequest(input: {
  fromId: string;
  toId: string;
  fromName: string;
  fromColor: string;
  toName: string;
  fromMessage: string;
}): Promise<Connection | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        from_id: input.fromId,
        to_id: input.toId,
        from_name: input.fromName,
        from_color: input.fromColor,
        to_name: input.toName,
        from_message: input.fromMessage,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as ConnectionRow);
  } catch (err) {
    console.warn("Light Bridge: could not send connection request", err);
    return null;
  }
}

export async function respondToConnection(
  id: string,
  status: "accepted" | "declined",
  toWhatsapp?: string,
): Promise<Connection | null> {
  if (!supabase) return null;
  try {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "accepted" && toWhatsapp) update.to_whatsapp = toWhatsapp;
    const { data, error } = await supabase
      .from(TABLE)
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as ConnectionRow);
  } catch (err) {
    console.warn("Light Bridge: could not respond to connection", err);
    return null;
  }
}

// Called by the original requester once they see the other side accepted —
// completes the mutual reveal by writing their own WhatsApp number.
export async function shareWhatsapp(id: string, whatsapp: string, side: "from" | "to"): Promise<Connection | null> {
  if (!supabase) return null;
  try {
    const column = side === "from" ? "from_whatsapp" : "to_whatsapp";
    const { data, error } = await supabase
      .from(TABLE)
      .update({ [column]: whatsapp, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as ConnectionRow);
  } catch (err) {
    console.warn("Light Bridge: could not share contact", err);
    return null;
  }
}

export interface ConnectionCallbacks {
  onUpsert(connection: Connection): void;
}

// Subscribes to every connections row touching `selfId`, in either direction.
// Two postgres_changes filters are needed since a single filter can't express OR.
export function subscribeConnections(selfId: string, callbacks: ConnectionCallbacks): () => void {
  const client = supabase;
  if (!client) return () => {};

  const handle = (payload: { new: Record<string, unknown> }) => {
    const row = payload.new as unknown as ConnectionRow;
    if (row?.id) callbacks.onUpsert(fromRow(row));
  };

  const channel = client
    .channel(`light-bridge-${selfId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `to_id=eq.${selfId}` }, handle)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `from_id=eq.${selfId}` }, handle)
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
