import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { MemoryArtifact, MemoryNebula } from "../types";
import { EMOTION_PALETTES, EMOTION_GLYPHS, formatDate } from "../utils";

interface Props {
  artifact: MemoryArtifact;
  nebula: MemoryNebula;
  onClose: () => void;
}

// Immersive memory viewer. No sidebars. No dashboard. Just the memory.
export function ArtifactViewer({ artifact, nebula, onClose }: Props) {
  const echoNebula = useUniverseStore((s) => s.echoNebula);
  const palette = EMOTION_PALETTES[nebula.emotion];

  function handleClose() {
    echoNebula(nebula.id); // every revisit makes the nebula glow brighter
    onClose();
  }

  return (
    <motion.div
      className="artifact-veil"
      style={{ "--glow": palette.glow } as React.CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        className="artifact-viewer"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {/* Halo glow */}
        <div className="artifact-viewer__halo" style={{ background: `radial-gradient(circle, ${palette.glow}, transparent 65%)` }} />

        {/* Nebula origin */}
        <div className="artifact-viewer__origin">
          <span style={{ color: palette.primary }}>{EMOTION_GLYPHS[nebula.emotion]}</span>
          {nebula.title}
        </div>

        {/* Content */}
        {artifact.type === "photo" && artifact.content && (
          <img className="artifact-viewer__photo" src={artifact.content} alt={artifact.caption} />
        )}

        {artifact.type === "voice" && artifact.content && (
          <div className="artifact-viewer__voice">
            <div className="voice-orb" style={{ boxShadow: `0 0 40px ${palette.glow}66` }}>
              <span style={{ color: palette.primary, fontSize: "28px" }}>◉</span>
            </div>
            <audio controls src={artifact.content} className="artifact-viewer__audio" />
          </div>
        )}

        {artifact.type === "story" && (
          <div className="artifact-viewer__story">
            {artifact.content}
          </div>
        )}

        {artifact.type === "video" && artifact.content && (
          <video className="artifact-viewer__video" src={artifact.content} controls playsInline />
        )}

        {/* Caption + date */}
        <div className="artifact-viewer__caption">{artifact.caption}</div>
        <div className="artifact-viewer__date">{formatDate(artifact.date)}</div>

        <button className="letter__close" style={{ marginTop: "16px" }} onClick={handleClose}>
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
