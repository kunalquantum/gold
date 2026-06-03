import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { ArtifactType } from "../types";
import { ARTIFACT_DEFS, fileToDataUrl } from "../utils";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { checkContent } from "../utils/contentGuard";

interface Props {
  nebulaId: string;
  onClose: () => void;
}

export function CreateArtifactModal({ nebulaId, onClose }: Props) {
  const addArtifact = useUniverseStore((s) => s.addArtifact);

  const [type, setType] = useState<ArtifactType | null>(null);
  const [caption, setCaption] = useState("");
  const [content, setContent] = useState(""); // dataURL for photo/voice/video, text for story
  const [storyText, setStoryText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [guardError, setGuardError] = useState<string | null>(null);

  const { recording: isRecording, start: startVoice, stop: stopVoice } = useVoiceRecorder();
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  const canSave = type !== null && caption.trim().length > 0 && (
    (type === "photo" && !!content) ||
    (type === "voice" && !!voiceUrl) ||
    (type === "story" && storyText.trim().length > 0) ||
    (type === "video" && !!videoFile)
  );

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setContent(url);
    setPhotoPreview(url);
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setVideoFile(url);
    setContent(url);
  }

  function handleSave() {
    if (!type) return;
    const textToCheck = [caption, type === "story" ? storyText : ""].filter(Boolean).join(" ");
    if (textToCheck) {
      const err = checkContent(textToCheck);
      if (err) { setGuardError(err); return; }
    }
    setGuardError(null);
    const finalContent =
      type === "story" ? storyText :
      type === "voice" ? (voiceUrl ?? "") :
      content;

    addArtifact({
      nebulaId,
      type,
      content: finalContent,
      caption: caption.trim(),
      date,
    });
    onClose();
  }

  return (
    <motion.div
      className="veil veil--dim"
      style={{ zIndex: 50 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="modal__head">
          <h2 className="modal__title">Add a memory</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Artifact type selector */}
        <div className="artifact-type-row">
          {ARTIFACT_DEFS.map((def) => (
            <button
              key={def.type}
              type="button"
              className={`artifact-type-tab ${type === def.type ? "artifact-type-tab--active" : ""}`}
              onClick={() => setType(def.type)}
            >
              <span className="artifact-type-tab__glyph">{def.glyph}</span>
              <span>{def.label}</span>
            </button>
          ))}
        </div>

        {type && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Photo upload */}
            {type === "photo" && (
              <label className="field">
                <span className="field__label">Photo</span>
                {photoPreview ? (
                  <img src={photoPreview} style={{ width: "100%", borderRadius: "14px", marginBottom: "10px" }} />
                ) : (
                  <label
                    className="photo-drop photo-drop--wide"
                    style={{ display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    <span style={{ color: "var(--ink-faint)", fontSize: "13px" }}>Tap to choose a photo</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
                  </label>
                )}
              </label>
            )}

            {/* Voice recorder */}
            {type === "voice" && (
              <div className="field">
                <span className="field__label">Voice memory</span>
                <div className="voicebox" style={{ marginTop: "8px" }}>
                  {!isRecording && !voiceUrl && (
                    <button className="icon-btn" onClick={startVoice} title="Start recording">◉</button>
                  )}
                  {isRecording && (
                    <button
                      className="icon-btn icon-btn--rec"
                      onClick={async () => {
                        const url = await stopVoice();
                        if (url) setVoiceUrl(url);
                      }}
                      title="Stop"
                    >■</button>
                  )}
                  {voiceUrl && (
                    <>
                      <span className="voicebox__ok">✓ Voice recorded</span>
                      <audio controls src={voiceUrl} className="msg-card__audio" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Story text */}
            {type === "story" && (
              <label className="field">
                <span className="field__label">Write your story</span>
                <textarea
                  className="composer__input"
                  rows={6}
                  placeholder="Tell the story of this moment..."
                  maxLength={3000}
                  value={storyText}
                  style={{ fontFamily: "var(--display)", fontSize: "16px", lineHeight: 1.65 }}
                  onChange={(e) => { setStoryText(e.target.value); setGuardError(null); }}
                  autoFocus
                />
              </label>
            )}

            {/* Video upload */}
            {type === "video" && (
              <label className="field">
                <span className="field__label">Video</span>
                {videoFile ? (
                  <video src={videoFile} controls style={{ width: "100%", borderRadius: "14px", marginBottom: "10px" }} />
                ) : (
                  <label
                    className="photo-drop photo-drop--wide"
                    style={{ display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    <span style={{ color: "var(--ink-faint)", fontSize: "13px" }}>Tap to choose a video</span>
                    <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoChange} />
                  </label>
                )}
              </label>
            )}

            <label className="field">
              <span className="field__label">Caption — what does this memory mean to you?</span>
              <input
                className="field__input"
                value={caption}
                placeholder="One line that holds the feeling"
                maxLength={120}
                onChange={(e) => { setCaption(e.target.value); setGuardError(null); }}
              />
            </label>

            <label className="field">
              <span className="field__label">When did this happen?</span>
              <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </motion.div>
        )}

        {guardError && <p className="content-guard-error">{guardError}</p>}
        <button className="btn btn--primary" disabled={!canSave} onClick={handleSave} style={{ marginTop: "4px" }}>
          Place in the nebula
        </button>
      </motion.div>
    </motion.div>
  );
}
