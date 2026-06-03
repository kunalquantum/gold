import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { Citizen, DreamCategory } from "../types";
import {
  DREAM_CATEGORY_GLYPHS,
  DREAM_CATEGORY_LABELS,
  DREAM_CATEGORY_PALETTES,
  ROLE_LABELS,
  STAGE_LABELS,
  seedFrom,
} from "../utils";

// Journey stage order — survivorship is furthest ahead.
const STAGE_ORDER: Record<string, number> = {
  survivorship: 0,
  remission: 1,
  treatment: 2,
  diagnosis: 3,
};

function starYPercent(citizen: Citizen): number {
  let base = 0.65;
  if (citizen.user.stage === "survivorship") base = 0.12;
  else if (citizen.user.role === "survivor") base = 0.18;
  else if (citizen.user.stage === "remission") base = 0.28;
  else if (citizen.milestones.some((m) => m.type === "five_year_clear" || m.type === "one_year_clear")) base = 0.22;
  else if (citizen.milestones.length >= 3) base = 0.38;
  else if (citizen.milestones.length >= 1) base = 0.50;
  const noise = (seedFrom(citizen.ownerId + "::yn") - 0.5) * 0.09;
  return Math.max(0.05, Math.min(0.85, base + noise));
}

function starXPercent(citizen: Citizen): number {
  return 8 + seedFrom(citizen.ownerId) * 76;
}

const CATEGORY_FILTERS: { label: string; value: DreamCategory | null }[] = [
  { label: "All paths", value: null },
  { label: "◈ Adventure", value: "adventure" },
  { label: "✦ Creativity", value: "creativity" },
  { label: "♡ Family", value: "family" },
  { label: "✺ Purpose", value: "purpose" },
];

interface StarDotProps {
  citizen: Citizen;
  isReceived: boolean;
  onClick: () => void;
}

function StarDot({ citizen, isReceived, onClick }: StarDotProps) {
  const hasEcho = !!citizen.user.futureEcho;
  const stage = citizen.user.stage;
  const isSurvivor = citizen.user.role === "survivor";
  const isAdvanced = stage && STAGE_ORDER[stage] !== undefined && STAGE_ORDER[stage] <= 1;

  const x = starXPercent(citizen);
  const y = starYPercent(citizen);

  const color =
    isSurvivor || isAdvanced
      ? "#ffd27a"
      : stage === "remission"
      ? "#8be8d8"
      : "#c8a2ff";

  return (
    <button
      className={`star-dot ${hasEcho ? "star-dot--echo" : ""} ${isReceived ? "star-dot--received" : ""}`}
      style={{ left: `${x}%`, top: `${y}%`, "--star-color": color } as React.CSSProperties}
      onClick={onClick}
      title={citizen.user.name}
    >
      <span className="star-dot__core" />
      <span className="star-dot__halo" />
      {hasEcho && <span className="star-dot__echo-ring" />}
      <span className="star-dot__label">{citizen.user.name}</span>
    </button>
  );
}

