const OWNER_KEY = "universe.owner";
const AUTH_KEY  = "universe.auth-id";

// Called immediately after a successful Supabase sign-in so the authenticated
// UID becomes the universe owner for all subsequent repository operations.
export function setAuthUserId(uid: string): void {
  localStorage.setItem(AUTH_KEY, uid);
}

// Called on sign-out; falls back to the anonymous device identity.
export function clearAuthUserId(): void {
  localStorage.removeItem(AUTH_KEY);
}

// Returns the best available identity: authenticated UID first, then the
// stable anonymous UUID generated once for this device.
export function ownerId(): string {
  const authId = localStorage.getItem(AUTH_KEY);
  if (authId) return authId;

  let id = localStorage.getItem(OWNER_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `owner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(OWNER_KEY, id);
  }
  return id;
}
