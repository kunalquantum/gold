import { useMemo } from "react";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition } from "../utils";
import type { Citizen, Light, Person } from "../types";
import { StarBody } from "./StarBody";
import { PersonBody } from "./PersonBody";
import { SystemLights } from "./LightField";
import { NebulaMesh } from "./NebulaMesh";
import { DreamStarMesh } from "./DreamStarMesh";
import { useShallow } from "zustand/react/shallow";

interface Props {
  citizen: Citizen;
  isSelf: boolean;
  selected: boolean;
  anySelection: boolean;
  onSelectStar: (citizen: Citizen) => void;
  onSelectPerson: (person: Person, citizen: Citizen) => void;
  onOpenLight: (light: Light, citizen: Citizen) => void;
  onEnterNebula: (nebulaId: string) => void;
  onOpenDream: (dreamId: string) => void;
}

// One citizen's solar system: their star, orbiting people, lights, and nearby nebulas.
export function System({
  citizen,
  isSelf,
  selected,
  anySelection,
  onSelectStar,
  onSelectPerson,
  onOpenLight,
  onEnterNebula,
  onOpenDream,
}: Props) {
  const focusedPersonId = useUniverseStore((s) => s.focusedPersonId);
  const others = useUniverseStore(useShallow((s) => s.others));
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

      {citizen.people.map((person) => (
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

      {showLights && (
        <SystemLights
          lights={citizen.lights}
          dimmed={dimmed}
          onOpen={(l) => onOpenLight(l, citizen)}
        />
      )}

      {/* Memory nebulas float near this citizen's star */}
      {citizen.nebulas.map((nebula) => {
        const sharedFromName = nebula.sharedFromId
          ? others.find((c) => c.ownerId === nebula.sharedFromId)?.user.name
          : undefined;
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

      {/* Dream stars float in deep space beyond the known system */}
      {citizen.dreams.map((dream) => {
        const sharedFromName = dream.sharedFromId
          ? others.find((c) => c.ownerId === dream.sharedFromId)?.user.name
          : undefined;
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
}
