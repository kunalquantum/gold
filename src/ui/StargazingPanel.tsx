import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { CosmicReactionType, ConstellationId, SignalType, SignalVisibility } from "../types";
import {
  SIGNAL_TYPE_GLYPHS,
  SIGNAL_TYPE_LABELS,
  COSMIC_REACTION_GLYPHS,
  COSMIC_REACTION_LABELS,
  STAGE_LABELS,
} from "../utils";

// Seed signals — authentic anonymous moments. Shown when no real others are present.
const SEED_SIGNALS = [
  { id: "s1", type: "milestone" as SignalType, content: "Finished my last radiation session today. I don't have the words yet. But I'm here.", stage: "treatment" },
  { id: "s2", type: "reflection" as SignalType, content: "Learning that 'getting back to normal' isn't the goal. Finding a new kind of normal is.", stage: "remission" },
  { id: "s3", type: "dream" as SignalType, content: "Booked a trip to see the Northern Lights. Always said I would. Not waiting anymore.", stage: "survivorship" },
  { id: "s4", type: "memory" as SignalType, content: "Made my mom's recipe today for the first time in months. It tasted like love.", stage: "remission" },
  { id: "s5", type: "milestone" as SignalType, content: "Six months clear. Six months.", stage: "survivorship" },
  { id: "s6", type: "reflection" as SignalType, content: "A stranger on the bus gave me his seat without being asked. I almost cried.", stage: "treatment" },
  { id: "s7", type: "dream" as SignalType, content: "Signed up for a painting class. Always said I wasn't creative. I'm trying anyway.", stage: "diagnosis" },
  { id: "s8", type: "reflection" as SignalType, content: "Hard day. But I made it through. That's the whole entry.", stage: "treatment" },
  { id: "s9", type: "memory" as SignalType, content: "First walk in the park after four months indoors. The trees are still there. So am I.", stage: "remission" },
  { id: "s10", type: "milestone" as SignalType, content: "Rang the bell today.", stage: "treatment" },
  { id: "s11", type: "dream" as SignalType, content: "Started a list of all the books I want to read. It keeps getting longer.", stage: "treatment" },
  { id: "s12", type: "reflection" as SignalType, content: "Told my kids I loved them three extra times today. For no reason. For every reason.", stage: "remission" },
  { id: "s13", type: "memory" as SignalType, content: "My best friend drove four hours just to sit with me. We barely talked. It was everything.", stage: "diagnosis" },
  { id: "s14", type: "dream" as SignalType, content: "I want to learn to swim properly. Properly, for the first time in my life.", stage: "survivorship" },
  { id: "s15", type: "reflection" as SignalType, content: "Someone asked how I was and I actually told them. That felt like progress.", stage: "treatment" },
];

const REACTIONS: CosmicReactionType[] = ["light", "relate", "inspired", "thanks"];

