import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { JourneyStage, UserRole } from "../types";

const STAR_COLORS = ["#ffd27a", "#c8a2ff", "#9bb8ff", "#8be8d8", "#ff9ecd"];

interface RoleOption {
  id: UserRole;
  label: string;
  sub: string;
  glyph: string;
}

const ROLES: RoleOption[] = [
  { id: "patient", label: "I'm on this journey", sub: "Living with cancer", glyph: "✦" },
  { id: "survivor", label: "I've come through", sub: "Cancer survivor", glyph: "★" },
  { id: "caregiver", label: "I'm here for someone", sub: "Caregiver", glyph: "◎" },
  { id: "supporter", label: "Walking alongside", sub: "Friend or family", glyph: "·" },
];

const STAGES: { id: JourneyStage; label: string }[] = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "treatment", label: "In treatment" },
  { id: "remission", label: "Remission" },
  { id: "survivorship", label: "Survivorship" },
];

type Step = "identity" | "role";

export function Onboarding() {
  const setUser = useUniverseStore((s) => s.setUser);
  const setRoleAndStage = useUniverseStore((s) => s.setRoleAndStage);
  const setPrivacy = useUniverseStore((s) => s.setPrivacy);

  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [color, setColor] = useState(STAR_COLORS[0]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [stage, setStage] = useState<JourneyStage | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  const canContinue = name.trim().length > 0;
  const canEnter = role !== null;
  const needsStage = role === "patient";

  function handleContinue() {
    setUser({ name: name.trim(), color });
    setStep("role");
  }

  function handleEnter() {
    if (!role) return;
    setRoleAndStage({ role, stage: stage ?? undefined });
    setPrivacy(isPublic);
  }

  return (
    <motion.div
      className="veil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <AnimatePresence mode="wait">
        {step === "identity" ? (
          <motion.div
            key="identity"
            className="onboarding"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 1.0, delay: 0.3, ease: "easeOut" }}
          >
            <p className="onboarding__eyebrow">Welcome</p>
            <h1 className="onboarding__title">This universe is yours.</h1>
            <p className="onboarding__subtitle">
              A place to hold the people who carry you, and to find those who know what you're living through.
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
                  if (e.key === "Enter" && canContinue) handleContinue();
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
              disabled={!canContinue}
              onClick={handleContinue}
            >
              Continue →
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="role"
            className="onboarding onboarding--wide"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="onboarding__eyebrow">One more thing</p>
            <h1 className="onboarding__title" style={{ fontSize: "24px" }}>Who are you in this cosmos?</h1>
            <p className="onboarding__subtitle">
              This helps us connect you with those who truly understand.
            </p>

            <div className="role-grid">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`role-card ${role === r.id ? "role-card--active" : ""}`}
                  onClick={() => {
                    setRole(r.id);
                    if (r.id !== "patient") setStage(null);
                  }}
                >
                  <span className="role-card__glyph">{r.glyph}</span>
                  <span className="role-card__label">{r.label}</span>
                  <span className="role-card__sub">{r.sub}</span>
                </button>
              ))}
            </div>

            {needsStage && (
              <motion.div
                className="field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.4 }}
                style={{ marginTop: "16px" }}
              >
                <span className="field__label">Where are you right now?</span>
                <div className="chips" style={{ marginTop: "8px" }}>
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${stage === s.id ? "chip--active" : ""}`}
                      onClick={() => setStage(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="privacy-row">
              <div className="privacy-row__text">
                <span className="privacy-row__label">Appear in the community cosmos</span>
                <span className="privacy-row__sub">Others in similar situations can find you</span>
              </div>
              <button
                type="button"
                className={`toggle ${isPublic ? "toggle--on" : ""}`}
                onClick={() => setIsPublic((v) => !v)}
                aria-label="Toggle community visibility"
              />
            </div>

            <button
              className="btn btn--primary"
              style={{ marginTop: "8px" }}
              disabled={!canEnter}
              onClick={handleEnter}
            >
              Enter your universe
            </button>

            <button
              type="button"
              className="link-btn"
              style={{ marginTop: "14px", display: "block", width: "100%", textAlign: "center" }}
              onClick={() => setStep("identity")}
            >
              ← Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
