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

// A citizen's star in the shared galaxy. Survivors pulse with a golden outer
// ring; caregivers carry a soft blue aura — so the eye reads who's risen
// without a single label in 3D space.
export function StarBody({ citizen, isSelf, selected, onSelect }: Props) {
  const ring = useRef<THREE.Mesh>(null);
  const survivorRing = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = citizen.user.color;
  const role = citizen.user.role;
  const isSurvivor = role === "survivor";
  const isCaregiver = role === "caregiver";
  const size = isSelf ? 2.1 : 1.7;

  const auraColor = isSurvivor ? "#ffd27a" : isCaregiver ? "#9bb8ff" : color;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (ring.current) {
      ring.current.rotation.z = t * 0.3;
      const target = selected || hovered ? 1 : 0;
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity += (target * 0.5 - m.opacity) * 0.1;
    }

    if (survivorRing.current) {
      survivorRing.current.rotation.z = t * 0.18;
      const pulse = 0.28 + Math.sin(t * 1.1) * 0.14;
      const m = survivorRing.current.material as THREE.MeshBasicMaterial;
      m.opacity = pulse;
    }
  });

  return (
    <group>
      <pointLight
        color={auraColor}
        intensity={isSelf ? 3.2 : isSurvivor ? 3.0 : 2.2}
        distance={isSurvivor ? 90 : 70}
        decay={1.4}
      />

      <Sun color={color} size={size} />

      {/* Survivor: slow golden outer ring that breathes */}
      {isSurvivor && (
        <mesh ref={survivorRing} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 2.6, size * 2.85, 48]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Selection / hover ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.9, size * 2.1, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Invisible interaction target */}
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
        <div className={`star-label ${isSelf ? "star-label--self" : ""} ${selected ? "star-label--on" : ""} ${isSurvivor ? "star-label--survivor" : ""}`}>
          {citizen.user.name}
          {isSelf && <span className="star-label__you">you</span>}
          {isSurvivor && !isSelf && <span className="star-label__risen">★</span>}
        </div>
      </Html>
    </group>
  );
}
