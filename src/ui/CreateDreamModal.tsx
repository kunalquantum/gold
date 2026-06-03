import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { DreamCategory } from "../types";
import { DREAM_CATEGORY_GLYPHS, DREAM_CATEGORY_LABELS, DREAM_CATEGORY_PALETTES } from "../utils";

const CATEGORIES: DreamCategory[] = ["adventure", "creativity", "family", "purpose"];

export function CreateDreamModal() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const addDream = useUniverseStore((s) => s.addDream);
  const openOverlay = useUniverseStore((s) => s.openOverlay);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DreamCategory | null>(null);

  const canCreate = title.trim().length > 0 && category !== null;

  function handleCreate() {
    if (!category) return;
    const dream = addDream({ title, description: description.trim() || undefined, category });
    openOverlay({ kind: "dreamDetail", dreamId: dream.id });
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
          <h2 className="modal__title">A dream for your sky</h2>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <p className="dream-create__prompt">
          What is something you still want to experience?
        </p>

        <label className="field">
          <input
            className="field__input dream-create__input"
            value={title}
            autoFocus
            placeholder="Visit Kashmir, learn guitar, plant a garden…"
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canCreate) handleCreate(); }}
          />
        </label>

        <label className="field" style={{ marginTop: "4px" }}>
          <span className="field__label">A little more (optional)</span>
          <input
            className="field__input"
            value={description}
            placeholder="Why does this dream matter to you?"
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <span className="field__label" style={{ display: "block", marginBottom: "12px", marginTop: "20px" }}>
          Which galaxy does this belong to?
        </span>
        <div className="dream-category-grid">
          {CATEGORIES.map((cat) => {
            const palette = DREAM_CATEGORY_PALETTES[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`dream-category-card ${active ? "dream-category-card--active" : ""}`}
                style={active ? {
                  borderColor: palette.star,
                  background: `${palette.star}12`,
                  boxShadow: `0 0 18px ${palette.glow}28`,
                } : {}}
                onClick={() => setCategory(cat)}
              >
                <span
                  className="dream-category-card__glyph"
                  style={{ color: active ? palette.star : "var(--ink-faint)" }}
                >
                  {DREAM_CATEGORY_GLYPHS[cat]}
                </span>
                <span className="dream-category-card__label">{DREAM_CATEGORY_LABELS[cat]}</span>
              </button>
            );
          })}
        </div>

        <button
          className="btn btn--primary"
          style={{ marginTop: "24px" }}
          disabled={!canCreate}
          onClick={handleCreate}
        >
          Add this dream to your sky →
        </button>
      </motion.div>
    </motion.div>
  );
}
