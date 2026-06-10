import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The North Star — the one fixed point above the entire shared galaxy.
// It physically brightens as beacons of hope accumulate across all citizens,
// so the whole galaxy can see, at a glance, how much hope is in the world.
const POSITION: readonly [number, number, number] = [0, 240, -60];
const COLOR = new THREE.Color("#cfe6ff");

export function NorthStar({ hopeCount, onOpen }: { hopeCount: number; onOpen: () => void }) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const rays = useRef<THREE.Mesh>(null);

  // 1 → ~2.2 brightness multiplier as hope accumulates; saturates at 60 beacons.
  const hope = Math.min(hopeCount, 60) / 60;
  const intensity = 1 + hope * 1.2;

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.8) * 0.06 * intensity;
    if (core.current) core.current.scale.setScalar(pulse);
    if (halo.current) {
      halo.current.scale.setScalar(pulse * (2.6 + hope * 1.4));
      haloMaterial.opacity = (0.12 + hope * 0.1) * (0.85 + Math.sin(t * 0.8) * 0.15);
    }
    if (rays.current) rays.current.rotation.z = t * 0.05;
  });

  return (
    <group position={POSITION as [number, number, number]}>
      {/* Clickable core */}
      <mesh
        ref={core}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color={COLOR} toneMapped={false} />
      </mesh>

      {/* Soft halo, grows with hope */}
      <mesh ref={halo}>
        <sphereGeometry args={[3.2, 24, 24]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>

      {/* Four-point star rays */}
      <mesh ref={rays}>
        <planeGeometry args={[40 + hope * 24, 1.1]} />
        <meshBasicMaterial
          color={COLOR}
          transparent
          opacity={0.35 + hope * 0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[40 + hope * 24, 1.1]} />
        <meshBasicMaterial
          color={COLOR}
          transparent
          opacity={0.35 + hope * 0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Light cast over the galaxy below */}
      <pointLight color={COLOR} intensity={intensity * 0.6} distance={500} decay={1.6} />
    </group>
  );
}
