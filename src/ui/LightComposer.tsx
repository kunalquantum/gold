import { useRef, useState } from "react";
import { useUniverseStore } from "../store/useUniverseStore";
import type { LightType, UnlockTrigger } from "../types";
import { checkContent } from "../utils/contentGuard";
import {
  FEELING_TRIGGERS,
  OCCASION_TRIGGERS,
  UNLOCK_LABELS,
  fileToDataUrl,
} from "../utils";
import { useVoiceRecorder } from "./useVoiceRecorder";

const TYPE_TABS: { type: LightType; label: string }[] = [
  { type: "text", label: "Note" },
  { type: "voice", label: "Voice" },
  { type: "photo", label: "Memory" },
  { type: "future", label: "For later" },
];

const ALL_TRIGGERS: UnlockTrigger[] = [
  ...FEELING_TRIGGERS,
  ...OCCASION_TRIGGERS,
  "one_year",
];

// Capture a piece of support as a light. `senderName` is whose light this is —
// the person whose words you're keeping (e.g. "Mom").
export function LightComposer({
  senderId,
  senderName,
}: {
  senderId: string;
  senderName: string;
}) {
  const addLight = useUniverseStore((s) => s.addLight);
  const [type, setType] = useState<LightType>("text");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string | undefined>();
  const [trigger, setTrigger] = useState<UnlockTrigger>("scared");
  const [guardError, setGuardError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { recording, error, start, stop } = useVoiceRecorder();

  const reset = () => {
    setContent("");
    setMedia(undefined);
    setTrigger("scared");
  };

  const ready =
    type === "voice"
      ? !!media
      : type === "photo"
        ? !!media || content.trim().length > 0
        : content.trim().length > 0;

  const send = () => {
    if (!ready) return;
    if (content.trim()) {
      const err = checkContent(content);
      if (err) { setGuardError(err); return; }
    }
    setGuardError(null);
    addLight({
      senderId,
      type,
      content: content.trim(),
      mediaUrl: media,
      unlockTrigger: type === "future" ? trigger : undefined,
    });
    reset();
  };

  const toggleVoice = async () => {
    if (recording) {
      const audio = await stop();
      if (audio) setMedia(audio);
    } else {
      setMedia(undefined);
      await start();
    }
  };

  return (
    <div className="composer composer--stack">
      <div className="lighttype">
        {TYPE_TABS.map((t) => (
          <button
            key={t.type}
            className={`lighttype__tab ${type === t.type ? "lighttype__tab--on" : ""}`}
            onClick={() => {
              setType(t.type);
              setMedia(undefined);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === "text" && (
        <textarea
          className="composer__input"
          rows={2}
          placeholder={`What did ${senderName} say?  e.g. “Proud of you.”`}
          value={content}
          onChange={(e) => { setContent(e.target.value); setGuardError(null); }}
        />
      )}

      {type === "voice" && (
        <div className="voicebox">
          <button
            className={`btn btn--ghost ${recording ? "btn--recording" : ""}`}
            onClick={toggleVoice}
          >
            {recording ? "■  Stop recording" : media ? "🎙  Record again" : "🎙  Record a voice light"}
          </button>
          {media && !recording && <span className="voicebox__ok">Voice captured ✦</span>}
        </div>
      )}

      {type === "photo" && (
        <>
          <button
            type="button"
            className="photo-drop photo-drop--wide"
            onClick={() => fileInput.current?.click()}
            style={media ? { backgroundImage: `url(${media})` } : undefined}
          >
            {!media && <span>Add a photo</span>}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setMedia(await fileToDataUrl(f));
            }}
          />
          <input
            className="field__input"
            placeholder="A caption — e.g. Still one of my favorite days."
            value={content}
            onChange={(e) => { setContent(e.target.value); setGuardError(null); }}
          />
        </>
      )}

      {type === "future" && (
        <>
          <textarea
            className="composer__input"
            rows={2}
            placeholder="Write something for a moment that hasn't come yet…"
            value={content}
            onChange={(e) => { setContent(e.target.value); setGuardError(null); }}
          />
          <span className="field__label">Open this light…</span>
          <div className="chips">
            {ALL_TRIGGERS.map((tr) => (
              <button
                key={tr}
                className={`chip ${trigger === tr ? "chip--active" : ""}`}
                onClick={() => setTrigger(tr)}
              >
                {UNLOCK_LABELS[tr]}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="composer__error">{error}</p>}
      {guardError && <p className="content-guard-error">{guardError}</p>}

      <div className="composer__row composer__row--end">
        <button className="btn btn--small" disabled={!ready} onClick={send}>
          {type === "future" ? "Seal this light" : "Send into orbit"}
        </button>
      </div>
    </div>
  );
}
