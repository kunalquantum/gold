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
function Beam({ from, to, offset }: { from: THREE.Vector3; to: THREE.Vector3; offset: number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime + offset;
    matRef.current.opacity = 0.06 + Math.sin(t * 0.6) * 0.04;
  });

  const points = useMemo(() => [from, to], [from, to]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#ffd27a", transparent: true, opacity: 0.08 }))} />
  );
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
