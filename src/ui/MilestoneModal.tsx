import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { MilestoneType } from "../types";
import { MILESTONE_DEFS } from "../utils";
import { checkContent } from "../utils/contentGuard";

export function MilestoneModal() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const addMilestone = useUniverseStore((s) => s.addMilestone);

  const [selectedType, setSelectedType] = useState<MilestoneType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [guardError, setGuardError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPublic, setIsPublic] = useState(true);

  function handleSelectType(type: MilestoneType) {
    setSelectedType(type);
    const def = MILESTONE_DEFS.find((d) => d.type === type);
    if (def && !title) setTitle(def.defaultTitle);
  }

  const canSave = selectedType !== null && title.trim().length > 0;

  function handleSave() {
    if (!selectedType) return;
    const combined = [title, description].filter(Boolean).join(" ");
    const err = checkContent(combined);
    if (err) { setGuardError(err); return; }
    setGuardError(null);
    addMilestone({
      type: selectedType,
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      isPublic,
    });
    closeOverlay();
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
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="modal__head">
          <h2 className="modal__title">Mark a moment</h2>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <p style={{ color: "var(--ink-soft)", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
          Every step forward deserves to be held. These become stars in your journey.
        </p>

        <span className="field__label" style={{ marginBottom: "10px", display: "block" }}>What happened?</span>
        <div className="milestone-type-grid">
          {MILESTONE_DEFS.map((def) => (
            <button
              key={def.type}
              type="button"
              className={`milestone-type-btn ${selectedType === def.type ? "milestone-type-btn--active" : ""}`}
              onClick={() => handleSelectType(def.type)}
            >
              <span className="milestone-type-btn__glyph">{def.glyph}</span>
              <span className="milestone-type-btn__label">{def.label}</span>
            </button>
          ))}
        </div>

        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <label className="field" style={{ marginTop: "20px" }}>
              <span className="field__label">Give it a name</span>
              <input
                className="field__input"
                value={title}
                placeholder="e.g. Last chemo, done."
                maxLength={80}
                autoFocus
                onChange={(e) => { setTitle(e.target.value); setGuardError(null); }}
              />
            </label>

            <label className="field">
              <span className="field__label">What do you want to remember? (optional)</span>
              <textarea
                className="composer__input"
                value={description}
                placeholder="How it felt, who was there, what it means..."
                rows={3}
                maxLength={400}
                onChange={(e) => { setDescription(e.target.value); setGuardError(null); }}
              />
            </label>

            <label className="field">
              <span className="field__label">Date</span>
              <input
                className="field__input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <div className="privacy-row" style={{ marginBottom: "20px" }}>
              <div className="privacy-row__text">
                <span className="privacy-row__label">Share with the cosmos</span>
                <span className="privacy-row__sub">Others in this universe can see this victory</span>
              </div>
              <button
                type="button"
                className={`toggle ${isPublic ? "toggle--on" : ""}`}
                onClick={() => setIsPublic((v) => !v)}
                aria-label="Toggle public milestone"
              />
            </div>
          </motion.div>
        )}

        {guardError && <p className="content-guard-error">{guardError}</p>}
        <button
          className="btn btn--primary"
          disabled={!canSave}
          onClick={handleSave}
        >
          Hold this moment
        </button>
      </motion.div>
    </motion.div>
  );
}
