import { useEffect, useRef, useState, memo, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { onReaction, type Reaction } from "../data/reactionChannel";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition } from "../utils";

const LIFETIME_S  = 20;
const FADE_IN_S   = 1.0;
const FADE_OUT_S  = 4.0;             // last 4 s fade to nothing
const ORBIT_R_MIN = 9;               // orbital radius range around the star
const ORBIT_R_MAX = 17;
const ORBIT_PERIOD_MIN = 7;          // seconds per full revolution
const ORBIT_PERIOD_MAX = 11;

interface ActiveSat extends Reaction {
  bornMs: number;
  radius: number;
  /** radians/second — ensures full 2π revolutions */
  angularSpeed: number;
  phase: number;
  inclination: number;
  /** orbit center = owner's star position */
  cx: number; cy: number; cz: number;
}

function spawnSat(r: Reaction, cx: number, cy: number, cz: number): ActiveSat {
  const period = ORBIT_PERIOD_MIN + Math.random() * (ORBIT_PERIOD_MAX - ORBIT_PERIOD_MIN);
  return {
    ...r,
    bornMs: Date.now(),
    radius: ORBIT_R_MIN + Math.random() * (ORBIT_R_MAX - ORBIT_R_MIN),
    angularSpeed: (Math.PI * 2) / period,
    phase: Math.random() * Math.PI * 2,
    inclination: (Math.random() - 0.5) * Math.PI * 0.9,
    cx, cy, cz,
  };
}

// One satellite orbiting the user's star, fading in then out.
const Satellite = memo(function Satellite({ sat }: { sat: ActiveSat }) {
  const groupRef  = useRef<THREE.Group>(null);
  const bodyRef   = useRef<THREE.Mesh>(null);
  const panel1Ref = useRef<THREE.Mesh>(null);
  const panel2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const age   = (Date.now() - sat.bornMs) / 1000;
    const fadeIn  = Math.min(1, age / FADE_IN_S);
    const fadeOut = age > LIFETIME_S - FADE_OUT_S
      ? 1 - (age - (LIFETIME_S - FADE_OUT_S)) / FADE_OUT_S
      : 1;
    const alpha = fadeIn * Math.max(0, fadeOut);

    // Tilted circular orbit: rotate XZ plane by inclination around X axis
    const angle  = sat.phase + sat.angularSpeed * age;
    const x = sat.cx + sat.radius * Math.cos(angle);
    const zFlat  = sat.radius * Math.sin(angle);
    const y = sat.cy + zFlat * Math.sin(sat.inclination);
    const z = sat.cz + zFlat * Math.cos(sat.inclination);

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.rotation.y = age * 0.5 + sat.phase;
    }

    const setA = (mesh: THREE.Mesh | null, o: number) => {
      if (mesh) (mesh.material as THREE.MeshBasicMaterial).opacity = o;
    };
    setA(bodyRef.current,   alpha * 0.95);
    setA(panel1Ref.current, alpha * 0.50);
    setA(panel2Ref.current, alpha * 0.50);
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef}>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>

      {/* Solar panels */}
      <mesh ref={panel1Ref} position={[1.3, 0, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.62]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>
      <mesh ref={panel2Ref} position={[-1.3, 0, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.62]} />
        <meshBasicMaterial color={sat.color} transparent opacity={0} />
      </mesh>

      {/* Emoji + sender name */}
      <Html center position={[0, 1.7, 0]} distanceFactor={22} pointerEvents="none">
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
  const selfId = useUniverseStore((s) => s.selfId);
  const [cx, cy, cz] = useMemo(() => galaxyPosition(selfId), [selfId]);

  const [sats, setSats] = useState<ActiveSat[]>([]);

  useEffect(() => {
    return onReaction((r) => {
      const sat = spawnSat(r, cx, cy, cz);
      setSats((prev) => [...prev, sat]);
      setTimeout(() => {
        setSats((prev) => prev.filter((s) => s.id !== r.id));
      }, LIFETIME_S * 1000 + 300);
    });
  }, [cx, cy, cz]);

  return (
    <>
      {sats.map((s) => <Satellite key={s.id} sat={s} />)}
    </>
  );
}
