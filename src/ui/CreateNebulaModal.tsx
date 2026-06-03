import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { EmotionTag } from "../types";
import { EMOTION_LABELS, EMOTION_PALETTES, EMOTION_GLYPHS } from "../utils";
import { checkContent } from "../utils/contentGuard";

const EMOTIONS: EmotionTag[] = ["joy", "love", "proud", "adventure", "hope", "peace"];

export function CreateNebulaModal() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const addNebula = useUniverseStore((s) => s.addNebula);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const selfId = useUniverseStore((s) => s.selfId);

  const [title, setTitle] = useState("");
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);
  const [guardError, setGuardError] = useState<string | null>(null);

  const canCreate = title.trim().length > 0 && emotion !== null;

  function handleCreate() {
    if (!emotion) return;
    const err = checkContent(title);
    if (err) { setGuardError(err); return; }
    setGuardError(null);
    const nebula = addNebula({ title: title.trim(), emotion, participantIds: [selfId] });
    openOverlay({ kind: "nebulaInterior", nebulaId: nebula.id });
  }

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="modal__head">
          <h2 className="modal__title">Create a memory place</h2>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <p style={{ color: "var(--ink-soft)", fontSize: "13px", lineHeight: 1.6, marginBottom: "22px" }}>
          A nebula is a chapter of your life — not a folder, but a feeling.
          Choose what this place is made of.
        </p>

        <label className="field">
          <span className="field__label">Name this place</span>
          <input
            className="field__input"
            value={title}
            autoFocus
            placeholder="e.g. Goa Sunset, Dad's Stories, College Days"
            maxLength={60}
            onChange={(e) => { setTitle(e.target.value); setGuardError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && canCreate) handleCreate(); }}
          />
        </label>

        <span className="field__label" style={{ display: "block", marginBottom: "12px" }}>
          What feeling lives here?
        </span>
        <div className="emotion-grid">
          {EMOTIONS.map((em) => {
            const palette = EMOTION_PALETTES[em];
            const active = emotion === em;
            return (
              <button
                key={em}
                type="button"
                className={`emotion-card ${active ? "emotion-card--active" : ""}`}
                style={active ? {
                  borderColor: palette.primary,
                  background: `${palette.primary}14`,
                  boxShadow: `0 0 18px ${palette.glow}30`,
                } : {}}
                onClick={() => setEmotion(em)}
              >
                <span className="emotion-card__glyph" style={{ color: active ? palette.primary : "var(--ink-faint)" }}>
                  {EMOTION_GLYPHS[em]}
                </span>
                <span className="emotion-card__label">{EMOTION_LABELS[em]}</span>
                {active && (
                  <span
                    className="emotion-card__preview"
                    style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {guardError && <p className="content-guard-error" style={{ marginTop: "12px" }}>{guardError}</p>}
        <button
          className="btn btn--primary"
          style={{ marginTop: "12px" }}
          disabled={!canCreate}
          onClick={handleCreate}
        >
          Enter this place →
        </button>
      </motion.div>
    </motion.div>
  );
}
