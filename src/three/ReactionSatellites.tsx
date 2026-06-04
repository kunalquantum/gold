import { useEffect, useRef, useState, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { onReaction, type Reaction } from "../data/reactionChannel";

const LIFETIME_S = 16;

interface ActiveSat extends Reaction {
  bornMs: number;
  // Orbital parameters around galaxy centre
  radius: number;
  speed: number;       // rad/s
  phase: number;       // starting angle
  inclination: number; // orbit plane tilt (radians)
  centerY: number;
}

function spawnSat(r: Reaction): ActiveSat {
  return {
    ...r,
    bornMs: Date.now(),
    radius: 28 + Math.random() * 55,
    speed: 0.18 + Math.random() * 0.28,
    phase: Math.random() * Math.PI * 2,
    inclination: (Math.random() - 0.5) * Math.PI * 0.85,
    centerY: (Math.random() - 0.5) * 18,
  };
}

// Solar-panel satellite that orbits the galaxy centre.
const Satellite = memo(function Satellite({ sat }: { sat: ActiveSat }) {
  const groupRef  = useRef<THREE.Group>(null);
  const bodyRef   = useRef<THREE.Mesh>(null);
  const panel1Ref = useRef<THREE.Mesh>(null);
  const panel2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const age = (Date.now() - sat.bornMs) / 1000;
    const fadeIn  = Math.min(1, age / 1.2);
    const fadeOut = age > LIFETIME_S * 0.72 ? 1 - (age - LIFETIME_S * 0.72) / (LIFETIME_S * 0.28) : 1;
    const alpha   = fadeIn * Math.max(0, fadeOut);

    const angle = sat.phase + sat.speed * age;
    // Tilted orbital plane: rotate (x,z) orbit by inclination around X axis
    const x = sat.radius * Math.cos(angle);
    const zFlat = sat.radius * Math.sin(angle);
    const y = sat.centerY + zFlat * Math.sin(sat.inclination);
    const z = zFlat * Math.cos(sat.inclination);

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      // Slowly spin the satellite on its own axis
      groupRef.current.rotation.y = age * 0.4 + sat.phase;
      groupRef.current.rotation.x = Math.sin(age * 0.2 + sat.phase) * 0.3;
    }

    const setOpacity = (mesh: THREE.Mesh | null, o: number) => {
      if (mesh) (mesh.material as THREE.MeshBasicMaterial).opacity = o;
    };
    setOpacity(bodyRef.current,   alpha * 0.95);
    setOpacity(panel1Ref.current, alpha * 0.5);
    setOpacity(panel2Ref.current, alpha * 0.5);
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef}>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>

      {/* Solar panel L */}
      <mesh ref={panel1Ref} position={[1.3, 0, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.62]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>

      {/* Solar panel R */}
      <mesh ref={panel2Ref} position={[-1.3, 0, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.62]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>

      {/* Emoji + sender label */}
      <Html center position={[0, 1.6, 0]} distanceFactor={22} pointerEvents="none">
        <div style={{ textAlign: "center", lineHeight: 1.2, userSelect: "none" }}>
          <div style={{ fontSize: "20px" }}>{sat.emoji}</div>
          <div style={{ fontSize: "8px", color: sat.color, opacity: 0.85, marginTop: "2px", whiteSpace: "nowrap" }}>
            {sat.senderName}
          </div>
        </div>
      </Html>
    </group>
  );
});

export function ReactionSatellites() {
  const [sats, setSats] = useState<ActiveSat[]>([]);

  useEffect(() => {
    return onReaction((r) => {
      const sat = spawnSat(r);
      setSats((prev) => [...prev, sat]);
      setTimeout(() => {
        setSats((prev) => prev.filter((s) => s.id !== r.id));
      }, LIFETIME_S * 1000 + 500);
    });
  }, []);

  return (
    <>
      {sats.map((s) => <Satellite key={s.id} sat={s} />)}
    </>
  );
}
