import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { checkContent } from "../utils/contentGuard";

// Seed beacons — shown while the galaxy is still sparse so the North Star
// never feels cold. All anonymous, all real human sentiments.
const SEED_BEACONS = [
  "Whatever today took from you, it didn't take tomorrow.",
  "I was where you are. The road exists. Keep walking it.",
  "Someone you've never met is rooting for you tonight.",
  "Hope is not naive. It's the bravest thing in this galaxy.",
  "The scan was clear. After two years of fear — clear. Hold on.",
  "You are allowed to laugh during hard times. Joy is not betrayal.",
  "One more sunrise. That's all you have to reach. Then the next.",
  "My mother beat the odds twice. Odds are not prophecy.",
  "Rest is also fighting.",
  "The night is long, but look up — we're all under the same star.",
];

export function NorthStarPanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const others = useUniverseStore((s) => s.others);
  const mySignals = useUniverseStore((s) => s.signals);
  const addSignal = useUniverseStore((s) => s.addSignal);

  const [content, setContent] = useState("");
  const [justLit, setJustLit] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);

  // Every public hope beacon in the galaxy — always anonymous, never attributed.
  const beacons = useMemo(() => {
    const mine = mySignals.filter((s) => s.type === "hope");
    const theirs = others.flatMap((c) =>
      c.signals.filter((s) => s.type === "hope" && s.visibility === "public"),
    );
    const real = [...mine, ...theirs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({ id: s.id, content: s.content, mine: mine.includes(s) }));
    if (real.length >= 8) return real;
    const seeds = SEED_BEACONS.slice(0, 10 - real.length).map((content, i) => ({
      id: `seed-${i}`,
      content,
      mine: false,
    }));
    return [...real, ...seeds];
  }, [mySignals, others]);

  const galaxyHopeCount = beacons.length;

  function handleLight() {
    const text = content.trim();
    if (!text) return;
    const err = checkContent(text);
    if (err) { setGuardError(err); return; }
    setGuardError(null);
    addSignal({ type: "hope", content: text, visibility: "public" });
    setContent("");
    setJustLit(true);
    setTimeout(() => setJustLit(false), 3500);
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
        className="panel northstar-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">✶ The North Star</h2>
            <p className="library__sub">
              The one fixed point everyone shares. {galaxyHopeCount} beacon{galaxyHopeCount === 1 ? "" : "s"} of hope keep it burning.
            </p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {/* The star itself */}
          <div className="northstar__halo">
            <motion.span
              className="northstar__core"
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [1, 1 + Math.min(galaxyHopeCount, 40) * 0.004, 1],
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              ✶
            </motion.span>
          </div>

          <p className="northstar__intro">
            Every beacon here was lit by a real person, anonymously. No names,
            no counts, no replies — just hope, given freely to everyone under
            this sky. The more beacons burn, the brighter the North Star shines
            above the whole galaxy.
          </p>

          {/* Beacon lanterns */}
          <div className="northstar__beacons">
            {beacons.map((b, i) => (
              <motion.div
                key={b.id}
                className={`beacon ${b.mine ? "beacon--mine" : ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.6), duration: 0.4 }}
              >
                <span className="beacon__flame">✶</span>
                <p className="beacon__text">"{b.content}"</p>
                {b.mine && <span className="beacon__mine-tag">your beacon</span>}
              </motion.div>
            ))}
          </div>

          {/* Light a beacon */}
          <div className="light-give__divider" />
          <AnimatePresence mode="wait">
            {justLit ? (
              <motion.p
                key="lit"
                className="stargazing__sent"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                ✶ Your beacon rises. The North Star burns a little brighter.
              </motion.p>
            ) : (
              <motion.div
                key="composer"
                className="signal-composer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <textarea
                  className="light-give__textarea"
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setGuardError(null); }}
                  placeholder="Leave a few words of hope for everyone under this sky..."
                  rows={3}
                  maxLength={200}
                />
                {guardError && <p className="content-guard-error">{guardError}</p>}
                <div className="light-give__composer-footer">
                  <span className="signal-composer__chars">{content.length}/200</span>
                  <button
                    className="btn btn--primary"
                    disabled={!content.trim()}
                    onClick={handleLight}
                  >
                    ✶ Light a beacon
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
