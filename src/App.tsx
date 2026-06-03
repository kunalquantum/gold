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
import { LightIGivePanel } from "./ui/LightIGivePanel";
import { LibraryOfLight } from "./ui/LibraryOfLight";

// Positions orbs in a quarter-circle arc: straight up → pure left (FAB is bottom-right).
// Radius scales with item count to maintain comfortable spacing.
function getOrbPos(index: number, total: number) {
  const r = total > 6 ? 120 : 100;
  const startDeg = 90;
  const spread = total > 1 ? Math.min((total - 1) * 14, 90) : 0;
  const deg = startDeg + (total > 1 ? (spread / (total - 1)) * index : 0);
  const rad = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(rad)), y: -Math.round(r * Math.sin(rad)) };
}

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

  const fabItems = useMemo(() => {
    if (!user) return [];
    type Orb = { key: string; icon: string; label: string; badge?: number; accent?: "purple" | "gold"; action: () => void };
    const items: Orb[] = [];
    if (hasWaitingLight)
      items.push({ key: "door", icon: "✦", label: "When you need it", accent: "purple", action: () => openOverlay({ kind: "feelingDoor" }) });
    items.push({ key: "lightIGive", icon: "✦", label: "Light I Give", accent: "gold", action: () => openOverlay({ kind: "lightIGive" }) });
    items.push({ key: "cosmos", icon: "✺", label: "The Cosmos", badge: population > 1 ? population : undefined, action: () => openOverlay({ kind: "community" }) });
    if (hasStarsAhead)
      items.push({ key: "stars", icon: "✦", label: "Stars Ahead", action: () => openOverlay({ kind: "starsAhead" }) });
    if (isSurvivor || milestonesCount > 0 || user.role === "patient")
      items.push({ key: "milestone", icon: "★", label: milestonesCount > 0 ? `${milestonesCount} milestone${milestonesCount === 1 ? "" : "s"}` : "Mark a moment", action: () => openOverlay({ kind: "milestone" }) });
    items.push({ key: "nebula", icon: "☁", label: nebulasCount > 0 ? `${nebulasCount} nebula${nebulasCount === 1 ? "" : "s"}` : "New memory", action: () => openOverlay({ kind: "createNebula" }) });
    items.push({ key: "dream", icon: "✦", label: dreamsCount > 0 ? `${dreamsCount} dream${dreamsCount === 1 ? "" : "s"}` : "New dream", action: () => openOverlay({ kind: "createDream" }) });
    items.push({ key: "add", icon: "+", label: "Add someone", accent: "gold", action: () => openOverlay({ kind: "addPerson" }) });
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasWaitingLight, population, hasStarsAhead, isSurvivor, milestonesCount, nebulasCount, dreamsCount]);

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

      {/* Radial orb fan — bottom right */}
      {user && overlay.kind !== "onboarding" && (
        <>
          {fabOpen && !exploring && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 19 }}
              onClick={() => setFabOpen(false)}
            />
          )}

          <div className="universe-fab">
            {exploring ? (
              <button className="universe-fab__return" onClick={() => selectCitizen(selfId)}>
                ← Return home
              </button>
            ) : (
              <div className="universe-fab__field">
                <AnimatePresence>
                  {fabOpen && fabItems.map((item, i) => {
                    const { x, y } = getOrbPos(i, fabItems.length);
                    return (
                      <motion.button
                        key={item.key}
                        className={`fab-orb${item.accent ? ` fab-orb--${item.accent}` : ""}`}
                        initial={{ x: 0, y: 0, opacity: 0, scale: 0.15 }}
                        animate={{ x, y, opacity: 1, scale: 1, transition: { delay: i * 0.04, type: "spring", stiffness: 290, damping: 22 } }}
                        exit={{ x: 0, y: 0, opacity: 0, scale: 0.1, transition: { delay: (fabItems.length - 1 - i) * 0.025, duration: 0.16 } }}
                        onClick={() => { item.action(); setFabOpen(false); }}
                        title={item.label + (item.badge !== undefined ? ` · ${item.badge}` : "")}
                      >
                        <span className="fab-orb__glyph">{item.icon}</span>
                        <span className="fab-orb__label">
                          {item.label}
                          {item.badge !== undefined && <span className="fab-orb__badge">{item.badge}</span>}
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                <button
                  className={`universe-fab__btn${fabOpen ? " universe-fab__btn--open" : ""}`}
                  onClick={() => setFabOpen((v) => !v)}
                  aria-label={fabOpen ? "Close" : "Open menu"}
                >
                  <span className="universe-fab__glyph">✦</span>
                </button>
              </div>
            )}
          </div>
        </>
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
        {overlay.kind === "lightIGive" && <LightIGivePanel key="lightIGive" />}
        {overlay.kind === "libraryOfLight" && <LibraryOfLight key="libraryOfLight" />}
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
