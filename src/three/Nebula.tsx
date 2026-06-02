import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./shaders/noise";

// A vast, faint cloud of colour wrapping the whole scene — the thing that turns
// a black void into deep space. Very low opacity so it reads as distant haze,
// never as a wall.
export function Nebula() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#3a1d6e") }, // violet
      uColorB: { value: new THREE.Color("#13294b") }, // midnight blue
    }),
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={680}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

const NEBULA_VERT = /* glsl */ `
varying vec3 vPos;
void main(){
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NEBULA_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vPos;
${NOISE_GLSL}
void main(){
  vec3 p = normalize(vPos);
  float clouds = fbm(p * 2.2 + vec3(uTime * 0.01));
  clouds = smoothstep(0.1, 0.9, clouds * 0.5 + 0.5);
  float veins = fbm(p * 5.0 - vec3(uTime * 0.015));
  vec3 col = mix(uColorB, uColorA, clouds);
  col += uColorA * pow(max(veins, 0.0), 2.0) * 0.3;
  // Fade so it's only a whisper of colour.
  float a = clouds * 0.16 + 0.02;
  gl_FragColor = vec4(col, a);
}
`;
