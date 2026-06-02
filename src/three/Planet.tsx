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

  useFrame((_, delta) => {
    if (body.current) body.current.rotation.y += delta * 0.06;
  });

  return (
    <group>
      <mesh ref={body}>
        <sphereGeometry args={[size, 96, 96]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={SURFACE_VERT}
          fragmentShader={SURFACE_FRAG}
        />
      </mesh>

      {/* Atmosphere — glows on the lit limb */}
      <mesh scale={1.16}>
        <sphereGeometry args={[size, 48, 48]} />
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
varying vec3 vPos;
varying vec3 vWNormal;
varying vec3 vWPos;
${NOISE_GLSL}
void main(){
  vec3 p = normalize(vPos);
  vec3 sp = p * 1.8 + uSeed;
  float n = fbm(sp);

  vec3 col;
  if(uType < 0.5){
    // Gas giant — latitude bands warped by turbulence.
    float bands = sin((p.y * 7.0 + n * 1.4) * 3.14159);
    col = mix(uColor, uAccent, smoothstep(0.3, 0.7, bands * 0.5 + 0.5));
    col += vec3(0.05) * fbm(sp * 3.0);
  } else if(uType < 1.5){
    // Rocky — continents and seas.
    float land = smoothstep(0.0, 0.22, n);
    col = mix(uColor * 0.65, uAccent, land);
    col += fbm(sp * 4.5) * 0.12;
  } else {
    // Icy — bright fractured crust.
    float cr = fbm(sp * 3.2);
    col = mix(uColor, vec3(0.92, 0.96, 1.0), smoothstep(0.1, 0.6, cr));
  }

  // Lit by this system's own star → a real terminator.
  vec3 N = normalize(vWNormal);
  vec3 L = normalize(uStarPos - vWPos);
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float light = 0.10 + 0.95 * diff;
  col *= light;

  // Atmospheric scatter brightening the lit edge.
  vec3 V = normalize(cameraPosition - vWPos);
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