export function StarsAheadPanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const user = useUniverseStore((s) => s.user);
  const selfId = useUniverseStore((s) => s.selfId);
  const others = useUniverseStore((s) => s.others);
  const receivedEchoIds = useUniverseStore((s) => s.receivedEchoIds);
  const futureEcho = useUniverseStore((s) => s.user?.futureEcho);
  const receiveEcho = useUniverseStore((s) => s.receiveEcho);
  const setFutureEcho = useUniverseStore((s) => s.setFutureEcho);
  const setJourneyNote = useUniverseStore((s) => s.setJourneyNote);
  const selectCitizen = useUniverseStore((s) => s.selectCitizen);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DreamCategory | null>(null);
  const [echoText, setEchoText] = useState(user?.futureEcho ?? "");
  const [thenText, setThenText] = useState(user?.journeyThen ?? "");
  const [nowText, setNowText] = useState(user?.journeyNow ?? "");
  const [showEchoComposer, setShowEchoComposer] = useState(false);
  const [justReceived, setJustReceived] = useState(false);

  const starsAhead = useMemo(() => {
    return others.filter((c) => {
      if (!c.user.isPublic) return false;
      const hasJourney = c.milestones.length > 0 || c.fragments.filter((f) => f.completed).length >= 2;
      const isSurvivor = c.user.role === "survivor";
      const isAdvanced = c.user.stage && STAGE_ORDER[c.user.stage] !== undefined && STAGE_ORDER[c.user.stage] <= 2;
      return hasJourney || isSurvivor || isAdvanced;
    });
  }, [others]);

  const filtered = useMemo(() => {
    if (!filter) return starsAhead;
    return starsAhead.filter((c) => c.dreams.some((d) => d.category === filter));
  }, [starsAhead, filter]);

  const selected = selectedId ? filtered.find((c) => c.ownerId === selectedId) ?? null : null;

  const canLeaveEcho =
    user?.role === "survivor" ||
    user?.stage === "survivorship" ||
    user?.stage === "remission";

  function handleReceiveEcho(fromOwnerId: string) {
    receiveEcho(fromOwnerId);
    setJustReceived(true);
    setTimeout(() => setJustReceived(false), 2400);
  }

  function handleVisit(ownerId: string) {
    selectCitizen(ownerId);
    closeOverlay();
  }

  function handleSaveEcho() {
    setFutureEcho(echoText.trim());
    setJourneyNote(thenText.trim(), nowText.trim());
    setShowEchoComposer(false);
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
        className="panel stars-ahead-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">Stars Ahead of You</h2>
            <p className="stars-ahead__sub">People who once stood where you stand now.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="profile"
                className="star-profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <button className="star-profile__back" onClick={() => setSelectedId(null)}>
                  ← Back to the constellation
                </button>

                <div className="star-profile__header">
                  <span className="star-profile__star">✨</span>
                  <div>
                    <h3 className="star-profile__name">{selected.user.name}</h3>
                    <div className="star-profile__badges">
                      {selected.user.role && (
                        <span className="role-badge" style={{ color: "#ffd27a" }}>
                          {ROLE_LABELS[selected.user.role]}
                        </span>
                      )}
                      {selected.user.stage && (
                        <span className="stage-badge">{STAGE_LABELS[selected.user.stage]}</span>
                      )}
                    </div>
                  </div>
                </div>

                {(selected.user.journeyThen || selected.user.journeyNow) && (
                  <div className="star-profile__journey">
                    {selected.user.journeyThen && (
                      <div className="star-profile__journey-row">
                        <span className="star-profile__journey-label">Then</span>
                        <p className="star-profile__journey-text">"{selected.user.journeyThen}"</p>
                      </div>
                    )}
                    {selected.user.journeyThen && selected.user.journeyNow && (
                      <div className="star-profile__journey-arrow">↓</div>
                    )}
                    {selected.user.journeyNow && (
                      <div className="star-profile__journey-row">
                        <span className="star-profile__journey-label">Now</span>
                        <p className="star-profile__journey-text">"{selected.user.journeyNow}"</p>
                      </div>
                    )}
                  </div>
                )}

                {selected.dreams.length > 0 && (
                  <div className="star-profile__dreams">
                    {selected.dreams.slice(0, 3).map((d) => {
                      const pal = DREAM_CATEGORY_PALETTES[d.category];
                      return (
                        <span key={d.id} className="star-profile__dream-tag" style={{ color: pal.star, borderColor: `${pal.star}33` }}>
                          {DREAM_CATEGORY_GLYPHS[d.category]} {d.title}
                        </span>
                      );
                    })}
                  </div>
                )}

                {selected.user.futureEcho && (
                  <div className="future-echo-card">
                    <span className="future-echo-card__from">
                      ✦ From {selected.user.name}, to you:
                    </span>
                    <blockquote className="future-echo-card__content">
                      "{selected.user.futureEcho}"
                    </blockquote>

                    <AnimatePresence>
                      {justReceived ? (
                        <motion.p
                          className="future-echo-card__received"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          ✦ This echo has reached you
                        </motion.p>
                      ) : receivedEchoIds.includes(selected.ownerId) ? (
                        <p className="future-echo-card__received future-echo-card__received--quiet">
                          ✦ Received
                        </p>
                      ) : (
                        <button
                          className="future-echo-card__receive-btn"
                          onClick={() => handleReceiveEcho(selected.ownerId)}
                        >
                          Receive this echo ✦
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button
                  className="star-profile__visit"
                  onClick={() => handleVisit(selected.ownerId)}
                >
                  Visit their universe →
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="constellation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Category filter chips */}
                <div className="stars-ahead__filters">
                  {CATEGORY_FILTERS.map((f) => (
                    <button
                      key={f.label}
                      className={`stars-ahead__filter ${filter === f.value ? "stars-ahead__filter--active" : ""}`}
                      onClick={() => setFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div className="stars-ahead__empty">
                    <p>
                      {starsAhead.length === 0
                        ? "The cosmos is still quiet. As others join and share their journey, their stars will appear here."
                        : `No one in this path yet — try a different filter.`}
                    </p>
                  </div>
                ) : (
                  <div className="constellation-map">
                    <div className="constellation-map__guide">
                      <span className="constellation-map__label constellation-map__label--top">Ahead</span>
                      <span className="constellation-map__label constellation-map__label--bottom">Where you are</span>
                    </div>

                    <div className="constellation-map__field">
                      {/* Faint path line */}
                      <div className="constellation-map__path" />

                      {filtered.map((c) => (
                        <StarDot
                          key={c.ownerId}
                          citizen={c}
                          isReceived={receivedEchoIds.includes(c.ownerId)}
                          onClick={() => setSelectedId(c.ownerId)}
                        />
                      ))}
                    </div>

                    <p className="constellation-map__hint">
                      {filtered.some((c) => c.user.futureEcho) && (
                        <><span className="constellation-map__echo-indicator">◉</span> has left an echo for you · </>
                      )}
                      click any star to read their story
                    </p>
                  </div>
                )}

                {/* Echo composer — for people who are ahead */}
                {canLeaveEcho && (
                  <div className="echo-composer-section">
                    <div className="echo-composer-section__divider" />
                    <h3 className="echo-composer-section__title">
                      You are a star for someone behind you
                    </h3>
                    <p className="echo-composer-section__sub">
                      Leave a message. Someone just starting will find it like a transmission from the future.
                    </p>

                    {!showEchoComposer && (
                      <button
                        className="echo-composer-section__trigger"
                        onClick={() => setShowEchoComposer(true)}
                      >
                        {futureEcho
                          ? <><span className="echo-dot">◉</span> Your echo is out there · edit it</>
                          : <>✦ Write your echo</>}
                      </button>
                    )}

                    <AnimatePresence>
                      {showEchoComposer && (
                        <motion.div
                          className="echo-composer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                        >
                          <label className="field">
                            <span className="field__label">Your message to someone behind you</span>
                            <textarea
                              className="echo-composer__textarea"
                              value={echoText}
                              placeholder={`"If you're reading this, I know you're scared. Your story isn't over."`}
                              rows={4}
                              maxLength={320}
                              onChange={(e) => setEchoText(e.target.value)}
                            />
                          </label>

                          <div className="echo-composer__story">
                            <label className="field">
                              <span className="field__label">Then — where you were</span>
                              <input
                                className="field__input"
                                value={thenText}
                                placeholder="I was scared and couldn't imagine the future."
                                maxLength={120}
                                onChange={(e) => setThenText(e.target.value)}
                              />
                            </label>
                            <label className="field" style={{ marginTop: "10px" }}>
                              <span className="field__label">Now — where you are</span>
                              <input
                                className="field__input"
                                value={nowText}
                                placeholder="Now I travel, work, and keep dreaming."
                                maxLength={120}
                                onChange={(e) => setNowText(e.target.value)}
                              />
                            </label>
                          </div>

                          <div className="echo-composer__actions">
                            <button className="btn--ghost" onClick={() => setShowEchoComposer(false)}>
                              Cancel
                            </button>
                            <button
                              className="btn btn--primary"
                              disabled={!echoText.trim()}
                              onClick={handleSaveEcho}
                            >
                              {futureEcho ? "Update your echo" : "Send this echo"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
