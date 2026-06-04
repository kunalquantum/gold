import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { broadcastReaction } from "../data/reactionChannel";
import { useUniverseStore } from "../store/useUniverseStore";
import { uid } from "../utils";

const REACTIONS = [
  { emoji: "💛", label: "Warmth" },
  { emoji: "✨", label: "Sparkle" },
  { emoji: "🌟", label: "Strength" },
  { emoji: "🤍", label: "Love" },
  { emoji: "💫", label: "Cosmic" },
  { emoji: "🌈", label: "Hope" },
];

export function ReactionBar() {
  const user = useUniverseStore((s) => s.user);
  const [open, setOpen]   = useState(false);
  const [burst, setBurst] = useState<string | null>(null);

  if (!user) return null;

  function send(emoji: string) {
    broadcastReaction({
      id: uid(),
      emoji,
      senderName: user!.name,
      color: user!.color ?? "#ffd27a",
    });
    setBurst(emoji);
    setOpen(false);
    setTimeout(() => setBurst(null), 1800);
  }

  return (
    <div className="reaction-bar">
      <AnimatePresence>
        {open && (
          <motion.div
            className="reaction-bar__tray"
            initial={{ opacity: 0, y: 10, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.88 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {REACTIONS.map((r) => (
              <motion.button
                key={r.emoji}
                className="reaction-bar__emoji"
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => send(r.emoji)}
                title={r.label}
              >
                {r.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={`reaction-bar__trigger${open ? " reaction-bar__trigger--open" : ""}`}
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen((v) => !v)}
        title="Send a reaction into the universe"
        aria-label="Reactions"
      >
        <AnimatePresence mode="wait">
          {burst ? (
            <motion.span
              key={burst}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {burst}
            </motion.span>
          ) : (
            <motion.span
              key="ship"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              🛸
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
