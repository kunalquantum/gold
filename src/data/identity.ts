const OWNER_KEY = "universe.owner";

// A stable id for this person in the shared universe. Until real auth exists,
// this is how a citizen is addressed across sessions on this device.
export function ownerId(): string {
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
