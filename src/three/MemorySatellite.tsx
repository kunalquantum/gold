import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  index: number;
  total: number;
  baseRadius: number;
}

// A memory rendered as a small twinkling star orbiting its person.
export function MemorySatellite({ index, total, baseRadius }: Props) {
  const ref = useRef<THREE.Group>(null);
  const phase = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = baseRadius + (index % 3) * 0.5;
  const tilt = 0.4 + (index % 4) * 0.25;
  const speed = 0.5 + (index % 5) * 0.08;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const a = phase + t * speed;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const y = Math.sin(a * tilt) * radius * 0.4;
    if (ref.current) {
      ref.current.position.set(x, y, z);
      const tw = 0.7 + Math.sin(t * 3 + index) * 0.3;
      ref.current.scale.setScalar(tw);
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#fff4d6" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
