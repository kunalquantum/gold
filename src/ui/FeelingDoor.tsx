import { useMemo, useState } from "react";
import { useUniverseStore } from "../store/useUniverseStore";
import { FEELING_TRIGGERS, OCCASION_TRIGGERS, UNLOCK_LABELS } from "../utils";
import type { UnlockTrigger } from "../types";
import { ModalShell } from "./AddPersonModal";

// "When you need it" — the user names a moment they're in, and any light kept
// for exactly that moment unlocks. This is the heart of the Future Light Capsule.
export function FeelingDoor() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const unlockByTrigger = useUniverseStore((s) => s.unlockByTrigger);
  const openLight = useUniverseStore((s) => s.openLight);
  const lights = useUniverseStore((s) => s.lights);
  const [emptyFor, setEmptyFor] = useState<UnlockTrigger | null>(null);

  // Only offer moments that actually have a sealed light waiting — no dead ends.
  const waiting = useMemo(() => {
    const set = new Set<UnlockTrigger>();
    for (const l of lights)
      if (l.sealed && l.unlockTrigger && l.unlockTrigger !== "one_year")
        set.add(l.unlockTrigger);
    return set;
  }, [lights]);

  const options = [...FEELING_TRIGGERS, ...OCCASION_TRIGGERS];

  const choose = (trigger: UnlockTrigger) => {
    const unlocked = unlockByTrigger(trigger);
    if (unlocked.length > 0) {
      closeOverlay();
      // Bring the first kept light up to read, as it blooms into the sky.
      setTimeout(() => openLight(unlocked[0].id), 400);
    } else {
      setEmptyFor(trigger);
    }
  };

  return (
    <ModalShell title="When you need it" onClose={closeOverlay}>
      <p className="door__intro">
        Some lights were kept for a moment like this. Name where you are, and let
        them find you.
      </p>

      <div className="door__options">
        {options.map((tr) => {
          const has = waiting.has(tr);
          return (
            <button
              key={tr}
              className={`door__option ${has ? "door__option--ready" : ""}`}
              onClick={() => choose(tr)}
            >
              <span>{UNLOCK_LABELS[tr]}</span>
              {has && <span className="door__glint">✦</span>}
            </button>
          );
        })}
      </div>

      {emptyFor && (
        <p className="door__empty">
          No light is waiting for that moment yet — but the people in your sky are
          still here. You&#8217;re not alone.
        </p>
      )}
    </ModalShell>
  );
}
