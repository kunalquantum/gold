import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { useUniverseStore } from "../store/useUniverseStore";
import type { MemoryArtifact, MemoryNebula } from "../types";
import { EMOTION_PALETTES, EMOTION_GLYPHS } from "../utils";
import { ArtifactObject } from "./ArtifactObject";
import { CreateArtifactModal } from "../ui/CreateArtifactModal";
import { ArtifactViewer } from "../ui/ArtifactViewer";
import { ShareNebulaModal } from "../ui/ShareNebulaModal";

// Dense animated particle cloud that fills the nebula interior.
function NebulaCloud({ emotion }: { emotion: MemoryNebula["emotion"] }) {
  const ref = useRef<THREE.Group>(null);
  const palette = EMOTION_PALETTES[emotion];

  const { primaryPos, secondaryPos, count } = useMemo(() => {
    const count = 1400;
    const primaryPos = new Float32Array(count * 3);
    const secondaryPos = new Float32Array((count / 2) * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 16;
      primaryPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      primaryPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      primaryPos[i * 3 + 2] = r * Math.cos(phi);
    }
    for (let i = 0; i < count / 2; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 11;
      secondaryPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      secondaryPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      secondaryPos[i * 3 + 2] = r * Math.cos(phi);
    }
    return { primaryPos, secondaryPos, count };
  }, [emotion]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });

  return (
    <group ref={ref}>
      {/* Primary color cloud */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={primaryPos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.primary}
          size={0.22}
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Secondary color wisps */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count / 2} array={secondaryPos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.secondary}
          size={0.14}
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={palette.primary} intensity={2.2} distance={30} decay={1.5} />
      <pointLight color={palette.secondary} position={[8, 4, -6]} intensity={1.2} distance={20} decay={2} />
    </group>
  );
}

interface SceneProps {
  nebula: MemoryNebula;
  artifacts: MemoryArtifact[];
  onSelectArtifact: (a: MemoryArtifact) => void;
}

function InteriorScene({ nebula, artifacts, onSelectArtifact }: SceneProps) {
  const bg = EMOTION_PALETTES[nebula.emotion].bg;
  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.1} />
      <NebulaCloud emotion={nebula.emotion} />
      {artifacts.map((a) => (
        <ArtifactObject key={a.id} artifact={a} emotion={nebula.emotion} onSelect={onSelectArtifact} />
      ))}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.04}
        rotateSpeed={0.3}
        zoomSpeed={0.6}
        minDistance={3}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.25}
      />
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.6} luminanceThreshold={0.15} luminanceSmoothing={0.9} radius={0.85} />
      </EffectComposer>
    </>
  );
}

interface Props {
  nebulaId: string;
}

export function NebulaInterior({ nebulaId }: Props) {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const selfId = useUniverseStore((s) => s.selfId);
  const world = useUniverseStore((s) => s.world)();

  // Search the full world for the nebula so shared nebulas work correctly.
  const ownerCitizen = useMemo(
    () => world.find((c) => c.nebulas.some((n) => n.id === nebulaId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nebulaId, world],
  );
  const nebula = ownerCitizen?.nebulas.find((n) => n.id === nebulaId) ?? null;
  const isOwner = ownerCitizen?.ownerId === selfId;
  const isParticipant = !isOwner && (nebula?.participantIds.includes(selfId) ?? false);
  const ownerName = !isOwner ? ownerCitizen?.user.name : undefined;

  // Collect artifacts from ALL world citizens for this nebula (owner + participants all contribute).
  const nebulaArtifacts = useMemo(
    () => world.flatMap((c) => c.artifacts.filter((a) => a.nebulaId === nebulaId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nebulaId, world],
  );

  const [activeArtifact, setActiveArtifact] = useState<MemoryArtifact | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (!nebula) return null;

  const palette = EMOTION_PALETTES[nebula.emotion];

  return (
    <motion.div
      className="nebula-interior"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.2, ease: "easeInOut" }}
    >
      <Canvas
        camera={{ position: [0, 4, 18], fov: 72, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ position: "absolute", inset: 0 }}
      >
        <InteriorScene
          nebula={nebula}
          artifacts={nebulaArtifacts}
          onSelectArtifact={setActiveArtifact}
        />
      </Canvas>

      {/* HUD */}
      <div className="nebula-interior__hud">
        <div className="nebula-interior__nav">
          <button className="nebula-interior__back" onClick={closeOverlay}>
            ← Leave this place
          </button>
          {isOwner && (
            <button className="nebula-interior__share-btn" onClick={() => setShowShare(true)}>
              ✦ Share this place
            </button>
          )}
        </div>

        <div className="nebula-interior__title-row">
          <span className="nebula-interior__glyph" style={{ color: palette.primary }}>
            {EMOTION_GLYPHS[nebula.emotion]}
          </span>
          <div>
            <h2 className="nebula-interior__title">{nebula.title}</h2>
            {isParticipant && ownerName && (
              <p className="nebula-interior__shared-by">✦ shared by {ownerName}</p>
            )}
            {isOwner && nebula.participantIds.length > 0 && (
              <p className="nebula-interior__shared-by">
                shared with {nebula.participantIds.length} {nebula.participantIds.length === 1 ? "person" : "people"}
              </p>
            )}
          </div>
        </div>

        {nebulaArtifacts.length === 0 && (
          <p className="nebula-interior__empty">
            This place is waiting for its first memory.
          </p>
        )}

        <button
          className="nebula-interior__add"
          style={{ borderColor: `${palette.primary}55`, color: palette.primary }}
          onClick={() => setShowCreate(true)}
        >
          + Add a memory
        </button>
      </div>

      {/* Sub-overlays managed inside the interior */}
      <AnimatePresence>
        {showCreate && (
          <CreateArtifactModal
            key="create"
            nebulaId={nebulaId}
            onClose={() => setShowCreate(false)}
          />
        )}
        {activeArtifact && (
          <ArtifactViewer
            key={activeArtifact.id}
            artifact={activeArtifact}
            nebula={nebula}
            onClose={() => setActiveArtifact(null)}
          />
        )}
        {showShare && (
          <ShareNebulaModal
            key="share"
            nebula={nebula}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
