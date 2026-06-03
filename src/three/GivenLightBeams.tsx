import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GivenLight } from "../types";
import { galaxyPosition } from "../utils";

interface Props {
  selfId: string;
  givenLights: GivenLight[];
}

// A single faint beam from this user's star to a recipient's star.
// Material and Line object are stable; only geometry rebuilds when endpoints change.
function Beam({ from, to, offset }: { from: THREE.Vector3; to: THREE.Vector3; offset: number }) {
  const mat = useRef(new THREE.LineBasicMaterial({ color: "#ffd27a", transparent: true, opacity: 0.08 }));
  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints([from, to]),
    [from, to],
  );
  const lineObj = useMemo(() => new THREE.Line(geometry, mat.current), [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offset;
    mat.current.opacity = 0.06 + Math.sin(t * 0.6) * 0.04;
  });

  return <primitive object={lineObj} />;
}

export function GivenLightBeams({ selfId, givenLights }: Props) {
  const beams = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ ownerId: string; offset: number }> = [];
    givenLights.forEach((gl, i) => {
      if (!seen.has(gl.toOwnerId)) {
        seen.add(gl.toOwnerId);
        result.push({ ownerId: gl.toOwnerId, offset: i * 1.3 });
      }
    });
    return result;
  }, [givenLights]);

  const selfPos = useMemo(() => {
    const [x, y, z] = galaxyPosition(selfId);
    return new THREE.Vector3(x, y, z);
  }, [selfId]);

  if (beams.length === 0) return null;

  return (
    <>
      {beams.map(({ ownerId, offset }) => {
        const [tx, ty, tz] = galaxyPosition(ownerId);
        const toPos = new THREE.Vector3(tx, ty, tz);
        return <Beam key={ownerId} from={selfPos} to={toPos} offset={offset} />;
      })}
    </>
  );
}
