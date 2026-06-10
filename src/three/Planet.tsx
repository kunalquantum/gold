import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./shaders/noise";

export type PlanetType = "gas" | "rocky" | "ice";

interface Props {
  baseColor: string;
  accentColor: string;
  atmoColor: string;
  type: PlanetType;
  seed: number;
  size: number;
  starPos?: [number, number, number]; // world position of the lighting star
}

const TYPE_INDEX: Record<PlanetType, number> = { gas: 0, rocky: 1, ice: 2 };

// A procedurally-surfaced world, lit by the central sun so it shows a genuine
// day/night terminator. Wrapped in a glowing atmosphere. Each one is unique.
export function Planet({
  baseColor,
  accentColor,
  atmoColor,
  type,
  seed,
  size,
  starPos = [0, 0, 0],
}: Props) {
  const body = useRef<THREE.Mesh>(null);
  const star = useMemo(() => new THREE.Vector3(...starPos), [starPos]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(baseColor) },
      uAccent: { value: new THREE.Color(accentColor) },
      uType: { value: TYPE_INDEX[type] },
      uSeed: { value: seed },
      uStarPos: { value: star },
      uTime: { value: 0 },
    }),
    [baseColor, accentColor, type, seed, star],
  );

  const atmoUniforms = useMemo(
    () => ({
      uAtmo: { value: new THREE.Color(atmoColor) },
      uStarPos: { value: star },
    }),
    [atmoColor, star],
  );

  useFrame((state, delta) => {
    if (body.current) body.current.rotation.y += delta * 0.06;
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh ref={body}>
        <sphereGeometry args={[size, 32, 32]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={SURFACE_VERT}
          fragmentShader={SURFACE_FRAG}
        />
      </mesh>

      {/* Atmosphere — glows on the lit limb */}
      <mesh scale={1.16}>
        <sphereGeometry args={[size, 16, 16]} />
        <shaderMaterial
          uniforms={atmoUniforms}
          vertexShader={ATMO_VERT}
          fragmentShader={ATMO_FRAG}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

const SURFACE_VERT = /* glsl */ `
varying vec3 vPos;
varying vec3 vWNormal;
varying vec3 vWPos;
void main(){
  vPos = position;
  vWNormal = mat3(modelMatrix) * normal;
  vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uType;
uniform float uSeed;
uniform vec3 uStarPos;
uniform float uTime;
varying vec3 vPos;
varying vec3 vWNormal;
varying vec3 vWPos;
${NOISE_GLSL}
void main(){
  vec3 p = normalize(vPos);
  vec3 sp = p * 1.8 + uSeed;
  float n = fbm(sp);

  vec3 N = normalize(vWNormal);
  vec3 L = normalize(uStarPos - vWPos);
  vec3 V = normalize(cameraPosition - vWPos);
  float diff = clamp(dot(N, L), 0.0, 1.0);

  vec3 col;
  if(uType < 0.5){
    // Gas giant — latitude bands warped by turbulence, plus one great storm.
    float bands = sin((p.y * 7.0 + n * 1.4) * 3.14159);
    col = mix(uColor, uAccent, smoothstep(0.3, 0.7, bands * 0.5 + 0.5));
    col += vec3(0.05) * fbm(sp * 3.0);
    vec3 stormDir = normalize(vec3(sin(uSeed), 0.22, cos(uSeed)));
    float storm = smoothstep(0.32, 0.05, distance(p, stormDir));
    float swirl = fbm(p * 9.0 + uSeed * 2.0 + vec3(uTime * 0.02));
    col = mix(col, mix(uAccent, vec3(1.0, 0.92, 0.8), 0.35), storm * (0.55 + 0.35 * swirl));
  } else if(uType < 1.5){
    // Rocky — continents and seas, drifting clouds, polar caps, ocean glint.
    float land = smoothstep(0.0, 0.22, n);
    col = mix(uColor * 0.65, uAccent, land);
    col += fbm(sp * 4.5) * 0.12;
    // Polar ice caps, edges roughened by the same terrain noise.
    float cap = smoothstep(0.74, 0.88, abs(p.y) + n * 0.08);
    col = mix(col, vec3(0.93, 0.96, 1.0), cap);
    // Sun glinting off open water.
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
    col += vec3(1.0, 0.95, 0.85) * spec * (1.0 - land) * (1.0 - cap) * diff * 0.6;
    // Cloud layer slowly drifting over everything.
    float cl = fbm(p * 3.4 + uSeed + vec3(uTime * 0.012, 0.0, uTime * 0.009));
    float clouds = smoothstep(0.16, 0.6, cl);
    col = mix(col, vec3(0.98), clouds * 0.55);
  } else {
    // Icy — bright fractured crust with cold blue depths in the cracks.
    float cr = fbm(sp * 3.2);
    col = mix(uColor, vec3(0.92, 0.96, 1.0), smoothstep(0.1, 0.6, cr));
    float crack = smoothstep(0.45, 0.2, abs(fbm(sp * 6.5)));
    col = mix(col, uColor * 0.55, crack * 0.5);
  }

  // Lit by this system's own star → a real terminator.
  float light = 0.10 + 0.95 * diff;
  col *= light;

  // Warm scatter right along the day/night line — sunsets, seen from space.
  float term = smoothstep(0.0, 0.16, diff) * (1.0 - smoothstep(0.16, 0.45, diff));
  col += mix(uAccent, vec3(1.0, 0.55, 0.3), 0.5) * term * 0.18;

  // Atmospheric scatter brightening the lit edge.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uAccent * fres * diff * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`;

const ATMO_VERT = /* glsl */ `
varying vec3 vWNormal;
varying vec3 vWPos;
void main(){
  vWNormal = mat3(modelMatrix) * normal;
  vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uAtmo;
uniform vec3 uStarPos;
varying vec3 vWNormal;
varying vec3 vWPos;
void main(){
  vec3 N = normalize(vWNormal);
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 L = normalize(uStarPos - vWPos);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  float lit = clamp(dot(N, L) + 0.25, 0.0, 1.0);
  gl_FragColor = vec4(uAtmo, fres * lit * 0.95);
}
`;
