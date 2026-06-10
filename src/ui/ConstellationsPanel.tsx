import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { useAuthStore } from "../data/auth";
import { CONSTELLATION_LABELS, CONSTELLATION_GLYPHS, CONSTELLATION_DESCRIPTIONS } from "../utils";
import { loadConstellationLinks, setConstellationLink, type ConstellationLinks } from "../data/constellationLinksRepository";
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
  const user = useUniverseStore((s) => s.user);
  const joinConstellation = useUniverseStore((s) => s.joinConstellation);
  const leaveConstellation = useUniverseStore((s) => s.leaveConstellation);
  const selfId = useUniverseStore((s) => s.selfId);
  const authStatus = useAuthStore((s) => s.status);

  const [expanded, setExpanded] = useState<ConstellationId | null>(null);
  const [links, setLinks] = useState<ConstellationLinks>({});
  const [linkInput, setLinkInput] = useState("");
  const [editingLink, setEditingLink] = useState(false);

  useEffect(() => {
    void loadConstellationLinks().then(setLinks);
  }, []);

  function membersOf(id: ConstellationId) {
    const others_ = others
      .filter((c) => c.constellations.includes(id))
      .map((c) => ({ ownerId: c.ownerId, name: c.user.name, color: c.user.color }));
    const mine = myConstellations.includes(id) && user
      ? [{ ownerId: selfId, name: user.name, color: user.color }]
      : [];
    return [...mine, ...others_];
  }

  function memberCount(id: ConstellationId) {
    return membersOf(id).length;
  }

  function toggleExpand(id: ConstellationId) {
    setExpanded((cur) => (cur === id ? null : id));
    setEditingLink(false);
    setLinkInput(links[id] ?? "");
  }

  async function saveLink(id: ConstellationId) {
    const url = linkInput.trim();
    if (!url) return;
    const ok = await setConstellationLink(id, url, selfId);
    if (ok) {
      setLinks((prev) => ({ ...prev, [id]: url }));
      setEditingLink(false);
    }
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
              const members = membersOf(id);
              const count = members.length;
              const isExpanded = expanded === id;
              const groupLink = links[id];
              return (
                <motion.div
                  key={id}
                  className={`constellation-card${joined ? " constellation-card--joined" : ""}${isExpanded ? " constellation-card--expanded" : ""}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <span className="constellation-card__glyph">{CONSTELLATION_GLYPHS[id]}</span>
                  <span className="constellation-card__label">{CONSTELLATION_LABELS[id]}</span>
                  <span className="constellation-card__desc">{CONSTELLATION_DESCRIPTIONS[id]}</span>

                  {/* Member roster */}
                  {count > 0 && (
                    <div className="constellation-card__roster">
                      {members.slice(0, 8).map((m) => (
                        <span
                          key={m.ownerId}
                          className="constellation-card__avatar"
                          style={{ background: m.color, boxShadow: `0 0 8px ${m.color}88` }}
                          title={m.name}
                        />
                      ))}
                      {count > 8 && <span className="constellation-card__more">+{count - 8}</span>}
                    </div>
                  )}

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

                  {joined && (
                    <button className="constellation-card__toggle" onClick={() => toggleExpand(id)}>
                      {isExpanded ? "Hide group ▲" : "WhatsApp group ▼"}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="constellation-card__group">
                      {groupLink ? (
                        <a className="btn btn--primary btn--block" href={groupLink} target="_blank" rel="noreferrer">
                          💬 Open {CONSTELLATION_LABELS[id]} WhatsApp group
                        </a>
                      ) : authStatus === "authenticated" ? (
                        editingLink ? (
                          <div className="constellation-card__link-form">
                            <input
                              className="field__input"
                              placeholder="https://chat.whatsapp.com/..."
                              value={linkInput}
                              onChange={(e) => setLinkInput(e.target.value)}
                            />
                            <button className="btn--small" onClick={() => void saveLink(id)} disabled={!linkInput.trim()}>
                              Share link
                            </button>
                          </div>
                        ) : (
                          <button className="btn--ghost" onClick={() => setEditingLink(true)}>
                            + Add a WhatsApp group link for {CONSTELLATION_LABELS[id]}
                          </button>
                        )
                      ) : (
                        <p className="constellation-card__no-link">No group link yet — sign in to add one.</p>
                      )}
                    </div>
                  )}
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
