import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { pcaProjectInput, axisPosition, riskColor, type Vec3 } from '../lib/analytics';
import type { PosMode, Axes } from '../types';
import type { Feature } from '../data/patients';

interface Props {
  input: Record<Feature, number>;
  risk: number;
  posMode: PosMode;
  axes: Axes;
}

export default function UserMarker({ input, risk, posMode, axes }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const target: Vec3 =
    posMode === 'pca'
      ? pcaProjectInput(input)
      : [axisPosition(axes.x, input[axes.x]), axisPosition(axes.y, input[axes.y]), axisPosition(axes.z, input[axes.z])];

  const color = riskColor(risk);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.lerp(_tv.set(target[0], target[1], target[2]), 0.1);
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 3) * 0.12;
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.2;
      const rp = (Math.sin(t * 2.4) + 1) / 2;
      ringRef.current.scale.setScalar(1 + rp * 0.5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 - rp * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.03, 12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={14} position={[0, 0.7, 0]} pointerEvents="none">
        <div className="whitespace-nowrap rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur">
          YOU · {(risk * 100).toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

const _tv = new THREE.Vector3();
