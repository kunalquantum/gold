import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { GivenLightType } from "../types";
import { STAGE_LABELS } from "../utils";
import { checkContent } from "../utils/contentGuard";

const GIVE_TYPES: { type: GivenLightType; label: string; hint: string }[] = [
  { type: "encouragement", label: "Encouragement", hint: "A few words that might help" },
  { type: "story", label: "Your story", hint: "A moment from your own journey" },
  { type: "advice", label: "Something you learned", hint: "What you wish someone had told you" },
];

// Stage order — who is "behind" the current user
const STAGE_ORDER: Record<string, number> = {
  diagnosis: 0,
  treatment: 1,
  remission: 2,
  survivorship: 3,
};

export function LightIGivePanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const user = useUniverseStore((s) => s.user);
  const others = useUniverseStore((s) => s.others);
  const givenLights = useUniverseStore((s) => s.givenLights);
  const sendGivenLight = useUniverseStore((s) => s.sendGivenLight);
  const setOpenToLight = useUniverseStore((s) => s.setOpenToLight);

  const [composingFor, setComposingFor] = useState<string | null>(null);
  const [lightType, setLightType] = useState<GivenLightType>("encouragement");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);

  const myStageRank = user?.stage ? (STAGE_ORDER[user.stage] ?? -1) : -1;
  const isSurvivor = user?.role === "survivor";

  // People who are open to light and are at an earlier stage (or any stage if user is survivor)
  const canReceiveLight = others.filter((c) => {
    if (!c.user.isPublic || !c.user.openToLight) return false;
    const theirRank = c.user.stage ? (STAGE_ORDER[c.user.stage] ?? -1) : -1;
    if (isSurvivor) return true;
    return theirRank < myStageRank;
  });

  const alreadySentTo = new Set(givenLights.map((gl) => gl.toOwnerId));

  function handleSend() {
    if (!composingFor || !content.trim()) return;
    const err = checkContent(content);
    if (err) { setGuardError(err); return; }
    setGuardError(null);
    sendGivenLight({ toOwnerId: composingFor, type: lightType, content: content.trim(), anonymous });
    setContent("");
    setComposingFor(null);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2800);
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
        className="panel light-give-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">Light I Give</h2>
            <p className="light-give__sub">You are not just receiving. You have something to offer.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {/* Open-to-light toggle */}
          <div className="light-give__open-section">
            <div className="light-give__open-text">
              <span className="light-give__open-title">Open your sky</span>
              <span className="light-give__open-hint">
                Let people further along find you and send light your way too.
              </span>
            </div>
            <button
              className={`toggle ${user?.openToLight ? "toggle--on" : ""}`}
              onClick={() => setOpenToLight(!user?.openToLight)}
              aria-label="Toggle open to light"
            />
          </div>

          {/* Who needs light */}
          <div className="light-give__divider" />
          <h3 className="light-give__section-title">Someone might need light</h3>

          {canReceiveLight.length === 0 ? (
            <p className="light-give__empty">
              {!isSurvivor && myStageRank <= 0
                ? "As you continue your journey, you'll be able to reach people just starting theirs."
                : "No one is currently open to receiving light. Check back as more people join."}
            </p>
          ) : (
            <div className="light-give__recipients">
              {canReceiveLight.slice(0, 5).map((c) => (
                <div key={c.ownerId} className="light-give__recipient">
                  <div className="light-give__recipient-info">
                    <span className="light-give__recipient-name">
                      {c.user.name}
                    </span>
                    {c.user.stage && (
                      <span className="light-give__recipient-stage">
                        {STAGE_LABELS[c.user.stage]}
                      </span>
                    )}
                  </div>

                  {alreadySentTo.has(c.ownerId) ? (
                    <span className="light-give__sent-badge">✦ Sent</span>
                  ) : (
                    <button
                      className="light-give__reach-btn"
                      onClick={() => { setComposingFor(c.ownerId); setContent(""); setLightType("encouragement"); }}
                    >
                      Send light →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <AnimatePresence>
            {composingFor && (
              <motion.div
                className="light-give__composer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                <div className="light-give__composer-head">
                  <span className="light-give__composer-to">
                    ✦ To {canReceiveLight.find((c) => c.ownerId === composingFor)?.user.name}
                  </span>
                  <button className="btn--ghost btn--sm" onClick={() => setComposingFor(null)}>cancel</button>
                </div>

                <div className="light-give__types">
                  {GIVE_TYPES.map((t) => (
                    <button
                      key={t.type}
                      className={`light-give__type-btn ${lightType === t.type ? "light-give__type-btn--active" : ""}`}
                      onClick={() => setLightType(t.type)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="light-give__type-hint">
                  {GIVE_TYPES.find((t) => t.type === lightType)?.hint}
                </p>

                <textarea
                  className="light-give__textarea"
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setGuardError(null); }}
                  placeholder={
                    lightType === "story"
                      ? "\"The first few weeks were the hardest for me. One day at a time.\""
                      : lightType === "advice"
                      ? "\"Write it all down before appointments. It helped me remember what to ask.\""
                      : "\"You're doing something incredibly hard. That takes real strength.\""
                  }
                  rows={4}
                  maxLength={400}
                />

                {guardError && <p className="content-guard-error">{guardError}</p>}
                <div className="light-give__composer-footer">
                  <label className="light-give__anon">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    <span>Send anonymously</span>
                  </label>
                  <button
                    className="btn btn--primary"
                    disabled={!content.trim()}
                    onClick={handleSend}
                  >
                    Send this light ✦
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {justSent && (
              <motion.p
                className="light-give__sent-confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                ✦ Your light is on its way
              </motion.p>
            )}
          </AnimatePresence>

          {/* Lights I've sent */}
          {givenLights.length > 0 && (
            <>
              <div className="light-give__divider" />
              <h3 className="light-give__section-title">Lights you've sent</h3>
              <div className="light-give__sent-list">
                {givenLights.slice().reverse().map((gl) => {
                  const recipient = others.find((c) => c.ownerId === gl.toOwnerId);
                  return (
                    <div key={gl.id} className="light-give__sent-item">
                      <span className="light-give__sent-icon">✦</span>
                      <div className="light-give__sent-body">
                        {!gl.anonymous && recipient && (
                          <span className="light-give__sent-name">→ {recipient.user.name}</span>
                        )}
                        {gl.anonymous && (
                          <span className="light-give__sent-name">→ (sent anonymously)</span>
                        )}
                        <p className="light-give__sent-content">"{gl.content}"</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Library of Light link */}
          <div className="light-give__divider" />
          <button
            className="light-give__library-link"
            onClick={() => openOverlay({ kind: "libraryOfLight" })}
          >
            <span className="light-give__library-glyph">◈</span>
            <div>
              <span className="light-give__library-title">Library of Light</span>
              <span className="light-give__library-sub">
                Browse and contribute human wisdom — fear, hope, identity, recovery.
              </span>
            </div>
            <span className="light-give__library-arrow">→</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
