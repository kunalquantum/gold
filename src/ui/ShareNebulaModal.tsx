import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { MemoryNebula } from "../types";
import { ROLE_LABELS } from "../utils";

interface Props {
  nebula: MemoryNebula;
  onClose: () => void;
}

export function ShareNebulaModal({ nebula, onClose }: Props) {
  const selfId = useUniverseStore((s) => s.selfId);
  const world = useUniverseStore((s) => s.world)();
  const addParticipantToNebula = useUniverseStore((s) => s.addParticipantToNebula);

  // Citizens who can be added: public, not self, not already a participant
  const candidates = world.filter(
    (c) =>
      c.ownerId !== selfId &&
      c.user.isPublic &&
      !nebula.participantIds.includes(c.ownerId),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(ownerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  }

  function handleShare() {
    selected.forEach((id) => addParticipantToNebula(nebula.id, id));
    onClose();
  }

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="modal__head">
          <h2 className="modal__title">Share "{nebula.title}"</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p style={{ color: "var(--ink-soft)", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
          This memory place will appear in their universe too.
          They can add their own memories alongside yours.
        </p>

        {candidates.length === 0 ? (
          <p className="share-modal__empty">
            {world.filter((c) => c.ownerId !== selfId).length === 0
              ? "No one else is in the cosmos yet."
              : "Everyone in the cosmos is already part of this place."}
          </p>
        ) : (
          <div className="share-modal__list">
            {candidates.map((c) => {
              const active = selected.has(c.ownerId);
              return (
                <button
                  key={c.ownerId}
                  className={`share-modal__citizen ${active ? "share-modal__citizen--selected" : ""}`}
                  onClick={() => toggle(c.ownerId)}
                >
                  <span
                    className="share-modal__dot"
                    style={{ background: c.user.color }}
                  />
                  <span className="share-modal__name">{c.user.name}</span>
                  {c.user.role && (
                    <span className="share-modal__role">{ROLE_LABELS[c.user.role]}</span>
                  )}
                  <span className="share-modal__check">{active ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        )}

        {nebula.participantIds.filter((id) => id !== selfId).length > 0 && (
          <p className="share-modal__already">
            Already shared with {nebula.participantIds.filter((id) => id !== selfId).length}{" "}
            {nebula.participantIds.filter((id) => id !== selfId).length === 1 ? "person" : "people"}
          </p>
        )}

        <button
          className="btn btn--primary"
          style={{ marginTop: "22px" }}
          disabled={selected.size === 0}
          onClick={handleShare}
        >
          {selected.size === 0
            ? "Select someone"
            : `Share with ${selected.size} ${selected.size === 1 ? "person" : "people"}`}
        </button>
      </motion.div>
    </motion.div>
  );
}
