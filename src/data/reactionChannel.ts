import { supabase } from "./supabaseClient";

export interface Reaction {
  id: string;
  emoji: string;
  senderName: string;
  color: string;
}

type ReactionCb = (r: Reaction) => void;

const listeners = new Set<ReactionCb>();
let channelReady = false;

function initChannel() {
  if (!supabase || channelReady) return;
  channelReady = true;
  supabase
    .channel("universe-reactions")
    .on("broadcast", { event: "reaction" }, ({ payload }) => {
      emit(payload as Reaction);
    })
    .subscribe();
}

function emit(r: Reaction) {
  for (const cb of listeners) cb(r);
}

export function onReaction(cb: ReactionCb): () => void {
  initChannel();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// Fires the reaction locally (so you see your own) and broadcasts to all peers.
export function broadcastReaction(r: Reaction): void {
  emit(r);
  if (!supabase) return;
  // Best-effort — no await, no error surface needed for ephemeral reactions.
  void supabase.channel("universe-reactions").send({
    type: "broadcast",
    event: "reaction",
    payload: r,
  });
}
