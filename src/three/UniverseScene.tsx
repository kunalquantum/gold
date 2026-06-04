import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition, lightOrbit, lightPosition, orbitPosition } from "../utils";
import { System } from "./System";
import { FloatingParticles } from "./FloatingParticles";
import { Starfield } from "./Starfield";
import { Nebula } from "./Nebula";
import { GivenLightBeams } from "./GivenLightBeams";
import { AmbientComets } from "./AmbientComets";
import { ReactionSatellites } from "./ReactionSatellites";
import { RocketLayer } from "./RocketLayer";
import type { Citizen, Light, Person } from "../types";

// ─── LOD ─────────────────────────────────────────────────────────────────────
// Per-citizen render complexity, chosen every 30 frames from the distance
// between each star and the OrbitControls target point.
// Selected citizen and self are always "full" regardless of distance.

export type LODLevel = "full" | "simple" | "minimal" | "hidden";

const LOD_FULL_SQ    = 100 * 100;   // < 100 units  → full: star + planets + nebulas + dreams
const LOD_SIMPLE_SQ  = 220 * 220;   // 100–220 units → simple: star + planets only
const LOD_MINIMAL_SQ = 380 * 380;   // 220–380 units → minimal: star glyph only
                                     // > 380 units  → hidden: not mounted

// Lives inside Canvas so useFrame is available.
// Recomputes the LOD map every 30 frames; calls onUpdate only when something changed.
function LODManager({ world, selectedCitizenId, selfId, onUpdate }: {
  world: Citizen[];
  selectedCitizenId: string;
  selfId: string;
  onUpdate: (map: ReadonlyMap<string, LODLevel>) => void;
}) {
  const starPositions = useMemo<ReadonlyMap<string, readonly [number, number, number]>>(() => {
    const m = new Map<string, readonly [number, number, number]>();
    for (const c of world) m.set(c.ownerId, galaxyPosition(c.ownerId));
    return m;
  }, [world]);

  const lodRef = useRef<Map<string, LODLevel>>(new Map());
  const tick = useRef(0);

  useFrame((state) => {
    if (++tick.current % 30 !== 0) return;
    const controls = state.controls as OrbitControlsImpl | null;
    if (!controls) return;
    const { x: tx, y: ty, z: tz } = controls.target;
    let changed = false;
    const cur = lodRef.current;

    for (const [id, [sx, sy, sz]] of starPositions) {
      const forced = id === selectedCitizenId || id === selfId;
      let lod: LODLevel;
      if (forced) {
        lod = "full";
      } else {
        const dSq = (tx - sx) ** 2 + (ty - sy) ** 2 + (tz - sz) ** 2;
        lod = dSq < LOD_FULL_SQ    ? "full"
            : dSq < LOD_SIMPLE_SQ  ? "simple"
            : dSq < LOD_MINIMAL_SQ ? "minimal"
            : "hidden";
      }
      if (cur.get(id) !== lod) { cur.set(id, lod); changed = true; }
    }

    if (changed) onUpdate(new Map(cur));
  });

  return null;
}

