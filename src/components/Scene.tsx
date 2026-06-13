import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Text, Stars, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import PatientCloud from './PatientCloud';
import UserMarker from './UserMarker';
import { patients, pcaInfo, axisPosition, patientRisk } from '../lib/analytics';
import { FEATURE_META } from '../data/features';
import type { ColorMode, PosMode, Axes } from '../types';
import type { Feature } from '../data/patients';

interface Props {
  colorMode: ColorMode;
  posMode: PosMode;
  axes: Axes;
  k: number;
  hovered: number | null;
  setHovered: (i: number | null) => void;
  showUser: boolean;
  input: Record<Feature, number>;
  userRisk: number;
}

const AXIS_LEN = 8.6;

function AxisLine({ dir, label }: { dir: [number, number, number]; label: string }) {
  const end = dir.map((d) => d * AXIS_LEN) as [number, number, number];
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, ...end]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2DD4BF" transparent opacity={0.28} />
      </line>
      <Billboard position={[end[0] * 1.06, end[1] * 1.06 + (dir[1] ? 0.3 : 0), end[2] * 1.06]}>
        <Text fontSize={0.42} color="#5EEAD4" anchorX="center" anchorY="middle">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

function AxesFrame({ posMode, axes }: { posMode: PosMode; axes: Axes }) {
  const labels =
    posMode === 'pca'
      ? { x: `PC1 · ${(pcaInfo.explained[0] * 100).toFixed(0)}%`, y: `PC2 · ${(pcaInfo.explained[1] * 100).toFixed(0)}%`, z: `PC3 · ${(pcaInfo.explained[2] * 100).toFixed(0)}%` }
      : { x: FEATURE_META[axes.x].label, y: FEATURE_META[axes.y].label, z: FEATURE_META[axes.z].label };
  return (
    <group>
      <AxisLine dir={[1, 0, 0]} label={labels.x} />
      <AxisLine dir={[0, 1, 0]} label={labels.y} />
      <AxisLine dir={[0, 0, 1]} label={labels.z} />
      <gridHelper args={[AXIS_LEN * 2, 20, '#123', '#0d1b1a']} position={[0, -AXIS_LEN, 0]} />
    </group>
  );
}

function HoverTooltip({ index, posMode, axes }: { index: number; posMode: PosMode; axes: Axes }) {
  const p = patients[index];
  const pos =
    posMode === 'pca'
      ? pcaInfo.positions[index]
      : ([axisPosition(axes.x, p[axes.x]), axisPosition(axes.y, p[axes.y]), axisPosition(axes.z, p[axes.z])] as [number, number, number]);
  const risk = patientRisk[index];
  return (
    <Html position={pos} center distanceFactor={16} pointerEvents="none" zIndexRange={[40, 0]}>
      <div className="w-40 -translate-y-6 rounded-xl border border-vital-400/30 bg-black/85 p-2.5 text-[11px] leading-tight text-gray-200 shadow-xl backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display font-semibold text-white">Patient #{index + 1}</span>
          <span className={p.disease ? 'text-risk-high' : 'text-vital-400'}>
            {p.disease ? 'Disease' : 'Healthy'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px] text-gray-400">
          <span>Age {p.age}</span>
          <span>{p.sex ? 'Male' : 'Female'}</span>
          <span>BP {p.trestbps}</span>
          <span>Chol {p.chol}</span>
          <span>HR {p.thalach}</span>
          <span>Vessels {p.ca}</span>
        </div>
        <div className="mt-1.5 border-t border-white/10 pt-1 text-[10px]">
          Model risk <span className="font-semibold text-white">{(risk * 100).toFixed(0)}%</span>
        </div>
      </div>
    </Html>
  );
}

export default function Scene(props: Props) {
  const { colorMode, posMode, axes, k, hovered, setHovered, showUser, input, userRisk } = props;
  return (
    <Canvas camera={{ position: [12, 9, 14], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#070809']} />
      <fog attach="fog" args={['#070809', 22, 46]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 12, 8]} intensity={1.1} />
      <pointLight position={[-10, -6, -8]} intensity={0.4} color="#2DD4BF" />

      <Stars radius={60} depth={40} count={1400} factor={3} saturation={0} fade speed={0.6} />

      <Suspense fallback={<Html center><span className="text-vital-400 text-xs">loading cohort…</span></Html>}>
        <AxesFrame posMode={posMode} axes={axes} />
        <PatientCloud
          colorMode={colorMode}
          posMode={posMode}
          axes={axes}
          k={k}
          hovered={hovered}
          setHovered={setHovered}
        />
        {showUser && <UserMarker input={input} risk={userRisk} posMode={posMode} axes={axes} />}
        {hovered !== null && <HoverTooltip index={hovered} posMode={posMode} axes={axes} />}
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={34}
        autoRotate={hovered === null}
        autoRotateSpeed={0.45}
        makeDefault
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.25} luminanceSmoothing={0.9} intensity={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
