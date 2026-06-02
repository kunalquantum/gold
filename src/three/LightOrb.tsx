import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Light } from "../types";
import { lightOrbit, lightPosition } from "../utils";

interface Props {
  light: Light;
  dimmed: boolean; // a different person is focused
  arriving: boolean; // currently flying in as a comet
  onArrived: () => void;
  onOpen: (light: Light) => void;
}

const COMET_DURATION = 2.6; // seconds for a new light to fly in and settle

// A single Message of Light: a glowing object orbiting the user's star. Its form
// reflects its kind, it pulses softly while unread, and it arrives as a comet.
export function LightOrb({ light, dimmed, arriving, onArrived, onOpen }: Props) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const arriveStart = useRef<number | null>(null);

  const orbit = useMemo(
    () => lightOrbit(light.id, light.orbitPosition, light.sealed),
    [light.id, light.orbitPosition, light.sealed],
  );

  const color = light.color;
  const unread = !light.opened && !light.sealed;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;

    const [ox, oy, oz] = lightPosition(orbit, t);

    if (arriving) {
      if (arriveStart.current === null) arriveStart.current = t;
      const p = Math.min((t - arriveStart.current) / COMET_DURATION, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic — slows as it settles
      // Comes streaking in from far out along its orbital direction.
      const start = new THREE.Vector3(ox, oy, oz).multiplyScalar(5.5);
      const target = new THREE.Vector3(ox, oy, oz);
      g.position.lerpVectors(start, target, ease);
      if (trail.current) {
        const mat = trail.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - p) * 0.5;
        trail.current.scale.setScalar(1 + (1 - p) * 6);
      }
      if (p >= 1) {
        arriveStart.current = null;
        onArrived();
      }
    } else {
      g.position.set(ox, oy, oz);
    }

    // Gentle living motion.
    if (inner.current) {
      let scale = hovered ? 1.5 : 1;
      if (unread) scale *= 1 + Math.sin(t * 1.6 + orbit.phase) * 0.18; // slow pulse
      if (light.form === "firefly")
        scale *= 0.7 + Math.abs(Math.sin(t * 3 + orbit.phase)) * 0.6; // flicker
      inner.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);
      inner.current.rotation.y += light.form === "fragment" ? 0.02 : 0.005;
    }
  });

  const opacity = dimmed ? 0.18 : 1;
  const coreSize = light.form === "firefly" ? 0.16 : light.sealed ? 0.34 : 0.26;

  return (
    <group ref={group}>
      <pointLight
        color={color}
        intensity={light.sealed ? 0.3 : unread ? 1 : 0.6}
        distance={6}
        decay={2}
      />

      {/* Comet trail (only meaningful while arriving) */}
      <mesh ref={trail} visible={arriving}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Soft halo */}
      <mesh>
        <sphereGeometry args={[coreSize * 2.4, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={(light.sealed ? 0.08 : 0.16) * opacity}
          depthWrite={false}
        />
      </mesh>

      {/* The light body — its form depends on the kind of message */}
      <mesh
        ref={inner}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(light);
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
        <LightGeometry form={light.form} size={coreSize} sealed={light.sealed} />
        <meshStandardMaterial
          color={light.sealed ? "#3a2f5c" : color}
          emissive={color}
          emissiveIntensity={light.sealed ? 0.35 : unread ? 1.5 : 0.9}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

function LightGeometry({
  form,
  size,
  sealed,
}: {
  form: Light["form"];
  size: number;
  sealed: boolean;
}) {
  if (sealed || form === "lantern") {
    // A sealed lantern — a little capsule keeping its light until its moment.
    return <octahedronGeometry args={[size, 0]} />;
  }
  switch (form) {
    case "fragment":
      return <icosahedronGeometry args={[size, 0]} />;
    case "firefly":
      return <sphereGeometry args={[size, 12, 12]} />;
    case "orb":
    default:
      return <sphereGeometry args={[size, 32, 32]} />;
  }
}
