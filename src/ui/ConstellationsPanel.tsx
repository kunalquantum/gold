import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { CONSTELLATION_LABELS, CONSTELLATION_GLYPHS, CONSTELLATION_DESCRIPTIONS } from "../utils";
import type { ConstellationId } from "../types";

const CONSTELLATION_IDS: ConstellationId[] = [
  "artists", "readers", "musicians", "travelers",
  "developers", "gardeners", "photographers", "walkers",
];

export function ConstellationsPanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const myConstellations = useUniverseStore((s) => s.constellations);
  const others = useUniverseStore((s) => s.others);
  const joinConstellation = useUniverseStore((s) => s.joinConstellation);
  const leaveConstellation = useUniverseStore((s) => s.leaveConstellation);

  function memberCount(id: ConstellationId) {
    const othersIn = others.filter((c) => c.constellations.includes(id)).length;
    const selfIn = myConstellations.includes(id) ? 1 : 0;
    return othersIn + selfIn;
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
        className="panel constellations-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">✦ Constellations</h2>
            <p className="library__sub">Gather around who you are, not what you have.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          <p className="constellation-panel__desc">
            These are communities of identity — artists, readers, dreamers. Every person here belongs to multiple constellations. Join the ones that feel like home.
          </p>

          <div className="constellation-grid">
            {CONSTELLATION_IDS.map((id, i) => {
              const joined = myConstellations.includes(id);
              const count = memberCount(id);
              return (
                <motion.div
                  key={id}
                  className={`constellation-card${joined ? " constellation-card--joined" : ""}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <span className="constellation-card__glyph">{CONSTELLATION_GLYPHS[id]}</span>
                  <span className="constellation-card__label">{CONSTELLATION_LABELS[id]}</span>
                  <span className="constellation-card__desc">{CONSTELLATION_DESCRIPTIONS[id]}</span>
                  <div className="constellation-card__footer">
                    <span className="constellation-card__count">
                      {count === 0 ? "Be the first" : count === 1 ? "1 soul" : `${count} souls`}
                    </span>
                    <button
                      className={`constellation-join-btn${joined ? " constellation-join-btn--joined" : ""}`}
                      onClick={() => joined ? leaveConstellation(id) : joinConstellation(id)}
                    >
                      {joined ? "Leave" : "Join"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="light-give__divider" />
          <button
            className="stargazing__constellation-link"
            onClick={() => openOverlay({ kind: "stargazing" })}
          >
            ✦ Browse Shared Stargazing — signals from across the cosmos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
