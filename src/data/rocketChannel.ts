import { supabase } from "./supabaseClient";

export interface RocketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  receiverId: string;
  receiverName: string;
  message: string;
}

type RocketCb = (r: RocketMessage) => void;
const listeners = new Set<RocketCb>();
let channelReady = false;

function initChannel() {
  if (!supabase || channelReady) return;
  channelReady = true;
  supabase
    .channel("universe-rockets")
    .on("broadcast", { event: "rocket" }, ({ payload }) => {
      emit(payload as RocketMessage);
    })
    .subscribe();
}

function emit(r: RocketMessage) {
  for (const cb of listeners) cb(r);
}

export function onRocket(cb: RocketCb): () => void {
  initChannel();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function broadcastRocket(r: RocketMessage): void {
  emit(r);
  if (!supabase) return;
  void supabase.channel("universe-rockets").send({
    type: "broadcast",
    event: "rocket",
    payload: r,
  });
}
