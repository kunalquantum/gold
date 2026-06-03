import { memo, useMemo } from "react";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition } from "../utils";
import type { Citizen, Light, Person } from "../types";
import type { LODLevel } from "./UniverseScene";
import { StarBody } from "./StarBody";
import { PersonBody } from "./PersonBody";
import { SystemLights } from "./LightField";
import { NebulaMesh } from "./NebulaMesh";
import { DreamStarMesh } from "./DreamStarMesh";
import { SignalPulse } from "./SignalPulse";

const SIGNAL_RECENCY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Props {
  citizen: Citizen;
  isSelf: boolean;
  selected: boolean;
  anySelection: boolean;
  nameById: Map<string, string>;
  lod: LODLevel;
  onSelectStar: (citizen: Citizen) => void;
  onSelectPerson: (person: Person, citizen: Citizen) => void;
  onOpenLight: (light: Light, citizen: Citizen) => void;
  onEnterNebula: (nebulaId: string) => void;
  onOpenDream: (dreamId: string) => void;
}

// One citizen's solar system: their star, orbiting people, lights, and nearby nebulas.
// memo'd so React skips re-rendering when props are identical — the LOD map update
// in UniverseScene only causes re-renders for citizens whose lod level actually changed.
export const System = memo(function System({
  citizen,
  isSelf,
  selected,
  anySelection,
  nameById,
  lod,
  onSelectStar,
  onSelectPerson,
  onOpenLight,
  onEnterNebula,
  onOpenDream,
}: Props) {
  const focusedPersonId = useUniverseStore((s) => s.focusedPersonId);
  const pos = useMemo(() => galaxyPosition(citizen.ownerId), [citizen.ownerId]);
  const dimmed = anySelection && !selected;
  const showLights = selected || isSelf;

  return (
    <group position={pos}>
      <StarBody
        citizen={citizen}
        isSelf={isSelf}
        selected={selected}
        onSelect={() => onSelectStar(citizen)}
      />

      {/* simple + full: planets orbit the star */}
      {lod !== "minimal" && citizen.people.map((person) => (
        <PersonBody
          key={person.id}
          person={person}
          memories={citizen.memories.filter((m) => m.personId === person.id)}
          starPos={pos}
          focused={focusedPersonId === person.id}
          dimmed={dimmed}
          onSelect={(p) => onSelectPerson(p, citizen)}
        />
      ))}

      {/* simple + full: lights orbit the star (already gated to selected/self) */}
      {lod !== "minimal" && showLights && (
        <SystemLights
          lights={citizen.lights}
          dimmed={dimmed}
          onOpen={(l) => onOpenLight(l, citizen)}
        />
      )}

      {/* full only: nebulas, signal pulses, dream stars are expensive and only
          meaningful when the citizen is nearby */}
      {lod === "full" && citizen.nebulas.map((nebula) => {
        const sharedFromName = nebula.sharedFromId ? nameById.get(nebula.sharedFromId) : undefined;
        return (
          <NebulaMesh
            key={nebula.id}
            nebula={nebula}
            ownerPos={pos}
            artifactCount={citizen.artifacts.filter((a) => a.nebulaId === nebula.id).length}
            onEnter={onEnterNebula}
            sharedFromName={sharedFromName}
          />
        );
      })}

      {lod === "full" && citizen.signals
        .filter((s) => s.visibility === "public" && Date.now() - s.createdAt < SIGNAL_RECENCY_MS)
        .slice(0, 3)
        .map((s, i) => (
          <SignalPulse
            key={s.id}
            position={[0, 0, 0]}
            color={citizen.user.color}
            index={i}
          />
        ))}

      {lod === "full" && citizen.dreams.map((dream) => {
        const sharedFromName = dream.sharedFromId ? nameById.get(dream.sharedFromId) : undefined;
        return (
          <DreamStarMesh
            key={dream.id}
            dream={dream}
            ownerPos={pos}
            fragments={citizen.fragments}
            onOpen={onOpenDream}
            sharedFromName={sharedFromName}
          />
        );
      })}
    </group>
  );
});
