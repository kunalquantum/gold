import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../data/auth";

type Mode = "signin" | "signup";

// The doorway before the doorway. Not a registration form — an invitation to
// find your universe. Language matters: we never say "register" or "log in."
export function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setLoading(false);

    if (result === "CHECK_EMAIL") {
      setCheckEmail(true);
    } else if (result) {
      setError(result);
    }
    // null → success; onAuthStateChange drives the state update automatically.
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  if (checkEmail) {
    return (
      <div className="auth-screen">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="auth-glyph" style={{ fontSize: "32px" }}>✉</span>
          <h1 className="auth-title">Check your email.</h1>
          <p className="auth-sub">
            We sent a link to <strong style={{ color: "var(--ink)" }}>{email}</strong>.
            <br />Click it to enter your universe.
          </p>
          <p className="auth-sub" style={{ marginTop: "6px", fontSize: "12px" }}>
            You can close this tab and return after clicking the link.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.2, ease: "easeOut" }}
      >
        <motion.span
          className="auth-glyph"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        >
          ✦
        </motion.span>

        <h1 className="auth-title">Your universe is waiting.</h1>
        <p className="auth-sub">
          A place to hold the people, memories, and moments that carry you.
        </p>

        {/* Mode tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "signin" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            I have an account
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            I'm new here
          </button>
        </div>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__input"
            type="email"
            value={email}
            placeholder="your@email.com"
            autoFocus
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
          />
        </label>

        <label className="field">
          <span className="field__label">
            Password{mode === "signup" ? " — at least 6 characters" : ""}
          </span>
          <input
            className="field__input"
            type="password"
            value={password}
            placeholder="••••••••"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
          />
        </label>

        {error && (
          <motion.p
            className="auth-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.p>
        )}

        <button
          className="btn btn--primary"
          style={{ marginTop: "6px" }}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {loading
            ? "Entering…"
            : mode === "signin"
            ? "Enter your universe"
            : "Create your universe"}
        </button>

        <div className="auth-divider" />

        <button className="auth-guest" onClick={continueAsGuest}>
          Continue without an account
          <span className="auth-guest__note">Your universe stays on this device only</span>
        </button>
      </motion.div>
    </div>
  );
}
