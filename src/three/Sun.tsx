import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./shaders/noise";

// The user's star, rendered as living plasma: a turbulent emissive surface, a
// fresnel corona, and (with bloom) a genuine glow. Tinted by the user's chosen
// colour so it stays personal while looking real.
export function Sun({ color, size = 2.1 }: { color: string; size?: number }) {
  const core = useRef<THREE.Mesh>(null);
  const uColor = useMemo(() => new THREE.Color(color), [color]);

  const coreUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: uColor } }),
    [uColor],
  );
  const coronaUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: uColor } }),
    [uColor],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    coreUniforms.uTime.value = t;
    coronaUniforms.uTime.value = t;
    if (core.current) core.current.rotation.y = t * 0.04;
  });

  return (
    <group>
      {/* Plasma core */}
      <mesh ref={core}>
        <sphereGeometry args={[size, 128, 128]} />
        <shaderMaterial
          uniforms={coreUniforms}
          vertexShader={CORE_VERT}
          fragmentShader={CORE_FRAG}
        />
      </mesh>

      {/* Corona — a fresnel shell that flares at the limb */}
      <mesh scale={1.45}>
        <sphereGeometry args={[size, 64, 64]} />
        <shaderMaterial
          uniforms={coronaUniforms}
          vertexShader={CORONA_VERT}
          fragmentShader={CORONA_FRAG}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

const CORE_VERT = /* glsl */ `
varying vec3 vPos;
void main(){
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORE_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vPos;
${NOISE_GLSL}
void main(){
  vec3 p = normalize(vPos);
  float flow = uTime * 0.12;
  float n  = fbm(p * 2.0 + vec3(flow));
  float n2 = fbm(p * 5.5 - vec3(flow * 1.7));
  float heat = clamp((n * 0.6 + n2 * 0.4) * 0.5 + 0.5, 0.0, 1.0);

  vec3 deep = uColor * 0.35;
  vec3 mid  = uColor;
  vec3 hot  = mix(uColor, vec3(1.0), 0.75);

  vec3 col = mix(deep, mid, smoothstep(0.2, 0.55, heat));
  col = mix(col, hot, smoothstep(0.55, 0.92, heat));
  col += hot * pow(max(heat, 0.0), 3.0) * 0.5; // bright granules
  gl_FragColor = vec4(col, 1.0);
}
`;

const CORONA_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
void main(){
  vNormal = mat3(modelMatrix) * normal;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORONA_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vWorld;
${NOISE_GLSL}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), V)), 2.4);
  float flicker = 0.85 + 0.15 * fbm(normalize(vWorld) * 3.0 + vec3(uTime * 0.4));
  vec3 hot = mix(uColor, vec3(1.0), 0.4);
  gl_FragColor = vec4(hot, fres * flicker * 0.9);
}
`;
