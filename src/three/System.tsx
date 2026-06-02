import { useMemo } from "react";
import { useUniverseStore } from "../store/useUniverseStore";
import { galaxyPosition } from "../utils";
import type { Citizen, Light, Person } from "../types";
import { StarBody } from "./StarBody";
import { PersonBody } from "./PersonBody";
import { SystemLights } from "./LightField";

interface Props {
  citizen: Citizen;
  isSelf: boolean;
  selected: boolean;
  anySelection: boolean;
  onSelectStar: (citizen: Citizen) => void;
  onSelectPerson: (person: Person, citizen: Citizen) => void;
  onOpenLight: (light: Light, citizen: Citizen) => void;
}

// One citizen's solar system, placed at their stable home in the galaxy: their
// star, the people who orbit them, and (when you're there) the light around them.
export function System({
  citizen,
  isSelf,
  selected,
  anySelection,
  onSelectStar,
  onSelectPerson,
  onOpenLight,
}: Props) {
  const focusedPersonId = useUniverseStore((s) => s.focusedPersonId);
  const pos = useMemo(() => galaxyPosition(citizen.ownerId), [citizen.ownerId]);
  const dimmed = anySelection && !selected;
  // Show the full system (lights) for your own star and whichever you visit.
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
    </group>
  );
}
