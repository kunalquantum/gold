import { useMemo, useRef } from "react";
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
import type { Citizen, Light, Person } from "../types";

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
  // Close-up modes (focused person/light) always track because those targets move.
  const SETTLE_SECS = 1.8;
  const releaseAt = useRef(0);
  const prevKey = useRef("");

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const store = useUniverseStore.getState();
    const { selectedCitizenId, focusedPersonId, openedLightId, recentreSeq } = store;

    const ownerPos = (ownerId: string) => galaxyPosition(ownerId);

    // Any change in selection or explicit recentre() restarts the fly-to timer.
    const key = `${selectedCitizenId}|${focusedPersonId ?? ""}|${openedLightId ?? ""}|${recentreSeq}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      releaseAt.current = t + SETTLE_SECS;
    }

    let close = false;

    // Only build the world array when we actually need to find a specific object.
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
      // Idle: stop lerping once the timer expires — full free roam from here.
      if (t >= releaseAt.current) return;
      const [bx, by, bz] = ownerPos(selectedCitizenId);
      target.set(bx, by, bz);
      desired.set(bx, by + 12, bz + 34);
    }

    camera.position.lerp(desired, close ? 0.045 : 0.06);
    if (controls) {
      controls.target.lerp(target, close ? 0.07 : 0.08);
      // drei's OrbitControls runs its own update() at frame priority −1 (before
      // this hook). Calling update() again here would double-apply damping.
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
  const focusPerson = useUniverseStore((s) => s.focusPerson);
  const openLight = useUniverseStore((s) => s.openLight);
  const openOverlay = useUniverseStore((s) => s.openOverlay);

  const handleEnterNebula = (nebulaId: string) => {
    openOverlay({ kind: "nebulaInterior", nebulaId });
  };

  const handleOpenDream = (dreamId: string) => {
    openOverlay({ kind: "dreamDetail", dreamId });
  };

  // Build the rendered world: your live self plus every other citizen, with shared
  // nebulas and shared dreams injected into participant citizens.
  const world = useMemo<Citizen[]>(() => {
    const self: Citizen | null = user?.name
      ? { ownerId: selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations }
      : null;
    const raw = self ? [self, ...others] : others;

    return raw.map((citizen) => {
      // Shared nebulas
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

      // Shared dreams
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

  const handleSelectStar = (citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    focusPerson(null);
  };
  const handleSelectPerson = (person: Person, citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    focusPerson(person.id);
    openOverlay({ kind: "personDetail", personId: person.id });
  };
  const handleOpenLight = (light: Light, citizen: Citizen) => {
    selectCitizen(citizen.ownerId);
    openLight(light.id);
  };

  return (
    <Canvas
      camera={{ position: [0, 16, 44], fov: 55, near: 0.1, far: 4000 }}
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

      {world.map((citizen) => (
        <System
          key={citizen.ownerId}
          citizen={citizen}
          isSelf={citizen.ownerId === selfId}
          selected={citizen.ownerId === selectedCitizenId}
          anySelection={anySelection}
          nameById={nameById}
          onSelectStar={handleSelectStar}
          onSelectPerson={handleSelectPerson}
          onOpenLight={handleOpenLight}
          onEnterNebula={handleEnterNebula}
          onOpenDream={handleOpenDream}
        />
      ))}

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
      <CameraRig />
      <AdaptiveDpr pixelated />

      <EffectComposer>
        <Bloom mipmapBlur={false} intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.9} radius={0.5} />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
