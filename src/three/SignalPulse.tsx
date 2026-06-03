import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  position: [number, number, number];
  color: string;
  index: number; // stagger multiple pulses
}

// Expanding ring that emanates from a star when it has recent signals.
// Fades out as it grows — purely visual, no interaction.
export function SignalPulse({ position, color, index }: Props) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const period = 6;
    const offset = index * (period / 3); // stagger up to 3 pulses
    const phase = ((state.clock.elapsedTime + offset) % period) / period;
    const scale = 1 + phase * 5;
    const opacity = Math.max(0, (1 - phase) * 0.25);
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.6, 2.0, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
