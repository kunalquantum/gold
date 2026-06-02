import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { useWorld, findLightOwner } from "../store/useWorld";
import { REACTION_LABELS, UNLOCK_LABELS, formatDate } from "../utils";
import type { Light, LightReaction } from "../types";

const REACTIONS: LightReaction[] = ["thank_you", "this_helped", "saved_for_later"];

// Opening a light feels like opening a letter: the galaxy falls away behind a
// soft blur and a single message expands to fill your attention. Any light in
// the shared world can be read; only your own can be reacted to.
export function LightLetter({ lightId }: { lightId: string }) {
  const world = useWorld();
  const selfId = useUniverseStore((s) => s.selfId);
  const closeLight = useUniverseStore((s) => s.closeLight);
  const reactToLight = useUniverseStore((s) => s.reactToLight);

  const found = findLightOwner(world, lightId);
  if (!found) return null;
  const { citizen, light } = found;
  const mine = citizen.ownerId === selfId;

  const sender =
    light.senderId === "self"
      ? citizen.user.name
      : citizen.people.find((p) => p.id === light.senderId)?.name ?? "Someone";

  return (
    <motion.div
      className="letter-veil"
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(7px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.7 }}
      onClick={closeLight}
    >
      <motion.div
        className={`letter ${light.sealed ? "letter--sealed" : ""}`}
        style={{ ["--glow" as string]: light.color }}
        initial={{ opacity: 0, scale: 0.6, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 20 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {light.sealed ? (
          <SealedBody light={light} sender={sender} />
        ) : (
          <OpenBody light={light} sender={sender} />
        )}

        {!light.sealed && mine && (
          <div className="reactions">
            {REACTIONS.map((r) => (
              <button
                key={r}
                className={`reaction ${light.reaction === r ? "reaction--on" : ""}`}
                onClick={() => reactToLight(light.id, r)}
              >
                {REACTION_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        <button className="letter__close" onClick={closeLight}>
          Let it return to the sky
        </button>
      </motion.div>
    </motion.div>
  );
}

function OpenBody({ light, sender }: { light: Light; sender: string }) {
  return (
    <>
      <div className="letter__halo" />
      {light.type === "photo" && light.mediaUrl && <img className="letter__photo" src={light.mediaUrl} alt="" />}
      {light.content && <p className="letter__text">{light.type === "photo" ? light.content : `“${light.content}”`}</p>}
      {light.type === "voice" && light.mediaUrl && <audio className="letter__audio" controls autoPlay src={light.mediaUrl} />}
      <div className="letter__sign">
        <span className="letter__from">— {sender}</span>
        <span className="letter__date">{formatDate(light.createdAt)}</span>
      </div>
    </>
  );
}

function SealedBody({ light, sender }: { light: Light; sender: string }) {
  return (
    <>
      <div className="letter__seal">✦</div>
      <p className="letter__sealed-title">A light kept for later</p>
      <p className="letter__sealed-when">{light.unlockTrigger ? UNLOCK_LABELS[light.unlockTrigger] : "Waiting"}</p>
      <p className="letter__sealed-note">{sender} left this, sealed until its moment arrives.</p>
      {light.unlockAt && <p className="letter__date">Opens {formatDate(light.unlockAt)}</p>}
    </>
  );
}
