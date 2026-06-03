import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { MemoryNebula } from "../types";
import { EMOTION_PALETTES, EMOTION_GLYPHS, nebulaGalaxyPosition } from "../utils";

interface Props {
  nebula: MemoryNebula;
  ownerPos: [number, number, number];
  artifactCount: number;
  onEnter: (nebulaId: string) => void;
}

function makeCloudTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NebulaMesh({ nebula, ownerPos, artifactCount, onEnter }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const palette = EMOTION_PALETTES[nebula.emotion];
  const pos = useMemo(() => nebulaGalaxyPosition(nebula.id, ownerPos), [nebula.id, ownerPos]);

  // Particle positions for the cloud body
  const { positions, count } = useMemo(() => {
    const count = 180 + Math.min(nebula.echoCount, 20) * 8;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 9;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return { positions, count };
  }, [nebula.id, nebula.echoCount]);

  const dot = useMemo(makeCloudTexture, []);

  const brightness = hovered ? 1.4 : 1.0;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.025;
    }
    if (outerRef.current) {
      const pulse = 1 + Math.sin(t * 0.55) * 0.04;
      outerRef.current.scale.setScalar(pulse * brightness);
      const m = outerRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = hovered ? 0.14 : 0.07;
      m.opacity += (targetOpacity - m.opacity) * 0.05;
    }
    if (innerRef.current) {
      const m = innerRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = hovered ? 0.2 : 0.1;
      m.opacity += (targetOpacity - m.opacity) * 0.05;
    }
  });

  return (
    <group position={pos} ref={groupRef}>
      <pointLight color={palette.glow} intensity={hovered ? 2.5 : 1.4} distance={40} decay={1.6} />

      {/* Outer glow sphere */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[11, 16, 16]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner cloud */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[7, 16, 16]} />
        <meshBasicMaterial
          color={palette.primary}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Cloud particles — primary color */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.primary}
          size={0.55}
          map={dot}
          alphaMap={dot}
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Invisible click/hover target */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onEnter(nebula.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[13, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html center distanceFactor={55} position={[0, -13, 0]} pointerEvents="none">
        <div className={`nebula-label ${hovered ? "nebula-label--hover" : ""}`}>
          <span className="nebula-label__glyph" style={{ color: palette.primary }}>
            {EMOTION_GLYPHS[nebula.emotion]}
          </span>
          <span className="nebula-label__name">{nebula.title}</span>
          {artifactCount > 0 && (
            <span className="nebula-label__count">{artifactCount}</span>
          )}
        </div>
      </Html>
    </group>
  );
}
