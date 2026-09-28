import { Suspense, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Text, Stars, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import interFont from '@fontsource/inter/files/inter-latin-500-normal.woff?url';
import PatientCloud from './PatientCloud';
import UserMarker from './UserMarker';
import { patients, pcaInfo, axisPosition, patientRisk, RANGES, type Input } from '../lib/analytics';
import { FEATURE_META } from '../data/features';
import type { ColorMode, PosMode, Axes } from '../types';
import type { Feature } from '../data/patients';

interface Props {
  colorMode: ColorMode;
  posMode: PosMode;
  axes: Axes;
  k: number;
  showUser: boolean;
  input: Input;
  userRisk: number;
  /** Indices of the cohort patients nearest to the user's input. */
  neighbors: number[];
  /** Screen-space shift (px) that re-centres the scene in the area not covered by the HUD. */
  viewOffset: { x: number; y: number };
  /** Size (px) of the screen area left visible by the HUD; null until it has been measured. */
  frame: { visibleW: number; visibleH: number } | null;
  reducedMotion: boolean;
}

// The frame is a box anchored at its (-L,-L,-L) corner; the data fills [-7.5, 7.5]³.
const L = 8.6;

type AxisKey = 'x' | 'y' | 'z';
const AXIS_DIR: Record<AxisKey, Vec> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
// Where tick labels sit relative to their axis, pushed outward from the box.
const TICK_OFFSET: Record<AxisKey, Vec> = { x: [0, -0.5, -0.35], y: [-0.7, 0, -0.35], z: [-0.7, -0.5, 0] };
type Vec = [number, number, number];

function pointOnAxis(axis: AxisKey, t: number): Vec {
  const d = AXIS_DIR[axis];
  return [d[0] ? t : -L, d[1] ? t : -L, d[2] ? t : -L];
}

function ticksFor(feature: Feature): { pos: number; label: string }[] {
  const m = FEATURE_META[feature];
  if (m.kind === 'categorical') {
    return m.options!
      .filter((o) => o.value >= RANGES[feature].lo && o.value <= RANGES[feature].hi)
      .map((o) => ({ pos: axisPosition(feature, o.value), label: o.label }));
  }
  const { lo, hi } = RANGES[feature];
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return [lo, (lo + hi) / 2, hi].map((v) => ({ pos: axisPosition(feature, v), label: fmt(v) }));
}

function AxisLine({ axis, label, ticks }: { axis: AxisKey; label: string; ticks: { pos: number; label: string }[] }) {
  const labelPos = pointOnAxis(axis, L * 1.1);
  const off = TICK_OFFSET[axis];
  const positions = useMemo(
    () => new Float32Array([...pointOnAxis(axis, -L), ...pointOnAxis(axis, L)]),
    [axis],
  );
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2DD4BF" transparent opacity={0.35} />
      </line>
      <Billboard position={labelPos}>
        <Text font={interFont} fontSize={0.42} color="#5EEAD4" anchorX="center" anchorY="middle">
          {label}
        </Text>
      </Billboard>
      {ticks.map((t) => {
        const p = pointOnAxis(axis, t.pos);
        return (
          <Billboard key={t.label} position={[p[0] + off[0], p[1] + off[1], p[2] + off[2]]}>
            <Text font={interFont} fontSize={0.26} color="#9CA3AF" anchorX="center" anchorY="middle">
              {t.label}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}

function AxesFrame({ posMode, axes }: { posMode: PosMode; axes: Axes }) {
  const pc = (i: number) => `PC${i + 1} · ${(pcaInfo.explained[i] * 100).toFixed(0)}%`;
  const keys: AxisKey[] = ['x', 'y', 'z'];
  return (
    <group>
      {keys.map((a, i) => (
        <AxisLine
          key={a}
          axis={a}
          label={posMode === 'pca' ? pc(i) : FEATURE_META[axes[a]].label}
          ticks={posMode === 'pca' ? [] : ticksFor(axes[a])}
        />
      ))}
    </group>
  );
}

function HoverTooltip({ index, liveRef, portal }: {
  index: number;
  liveRef: RefObject<Float32Array>;
  portal: RefObject<HTMLDivElement | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const p = patients[index];
  const risk = patientRisk[index];
  // Follow the point's animated position, not its destination.
  useFrame(() => {
    const b = liveRef.current;
    group.current?.position.set(b[index * 3], b[index * 3 + 1], b[index * 3 + 2]);
  });
  return (
    <group ref={group}>
      <Html center pointerEvents="none" zIndexRange={[40, 0]} portal={portal as RefObject<HTMLElement>}>
        <div className="w-44 -translate-y-[4.5rem] rounded-xl border border-vital-400/30 bg-black/85 p-2.5 text-[11px] leading-tight text-gray-200 shadow-xl backdrop-blur">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-display font-semibold text-white">Patient #{index + 1}</span>
            <span className={p.disease ? 'text-risk-high' : 'text-risk-low'}>
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
    </group>
  );
}

/** Dashed-looking links from the user marker to their nearest cohort neighbours. */
function NeighborLinks({ neighbors, liveRef, userPosRef }: {
  neighbors: number[];
  liveRef: RefObject<Float32Array>;
  userPosRef: RefObject<THREE.Vector3>;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(neighbors.length * 6), 3));
    return g;
  }, [neighbors.length]);
  useFrame(() => {
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const u = userPosRef.current, b = liveRef.current;
    neighbors.forEach((n, i) => {
      attr.setXYZ(i * 2, u.x, u.y, u.z);
      attr.setXYZ(i * 2 + 1, b[n * 3], b[n * 3 + 1], b[n * 3 + 2]);
    });
    attr.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#E5E7EB" transparent opacity={0.35} />
    </lineSegments>
  );
}

/** Shift the rendered frame so the scene centres in the part of the screen the HUD leaves free. */
function ViewOffset({ x, y }: { x: number; y: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    camera.setViewOffset(width, height, x, y, width, height);
    camera.updateProjectionMatrix();
    return () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, width, height, x, y]);
  return null;
}

/**
 * Pull the camera back once, at start-up, so the whole frame fits in the part of the
 * screen the HUD leaves visible (narrow windows, phone bottom sheet). Never fights the
 * user's own zooming afterwards.
 */
function InitialFraming({ frame }: { frame: Props['frame'] }) {
  const camera = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);
  const done = useRef(false);
  useLayoutEffect(() => {
    if (done.current || !frame || !height || frame.visibleW <= 0 || frame.visibleH <= 0) return;
    done.current = true;
    const k = Math.min(2.6, Math.max(1, height / frame.visibleH, (1.2 * height) / frame.visibleW));
    camera.position.multiplyScalar(k);
  }, [camera, height, frame]);
  return null;
}

/** Fog tracks the camera distance, so zooming out never fades the cloud away. */
function AdaptiveFog() {
  const fog = useRef<THREE.Fog>(null);
  useFrame(({ camera }) => {
    if (!fog.current) return;
    const d = camera.position.length();
    fog.current.near = d + 2;
    fog.current.far = d + 26;
  });
  return <fog ref={fog} attach="fog" args={['#070809', 22, 46]} />;
}

export default function Scene(props: Props) {
  const { colorMode, posMode, axes, k, showUser, input, userRisk, neighbors, viewOffset, frame, reducedMotion } = props;
  const [hovered, setHovered] = useState<number | null>(null);
  const live = useRef(new Float32Array(patients.length * 3));
  const userPos = useRef(new THREE.Vector3());
  // Stable mount point for drei <Html> overlays. Without it drei re-targets after the
  // canvas wires up its events, and the re-created overlay root is wiped by the old one's unmount.
  const overlay = useRef<HTMLDivElement>(null);
  const emphasized = useMemo(() => new Set(showUser ? neighbors : []), [neighbors, showUser]);

  // Keyboard access: ←/→ step through patients, Esc clears.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setHovered((h) => (h === null ? (step > 0 ? 0 : patients.length - 1) : (h + step + patients.length) % patients.length));
    } else if (e.key === 'Escape') {
      setHovered(null);
    }
  };

  return (
    // `isolate` keeps drei's <Html> overlays in their own stacking context, under the HUD.
    <div
      className="absolute inset-0 isolate outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vital-400/40"
      tabIndex={0}
      role="application"
      aria-label="3D patient cloud. Use left and right arrow keys to inspect patients one by one, Escape to clear."
      onKeyDown={onKeyDown}
      onPointerLeave={() => setHovered(null)}
    >
      <Canvas
        camera={{ position: [12, 9, 14], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={() => setHovered(null)}
      >
        <ViewOffset x={viewOffset.x} y={viewOffset.y} />
        <InitialFraming frame={frame} />
        <color attach="background" args={['#070809']} />
        <AdaptiveFog />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 12, 8]} intensity={1.1} />
        <pointLight position={[-10, -6, -8]} intensity={0.4} color="#2DD4BF" />

        <Stars radius={60} depth={40} count={1400} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.6} />

        <gridHelper args={[L * 2, 16, '#1b3a37', '#0f1f1d']} position={[0, -L, 0]} />
        {/* drei <Text> loads its font asynchronously; keep it in its own non-blocking boundary
            so the cohort renders immediately. */}
        <Suspense fallback={null}>
          <AxesFrame posMode={posMode} axes={axes} />
        </Suspense>
        <PatientCloud
          colorMode={colorMode}
          posMode={posMode}
          axes={axes}
          k={k}
          hovered={hovered}
          setHovered={setHovered}
          emphasized={emphasized}
          liveRef={live}
          reducedMotion={reducedMotion}
        />
        {showUser && (
          <>
            <UserMarker input={input} risk={userRisk} posMode={posMode} axes={axes} livePosRef={userPos} reducedMotion={reducedMotion} portal={overlay} />
            <NeighborLinks neighbors={neighbors} liveRef={live} userPosRef={userPos} />
          </>
        )}
        {hovered !== null && <HoverTooltip index={hovered} liveRef={live} portal={overlay} />}

        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={56}
          autoRotate={hovered === null && !reducedMotion}
          autoRotateSpeed={0.45}
          makeDefault
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.25} luminanceSmoothing={0.9} intensity={0.9} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
