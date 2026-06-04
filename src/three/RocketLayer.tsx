import { useEffect, useRef, useState, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { onRocket, type RocketMessage } from "../data/rocketChannel";
import { galaxyPosition } from "../utils";

const TRAVEL_S  = 8;   // seconds to fly from star to star
const HOVER_S   = 52;  // seconds hovering at destination
const TOTAL_S   = TRAVEL_S + HOVER_S; // 60 s lifetime
const FADE_IN_S = 1.2;
const FADE_OUT_S = 5;

interface ActiveRocket extends RocketMessage {
  bornMs: number;
  // src / dst positions
  sx: number; sy: number; sz: number;
  dx: number; dy: number; dz: number;
  // hover orbit
  hoverRadius: number;
  hoverPhase: number;
  hoverSpeed: number;
}

// Quadratic Bezier: P0 → control → P1
function bezier(
  t: number,
  p0x: number, p0y: number, p0z: number,
  p1x: number, p1y: number, p1z: number,
  cpx: number,  cpy: number,  cpz: number,
  out: THREE.Vector3,
) {
  const mt = 1 - t;
  out.set(
    mt * mt * p0x + 2 * mt * t * cpx + t * t * p1x,
    mt * mt * p0y + 2 * mt * t * cpy + t * t * p1y,
    mt * mt * p0z + 2 * mt * t * cpz + t * t * p1z,
  );
}

function spawnRocket(r: RocketMessage): ActiveRocket {
  const [sx, sy, sz] = galaxyPosition(r.senderId);
  const [dx, dy, dz] = galaxyPosition(r.receiverId);
  return {
    ...r,
    bornMs: Date.now(),
    sx, sy, sz, dx, dy, dz,
    hoverRadius: 5 + Math.random() * 4,
    hoverPhase:  Math.random() * Math.PI * 2,
    hoverSpeed:  0.5 + Math.random() * 0.3,
  };
}

const _pos    = new THREE.Vector3();
const _prev   = new THREE.Vector3();
const _dir    = new THREE.Vector3();
const _up     = new THREE.Vector3(0, 1, 0);
const _quat   = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();

const RocketMesh = memo(function RocketMesh({ r }: { r: ActiveRocket }) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Mesh>(null);
  const noseRef  = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const fin1Ref  = useRef<THREE.Mesh>(null);
  const fin2Ref  = useRef<THREE.Mesh>(null);

  // Control point: arc midpoint lifted above the straight line
  const mx = (r.sx + r.dx) / 2;
  const my = Math.max(r.sy, r.dy) + Math.sqrt((r.dx - r.sx) ** 2 + (r.dz - r.sz) ** 2) * 0.35 + 15;
  const mz = (r.sz + r.dz) / 2;

  useFrame(() => {
    const age  = (Date.now() - r.bornMs) / 1000;
    const travelling = age < TRAVEL_S;

    // Opacity
    const fadeIn  = Math.min(1, age / FADE_IN_S);
    const fadeOut = age > TOTAL_S - FADE_OUT_S
      ? 1 - (age - (TOTAL_S - FADE_OUT_S)) / FADE_OUT_S
      : 1;
    const alpha = fadeIn * Math.max(0, fadeOut);

    const group = groupRef.current;
    if (!group) return;

    if (travelling) {
      // Store previous position for direction calculation
      _prev.copy(_pos);

      const t = age / TRAVEL_S;
      bezier(t, r.sx, r.sy, r.sz, r.dx, r.dy, r.dz, mx, my, mz, _pos);
      group.position.copy(_pos);

      // Orient rocket toward direction of travel
      if (age > 0.05) {
        const t2 = Math.min(1, (age + 0.08) / TRAVEL_S);
        bezier(t2, r.sx, r.sy, r.sz, r.dx, r.dy, r.dz, mx, my, mz, _dir);
        _dir.sub(_pos).normalize();
        if (_dir.lengthSq() > 0.001) {
          _matrix.lookAt(_pos, _pos.clone().add(_dir), _up);
          _quat.setFromRotationMatrix(_matrix);
          group.quaternion.slerp(_quat, 0.2);
        }
      }
    } else {
      // Hovering at destination
      const hAge = age - TRAVEL_S;
      const angle = r.hoverPhase + r.hoverSpeed * hAge;
      group.position.set(
        r.dx + Math.cos(angle) * r.hoverRadius,
        r.dy + Math.sin(hAge * 0.4) * 1.5,
        r.dz + Math.sin(angle) * r.hoverRadius,
      );
      // Slowly rotate during hover
      group.rotation.y = angle;
      group.rotation.x = Math.sin(hAge * 0.3) * 0.2;
    }

    // Flame only visible during travel
    const flameAlpha = travelling ? alpha * (0.6 + Math.sin(age * 18) * 0.3) : 0;

    const setA = (m: THREE.Mesh | null, a: number) => {
      if (m) (m.material as THREE.MeshBasicMaterial).opacity = a;
    };
    setA(bodyRef.current,  alpha * 0.95);
    setA(noseRef.current,  alpha * 0.90);
    setA(flameRef.current, flameAlpha);
    setA(fin1Ref.current,  alpha * 0.70);
    setA(fin2Ref.current,  alpha * 0.70);
  });

  return (
    <group ref={groupRef} position={[r.sx, r.sy, r.sz]}>
      {/* Body */}
      <mesh ref={bodyRef}>
        <cylinderGeometry args={[0.38, 0.38, 1.6, 10]} />
        <meshBasicMaterial color={r.senderColor} transparent opacity={0} />
      </mesh>

      {/* Nose cone */}
      <mesh ref={noseRef} position={[0, 1.2, 0]}>
        <coneGeometry args={[0.38, 0.85, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>

      {/* Fins */}
      <mesh ref={fin1Ref} position={[0.52, -0.65, 0]} rotation={[0, 0, Math.PI * 0.18]}>
        <boxGeometry args={[0.55, 0.65, 0.07]} />
        <meshBasicMaterial color={r.senderColor} transparent opacity={0} />
      </mesh>
      <mesh ref={fin2Ref} position={[-0.52, -0.65, 0]} rotation={[0, 0, -Math.PI * 0.18]}>
        <boxGeometry args={[0.55, 0.65, 0.07]} />
        <meshBasicMaterial color={r.senderColor} transparent opacity={0} />
      </mesh>

      {/* Flame (exhaust) */}
      <mesh ref={flameRef} position={[0, -1.2, 0]}>
        <coneGeometry args={[0.28, 0.9, 8]} />
        <meshBasicMaterial color="#ff9944" transparent opacity={0} />
      </mesh>

      {/* Message label */}
      <Html center position={[0, 2.5, 0]} distanceFactor={24} pointerEvents="none">
        <div style={{ textAlign: "center", lineHeight: 1.3, userSelect: "none" }}>
          <div style={{ fontSize: "13px", color: r.senderColor, fontWeight: 600, whiteSpace: "nowrap", textShadow: "0 0 8px currentColor" }}>
            {r.message}
          </div>
          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.55)", marginTop: "2px", whiteSpace: "nowrap" }}>
            {r.senderName} → {r.receiverName}
          </div>
        </div>
      </Html>
    </group>
  );
});

export function RocketLayer() {
  const [rockets, setRockets] = useState<ActiveRocket[]>([]);

  useEffect(() => {
    return onRocket((r) => {
      const rocket = spawnRocket(r);
      setRockets((prev) => [...prev, rocket]);
      setTimeout(() => {
        setRockets((prev) => prev.filter((x) => x.id !== r.id));
      }, TOTAL_S * 1000 + 500);
    });
  }, []);

  return (
    <>
      {rockets.map((r) => <RocketMesh key={r.id} r={r} />)}
    </>
  );
}