// ─── Camera ──────────────────────────────────────────────────────────────────
// Smoothly carries the camera across the galaxy: to a light being read, to a
// person being explored, or to whichever citizen's system is selected.
function CameraRig() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const up08 = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);
  const up25 = useMemo(() => new THREE.Vector3(0, 2.5, 0), []);
  // After a selection/recentre change, the rig flies for SETTLE_SECS then
  // releases control entirely — free roam resumes after the timer expires.
  const SETTLE_SECS = 1.8;
  const releaseAt = useRef(0);
  const prevKey = useRef("");

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const store = useUniverseStore.getState();
    const { selectedCitizenId, focusedPersonId, openedLightId, recentreSeq } = store;

    const ownerPos = (ownerId: string) => galaxyPosition(ownerId);

    const key = `${selectedCitizenId}|${focusedPersonId ?? ""}|${openedLightId ?? ""}|${recentreSeq}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      releaseAt.current = t + SETTLE_SECS;
    }

    let close = false;

    const openedLight = openedLightId
      ? findLight(store.world(), openedLightId)
      : null;
    const focusedPerson = !openedLight && focusedPersonId
      ? findPerson(store.world(), focusedPersonId)
      : null;

    if (openedLight) {
      const [bx, by, bz] = ownerPos(openedLight.ownerId);
      const o = lightOrbit(openedLight.light.id, openedLight.light.orbitPosition, openedLight.light.sealed);
      const [lx, ly, lz] = lightPosition(o, t);
      target.set(bx + lx, by + ly, bz + lz);
      tmp.set(lx, ly, lz).normalize();
      desired.copy(target).addScaledVector(tmp, 3.4).add(up08);
      close = true;
    } else if (focusedPerson) {
      const [bx, by, bz] = ownerPos(focusedPerson.ownerId);
      const [px, py, pz] = orbitPosition(focusedPerson.person.orbit, t);
      target.set(bx + px, by + py, bz + pz);
      tmp.set(px, py, pz).normalize();
      desired.copy(target).addScaledVector(tmp, 6).add(up25);
      close = true;
    } else {
      if (t >= releaseAt.current) return;
      const [bx, by, bz] = ownerPos(selectedCitizenId);
      target.set(bx, by, bz);
      // Wide view — shows the shared galaxy, not just your own star
      desired.set(bx, by + 38, bz + 95);
    }

    camera.position.lerp(desired, close ? 0.045 : 0.06);
    if (controls) {
      controls.target.lerp(target, close ? 0.07 : 0.08);
    }
  });

  return null;
}

function findLight(world: Citizen[], lightId: string) {
  for (const c of world) {
    const light = c.lights.find((l) => l.id === lightId);
    if (light) return { ownerId: c.ownerId, light };
  }
  return null;
}

function findPerson(world: Citizen[], personId: string) {
  for (const c of world) {
    const person = c.people.find((p) => p.id === personId);
    if (person) return { ownerId: c.ownerId, person };
  }
  return null;
}

export function UniverseScene() {
  const selfId = useUniverseStore((s) => s.selfId);
  const others = useUniverseStore((s) => s.others);
  const givenLights = useUniverseStore((s) => s.givenLights);
  const user = useUniverseStore((s) => s.user);
  const people = useUniverseStore((s) => s.people);
  const lights = useUniverseStore((s) => s.lights);
  const memories = useUniverseStore((s) => s.memories);
  const milestones = useUniverseStore((s) => s.milestones);
  const nebulas = useUniverseStore((s) => s.nebulas);
  const artifacts = useUniverseStore((s) => s.artifacts);
  const dreams = useUniverseStore((s) => s.dreams);
  const fragments = useUniverseStore((s) => s.fragments);
  const wisdom = useUniverseStore((s) => s.wisdom);
  const signals = useUniverseStore((s) => s.signals);
  const constellations = useUniverseStore((s) => s.constellations);
  const selectedCitizenId = useUniverseStore((s) => s.selectedCitizenId);

  const selectCitizen = useUniverseStore((s) => s.selectCitizen);
  const focusPerson   = useUniverseStore((s) => s.focusPerson);
  const openLight     = useUniverseStore((s) => s.openLight);
  const openOverlay   = useUniverseStore((s) => s.openOverlay);

  // Stable callbacks — Zustand actions never change identity.
  const handleEnterNebula = useCallback((nebulaId: string) => {
    openOverlay({ kind: "nebulaInterior", nebulaId });
  }, [openOverlay]);

  const handleOpenDream = useCallback((dreamId: string) => {
    openOverlay({ kind: "dreamDetail", dreamId });
  }, [openOverlay]);

  const handleSelectStar = useCallback((citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    focusPerson(null);
  }, [selectCitizen, focusPerson]);

  const handleSelectPerson = useCallback((person: Person, citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    focusPerson(person.id);
    openOverlay({ kind: "personDetail", personId: person.id });
  }, [selectCitizen, focusPerson, openOverlay]);

  const handleOpenLight = useCallback((light: Light, citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    openLight(light.id);
  }, [selectCitizen, openLight]);

  // Build the rendered world: your live self plus every other citizen, with shared
  // nebulas and shared dreams injected into participant citizens.
  const world = useMemo<Citizen[]>(() => {
    const self: Citizen | null = user?.name
      ? { ownerId: selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations }
      : null;
    const raw = self ? [self, ...others] : others;

    return raw.map((citizen) => {
      const sharedNebulas = raw
        .filter((other) => other.ownerId !== citizen.ownerId)
        .flatMap((other) =>
          other.nebulas
            .filter((n) => n.participantIds.includes(citizen.ownerId))
            .map((n) => ({ ...n, sharedFromId: other.ownerId })),
        );
      const sharedIds = new Set(sharedNebulas.map((n) => n.id));
      const extraArtifacts = raw.flatMap((other) =>
        other.ownerId !== citizen.ownerId
          ? other.artifacts.filter((a) => sharedIds.has(a.nebulaId))
          : [],
      );

      const sharedDreams = raw
        .filter((other) => other.ownerId !== citizen.ownerId)
        .flatMap((other) =>
          other.dreams
            .filter((d) => d.participantIds.includes(citizen.ownerId))
            .map((d) => ({ ...d, sharedFromId: other.ownerId })),
        );
      const sharedDreamIds = new Set(sharedDreams.map((d) => d.id));
      const extraFragments = raw.flatMap((other) =>
        other.ownerId !== citizen.ownerId
          ? other.fragments.filter((f) => sharedDreamIds.has(f.dreamId))
          : [],
      );

      if (sharedNebulas.length === 0 && sharedDreams.length === 0) return citizen;
      return {
        ...citizen,
        nebulas: [...citizen.nebulas, ...sharedNebulas],
        artifacts: [...citizen.artifacts, ...extraArtifacts],
        dreams: [...citizen.dreams, ...sharedDreams],
        fragments: [...citizen.fragments, ...extraFragments],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations, others]);

  const anySelection = world.length > 1;
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of world) if (c.user.name) m.set(c.ownerId, c.user.name);
    return m;
  }, [world]);

  // LOD map — updated inside Canvas by LODManager every 30 frames.
  const [lodMap, setLodMap] = useState<ReadonlyMap<string, LODLevel>>(() => new Map());

  return (
    <Canvas
      camera={{ position: [0, 55, 145], fov: 55, near: 0.1, far: 4000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false }}
      onPointerMissed={() => focusPerson(null)}
    >
      <color attach="background" args={["#03040c"]} />

      <ambientLight intensity={0.08} />
      <Nebula />
      <Starfield />
      <FloatingParticles />
      <GivenLightBeams selfId={selfId} givenLights={givenLights} />
      <AmbientComets />
      <ReactionSatellites />
      <RocketLayer />

      {world.map((citizen) => {
        const forced = citizen.ownerId === selectedCitizenId || citizen.ownerId === selfId;
        const lod: LODLevel = forced ? "full" : (lodMap.get(citizen.ownerId) ?? "full");
        if (lod === "hidden") return null;
        return (
          <System
            key={citizen.ownerId}
            citizen={citizen}
            isSelf={citizen.ownerId === selfId}
            selected={citizen.ownerId === selectedCitizenId}
            anySelection={anySelection}
            nameById={nameById}
            lod={lod}
            onSelectStar={handleSelectStar}
            onSelectPerson={handleSelectPerson}
            onOpenLight={handleOpenLight}
            onEnterNebula={handleEnterNebula}
            onOpenDream={handleOpenDream}
          />
        );
      })}

      <OrbitControls
        makeDefault
        regress
        enablePan
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.7}
        panSpeed={0.5}
        minDistance={5}
        maxDistance={1800}
      />
      <LODManager
        world={world}
        selectedCitizenId={selectedCitizenId}
        selfId={selfId}
        onUpdate={setLodMap}
      />
      <CameraRig />
      <AdaptiveDpr pixelated />

      <EffectComposer>
        <Bloom mipmapBlur={false} intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.9} radius={0.5} />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
