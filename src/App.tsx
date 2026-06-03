import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUniverseStore } from "./store/useUniverseStore";
import { useAuthStore } from "./data/auth";
import { AuthScreen } from "./ui/AuthScreen";
import { UniverseScene } from "./three/UniverseScene";
import { Onboarding } from "./ui/Onboarding";
import { AddPersonModal } from "./ui/AddPersonModal";
import { PersonDetailPanel } from "./ui/PersonDetailPanel";
import { LightLetter } from "./ui/LightLetter";
import { FeelingDoor } from "./ui/FeelingDoor";
import { CommunityPanel } from "./ui/CommunityPanel";
import { MilestoneModal } from "./ui/MilestoneModal";
import { CreateNebulaModal } from "./ui/CreateNebulaModal";
import { NebulaInterior } from "./three/NebulaInterior";
import { CreateDreamModal } from "./ui/CreateDreamModal";
import { DreamPanel } from "./ui/DreamPanel";
import { StarsAheadPanel } from "./ui/StarsAheadPanel";

export default function App() {
  const loaded = useUniverseStore((s) => s.loaded);
  const user = useUniverseStore((s) => s.user);
  const people = useUniverseStore((s) => s.people);
  const lights = useUniverseStore((s) => s.lights);
  const milestones = useUniverseStore((s) => s.milestones);
  const others = useUniverseStore((s) => s.others);
  const overlay = useUniverseStore((s) => s.overlay);
  const openedLightId = useUniverseStore((s) => s.openedLightId);
  const selfId = useUniverseStore((s) => s.selfId);
  const selectedCitizenId = useUniverseStore((s) => s.selectedCitizenId);
  const load = useUniverseStore((s) => s.load);
  const openOverlay = useUniverseStore((s) => s.openOverlay);
  const selectCitizen = useUniverseStore((s) => s.selectCitizen);

  const authStatus = useAuthStore((s) => s.status);
  const userEmail = useAuthStore((s) => s.userEmail);
  const initialize = useAuthStore((s) => s.initialize);
  const signOut = useAuthStore((s) => s.signOut);

  const [fabOpen, setFabOpen] = useState(false);

  // Auth resolves first; universe loads only once we know who the user is.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (authStatus === "authenticated" || authStatus === "guest") {
      void load();
    }
  }, [authStatus, load]);

  const atHome = selectedCitizenId === selfId;
  const population = others.length + (user?.name ? 1 : 0);

  const exploring = useMemo(() => {
    if (atHome) return null;
    return others.find((c) => c.ownerId === selectedCitizenId) ?? null;
  }, [atHome, others, selectedCitizenId]);

  const hasWaitingLight = lights.some(
    (l) => l.sealed && l.unlockTrigger && l.unlockTrigger !== "one_year",
  );

  const isSurvivor = user?.role === "survivor";
  const milestonesCount = milestones.length;
  const nebulasCount = useUniverseStore((s) => s.nebulas).length;
  const dreamsCount = useUniverseStore((s) => s.dreams).length;
  const inNebula = overlay.kind === "nebulaInterior";
  const hasStarsAhead = others.some((c) => c.user.isPublic && (
    c.user.role === "survivor" ||
    c.user.stage === "survivorship" ||
    c.user.stage === "remission" ||
    c.milestones.length > 0
  ));

  // Auth gate: show auth screen when Supabase is configured but no session exists.
  if (authStatus === "needsAuth") {
    return <AuthScreen />;
  }

  if (authStatus === "loading" || !loaded) {
    return <div className="boot" />;
  }

  return (
    <div className="app">
      {!inNebula && <UniverseScene />}

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
                {authStatus === "authenticated" && userEmail && (
                  <div className="hud__account">
                    <span className="hud__account-dot" />
                    <span className="hud__account-email">{userEmail}</span>
                    <button className="hud__signout" onClick={() => void signOut()}>
                      Sign out
                    </button>
                  </div>
                )}
                {authStatus === "guest" && (
                  <div className="hud__account">
                    <span className="hud__account-email hud__account-email--guest">
                      Guest · your universe is local only
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating action button — bottom right */}
      {user && overlay.kind !== "onboarding" && (
        <div className="universe-fab">
          {fabOpen && !exploring && (
            <div className="universe-fab__backdrop" onClick={() => setFabOpen(false)} />
          )}

          <AnimatePresence>
            {fabOpen && !exploring && (
              <motion.div
                className="universe-fab__menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {hasWaitingLight && (
                  <motion.button
                    className="fab-item fab-item--purple"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.0 } }}
                    exit={{ opacity: 0, y: 4 }}
                    onClick={() => { openOverlay({ kind: "feelingDoor" }); setFabOpen(false); }}
                  >
                    <span className="fab-item__icon">✦</span>
                    When you need it
                  </motion.button>
                )}

                <motion.button
                  className="fab-item"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: hasWaitingLight ? 0.04 : 0.0 } }}
                  exit={{ opacity: 0, y: 4 }}
                  onClick={() => { openOverlay({ kind: "community" }); setFabOpen(false); }}
                >
                  <span className="fab-item__icon">✺</span>
                  The Cosmos
                  {population > 1 && <span className="fab-item__badge">{population}</span>}
                </motion.button>

                {hasStarsAhead && (
                  <motion.button
                    className="fab-item"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0, y: 4 }}
                    onClick={() => { openOverlay({ kind: "starsAhead" }); setFabOpen(false); }}
                  >
                    <span className="fab-item__icon">✨</span>
                    Stars Ahead
                  </motion.button>
                )}

                {(isSurvivor || milestonesCount > 0 || user.role === "patient") && (
                  <motion.button
                    className="fab-item"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}
                    exit={{ opacity: 0, y: 4 }}
                    onClick={() => { openOverlay({ kind: "milestone" }); setFabOpen(false); }}
                  >
                    <span className="fab-item__icon">★</span>
                    {milestonesCount > 0 ? `${milestonesCount} Milestone${milestonesCount === 1 ? "" : "s"}` : "Mark a moment"}
                  </motion.button>
                )}

                <motion.button
                  className="fab-item"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.16 } }}
                  exit={{ opacity: 0, y: 4 }}
                  onClick={() => { openOverlay({ kind: "createNebula" }); setFabOpen(false); }}
                >
                  <span className="fab-item__icon">☁</span>
                  {nebulasCount > 0 ? `${nebulasCount} Nebula${nebulasCount === 1 ? "" : "s"}` : "New Memory"}
                </motion.button>

                <motion.button
                  className="fab-item"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.20 } }}
                  exit={{ opacity: 0, y: 4 }}
                  onClick={() => { openOverlay({ kind: "createDream" }); setFabOpen(false); }}
                >
                  <span className="fab-item__icon">✦</span>
                  {dreamsCount > 0 ? `${dreamsCount} Dream${dreamsCount === 1 ? "" : "s"}` : "New Dream"}
                </motion.button>

                <motion.button
                  className="fab-item fab-item--gold"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.24 } }}
                  exit={{ opacity: 0, y: 4 }}
                  onClick={() => { openOverlay({ kind: "addPerson" }); setFabOpen(false); }}
                >
                  <span className="fab-item__icon">+</span>
                  Add someone
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {exploring ? (
            <button className="universe-fab__return" onClick={() => selectCitizen(selfId)}>
              ← Return home
            </button>
          ) : (
            <button
              className={`universe-fab__btn${fabOpen ? " universe-fab__btn--open" : ""}`}
              onClick={() => setFabOpen((v) => !v)}
              aria-label={fabOpen ? "Close menu" : "Open menu"}
            >
              <span className="universe-fab__glyph">{fabOpen ? "✕" : "✦"}</span>
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {overlay.kind === "onboarding" && <Onboarding key="onboarding" />}
        {overlay.kind === "addPerson" && <AddPersonModal key="addPerson" />}
        {overlay.kind === "feelingDoor" && <FeelingDoor key="feelingDoor" />}
        {overlay.kind === "personDetail" && (
          <PersonDetailPanel key={overlay.personId} personId={overlay.personId} />
        )}
        {overlay.kind === "community" && <CommunityPanel key="community" />}
        {overlay.kind === "milestone" && <MilestoneModal key="milestone" />}
        {overlay.kind === "createNebula" && <CreateNebulaModal key="createNebula" />}
        {overlay.kind === "nebulaInterior" && (
          <NebulaInterior key={overlay.nebulaId} nebulaId={overlay.nebulaId} />
        )}
        {overlay.kind === "createDream" && <CreateDreamModal key="createDream" />}
        {overlay.kind === "dreamDetail" && (
          <DreamPanel key={overlay.dreamId} dreamId={overlay.dreamId} />
        )}
        {overlay.kind === "starsAhead" && <StarsAheadPanel key="starsAhead" />}
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
