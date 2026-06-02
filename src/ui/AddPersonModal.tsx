import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { RELATIONSHIP_KINDS } from "../types";
import { fileToDataUrl } from "../utils";

// Bringing someone into your universe. Warm and simple — name, relationship,
// and an optional face. Never a CRUD form.
export function AddPersonModal() {
  const addPerson = useUniverseStore((s) => s.addPerson);
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const focusPerson = useUniverseStore((s) => s.focusPerson);

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<string>(RELATIONSHIP_KINDS[0]);
  const [photo, setPhoto] = useState<string | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);

  const canAdd = name.trim().length > 0;

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    setPhoto(await fileToDataUrl(file));
  };

  const submit = () => {
    if (!canAdd) return;
    const person = addPerson({ name, relationship, photo });
    closeOverlay();
    focusPerson(person.id);
  };

  return (
    <ModalShell onClose={closeOverlay} title="Add someone you love">
      <div className="addperson">
        <button
          type="button"
          className="photo-drop"
          onClick={() => fileInput.current?.click()}
          style={photo ? { backgroundImage: `url(${photo})` } : undefined}
        >
          {!photo && <span>Add a photo</span>}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handlePhoto(e.target.files?.[0])}
        />

        <label className="field">
          <span className="field__label">Their name</span>
          <input
            className="field__input"
            value={name}
            autoFocus
            placeholder="e.g. Mom"
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        <div className="field">
          <span className="field__label">Who are they to you?</span>
          <div className="chips">
            {RELATIONSHIP_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={`chip ${relationship === kind ? "chip--active" : ""}`}
                onClick={() => setRelationship(kind)}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn--primary" disabled={!canAdd} onClick={submit}>
          Place them in your sky
        </button>
      </div>
    </ModalShell>
  );
}

// Shared frosted modal shell with a soft entrance.
export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
