import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../data/auth";

type Mode = "signin" | "signup";

// The doorway before the doorway. Not a registration form — an invitation to
// find your universe. Language matters: we never say "register" or "log in."
export function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleGoogle() {
    setError(null);
    const result = await signInWithGoogle();
    if (result) setError(result);
    // null → the browser is redirecting to Google.
  }

  async function handleGuest() {
    setGuestLoading(true);
    await continueAsGuest();
    setGuestLoading(false);
  }

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

        {/* One-tap entry */}
        <button className="auth-google" onClick={() => void handleGoogle()}>
          <svg className="auth-google__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider auth-divider--labeled"><span>or use email</span></div>

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

        <button className="auth-guest" onClick={() => void handleGuest()} disabled={guestLoading}>
          {guestLoading ? "Lighting your star…" : "Continue without an account"}
          <span className="auth-guest__note">
            You'll still shine as a star in the shared galaxy — but your universe
            lives only in this browser, so use an account to keep it forever
          </span>
        </button>
      </motion.div>
    </div>
  );
}
