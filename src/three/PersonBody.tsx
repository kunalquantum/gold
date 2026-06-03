import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Memory, Person } from "../types";
import { orbitPosition, seedFrom } from "../utils";
import { MemorySatellite } from "./MemorySatellite";
import { Planet, type PlanetType } from "./Planet";

interface Props {
  person: Person;
  memories: Memory[];
  focused: boolean;
  dimmed: boolean;
  starPos: [number, number, number]; // world position of this system's star
  onSelect: (person: Person) => void;
}

const PLANET_TYPES: PlanetType[] = ["gas", "rocky", "ice"];

// One important person, orbiting the user as a unique world. Procedurally
// surfaced, lit by the user's star, wrapped in atmosphere. Their memories orbit
// them as small stars.
export function PersonBody({ person, memories, focused, dimmed, starPos, onSelect }: Props) {
  const group = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const scaleVec = useRef(new THREE.Vector3(1, 1, 1));
  const [hovered, setHovered] = useState(false);
  const { orbit } = person;

  // Each person gets a stable, distinct world.
  const profile = useMemo(() => {
    const s = seedFrom(person.id);
    const base = new THREE.Color(orbit.color);
    const accent = base.clone().offsetHSL(0.06, -0.05, -0.18);
    const atmo = base.clone().offsetHSL(-0.04, 0.12, 0.12);
    return {
      type: PLANET_TYPES[Math.floor(s * PLANET_TYPES.length) % PLANET_TYPES.length],
      seed: s * 10,
      accent: `#${accent.getHexString()}`,
      atmo: `#${atmo.getHexString()}`,
    };
  }, [person.id, orbit.color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const [x, y, z] = orbitPosition(orbit, t);
    if (group.current) group.current.position.set(x, y, z);
    if (bodyGroup.current) {
      const target = hovered || focused ? 1.18 : dimmed ? 0.92 : 1;
      scaleVec.current.set(target, target, target);
      bodyGroup.current.scale.lerp(scaleVec.current, 0.1);
    }
  });

  return (
    <group ref={group}>
      <pointLight
        color={orbit.color}
        intensity={focused ? 1.1 : dimmed ? 0.15 : 0.45}
        distance={12}
        decay={1.8}
      />

      <group ref={bodyGroup}>
        {person.photo ? (
          <PhotoSphere url={person.photo} size={orbit.size} tint={orbit.color} />
        ) : (
          <Planet
            baseColor={orbit.color}
            accentColor={profile.accent}
            atmoColor={profile.atmo}
            type={profile.type}
            seed={profile.seed}
            size={orbit.size}
            starPos={starPos}
          />
        )}

        {/* Invisible, reliable interaction target */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(person);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[orbit.size * 1.12, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {(hovered || focused) && (
        <Html center distanceFactor={20} position={[0, orbit.size + 1.4, 0]} pointerEvents="none">
          <div className="body-label">
            <span className="body-label__name">{person.name}</span>
            <span className="body-label__rel">{person.relationship}</span>
          </div>
        </Html>
      )}

      {memories.map((m, i) => (
        <MemorySatellite key={m.id} index={i} total={memories.length} baseRadius={orbit.size + 1.7} />
      ))}
    </group>
  );
}

// A person with a photo: their face on a sphere, lit by the central star and
// slowly turning, with a soft halo.
function PhotoSphere({ url, size, tint }: { url: string; size: number; tint: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useTexture(url);
  const map = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [texture]);

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.06;
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          map={map}
          emissive={tint}
          emissiveIntensity={0.12}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      <mesh scale={1.16}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={tint} transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
