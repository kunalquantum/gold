import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { useWorld, findPersonOwner } from "../store/useWorld";
import { REACTION_LABELS, UNLOCK_LABELS, fileToDataUrl, formatDate } from "../utils";
import { LightComposer } from "./LightComposer";
import type { Citizen, Light, Memory } from "../types";

type Tab = "lights" | "memories";

// The quiet room behind a person. Works for anyone in the shared world — your
// own people are editable; others' are yours to witness, not change.
export function PersonDetailPanel({ personId }: { personId: string }) {
  const world = useWorld();
  const selfId = useUniverseStore((s) => s.selfId);
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const focusPerson = useUniverseStore((s) => s.focusPerson);
  const removePerson = useUniverseStore((s) => s.removePerson);
  const openLight = useUniverseStore((s) => s.openLight);
  const [tab, setTab] = useState<Tab>("lights");

  const found = findPersonOwner(world, personId);
  if (!found) return null;
  const { citizen, person } = found;
  const editable = citizen.ownerId === selfId;

  const personLights = citizen.lights
    .filter((l) => l.senderId === personId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const personMemories = citizen.memories
    .filter((m) => m.personId === personId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const voiceCount = personLights.filter((l) => l.type === "voice").length;

  const close = () => {
    closeOverlay();
    focusPerson(null);
  };

  return (
    <motion.aside
      className="panel"
      initial={{ x: 460, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 460, opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="icon-btn panel__close" onClick={close} aria-label="Close">
        ×
      </button>

      {!editable && <Visiting citizen={citizen} />}

      <header className="panel__head">
        <div
          className="panel__avatar"
          style={
            person.photo
              ? { backgroundImage: `url(${person.photo})` }
              : { background: person.orbit.color, boxShadow: `0 0 30px ${person.orbit.color}` }
          }
        >
          {!person.photo && <span>{person.name.charAt(0)}</span>}
        </div>
        <div>
          <h2 className="panel__name">{person.name}</h2>
          <p className="panel__rel">{person.relationship}</p>
        </div>
      </header>

      <p className="panel__constellation">
        {phrase(personLights.length, "light")} · {phrase(personMemories.length, "memory", "memories")}
        {voiceCount > 0 && <> · {phrase(voiceCount, "voice note")}</>}
      </p>

      <div className="tabs">
        <button className={`tab ${tab === "lights" ? "tab--active" : ""}`} onClick={() => setTab("lights")}>
          Messages of light
        </button>
        <button className={`tab ${tab === "memories" ? "tab--active" : ""}`} onClick={() => setTab("memories")}>
          Memory stars
        </button>
      </div>

      <div className="panel__body">
        <AnimatePresence mode="wait">
          {tab === "lights" ? (
            <motion.div key="lights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              {editable && <LightComposer senderId={personId} senderName={person.name} />}
              {personLights.length === 0 ? (
                <Empty text={editable ? `No lights from ${person.name} yet. Keep one here.` : `No lights from ${person.name} yet.`} />
              ) : (
                <ul className="feed">
                  {personLights.map((l) => (
                    <LightRow key={l.id} light={l} onOpen={() => openLight(l.id)} />
                  ))}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.div key="memories" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              {editable && <MemoryComposer personId={personId} />}
              {personMemories.length === 0 ? (
                <Empty text="No memories yet." />
              ) : (
                <ul className="feed">
                  {personMemories.map((m) => (
                    <MemoryCard key={m.id} memory={m} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {editable && (
        <footer className="panel__foot">
          <button
            className="link-btn link-btn--quiet"
            onClick={() => {
              if (confirm(`Remove ${person.name} from your universe?`)) removePerson(personId);
            }}
          >
            Let this star fade
          </button>
        </footer>
      )}
    </motion.aside>
  );
}

function Visiting({ citizen }: { citizen: Citizen }) {
  return (
    <div className="panel__visiting">
      In {citizen.user.name}&#8217;s universe
    </div>
  );
}

function phrase(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <li className="memory-card">
      {memory.photo && <div className="memory-card__photo" style={{ backgroundImage: `url(${memory.photo})` }} />}
      <div className="memory-card__body">
        <div className="memory-card__title">{memory.title}</div>
        {memory.date && <div className="memory-card__date">{formatDate(memory.date)}</div>}
        {memory.description && <p className="memory-card__desc">{memory.description}</p>}
      </div>
    </li>
  );
}

function LightRow({ light, onOpen }: { light: Light; onOpen: () => void }) {
  const preview = light.sealed
    ? light.unlockTrigger
      ? UNLOCK_LABELS[light.unlockTrigger]
      : "Sealed for later"
    : light.type === "voice"
      ? "A voice light"
      : light.type === "photo"
        ? light.content || "A memory in light"
        : light.content;

  return (
    <li className={`light-row ${!light.opened && !light.sealed ? "light-row--unread" : ""}`}>
      <button className="light-row__btn" onClick={onOpen}>
        <span className={`light-row__dot ${light.sealed ? "light-row__dot--sealed" : ""}`} style={{ background: light.color, boxShadow: `0 0 10px ${light.color}` }} />
        <span className="light-row__body">
          <span className="light-row__text">{light.sealed ? <em>{preview}</em> : preview}</span>
          <span className="light-row__meta">
            {light.sealed ? "Sealed" : formatDate(light.createdAt)}
            {light.reaction && <span className="light-row__react"> · {REACTION_LABELS[light.reaction]}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function MemoryComposer({ personId }: { personId: string }) {
  const addMemory = useUniverseStore((s) => s.addMemory);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);

  const save = () => {
    if (!title.trim()) return;
    addMemory({ personId, title: title.trim(), date, description, photo });
    setTitle("");
    setDate("");
    setDescription("");
    setPhoto(undefined);
    setOpen(false);
  };

  if (!open) {
    return (
      <button className="btn btn--ghost btn--block" onClick={() => setOpen(true)}>
        + Create a memory star
      </button>
    );
  }

  return (
    <div className="composer composer--stack">
      <input className="field__input" placeholder="Title — e.g. Graduation" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
      <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <textarea className="composer__input" placeholder="What made this moment matter?" value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
      <button type="button" className="photo-drop photo-drop--wide" onClick={() => fileInput.current?.click()} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
        {!photo && <span>Add a photo</span>}
      </button>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) setPhoto(await fileToDataUrl(file));
      }} />
      <div className="composer__row">
        <button className="link-btn link-btn--quiet" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn--small" disabled={!title.trim()} onClick={save}>Place this star</button>
      </div>
    </div>
  );
}
