import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  count?: number;
}

// Soft motes of light drifting through the foreground — gives the universe a
// sense of living, breathing depth without demanding attention.
// A soft circular sprite so each mote is a round glow, not a hard square.
function makeSoftDot(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function FloatingParticles({ count = 160 }: Props) {
  const points = useRef<THREE.Points>(null);
  const dot = useMemo(makeSoftDot, []);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 14 + Math.random() * 46;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      speeds[i] = 0.1 + Math.random() * 0.3;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * 0.01;
      if (arr[i * 3 + 1] > 26) arr[i * 3 + 1] = -26;
      arr[i * 3] += Math.sin(t * 0.1 + i) * 0.002;
    }
    geo.attributes.position.needsUpdate = true;
    if (points.current) points.current.rotation.y = t * 0.005;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        map={dot}
        alphaMap={dot}
        color="#ffe9b8"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