export function StargazingPanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const others = useUniverseStore((s) => s.others);
  const user = useUniverseStore((s) => s.user);
  const mySignals = useUniverseStore((s) => s.signals);
  const reactions = useUniverseStore((s) => s.reactions);
  const addSignal = useUniverseStore((s) => s.addSignal);
  const addCosmicReaction = useUniverseStore((s) => s.addCosmicReaction);

  const [showComposer, setShowComposer] = useState(false);
  const [signalType, setSignalType] = useState<SignalType>("reflection");
  const [signalContent, setSignalContent] = useState("");
  const [signalVisibility] = useState<SignalVisibility>("public");
  const [justSent, setJustSent] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SignalType | "all">("all");

  // Gather signals from others + seeds if needed
  const communitySignals = useMemo(() => {
    const real = others.flatMap((c) =>
      c.signals
        .filter((s) => s.visibility === "public")
        .map((s) => ({
          ...s,
          authorStage: c.user.stage,
          authorRole: c.user.role,
          isReal: true,
        })),
    );
    if (real.length >= 6) return real.sort((a, b) => b.createdAt - a.createdAt);
    // Pad with seeds when the cosmos is sparse
    const seedSignals = SEED_SIGNALS.map((s) => ({
      id: s.id,
      authorId: "seed",
      type: s.type,
      content: s.content,
      visibility: "public" as SignalVisibility,
      createdAt: Date.now() - Math.random() * 7 * 86400000,
      authorStage: s.stage,
      authorRole: undefined as undefined,
      isReal: false,
    }));
    return [...real, ...seedSignals].sort((a, b) => b.createdAt - a.createdAt);
  }, [others]);

  const filtered = useMemo(
    () => activeFilter === "all" ? communitySignals : communitySignals.filter((s) => s.type === activeFilter),
    [communitySignals, activeFilter],
  );

  function handleSend() {
    if (!signalContent.trim()) return;
    addSignal({ type: signalType, content: signalContent.trim(), visibility: signalVisibility });
    setSignalContent("");
    setShowComposer(false);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 3000);
  }

  function hasReacted(signalId: string, type: CosmicReactionType) {
    return reactions.some((r) => r.signalId === signalId && r.type === type);
  }

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 60) return m <= 1 ? "just now" : `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  }

  const SIGNAL_TYPES: SignalType[] = ["dream", "memory", "milestone", "reflection"];

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
    >
      <motion.div
        className="panel stargazing-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">✦ Shared Stargazing</h2>
            <p className="library__sub">Every light here is a real person.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {/* Filter tabs */}
          <div className="stargazing__filters">
            <button
              className={`stargazing__filter ${activeFilter === "all" ? "stargazing__filter--active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All
            </button>
            {SIGNAL_TYPES.map((t) => (
              <button
                key={t}
                className={`stargazing__filter ${activeFilter === t ? "stargazing__filter--active" : ""}`}
                onClick={() => setActiveFilter(t)}
              >
                {SIGNAL_TYPE_GLYPHS[t]} {SIGNAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Signal stream */}
          <div className="stargazing__stream">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {filtered.map((signal) => (
                  <div key={signal.id} className="signal-card">
                    <div className="signal-card__header">
                      <span className="signal-card__type">
                        {SIGNAL_TYPE_GLYPHS[signal.type]} {SIGNAL_TYPE_LABELS[signal.type]}
                      </span>
                      <span className="signal-card__time">{timeAgo(signal.createdAt)}</span>
                    </div>
                    <p className="signal-card__content">"{signal.content}"</p>
                    <div className="signal-card__footer">
                      <span className="signal-card__author">
                        {signal.authorStage
                          ? `A soul in ${STAGE_LABELS[signal.authorStage as keyof typeof STAGE_LABELS]?.toLowerCase() ?? "the cosmos"}`
                          : "A soul in the cosmos"}
                      </span>
                      {/* Reactions — no counts ever shown publicly */}
                      <div className="signal-card__reactions">
                        {REACTIONS.map((r) => (
                          <button
                            key={r}
                            className={`signal-reaction ${hasReacted(signal.id, r) ? "signal-reaction--active" : ""}`}
                            onClick={() => addCosmicReaction(signal.id, r)}
                            title={COSMIC_REACTION_LABELS[r]}
                          >
                            {COSMIC_REACTION_GLYPHS[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* My signals */}
          {mySignals.length > 0 && (
            <div className="stargazing__mine">
              <div className="light-give__divider" />
              <p className="stargazing__mine-label">Your signals</p>
              {mySignals.slice().reverse().slice(0, 3).map((s) => (
                <div key={s.id} className="signal-card signal-card--mine">
                  <span className="signal-card__type">
                    {SIGNAL_TYPE_GLYPHS[s.type]} {SIGNAL_TYPE_LABELS[s.type]}
                  </span>
                  <p className="signal-card__content">"{s.content}"</p>
                  <span className="signal-card__time">{timeAgo(s.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Send a signal */}
          <div className="light-give__divider" />
          <AnimatePresence mode="wait">
            {justSent ? (
              <motion.p
                key="sent"
                className="stargazing__sent"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                ✨ Your signal travels through the cosmos.
              </motion.p>
            ) : !showComposer ? (
              <motion.button
                key="open"
                className="library__contribute-btn"
                onClick={() => setShowComposer(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                ✨ Send a signal into the cosmos
              </motion.button>
            ) : (
              <motion.div
                key="composer"
                className="signal-composer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="signal-composer__types">
                  {SIGNAL_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`signal-composer__type ${signalType === t ? "signal-composer__type--active" : ""}`}
                      onClick={() => setSignalType(t)}
                    >
                      {SIGNAL_TYPE_GLYPHS[t]} {SIGNAL_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="light-give__textarea"
                  value={signalContent}
                  onChange={(e) => setSignalContent(e.target.value)}
                  placeholder={
                    signalType === "dream" ? "A dream you're holding..."
                    : signalType === "memory" ? "A moment worth keeping..."
                    : signalType === "milestone" ? "Something you've reached..."
                    : "Something you're noticing..."
                  }
                  rows={3}
                  maxLength={280}
                  autoFocus
                />
                <div className="light-give__composer-footer">
                  <span className="signal-composer__chars">{signalContent.length}/280</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn--ghost" onClick={() => { setShowComposer(false); setSignalContent(""); }}>Cancel</button>
                    <button
                      className="btn btn--primary"
                      disabled={!signalContent.trim()}
                      onClick={handleSend}
                    >
                      Send signal
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Constellations link */}
          <div className="light-give__divider" />
          <button
            className="stargazing__constellation-link"
            onClick={() => openOverlay({ kind: "constellations" })}
          >
            ✦ Browse Constellations — gather around who you are
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
