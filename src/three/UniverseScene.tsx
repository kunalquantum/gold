import { useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition, lightOrbit, lightPosition, orbitPosition } from "../utils";
import { System } from "./System";
import { FloatingParticles } from "./FloatingParticles";
import { Starfield } from "./Starfield";
import { Nebula } from "./Nebula";
import type { Citizen, Light, Person } from "../types";

// Smoothly carries the camera across the galaxy: to a light being read, to a
// person being explored, or to whichever citizen's system is selected.
function CameraRig() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const store = useUniverseStore.getState();
    const world = store.world();
    const { selectedCitizenId, focusedPersonId, openedLightId } = store;

    const ownerPos = (ownerId: string) => galaxyPosition(ownerId);

    let close = false;

    const openedLight = openedLightId
      ? findLight(world, openedLightId)
      : null;
    const focusedPerson = focusedPersonId
      ? findPerson(world, focusedPersonId)
      : null;

    if (openedLight) {
      const [bx, by, bz] = ownerPos(openedLight.ownerId);
      const o = lightOrbit(openedLight.light.id, openedLight.light.orbitPosition, openedLight.light.sealed);
      const [lx, ly, lz] = lightPosition(o, t);
      target.set(bx + lx, by + ly, bz + lz);
      tmp.set(lx, ly, lz).normalize();
      desired.copy(target).addScaledVector(tmp, 3.4).add(new THREE.Vector3(0, 0.8, 0));
      close = true;
    } else if (focusedPerson) {
      const [bx, by, bz] = ownerPos(focusedPerson.ownerId);
      const [px, py, pz] = orbitPosition(focusedPerson.person.orbit, t);
      target.set(bx + px, by + py, bz + pz);
      tmp.set(px, py, pz).normalize();
      desired.copy(target).addScaledVector(tmp, 6).add(new THREE.Vector3(0, 2.5, 0));
      close = true;
    } else {
      const [bx, by, bz] = ownerPos(selectedCitizenId);
      target.set(bx, by, bz);
      desired.set(bx, by + 12, bz + 34);
    }

    camera.position.lerp(desired, close ? 0.045 : 0.03);
    if (controls) {
      controls.target.lerp(target, close ? 0.07 : 0.05);
      controls.update();
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
  const user = useUniverseStore((s) => s.user);
  const people = useUniverseStore((s) => s.people);
  const lights = useUniverseStore((s) => s.lights);
  const memories = useUniverseStore((s) => s.memories);
  const selectedCitizenId = useUniverseStore((s) => s.selectedCitizenId);

  const selectCitizen = useUniverseStore((s) => s.selectCitizen);
  const focusPerson = useUniverseStore((s) => s.focusPerson);
  const openLight = useUniverseStore((s) => s.openLight);
  const openOverlay = useUniverseStore((s) => s.openOverlay);

  // Build the rendered world: your live self plus every other citizen.
  const world = useMemo<Citizen[]>(() => {
    const self: Citizen | null = user?.name
      ? { ownerId: selfId, user, people, lights, memories }
      : null;
    return self ? [self, ...others] : others;
  }, [selfId, user, people, lights, memories, others]);

  const anySelection = world.length > 1;

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
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => focusPerson(null)}
    >
      <color attach="background" args={["#03040c"]} />

      <ambientLight intensity={0.08} />
      <Nebula />
      <Starfield />
      <FloatingParticles />

      {world.map((citizen) => (
        <System
          key={citizen.ownerId}
          citizen={citizen}
          isSelf={citizen.ownerId === selfId}
          selected={citizen.ownerId === selectedCitizenId}
          anySelection={anySelection}
          onSelectStar={handleSelectStar}
          onSelectPerson={handleSelectPerson}
          onOpenLight={handleOpenLight}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.7}
        panSpeed={0.5}
        minDistance={5}
        maxDistance={520}
      />
      <CameraRig />

      <EffectComposer>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.2} luminanceSmoothing={0.9} radius={0.7} />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
