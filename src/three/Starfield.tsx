import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A deep field of stars with real variety: a range of colour temperatures
// (cool blue-white through warm amber), differing brightness, and a slow
// independent twinkle. The brightest few carry diffraction spikes, the way
// they do in real long-exposure photographs. Round and soft, never square.
export function Starfield({ count = 2600 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, colors, sizes, phases, spikes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const spikes = new Float32Array(count);
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
      const size = Math.pow(Math.random(), 3) * 5 + 0.6;
      sizes[i] = size;
      phases[i] = Math.random() * Math.PI * 2;
      // Only genuinely bright stars earn diffraction spikes.
      spikes[i] = size > 4.2 ? 1 : 0;
    }
    return { positions, colors, sizes, phases, spikes };
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
        <bufferAttribute attach="attributes-aSpike" count={count} array={spikes} itemSize={1} />
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

// The galactic river: thousands of tiny faint stars and warm dust pinpoints
// concentrated along one tilted plane across the whole sky. A single extra
// draw call, static (no per-frame work beyond inheriting scene rotation).
export function MilkyWay({ count = 4200 }: { count?: number }) {
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const c = new THREE.Color();
    // Tilt of the band so it cuts diagonally across the sky.
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0, 0.28));
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const r = 380 + Math.random() * 360;
      const theta = Math.random() * Math.PI * 2;
      // Gaussian-ish spread around the band plane — dense core, soft edges.
      const spread = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      v.set(Math.cos(theta) * r, spread * 52, Math.sin(theta) * r).applyQuaternion(tilt);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;

      // Mostly faint warm-white dust, occasional cool blue and amber sparks.
      const t = Math.random();
      if (t < 0.7) c.setHSL(0.10, 0.12 + Math.random() * 0.1, 0.55 + Math.random() * 0.25);
      else if (t < 0.88) c.setHSL(0.6, 0.3, 0.7 + Math.random() * 0.2);
      else c.setHSL(0.07, 0.5, 0.6 + Math.random() * 0.2);
      const dim = 0.25 + Math.random() * 0.5;
      colors[i * 3] = c.r * dim;
      colors[i * 3 + 1] = c.g * dim;
      colors[i * 3 + 2] = c.b * dim;
      sizes[i] = Math.pow(Math.random(), 2.5) * 2.2 + 0.4;
    }
    return { positions, colors, sizes };
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const DUST_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const DUST_FRAG = /* glsl */ `
varying vec3 vColor;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float alpha = smoothstep(0.5, 0.0, length(uv));
  alpha *= alpha;
  gl_FragColor = vec4(vColor, alpha * 0.85);
}
`;

const STAR_VERT = /* glsl */ `
uniform float uTime;
attribute float aSize;
attribute float aPhase;
attribute float aSpike;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
varying float vSpike;
void main(){
  vColor = aColor;
  vSpike = aSpike;
  vTwinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aPhase);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Spiked stars get extra canvas room so the flare has space to draw.
  gl_PointSize = aSize * (1.0 + aSpike * 1.6) * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;
varying float vSpike;
void main(){
  // Round, soft falloff.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.0, d);
  alpha *= alpha;
  // Diffraction spikes — a thin four-pointed cross on the brightest stars.
  if (vSpike > 0.5) {
    float core = smoothstep(0.35, 0.0, d);
    alpha *= core; // shrink the disc so the flare dominates
    float fall = smoothstep(0.5, 0.05, d);
    float cross_ = max(
      smoothstep(0.030, 0.0, abs(uv.x)),
      smoothstep(0.030, 0.0, abs(uv.y))
    );
    alpha = max(alpha, cross_ * fall * fall * 0.9);
  }
  gl_FragColor = vec4(vColor * vTwinkle, alpha * vTwinkle);
}
`;
