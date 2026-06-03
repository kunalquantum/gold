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
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
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

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setAuthUserId(session.user.id);
      set({ status: "authenticated", userEmail: session.user.email ?? null });
    } else {
      // If the user previously chose guest mode, respect that choice.
      const isGuest = localStorage.getItem("universe.guest") === "true";
      set({ status: isGuest ? "guest" : "needsAuth" });
    }

    // Stay in sync as Supabase fires auth events (token refresh, sign-out, etc.)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUserId(session.user.id);
        set({ status: "authenticated", userEmail: session.user.email ?? null });
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

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    clearAuthUserId();
    localStorage.removeItem("universe.guest");
    set({ status: "needsAuth", userEmail: null });
  },

  continueAsGuest: () => {
    localStorage.setItem("universe.guest", "true");
    set({ status: "guest" });
  },
}));
