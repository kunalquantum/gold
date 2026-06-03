import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A deep field of stars with real variety: a range of colour temperatures
// (cool blue-white through warm amber), differing brightness, and a slow
// independent twinkle. Round and soft, never square sprites.
export function Starfield({ count = 2500 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, colors, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Distribute on a large shell, well beyond the galaxy of systems.
      const r = 320 + Math.random() * 420;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Colour temperature: mostly white, some blue, some warm.
      const t = Math.random();
      const hue = t < 0.55 ? 0.6 : t < 0.8 ? 0.6 + Math.random() * 0.05 : 0.08 + Math.random() * 0.06;
      const sat = t < 0.55 ? 0.05 + Math.random() * 0.12 : 0.25 + Math.random() * 0.4;
      c.setHSL(hue, sat, 0.75 + Math.random() * 0.2);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // A few bright stars, many faint ones.
      sizes[i] = Math.pow(Math.random(), 3) * 5 + 0.6;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, colors, sizes, phases };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if (points.current) points.current.rotation.y = state.clock.elapsedTime * 0.004;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const STAR_VERT = /* glsl */ `
uniform float uTime;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vColor = aColor;
  vTwinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aPhase);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;
void main(){
  // Round, soft falloff.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.0, d);
  alpha *= alpha;
  gl_FragColor = vec4(vColor * vTwinkle, alpha * vTwinkle);
}
`;
