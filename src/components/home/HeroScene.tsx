"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import type { Group } from "three";

/**
 * 3D hero — a slowly turning gold band with a bezel-set stone, lit like a
 * studio shot. Local lighting only (no HDRI fetch) so it works offline.
 */
function GoldPiece({ still }: { still: boolean }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={group} rotation={[0.45, 0.6, 0.1]}>
      {/* Band — lower metalness + emissive lift so gold reads on the ivory bg */}
      <mesh castShadow>
        <torusGeometry args={[1.15, 0.16, 48, 96]} />
        <meshStandardMaterial
          color="#e2b45c"
          metalness={0.75}
          roughness={0.28}
          emissive="#8a5106"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* Bezel */}
      <mesh position={[0, 1.31, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.18, 32]} />
        <meshStandardMaterial
          color="#d8a848"
          metalness={0.75}
          roughness={0.32}
          emissive="#8a5106"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Stone */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <octahedronGeometry args={[0.26, 0]} />
        <meshPhysicalMaterial
          color="#2f6d4f"
          metalness={0.1}
          roughness={0.05}
          transmission={0.7}
          thickness={0.6}
          ior={1.6}
        />
      </mesh>
    </group>
  );
}

export function HeroScene() {
  const reduce = useReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.6, 5.2], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      className="!touch-pan-y"
      aria-label="Rotating gold ring with an emerald stone"
      role="img"
    >
      {/* Studio lighting tuned for the ivory (light) backdrop */}
      <hemisphereLight args={["#fffaf0", "#c9b98f", 1.1]} />
      <ambientLight intensity={0.7} />
      <spotLight position={[6, 8, 4]} angle={0.4} penumbra={0.8} intensity={260} castShadow />
      <spotLight position={[-6, 3, -2]} angle={0.5} penumbra={1} intensity={110} color="#ffffff" />
      <pointLight position={[0, -3, 3]} intensity={26} color="#c07f0e" />

      <Suspense fallback={null}>
        {reduce ? (
          <GoldPiece still />
        ) : (
          <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.9}>
            <GoldPiece still={false} />
          </Float>
        )}
        <ContactShadows position={[0, -2.1, 0]} opacity={0.28} scale={8} blur={2.8} far={3} color="#191612" />
      </Suspense>
    </Canvas>
  );
}
