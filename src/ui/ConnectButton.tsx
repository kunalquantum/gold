import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { useAuthStore } from "../data/auth";
import { checkContent } from "../utils/contentGuard";
import type { Citizen } from "../types";

interface Props {
  target: Citizen;
}

// Sends a Light Bridge connection request — only revealed as a WhatsApp
// contact if the other person accepts too.
export function ConnectButton({ target }: Props) {
  const authStatus = useAuthStore((s) => s.status);
  const openAuthScreen = useAuthStore((s) => s.openAuthScreen);
  const selfId = useUniverseStore((s) => s.selfId);
  const connections = useUniverseStore((s) => s.connections);
  const requestConnection = useUniverseStore((s) => s.requestConnection);
  const openOverlay = useUniverseStore((s) => s.openOverlay);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existing = connections.find(
    (c) => c.fromId === target.ownerId || c.toId === target.ownerId,
  );

  if (authStatus !== "authenticated") {
    return (
      <button className="connect-btn" onClick={openAuthScreen} title="Sign in to connect">
        🌉 Connect
      </button>
    );
  }

  if (existing) {
    if (existing.status === "accepted") {
      return (
        <button className="connect-btn connect-btn--active" onClick={() => openOverlay({ kind: "lightBridge" })}>
          🌉 Connected
        </button>
      );
    }
    if (existing.status === "pending") {
      const iSent = existing.fromId === selfId;
      return (
        <button className="connect-btn connect-btn--pending" onClick={() => openOverlay({ kind: "lightBridge" })}>
          {iSent ? "🌉 Request sent" : "🌉 Wants to connect"}
        </button>
      );
    }
  }

  function handleSend() {
    const err = checkContent(message);
    if (err) { setError(err); return; }
    setError(null);
    void requestConnection(target, message);
    setOpen(false);
    setMessage("");
  }

  return (
    <div className="send-rocket">
      <AnimatePresence>
        {open && (
          <motion.div
            className="send-rocket__tray connect-tray"
            initial={{ opacity: 0, y: 6, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.93 }}
            transition={{ duration: 0.18 }}
          >
            <p className="send-rocket__hint">Connect with {target.user.name}</p>
            <p className="connect-tray__note">
              If they accept, you'll both be able to continue on WhatsApp.
            </p>
            <textarea
              className="light-give__textarea"
              value={message}
              onChange={(e) => { setMessage(e.target.value); setError(null); }}
              placeholder={`A short note for ${target.user.name}...`}
              rows={2}
              maxLength={200}
              autoFocus
            />
            {error && <p className="content-guard-error">{error}</p>}
            <button className="btn btn--primary btn--block" onClick={handleSend}>
              Send request
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button className="connect-btn" onClick={() => setOpen((v) => !v)}>
        🌉 Connect
      </button>
    </div>
  );
}
