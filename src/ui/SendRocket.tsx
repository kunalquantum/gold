import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { broadcastRocket } from "../data/rocketChannel";
import { useUniverseStore } from "../store/useUniverseStore";
import { uid } from "../utils";
import type { Citizen } from "../types";

const MESSAGES = [
  "I'm here with you 💛",
  "You've got this ✨",
  "Thinking of you 🌟",
  "Sending strength 🤍",
  "You're not alone 💫",
  "One day at a time 🌈",
];

interface Props {
  target: Citizen;
}

export function SendRocket({ target }: Props) {
  const user   = useUniverseStore((s) => s.user);
  const selfId = useUniverseStore((s) => s.selfId);
  const [open,  setOpen]  = useState(false);
  const [sent,  setSent]  = useState(false);

  if (!user) return null;

  function launch(message: string) {
    broadcastRocket({
      id: uid(),
      senderId: selfId,
      senderName: user!.name,
      senderColor: user!.color ?? "#ffd27a",
      receiverId: target.ownerId,
      receiverName: target.user.name,
      message,
    });
    setSent(true);
    setOpen(false);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="send-rocket">
      <AnimatePresence>
        {open && (
          <motion.div
            className="send-rocket__tray"
            initial={{ opacity: 0, y: 6, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.93 }}
            transition={{ duration: 0.18 }}
          >
            <p className="send-rocket__hint">Send to {target.user.name}</p>
            {MESSAGES.map((msg) => (
              <motion.button
                key={msg}
                className="send-rocket__msg"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => launch(msg)}
              >
                {msg}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={`send-rocket__btn${sent ? " send-rocket__btn--sent" : ""}`}
        whileTap={{ scale: 0.88 }}
        onClick={() => !sent && setOpen((v) => !v)}
        title={sent ? "Rocket launched!" : `Send a rocket to ${target.user.name}`}
      >
        {sent ? "🚀 Launched!" : "🚀 Send"}
      </motion.button>
    </div>
  );
}
