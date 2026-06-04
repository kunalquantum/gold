import { useRef, useState, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COMET_COLORS = ["#ffd27a", "#c8a2ff", "#9bb8ff", "#8be8d8", "#ffffff", "#ffb3de"];
const TRAIL_COUNT = 9;
const MAX_COMETS = 3;

interface CometData {
  id: number;
  ox: number; oy: number; oz: number; // origin
  dx: number; dy: number; dz: number; // direction (normalised)
  color: string;
  speed: number;
  headR: number;
  bornMs: number;
  lifetimeMs: number;
}

function spawnComet(id: number): CometData {
  const phi   = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const r = 200;
  const ox = r * Math.sin(phi) * Math.cos(theta);
  const oy = r * Math.sin(phi) * Math.sin(theta) * 0.35;
  const oz = r * Math.cos(phi);

  // Aim roughly toward opposite hemisphere with scatter
  const tx = -ox + (Math.random() - 0.5) * 80;
  const ty = -oy + (Math.random() - 0.5) * 30;
  const tz = -oz + (Math.random() - 0.5) * 80;
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz);

  return {
    id,
    ox, oy, oz,
    dx: tx / len, dy: ty / len, dz: tz / len,
    color: COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)],
    speed: 55 + Math.random() * 45,
    headR: 0.9 + Math.random() * 0.7,
    bornMs: Date.now(),
    lifetimeMs: (3.2 + Math.random() * 2.2) * 1000,
  };
}

// Individual comet — all animation via imperative ref updates in useFrame.
const Comet = memo(function Comet({ data }: { data: CometData }) {
  const headRef  = useRef<THREE.Mesh>(null);
  const trailRef = useRef<(THREE.Mesh | null)[]>(Array(TRAIL_COUNT).fill(null));

  useFrame(() => {
    const age = (Date.now() - data.bornMs) / 1000;
    const progress = age / (data.lifetimeMs / 1000);
    const opacity = progress < 0.12
      ? progress / 0.12
      : progress > 0.78 ? (1 - progress) / 0.22 : 1;

    const dist = data.speed * age;
    const hx = data.ox + data.dx * dist;
    const hy = data.oy + data.dy * dist;
    const hz = data.oz + data.dz * dist;

    const head = headRef.current;
    if (head) {
      head.position.set(hx, hy, hz);
      (head.material as THREE.MeshBasicMaterial).opacity = opacity;
    }

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const mesh = trailRef.current[i];
      if (!mesh) continue;
      const gap = data.headR * 2.4;
      const td = dist - (i + 1) * gap;
      if (td < 0) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.set(
        data.ox + data.dx * td,
        data.oy + data.dy * td,
        data.oz + data.dz * td,
      );
      const frac = 1 - (i + 1) / TRAIL_COUNT;
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * frac * 0.65;
    }
  });

  return (
    <>
      <mesh ref={headRef}>
        <sphereGeometry args={[data.headR, 8, 8]} />
        <meshBasicMaterial color={data.color} transparent opacity={0} />
      </mesh>
      {Array.from({ length: TRAIL_COUNT }, (_, i) => {
        const frac = 1 - (i + 1) / TRAIL_COUNT;
        return (
          <mesh key={i} ref={(el) => { trailRef.current[i] = el; }}>
            <sphereGeometry args={[data.headR * frac * 0.85, 6, 6]} />
            <meshBasicMaterial color={data.color} transparent opacity={0} />
          </mesh>
        );
      })}
    </>
  );
});

// Manages spawning / expiring comets.
export function AmbientComets() {
  const nextId       = useRef(0);
  const nextSpawnAt  = useRef(4 + Math.random() * 6);
  const activeCount  = useRef(0);
  const [comets, setComets] = useState<CometData[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t >= nextSpawnAt.current && activeCount.current < MAX_COMETS) {
      nextSpawnAt.current = t + 8 + Math.random() * 11;
      const id = nextId.current++;
      const comet = spawnComet(id);
      activeCount.current++;
      setComets((prev) => [...prev, comet]);
      setTimeout(() => {
        setComets((prev) => prev.filter((c) => c.id !== id));
        activeCount.current = Math.max(0, activeCount.current - 1);
      }, comet.lifetimeMs + 300);
    }
  });

  return (
    <>
      {comets.map((c) => <Comet key={c.id} data={c} />)}
    </>
  );
}
