import { useRef, useState } from "react";
import { fileToDataUrl } from "../utils";

// Minimal voice-note recorder built on MediaRecorder. Returns a data URL so the
// note persists alongside everything else in the local-first store.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      mr.start();
      recorder.current = mr;
      setRecording(true);
    } catch {
      setError("We couldn't reach your microphone.");
    }
  };

  // Resolves with the recorded audio as a data URL (or null if nothing captured).
  const stop = (): Promise<string | null> =>
    new Promise((resolve) => {
      const mr = recorder.current;
      if (!mr) return resolve(null);
      mr.onstop = async () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (!chunks.current.length) return resolve(null);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        resolve(await fileToDataUrl(file));
      };
      mr.stop();
    });

  return { recording, error, start, stop };
}
