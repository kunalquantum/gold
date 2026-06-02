import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Citizen } from "../types";
import { Sun } from "./Sun";

interface Props {
  citizen: Citizen;
  isSelf: boolean;
  selected: boolean;
  onSelect: () => void;
}

// A citizen's star in the shared galaxy — their whole presence, clickable to
// fly over and explore. Your own star is marked; a selection ring shows whose
// universe you're currently in.
export function StarBody({ citizen, isSelf, selected, onSelect }: Props) {
  const ring = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = citizen.user.color;
  const size = isSelf ? 2.1 : 1.7;

  useFrame((state) => {
    if (ring.current) {
      ring.current.rotation.z = state.clock.elapsedTime * 0.3;
      const target = selected || hovered ? 1 : 0;
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity += (target * 0.5 - m.opacity) * 0.1;
    }
  });

  return (
    <group>
      <pointLight color={color} intensity={isSelf ? 3.2 : 2.2} distance={70} decay={1.4} />

      <Sun color={color} size={size} />

      {/* Selection / hover ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.9, size * 2.1, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Invisible, reliable interaction target */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[size * 1.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html center distanceFactor={40} position={[0, -size - 1.6, 0]} pointerEvents="none">
        <div className={`star-label ${isSelf ? "star-label--self" : ""} ${selected ? "star-label--on" : ""}`}>
          {citizen.user.name}
          {isSelf && <span className="star-label__you">you</span>}
        </div>
      </Html>
    </group>
  );
}
