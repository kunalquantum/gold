import { create } from "zustand";
import { supabase, SUPABASE_CONFIGURED } from "./supabaseClient";
import { setAuthUserId, clearAuthUserId } from "./identity";

export type AuthStatus = "loading" | "authenticated" | "guest" | "needsAuth";

interface AuthState {
  status: AuthStatus;
  userEmail: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<"CHECK_EMAIL" | string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  openAuthScreen: () => void;
}

// Maps a Supabase session to app status. Anonymous sessions are "guest" in the
// UI (no Light Bridge etc.) but still carry a real auth.uid() — which is what
// lets a guest's star pass RLS and appear in the shared galaxy.
function applySession(
  set: (s: Partial<AuthState>) => void,
  user: { id: string; email?: string | null; is_anonymous?: boolean },
) {
  setAuthUserId(user.id);
  if (user.is_anonymous) {
    set({ status: "guest", userEmail: null });
  } else {
    set({ status: "authenticated", userEmail: user.email ?? null });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  userEmail: null,

  initialize: async () => {
    // When Supabase is not configured, run fully local — no auth gate.
    if (!SUPABASE_CONFIGURED || !supabase) {
      set({ status: "guest" });
      return;
    }

    // Legacy sticky-guest flag — guest is now a per-visit choice, not a
    // permanent preference. Clear so returning visitors see the auth screen
    // instead of being silently locked into local-only mode.
    localStorage.removeItem("universe.guest");

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      applySession(set, session.user);
    } else {
      // No live session = show the auth screen. From there the user can sign
      // in, sign up, or pick guest mode for this visit only.
      set({ status: "needsAuth" });
    }

    // Stay in sync as Supabase fires auth events (token refresh, sign-out, etc.)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applySession(set, session.user);
      } else if (get().status !== "guest") {
        // Only switch to needsAuth if the user didn't explicitly choose guest.
        clearAuthUserId();
        set({ status: "needsAuth", userEmail: null });
      }
    });
  },

  signIn: async (email, password) => {
    if (!supabase) return "No connection available.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    if (error.message.toLowerCase().includes("invalid")) {
      return "That email and password don't match.";
    }
    return "Something didn't connect. Check your signal and try again.";
  },

  signUp: async (email, password) => {
    if (!supabase) return "No connection available.";
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return "This email already has a universe — try signing in.";
      }
      return "Something didn't connect. Check your signal and try again.";
    }
    // No session means Supabase requires email confirmation.
    if (!data.session) return "CHECK_EMAIL";
    return null; // onAuthStateChange fires and updates status
  },

  // One-tap entry. Redirects to Google and back; onAuthStateChange picks up
  // the session when the browser returns.
  signInWithGoogle: async () => {
    if (!supabase) return "No connection available.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (!error) return null; // browser is navigating away
    if (error.message.toLowerCase().includes("provider")) {
      return "Google sign-in isn't enabled yet — use email for now.";
    }
    return "Something didn't connect. Check your signal and try again.";
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    clearAuthUserId();
    set({ status: "needsAuth", userEmail: null });
  },

  // Guests get a real (anonymous) Supabase identity when possible, so their
  // star appears in the shared galaxy like everyone else's. If anonymous
  // sign-ins are disabled or we're offline, fall back to device-only mode.
  // Guest mode is *per-visit* — no localStorage flag — so a refresh always
  // brings them back to the auth screen, where they can choose to sign in
  // properly and have their universe sync across devices.
  continueAsGuest: async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.session?.user) {
          // onAuthStateChange also fires, but set state now so entry is instant.
          applySession(set, data.session.user);
          return;
        }
        if (error) {
          console.warn("Universe: anonymous sign-in unavailable — guest stays local-only", error.message);
        }
      } catch (err) {
        console.warn("Universe: anonymous sign-in failed — guest stays local-only", err);
      }
    }
    set({ status: "guest" });
  },

  // Surfaces the auth screen from inside a guest session. Local data is
  // preserved and gets pushed to Supabase on the first successful sign-in.
  openAuthScreen: () => {
    set({ status: "needsAuth" });
  },
}));
