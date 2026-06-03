import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { DreamFragment, DreamStar } from "../types";
import { DREAM_CATEGORY_GLYPHS, DREAM_CATEGORY_PALETTES, dreamGalaxyPosition } from "../utils";

interface Props {
  dream: DreamStar;
  ownerPos: [number, number, number];
  fragments: DreamFragment[];
  sharedFromName?: string;
  onOpen: (dreamId: string) => void;
}

export function DreamStarMesh({ dream, ownerPos, fragments, sharedFromName, onOpen }: Props) {
  const palette = DREAM_CATEGORY_PALETTES[dream.category];
  const pos = useMemo(() => dreamGalaxyPosition(dream.id, ownerPos), [dream.id, ownerPos]);

  const [hovered, setHovered] = useState(false);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const completedCount = fragments.filter((f) => f.dreamId === dream.id && f.completed).length;
  const totalCount = fragments.filter((f) => f.dreamId === dream.id).length;
  const brightness = totalCount > 0 ? 0.28 + (completedCount / totalCount) * 0.72 : 0.3;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.7 + pos[0]) * 0.12;
    const targetB = hovered ? 1.0 : brightness;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.018;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse * (hovered ? 1.6 : 1.0));
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity += (targetB - m.opacity) * 0.06;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(pulse * (hovered ? 1.4 : 1.0));
      const m = haloRef.current.material as THREE.MeshBasicMaterial;
      const targetOp = hovered ? targetB * 0.35 : targetB * 0.18;
      m.opacity += (targetOp - m.opacity) * 0.05;
    }
    if (outerRef.current) {
      outerRef.current.scale.setScalar(pulse * 0.96);
      const m = outerRef.current.material as THREE.MeshBasicMaterial;
      const targetOp = hovered ? targetB * 0.12 : targetB * 0.06;
      m.opacity += (targetOp - m.opacity) * 0.04;
    }
  });

  const label = DREAM_CATEGORY_GLYPHS[dream.category];

  return (
    <group position={pos}>
      <pointLight
        color={palette.star}
        intensity={hovered ? brightness * 5 : brightness * 2.5}
        distance={60}
        decay={1.8}
      />

      <group ref={groupRef}>
        {/* Outer halo — very soft, large */}
        <mesh ref={outerRef}>
          <sphereGeometry args={[9, 10, 10]} />
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={brightness * 0.06}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Inner glow */}
        <mesh ref={haloRef}>
          <sphereGeometry args={[4, 10, 10]} />
          <meshBasicMaterial
            color={palette.star}
            transparent
            opacity={brightness * 0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Star core — the visible point */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial
          color={palette.core}
          transparent
          opacity={brightness}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Click / hover target */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onOpen(dream.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[12, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html center distanceFactor={70} position={[0, -14, 0]} pointerEvents="none">
        <div className={`dream-label ${hovered ? "dream-label--hover" : ""} ${sharedFromName ? "dream-label--shared" : ""}`}>
          <span className="dream-label__glyph" style={{ color: palette.star }}>{label}</span>
          <span className="dream-label__title">{dream.title}</span>
          {totalCount > 0 && (
            <span className="dream-label__progress" style={{ color: palette.star }}>
              {completedCount}/{totalCount}
            </span>
          )}
          {sharedFromName && (
            <span className="dream-label__shared">✦ with {sharedFromName}</span>
          )}
        </div>
      </Html>
    </group>
  );
}
