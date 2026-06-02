import { useUniverseStore } from "../store/useUniverseStore";
import type { Light } from "../types";
import { LightOrb } from "./LightOrb";

interface Props {
  lights: Light[];
  dimmed: boolean;
  onOpen: (light: Light) => void;
}

// The shell of support around one citizen's star. Rendered for whichever system
// you're exploring (and always for your own) — so flying to someone reveals the
// love that surrounds them.
export function SystemLights({ lights, dimmed, onOpen }: Props) {
  const arriving = useUniverseStore((s) => s.arriving);
  const markArrived = useUniverseStore((s) => s.markArrived);

  return (
    <group>
      {lights.map((light) => (
        <LightOrb
          key={light.id}
          light={light}
          dimmed={dimmed}
          arriving={arriving.includes(light.id)}
          onArrived={() => markArrived(light.id)}
          onOpen={onOpen}
        />
      ))}
    </group>
  );
}
