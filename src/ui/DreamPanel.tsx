import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { FutureLetterTrigger } from "../types";
import {
  DREAM_CATEGORY_GLYPHS,
  DREAM_CATEGORY_LABELS,
  DREAM_CATEGORY_PALETTES,
  FUTURE_LETTER_LABELS,
  formatDate,
} from "../utils";

const TRIGGERS: FutureLetterTrigger[] = ["dream_completed", "one_year", "five_years"];

interface Props {
  dreamId: string;
}

export function DreamPanel({ dreamId }: Props) {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const selfId = useUniverseStore((s) => s.selfId);
  const world = useUniverseStore((s) => s.world)();
  const addFragment = useUniverseStore((s) => s.addFragment);
  const completeFragment = useUniverseStore((s) => s.completeFragment);
  const addFutureLetter = useUniverseStore((s) => s.addFutureLetter);
  const futureLetters = useUniverseStore((s) => s.futureLetters);

  // Find dream + owner across the world
  const ownerCitizen = world.find((c) => c.dreams.some((d) => d.id === dreamId));
  const dream = ownerCitizen?.dreams.find((d) => d.id === dreamId) ?? null;
  const isOwner = ownerCitizen?.ownerId === selfId;
  const ownerName = !isOwner ? ownerCitizen?.user.name : undefined;

  // Collect all fragments for this dream from the world
  const allFragments = world.flatMap((c) =>
    c.fragments.filter((f) => f.dreamId === dreamId),
  );
  // Deduplicate by id (shared dreams may have fragments in multiple citizens)
  const fragments = [...new Map(allFragments.map((f) => [f.id, f])).values()];
  const completedCount = fragments.filter((f) => f.completed).length;
  const totalCount = fragments.length;

  // Future letters are personal — only the owner sees their own letters for this dream
  const myLetters = futureLetters.filter((l) => l.dreamId === dreamId);

  const [fragmentInput, setFragmentInput] = useState("");
  const [showLetterComposer, setShowLetterComposer] = useState(false);
  const [letterContent, setLetterContent] = useState("");
  const [letterTrigger, setLetterTrigger] = useState<FutureLetterTrigger>("dream_completed");

  if (!dream) return null;

  const palette = DREAM_CATEGORY_PALETTES[dream.category];
  const glyph = DREAM_CATEGORY_GLYPHS[dream.category];

  function handleAddFragment() {
    if (!fragmentInput.trim()) return;
    addFragment(dreamId, fragmentInput);
    setFragmentInput("");
  }

  function handleSaveLetter() {
    if (!letterContent.trim()) return;
    addFutureLetter({ dreamId, content: letterContent.trim(), trigger: letterTrigger });
    setLetterContent("");
    setShowLetterComposer(false);
  }

  const brightnessLabel =
    totalCount === 0
      ? "just beginning to glow"
      : completedCount === totalCount
      ? "fully awake"
      : `${completedCount} of ${totalCount} steps done`;

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
    >
      <motion.div
        className="panel dream-panel"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="panel__head">
          <div className="dream-panel__header">
            <span
              className="dream-panel__category-glyph"
              style={{ color: palette.star }}
            >
              {glyph}
            </span>
            <div>
              <h2 className="dream-panel__title">{dream.title}</h2>
              <span
                className="dream-panel__category"
                style={{ color: palette.star }}
              >
                {DREAM_CATEGORY_LABELS[dream.category]}
                {ownerName && (
                  <span className="dream-panel__shared-by"> · shared by {ownerName}</span>
                )}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {dream.description && (
            <p className="dream-panel__description">{dream.description}</p>
          )}

          {/* Brightness / progress */}
          <div className="dream-panel__brightness">
            <div
              className="dream-panel__brightness-bar"
              style={{
                background: `linear-gradient(90deg, ${palette.star}, ${palette.glow})`,
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 15}%`,
                opacity: totalCount > 0 ? 1 : 0.35,
              }}
            />
            <span className="dream-panel__brightness-label" style={{ color: palette.star }}>
              ✦ {brightnessLabel}
            </span>
          </div>

          {/* Fragments — steps toward the dream */}
          <div className="dream-panel__section">
            <h3 className="dream-panel__section-title">Steps toward this</h3>

            {fragments.length === 0 && (
              <p className="dream-panel__empty">
                Every dream needs a first step. What's one small thing you could do?
              </p>
            )}

            <div className="dream-panel__fragments">
              {fragments.map((f) => (
                <button
                  key={f.id}
                  className={`dream-fragment ${f.completed ? "dream-fragment--done" : ""}`}
                  onClick={() => completeFragment(f.id)}
                  title={f.completed ? "Mark as not done" : "Mark as done"}
                >
                  <span
                    className="dream-fragment__dot"
                    style={f.completed ? { background: palette.star, borderColor: palette.star } : {}}
                  />
                  <span className="dream-fragment__title">{f.title}</span>
                  {f.completed && (
                    <span className="dream-fragment__check" style={{ color: palette.star }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="dream-panel__add-fragment">
              <input
                className="dream-panel__fragment-input"
                value={fragmentInput}
                placeholder="Add a step…"
                maxLength={100}
                onChange={(e) => setFragmentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddFragment(); }}
              />
              <button
                className="dream-panel__fragment-btn"
                style={{ color: palette.star, borderColor: `${palette.star}44` }}
                disabled={!fragmentInput.trim()}
                onClick={handleAddFragment}
              >
                +
              </button>
            </div>
          </div>

          {/* Future letters — only for owner */}
          {isOwner && (
            <div className="dream-panel__section">
              <h3 className="dream-panel__section-title">A letter to your future self</h3>

              {myLetters.length > 0 && (
                <div className="dream-panel__letters">
                  {myLetters.map((l) => (
                    <div key={l.id} className="future-letter">
                      <span className="future-letter__trigger">
                        ✦ {FUTURE_LETTER_LABELS[l.trigger]}
                      </span>
                      <p className="future-letter__preview">
                        {l.content.slice(0, 80)}{l.content.length > 80 ? "…" : ""}
                      </p>
                      <span className="future-letter__date">{formatDate(l.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {showLetterComposer ? (
                  <motion.div
                    className="letter-composer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                  >
                    <textarea
                      className="letter-composer__textarea"
                      value={letterContent}
                      placeholder="Dear future me…"
                      autoFocus
                      rows={5}
                      maxLength={2000}
                      onChange={(e) => setLetterContent(e.target.value)}
                    />

                    <div className="letter-composer__triggers">
                      {TRIGGERS.map((t) => (
                        <button
                          key={t}
                          className={`letter-trigger-btn ${letterTrigger === t ? "letter-trigger-btn--active" : ""}`}
                          style={letterTrigger === t ? { borderColor: palette.star, color: palette.star } : {}}
                          onClick={() => setLetterTrigger(t)}
                        >
                          {FUTURE_LETTER_LABELS[t]}
                        </button>
                      ))}
                    </div>

                    <div className="letter-composer__actions">
                      <button
                        className="btn btn--ghost"
                        onClick={() => { setShowLetterComposer(false); setLetterContent(""); }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn--primary"
                        disabled={!letterContent.trim()}
                        onClick={handleSaveLetter}
                      >
                        Seal this letter
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <button
                    className="dream-panel__write-letter"
                    style={{ borderColor: `${palette.star}40`, color: `${palette.star}cc` }}
                    onClick={() => setShowLetterComposer(true)}
                  >
                    ✦ Write when you get there
                  </button>
                )}
              </AnimatePresence>
            </div>
          )}

          <p className="dream-panel__date">
            Added to your sky {formatDate(dream.createdAt)}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
