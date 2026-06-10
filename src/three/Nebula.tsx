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
      uColorC: { value: new THREE.Color("#5e2447") }, // dusty rose
      uColorD: { value: new THREE.Color("#caa470") }, // galactic dust amber
    }),
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={680}>
      <sphereGeometry args={[1, 24, 24]} />
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
uniform vec3 uColorC;
uniform vec3 uColorD;
varying vec3 vPos;
${NOISE_GLSL}
void main(){
  vec3 p = normalize(vPos);
  float clouds = fbm(p * 2.2 + vec3(uTime * 0.01));
  clouds = smoothstep(0.1, 0.9, clouds * 0.5 + 0.5);
  float veins = fbm(p * 5.0 - vec3(uTime * 0.015));
  vec3 col = mix(uColorB, uColorA, clouds);
  col += uColorA * pow(max(veins, 0.0), 2.0) * 0.3;
  // A second hue region so the sky isn't one uniform violet wash.
  float warm = fbm(p * 1.4 + vec3(7.3, 0.0, 2.1));
  col = mix(col, uColorC, smoothstep(0.25, 0.75, warm) * 0.45);

  // Faint dust haze along the Milky Way plane (matches the band of stars).
  vec3 bandNormal = normalize(vec3(sin(0.28), cos(0.42) * cos(0.28), -sin(0.42)));
  float band = exp(-pow(dot(p, bandNormal) * 4.2, 2.0));
  float bandDust = fbm(p * 3.4 + vec3(3.0));
  col += uColorD * band * (0.35 + 0.4 * max(bandDust, 0.0)) * 0.22;

  // Fade so it's only a whisper of colour.
  float a = clouds * 0.16 + band * 0.06 + 0.02;
  gl_FragColor = vec4(col, a);
}
`;
