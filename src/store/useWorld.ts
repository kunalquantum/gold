import { useMemo } from "react";
import { useUniverseStore } from "./useUniverseStore";
import type { Citizen } from "../types";

// The whole shared world as a memoized array: your live self plus every other
// citizen. Use in UI that needs to look across all citizens (panels, letters).
export function useWorld(): Citizen[] {
  const selfId = useUniverseStore((s) => s.selfId);
  const user = useUniverseStore((s) => s.user);
  const people = useUniverseStore((s) => s.people);
  const lights = useUniverseStore((s) => s.lights);
  const memories = useUniverseStore((s) => s.memories);
  const milestones = useUniverseStore((s) => s.milestones);
  const nebulas = useUniverseStore((s) => s.nebulas);
  const artifacts = useUniverseStore((s) => s.artifacts);
  const dreams = useUniverseStore((s) => s.dreams);
  const fragments = useUniverseStore((s) => s.fragments);
  const wisdom = useUniverseStore((s) => s.wisdom);
  const signals = useUniverseStore((s) => s.signals);
  const constellations = useUniverseStore((s) => s.constellations);
  const others = useUniverseStore((s) => s.others);

  return useMemo<Citizen[]>(() => {
    const self: Citizen | null = user?.name
      ? { ownerId: selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations }
      : null;
    return self ? [self, ...others] : others;
  }, [selfId, user, people, lights, memories, milestones, nebulas, artifacts, dreams, fragments, wisdom, signals, constellations, others]);
}

// Find the citizen who owns a given person, and the person.
export function findPersonOwner(world: Citizen[], personId: string) {
  for (const c of world) {
    const person = c.people.find((p) => p.id === personId);
    if (person) return { citizen: c, person };
  }
  return null;
}

// Find the citizen who owns a given light, and the light.
export function findLightOwner(world: Citizen[], lightId: string) {
  for (const c of world) {
    const light = c.lights.find((l) => l.id === lightId);
    if (light) return { citizen: c, light };
  }
  return null;
}
