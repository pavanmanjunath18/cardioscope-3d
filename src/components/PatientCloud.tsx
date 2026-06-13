import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  patients,
  pcaInfo,
  axisPosition,
  clusterAssignments,
  riskColor,
  patientRisk,
  CLUSTER_COLORS,
  type Vec3,
} from '../lib/analytics';
import type { ColorMode, PosMode, Axes } from '../types';

const DISEASE_COLOR = '#F43F5E';
const HEALTHY_COLOR = '#2DD4BF';

interface Props {
  colorMode: ColorMode;
  posMode: PosMode;
  axes: Axes;
  k: number;
  hovered: number | null;
  setHovered: (i: number | null) => void;
}

/** Target positions for every patient given the current view. */
function useTargets(posMode: PosMode, axes: Axes): Vec3[] {
  return useMemo(() => {
    if (posMode === 'pca') return pcaInfo.positions;
    return patients.map((p) => [
      axisPosition(axes.x, p[axes.x]),
      axisPosition(axes.y, p[axes.y]),
      axisPosition(axes.z, p[axes.z]),
    ]);
  }, [posMode, axes]);
}

function useColors(colorMode: ColorMode, k: number): THREE.Color[] {
  return useMemo(() => {
    if (colorMode === 'diagnosis')
      return patients.map((p) => new THREE.Color(p.disease ? DISEASE_COLOR : HEALTHY_COLOR));
    if (colorMode === 'risk')
      return patientRisk.map((r) => new THREE.Color(riskColor(r)));
    const clusters = clusterAssignments(k);
    return clusters.map((c) => new THREE.Color(CLUSTER_COLORS[c % CLUSTER_COLORS.length]));
  }, [colorMode, k]);
}

export default function PatientCloud({ colorMode, posMode, axes, k, hovered, setHovered }: Props) {
  const targets = useTargets(posMode, axes);
  const colors = useColors(colorMode, k);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Live (animated) positions, lerped toward targets.
  const current = useRef<Vec3[]>(targets.map((t) => [...t] as Vec3));
  const targetVecs = useMemo(() => targets.map((t) => new THREE.Vector3(...t)), [targets]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < targetVecs.length; i++) {
      const cur = current.current[i];
      const tv = targetVecs[i];
      cur[0] += (tv.x - cur[0]) * 0.12;
      cur[1] += (tv.y - cur[1]) * 0.12;
      cur[2] += (tv.z - cur[2]) * 0.12;
      const isHover = hovered === i;
      const s = isHover ? 2.1 : hovered === null ? 1 : 0.72;
      dummy.position.set(cur[0], cur[1], cur[2]);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const col = colors[i];
      if (hovered !== null && !isHover) {
        mesh.setColorAt(i, _tmpColor.copy(col).multiplyScalar(0.35));
      } else {
        mesh.setColorAt(i, col);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, patients.length]}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) setHovered(e.instanceId);
      }}
      onPointerOut={() => setHovered(null)}
    >
      <sphereGeometry args={[0.13, 18, 18]} />
      <meshStandardMaterial
        roughness={0.35}
        metalness={0.1}
        emissiveIntensity={0.55}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

const _tmpColor = new THREE.Color();
