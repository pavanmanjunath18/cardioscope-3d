import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { riskColor } from '../lib/analytics';

function heartGeometry() {
  const s = new THREE.Shape();
  const x = 0, y = 0;
  s.moveTo(x + 0.5, y + 0.5);
  s.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y);
  s.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7);
  s.bezierCurveTo(x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9);
  s.bezierCurveTo(x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7);
  s.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y);
  s.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.55,
    bevelEnabled: true,
    bevelSegments: 8,
    bevelSize: 0.32,
    bevelThickness: 0.32,
    curveSegments: 24,
  });
  geo.center();
  geo.rotateZ(Math.PI); // apex pointing down
  return geo;
}

/** Double-beat (lub-dub) envelope over a normalized phase [0,1). */
function lubDub(phase: number) {
  const lub = Math.exp(-Math.pow((phase - 0.10) / 0.05, 2));
  const dub = 0.55 * Math.exp(-Math.pow((phase - 0.30) / 0.05, 2));
  return lub + dub;
}

function HeartMesh({ risk }: { risk: number }) {
  const geo = useMemo(() => heartGeometry(), []);
  const mesh = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const color = useMemo(() => new THREE.Color(riskColor(risk)), [risk]);

  // bpm rises with risk; 64 at zero risk → ~112 at max.
  const bpm = 64 + risk * 48;

  useFrame((_, dt) => {
    phase.current = (phase.current + (bpm / 60) * dt) % 1;
    const b = lubDub(phase.current);
    const amp = 0.10 + risk * 0.07; // higher risk beats harder
    const s = 1 + b * amp;
    if (mesh.current) {
      mesh.current.scale.setScalar(s);
      mesh.current.rotation.y += dt * 0.4;
      const m = mesh.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.25 + b * (0.4 + risk * 0.6);
    }
  });

  return (
    <mesh ref={mesh} geometry={geo}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.28}
        metalness={0.15}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function Heart({ risk }: { risk: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 5.4], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 5]} intensity={1.3} />
      <pointLight position={[-4, -2, 2]} intensity={0.5} color="#5EEAD4" />
      <HeartMesh risk={risk} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={0.7} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
