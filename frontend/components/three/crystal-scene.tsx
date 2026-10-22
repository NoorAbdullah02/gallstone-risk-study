"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron } from "@react-three/drei";
import type { Group } from "three";

function Crystals() {
  const group = useRef<Group>(null);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x += delta * 0.03;
  });

  const satellites = useMemo(
    () => [
      { pos: [1.6, 0.6, -0.4] as const, scale: 0.42, color: "#7c3aed", speed: 1.4 },
      { pos: [-1.5, -0.5, 0.3] as const, scale: 0.32, color: "#2dd4bf", speed: 1.8 },
      { pos: [0.3, 1.3, 0.6] as const, scale: 0.26, color: "#a78bfa", speed: 2.1 },
      { pos: [-0.9, 1.0, -0.6] as const, scale: 0.2, color: "#14b8a6", speed: 2.6 },
    ],
    []
  );

  return (
    <group ref={group}>
      <Icosahedron args={[1, 0]}>
        <meshStandardMaterial
          color="#0ea5a0"
          emissive="#0d9488"
          emissiveIntensity={0.35}
          roughness={0.15}
          metalness={0.4}
          flatShading
        />
      </Icosahedron>
      {satellites.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={1.1} floatIntensity={1.4}>
          <Icosahedron args={[s.scale, 0]} position={s.pos}>
            <meshStandardMaterial
              color={s.color}
              emissive={s.color}
              emissiveIntensity={0.4}
              roughness={0.2}
              metalness={0.3}
              flatShading
            />
          </Icosahedron>
        </Float>
      ))}
    </group>
  );
}

export default function CrystalScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 2, 4]} intensity={30} color="#2dd4bf" />
      <pointLight position={[-3, -2, -2]} intensity={20} color="#a78bfa" />
      <Crystals />
    </Canvas>
  );
}
