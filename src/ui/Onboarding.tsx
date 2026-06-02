import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";

const STAR_COLORS = ["#ffd27a", "#c8a2ff", "#9bb8ff", "#8be8d8", "#ff9ecd"];

// The doorway into the experience. Not a sign-up form — an invitation to arrive.
export function Onboarding() {
  const setUser = useUniverseStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [color, setColor] = useState(STAR_COLORS[0]);

  const canEnter = name.trim().length > 0;

  return (
    <motion.div
      className="veil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <motion.div
        className="onboarding"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
      >
        <p className="onboarding__eyebrow">Welcome</p>
        <h1 className="onboarding__title">This universe is yours.</h1>
        <p className="onboarding__subtitle">
          A quiet place to hold the people, memories, and moments that matter.
        </p>

        <label className="field">
          <span className="field__label">What should we call you?</span>
          <input
            className="field__input"
            value={name}
            autoFocus
            placeholder="Your name"
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canEnter) {
                setUser({ name: name.trim(), color });
              }
            }}
          />
        </label>

        <div className="field">
          <span className="field__label">Choose your light</span>
          <div className="swatches">
            {STAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${c === color ? "swatch--active" : ""}`}
                style={{ background: c, boxShadow: `0 0 18px ${c}` }}
                onClick={() => setColor(c)}
                aria-label={`Choose ${c}`}
              />
            ))}
          </div>
        </div>

        <button
          className="btn btn--primary"
          disabled={!canEnter}
          onClick={() => setUser({ name: name.trim(), color })}
        >
          Enter your universe
        </button>
      </motion.div>
    </motion.div>
  );
}
