import { useRef, useMemo } from "react";
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
  const photoGroupRef = useRef<THREE.Group>(null);
  const [px, py, pz] = artifactInteriorPosition(artifact.id);
  const palette = EMOTION_PALETTES[emotion];
  const color = ARTIFACT_COLORS[artifact.type];
  const phase = (artifact.id.charCodeAt(0) + artifact.id.charCodeAt(1)) % 100 / 100 * Math.PI * 2;

  const photoTexture = useMemo(() => {
    if (artifact.type !== "photo" || !artifact.content) return null;
    return new THREE.TextureLoader().load(artifact.content);
  }, [artifact.type, artifact.content]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (artifact.type === "photo") {
      const g = photoGroupRef.current;
      if (!g) return;
      g.position.y = py + Math.sin(t * 0.7 + phase) * 0.35;
      // Gentle sway rather than full spin — photos look better oscillating
      g.rotation.y = Math.sin(t * 0.25 + phase) * 0.35;
      g.rotation.x = Math.sin(t * 0.18 + phase) * 0.12;
    } else {
      const m = meshRef.current;
      if (!m) return;
      m.position.y = py + Math.sin(t * 0.7 + phase) * 0.35;
      m.rotation.y = t * 0.3 + phase;
      m.rotation.x = Math.sin(t * 0.25 + phase) * 0.15;
      if (artifact.type === "voice") {
        const pulse = 1 + Math.sin(t * 2.2 + phase) * 0.12;
        m.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group position={[px, py, pz]}>
      <pointLight color={color} intensity={0.8} distance={8} decay={2} />

      {artifact.type === "photo" ? (
        <group ref={photoGroupRef}>
          {/* White polaroid frame */}
          <mesh>
            <planeGeometry args={[1.7, 1.7]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
          {/* Photo — sits slightly in front of the frame, shifted up for polaroid bottom margin */}
          <mesh
            position={[0, 0.05, 0.012]}
            onClick={(e) => { e.stopPropagation(); onSelect(artifact); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}
          >
            <planeGeometry args={[1.46, 1.46]} />
            <meshBasicMaterial
              map={photoTexture}
              color={photoTexture ? "#ffffff" : color}
              transparent
              opacity={photoTexture ? 1.0 : 0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ) : (
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onSelect(artifact); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = "auto"; }}
        >
          {artifact.type === "voice" && <sphereGeometry args={[0.65, 16, 16]} />}
          {artifact.type === "story" && <cylinderGeometry args={[0.28, 0.28, 1.3, 8]} />}
          {artifact.type === "video" && <octahedronGeometry args={[0.8, 0]} />}

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
      )}

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
