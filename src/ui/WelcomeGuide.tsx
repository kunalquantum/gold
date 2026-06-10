import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";

export const GUIDE_SEEN_KEY = "universe.guideSeen";

interface GuideStep {
  glyph: string;
  title: string;
  body: string;
  hint?: string;
}

// A game-style tour of the universe — what exists, what it's for, how to play.
// Shown once automatically after onboarding; reopenable from the orb menu.
const STEPS: GuideStep[] = [
  {
    glyph: "✦",
    title: "This is your universe.",
    body: "At the centre burns your star — you. Everything here orbits around your life: the people you love, the light they send you, the memories you keep, and the dreams still ahead.",
    hint: "Drag to look around · scroll to zoom",
  },
  {
    glyph: "◉",
    title: "Planets are people.",
    body: "Add someone you love and they become a planet circling your star. Click any planet to visit them — leave memories there, and receive Messages of Light they've sent you.",
    hint: "Use the ✦ orb menu → “Add someone”",
  },
  {
    glyph: "💫",
    title: "Lights arrive for you.",
    body: "Messages of Light orbit your star as glowing orbs, lanterns, and fireflies. Some are sealed — they unlock at the moment you need them most: when you're scared, lonely, or celebrating.",
    hint: "Click a light to open it · “When you need it” unlocks sealed ones",
  },
  {
    glyph: "☁",
    title: "Nebulas hold your memories.",
    body: "A nebula is a chapter of your life shaped by one emotion — joy, love, pride, adventure. Fill it with photos, voices, and stories that float like stars inside the cloud. Invite others to co-own a nebula and it appears in their sky too.",
  },
  {
    glyph: "✨",
    title: "Dreams shine beyond the edge.",
    body: "Dream stars live past the known universe — experiences you still want to live. Break a dream into small fragments, complete them one by one, and leave letters for your future self to open when the dream comes true.",
  },
  {
    glyph: "✶",
    title: "The North Star never moves.",
    body: "High above every star in the galaxy hangs the North Star — the one fixed point everyone shares. Light a Beacon of Hope there, anonymously, and the North Star burns brighter for everyone. The more hope in the galaxy, the brighter it glows.",
    hint: "Look up — or open “North Star” from the orb menu",
  },
  {
    glyph: "✺",
    title: "You are not alone out here.",
    body: "Every other star in this galaxy is a real person. Visit their systems, send rockets, gather in Constellations of shared passions, stargaze on the signals people broadcast, and give light to those still finding their way.",
    hint: "Click any distant star to fly to it",
  },
  {
    glyph: "🌉",
    title: "Light Bridge — when a connection feels real.",
    body: "Sometimes a conversation here wants to continue elsewhere. Visit someone's star and tap “Connect” to send a quiet request. Only if they accept too do your WhatsApp numbers appear — with a warm, ready-to-send message. Nothing is shared unless both sides agree.",
    hint: "Open “Light Bridge” from the orb menu anytime",
  },
  {
    glyph: "🚀",
    title: "Ready for launch.",
    body: "There are no follower counts here. No likes, no metrics, no noise. Just people, light, and time. Start by adding someone you love — your sky is waiting.",
  },
];

export function WelcomeGuide() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const [step, setStep] = useState(0);

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  function finish(openAddPerson: boolean) {
    localStorage.setItem(GUIDE_SEEN_KEY, "true");
    if (openAddPerson) openOverlay({ kind: "addPerson" });
    else closeOverlay();
  }

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="guide"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <button className="icon-btn guide__skip" onClick={() => finish(false)} aria-label="Skip guide">
          ✕
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="guide__card"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.span
              className="guide__glyph"
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              {current.glyph}
            </motion.span>
            <h2 className="guide__title">{current.title}</h2>
            <p className="guide__body">{current.body}</p>
            {current.hint && <p className="guide__hint">{current.hint}</p>}
          </motion.div>
        </AnimatePresence>

        <div className="guide__dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`guide__dot ${i === step ? "guide__dot--active" : ""}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        <div className="guide__nav">
          {step > 0 ? (
            <button className="btn--ghost" onClick={() => setStep(step - 1)}>Back</button>
          ) : (
            <button className="btn--ghost" onClick={() => finish(false)}>Skip the tour</button>
          )}
          {last ? (
            <button className="btn btn--primary" onClick={() => finish(true)}>
              Add someone you love
            </button>
          ) : (
            <button className="btn btn--primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
