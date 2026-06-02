import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUniverseStore } from "./store/useUniverseStore";
import { UniverseScene } from "./three/UniverseScene";
import { Onboarding } from "./ui/Onboarding";
import { AddPersonModal } from "./ui/AddPersonModal";
import { PersonDetailPanel } from "./ui/PersonDetailPanel";
import { LightLetter } from "./ui/LightLetter";
import { FeelingDoor } from "./ui/FeelingDoor";

export default function App() {
  const loaded = useUniverseStore((s) => s.loaded);
  const user = useUniverseStore((s) => s.user);
  const people = useUniverseStore((s) => s.people);
  const lights = useUniverseStore((s) => s.lights);
  const others = useUniverseStore((s) => s.others);
  const overlay = useUniverseStore((s) => s.overlay);
  const openedLightId = useUniverseStore((s) => s.openedLightId);
  const selfId = useUniverseStore((s) => s.selfId);
  const selectedCitizenId = useUniverseStore((s) => s.selectedCitizenId);
  const load = useUniverseStore((s) => s.load);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const selectCitizen = useUniverseStore((s) => s.selectCitizen);

  useEffect(() => {
    void load();
  }, [load]);

  const atHome = selectedCitizenId === selfId;
  const population = others.length + (user?.name ? 1 : 0);

  const exploring = useMemo(() => {
    if (atHome) return null;
    return others.find((c) => c.ownerId === selectedCitizenId) ?? null;
  }, [atHome, others, selectedCitizenId]);

  const hasWaitingLight = lights.some(
    (l) => l.sealed && l.unlockTrigger && l.unlockTrigger !== "one_year",
  );

  if (!loaded) {
    return <div className="boot" />;
  }

  return (
    <div className="app">
      <UniverseScene />

      {user && overlay.kind !== "onboarding" && (
        <div className="hud">
          <div className="hud__brand">
            {exploring ? (
              <>
                <span className="hud__title">{exploring.user.name}&#8217;s universe</span>
                <span className="hud__hint">You&#8217;re visiting · click a planet or light to explore</span>
              </>
            ) : (
              <>
                <span className="hud__title">{user.name}&#8217;s universe</span>
                <span className="hud__hint">
                  {population > 1
                    ? `${population} souls share this sky · click any star to visit`
                    : "Drag to look around · add someone you love"}
                </span>
              </>
            )}
          </div>

          <div className="hud__actions">
            {exploring ? (
              <button className="add-btn" onClick={() => selectCitizen(selfId)}>
                ← Return home
              </button>
            ) : (
              <>
                {hasWaitingLight && (
                  <button
                    className="door-btn"
                    onClick={() => openOverlay({ kind: "feelingDoor" })}
                    title="Open a light kept for when you need it"
                  >
                    <span className="door-btn__glint">✦</span>
                    When you need it
                  </button>
                )}
                <button className="add-btn" onClick={() => openOverlay({ kind: "addPerson" })} title="Add someone">
                  <span>+</span>
                  Add someone
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {overlay.kind === "onboarding" && <Onboarding key="onboarding" />}
        {overlay.kind === "addPerson" && <AddPersonModal key="addPerson" />}
        {overlay.kind === "feelingDoor" && <FeelingDoor key="feelingDoor" />}
        {overlay.kind === "personDetail" && (
          <PersonDetailPanel key={overlay.personId} personId={overlay.personId} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openedLightId && <LightLetter key={openedLightId} lightId={openedLightId} />}
      </AnimatePresence>

      {user && atHome && people.length === 0 && overlay.kind === "none" && (
        <motion.button
          className="first-invite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
          onClick={() => openOverlay({ kind: "addPerson" })}
        >
          Your sky is waiting. Add someone you love.
        </motion.button>
      )}
    </div>
  );
}
