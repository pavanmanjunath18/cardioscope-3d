import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  patients,
  pcaInfo,
  patientAxisPosition,
  clusterAssignments,
  riskColor,
  patientRisk,
  CLUSTER_COLORS,
  DISEASE_COLOR,
  HEALTHY_COLOR,
  type Vec3,
} from '../lib/analytics';
import type { ColorMode, PosMode, Axes } from '../types';

interface Props {
  colorMode: ColorMode;
  posMode: PosMode;
  axes: Axes;
  k: number;
  hovered: number | null;
  setHovered: (i: number | null) => void;
  /** Patients to keep bright and slightly enlarged (e.g. the user's nearest neighbours). */
  emphasized: ReadonlySet<number>;
  /** Shared buffer of live (animated) xyz positions, read by tooltips and neighbour links. */
  liveRef: RefObject<Float32Array>;
  reducedMotion: boolean;
}

/** Target positions for every patient given the current view. */
function useTargets(posMode: PosMode, axes: Axes): Vec3[] {
  return useMemo(() => {
    if (posMode === 'pca') return pcaInfo.positions;
    return patients.map((_, i) => [
      patientAxisPosition(i, axes.x),
      patientAxisPosition(i, axes.y),
      patientAxisPosition(i, axes.z),
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

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export default function PatientCloud({
  colorMode, posMode, axes, k, hovered, setHovered, emphasized, liveRef, reducedMotion,
}: Props) {
  const targets = useTargets(posMode, axes);
  const colors = useColors(colorMode, k);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Only rewrite instance buffers while something is actually changing.
  const dirty = useRef(true);

  useEffect(() => {
    dirty.current = true;
  }, [targets, colors, hovered, emphasized]);

  useFrame(() => {
    const mesh = meshRef.current;
    const cur = liveRef.current;
    if (!mesh || !dirty.current) return;
    const ease = reducedMotion ? 1 : 0.12;
    let moving = false;
    for (let i = 0; i < targets.length; i++) {
      for (let a = 0; a < 3; a++) {
        const d = targets[i][a] - cur[i * 3 + a];
        if (Math.abs(d) > 1e-3) {
          cur[i * 3 + a] += d * ease;
          moving = true;
        } else {
          cur[i * 3 + a] = targets[i][a];
        }
      }
      const isHover = hovered === i;
      const isEmph = emphasized.has(i);
      const s = isHover ? 2.1 : isEmph ? 1.5 : hovered === null ? 1 : 0.72;
      dummy.position.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const dim = hovered !== null && !isHover && !isEmph;
      mesh.setColorAt(i, dim ? tmpColor.copy(colors[i]).multiplyScalar(0.35) : colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (!moving) dirty.current = false;
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
      <meshStandardMaterial roughness={0.35} metalness={0.1} emissiveIntensity={0.55} toneMapped={false} />
    </instancedMesh>
  );
}
