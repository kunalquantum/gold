import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { MemoryArtifact, EmotionTag } from "../types";
import { EMOTION_PALETTES, artifactInteriorPosition } from "../utils";

interface Props {
  artifact: MemoryArtifact;
  emotion: EmotionTag;
  onSelect: (artifact: MemoryArtifact) => void;
}

const ARTIFACT_COLORS = {
  photo: "#c8d8ff",   // cool crystal blue
  voice: "#8be8d8",   // aqua orb
  story: "#ffd27a",   // warm gold scroll
  video: "#c8a2ff",   // violet prism
};

export function ArtifactObject({ artifact, emotion, onSelect }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [px, py, pz] = artifactInteriorPosition(artifact.id);
  const palette = EMOTION_PALETTES[emotion];
  const color = ARTIFACT_COLORS[artifact.type];

  // Each artifact bobs at a different phase from its id hash
  const phase = (artifact.id.charCodeAt(0) + artifact.id.charCodeAt(1)) % 100 / 100 * Math.PI * 2;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!meshRef.current) return;
    meshRef.current.position.y = py + Math.sin(t * 0.7 + phase) * 0.35;
    meshRef.current.rotation.y = t * 0.3 + phase;
    meshRef.current.rotation.x = Math.sin(t * 0.25 + phase) * 0.15;

    // Voice orb pulses in scale
    if (artifact.type === "voice") {
      const pulse = 1 + Math.sin(t * 2.2 + phase) * 0.12;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[px, py, pz]}>
      <pointLight color={color} intensity={0.8} distance={8} decay={2} />

      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onSelect(artifact); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
      >
        {artifact.type === "photo" && <icosahedronGeometry args={[0.75, 1]} />}
        {artifact.type === "voice" && <sphereGeometry args={[0.65, 16, 16]} />}
        {artifact.type === "story" && <cylinderGeometry args={[0.28, 0.28, 1.3, 8]} />}
        {artifact.type === "video" && <octahedronGeometry args={[0.8, 0]} />}

        {artifact.type === "photo" && (
          <meshPhongMaterial color={color} transparent opacity={0.82} shininess={140} emissive={color} emissiveIntensity={0.18} />
        )}
        {artifact.type === "voice" && (
          <meshBasicMaterial color={color} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
        )}
        {artifact.type === "story" && (
          <meshStandardMaterial color={color} metalness={0.1} roughness={0.55} emissive={color} emissiveIntensity={0.22} />
        )}
        {artifact.type === "video" && (
          <meshPhongMaterial color={color} transparent opacity={0.78} shininess={200} emissive={color} emissiveIntensity={0.15} />
        )}
      </mesh>

      <Html
        center
        distanceFactor={22}
        position={[0, artifact.type === "story" ? 1.1 : 1.0, 0]}
        pointerEvents="none"
      >
        <div className="artifact-label" style={{ color: palette.primary }}>
          {artifact.caption || artifact.date}
        </div>
      </Html>
    </group>
  );
}
