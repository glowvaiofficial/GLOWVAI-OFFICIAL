"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// The GLOW VAI hero scene: four skincare products (serum, jar, pump bottle, tube) floating in soft light, droplets rising,
// and a mint scan ring sweeping through them (the face scan idea). Everything is built from code: no model files to license,
// nothing to download but this chunk. Decorative only (the page text carries the meaning).

const BRAND = "#1447E6";
const BRAND_DEEP = "#0B2F9E";
const MINT = "#7CF5C8";
const PEARL = "#F8FAFF";
const INK = "#12161F";

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A label for a product: brand word, product name, a thin accent line. */
function labelTexture(name: string, accent: string, dark = false): THREE.CanvasTexture {
  return canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = dark ? "rgba(12,24,70,0.0)" : "rgba(255,255,255,0.0)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = dark ? "#ffffff" : BRAND;
    ctx.font = "700 58px 'Poppins', 'Segoe UI', Arial, sans-serif";
    ctx.fillText("glowvai", w / 2, h * 0.42);
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - 46, h * 0.5, 92, 5);
    ctx.fillStyle = dark ? "rgba(255,255,255,0.85)" : "rgba(18,22,31,0.78)";
    ctx.font = "500 28px 'Poppins', 'Segoe UI', Arial, sans-serif";
    ctx.fillText(name.toUpperCase(), w / 2, h * 0.62);
  });
}

/** A big soft radial glow, drawn once, used as a backdrop sprite. */
function glowTexture(): THREE.CanvasTexture {
  return canvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(60,110,255,0.55)");
    g.addColorStop(0.45, "rgba(60,110,255,0.18)");
    g.addColorStop(1, "rgba(60,110,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const m = ctx.createRadialGradient(w * 0.68, h * 0.3, 0, w * 0.68, h * 0.3, w * 0.34);
    m.addColorStop(0, "rgba(124,245,200,0.5)");
    m.addColorStop(1, "rgba(124,245,200,0)");
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
  }, 512, 512);
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.9;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

// ---- Products -------------------------------------------------------------------------------------------------------

const lathe = (pts: [number, number][], seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function SerumBottle() {
  const body = useMemo(
    () => lathe([[0, 0], [0.5, 0], [0.62, 0.06], [0.66, 0.2], [0.66, 1.5], [0.62, 1.72], [0.46, 1.88], [0.3, 1.97], [0.28, 2.2]]),
    [],
  );
  const liquid = useMemo(() => lathe([[0, 0.06], [0.5, 0.06], [0.58, 0.14], [0.6, 0.24], [0.6, 1.2], [0.56, 1.34], [0, 1.4]]), []);
  const label = useMemo(() => labelTexture("Clarity serum", MINT), []);
  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#e6eeff"
          transmission={1}
          thickness={0.9}
          roughness={0.06}
          ior={1.46}
          attenuationColor="#6f9bff"
          attenuationDistance={2.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.6}
        />
      </mesh>
      <mesh geometry={liquid}>
        <meshStandardMaterial color="#3b6af0" emissive="#1447E6" emissiveIntensity={0.55} roughness={0.25} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.672, 0.672, 0.95, 48, 1, true, -0.9, 1.8]} />
        <meshStandardMaterial map={label} transparent roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.36, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.42, 40]} />
        <meshStandardMaterial color={INK} metalness={0.5} roughness={0.28} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <capsuleGeometry args={[0.21, 0.5, 8, 24]} />
        <meshPhysicalMaterial color={PEARL} roughness={0.35} clearcoat={0.6} />
      </mesh>
    </group>
  );
}

function Jar() {
  const body = useMemo(() => lathe([[0, 0], [0.98, 0], [1.06, 0.06], [1.08, 0.16], [1.08, 0.82], [0, 0.82]]), []);
  const label = useMemo(() => labelTexture("Barrier cream", BRAND), []);
  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial color="#fbfcff" roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.2} sheen={0.6} sheenColor={new THREE.Color("#cfe0ff")} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.085, 1.085, 0.5, 64, 1, true, -1.0, 2.0]} />
        <meshStandardMaterial map={label} transparent roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.4, 64]} />
        <meshStandardMaterial color={BRAND} metalness={0.45} roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.205, 0]}>
        <cylinderGeometry args={[1.0, 1.1, 0.03, 64]} />
        <meshStandardMaterial color={BRAND_DEEP} metalness={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
}

function PumpBottle() {
  const body = useMemo(() => lathe([[0, 0], [0.55, 0], [0.64, 0.06], [0.66, 0.2], [0.66, 1.8], [0.6, 2.0], [0.4, 2.12], [0.3, 2.18], [0.3, 2.3]]), []);
  const label = useMemo(() => labelTexture("Gentle cleanser", MINT), []);
  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.28} clearcoat={0.85} clearcoatRoughness={0.12} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.668, 0.668, 1.1, 48, 1, true, -0.9, 1.8]} />
        <meshStandardMaterial map={label} transparent roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.42, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.28, 40]} />
        <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.55, 20]} />
        <meshStandardMaterial color={PEARL} roughness={0.3} />
      </mesh>
      <mesh position={[0.16, 3.12, 0]}>
        <boxGeometry args={[0.55, 0.2, 0.26]} />
        <meshStandardMaterial color={PEARL} roughness={0.3} />
      </mesh>
      <mesh position={[0.46, 3.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.07, 0.16, 16]} />
        <meshStandardMaterial color={BRAND} />
      </mesh>
    </group>
  );
}

function Tube() {
  const label = useMemo(() => labelTexture("Sun fluid SPF 50", "#FFC93C", false), []);
  return (
    <group>
      <mesh position={[0, 1.15, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.56, 0.56, 2.1, 48, 1, false]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position={[0, 1.15, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.565, 0.565, 1.3, 48, 1, true, -0.95, 1.9]} />
        <meshStandardMaterial map={label} transparent roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.4, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.2, 0.56, 0.4, 40]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <cylinderGeometry args={[0.26, 0.2, 0.36, 40]} />
        <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.07, 0]} scale={[1, 1, 0.16]}>
        <boxGeometry args={[1.12, 0.2, 1]} />
        <meshStandardMaterial color="#e7ecf7" roughness={0.45} />
      </mesh>
    </group>
  );
}

// ---- Motion helpers ---------------------------------------------------------------------------------------------------

type Floaty = { base: [number, number, number]; scale: number; speed: number; phase: number; tilt: number; spin: number };

function Floating({ cfg, animate, children }: { cfg: Floaty; animate: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = animate ? state.clock.elapsedTime : cfg.phase;
    g.position.set(cfg.base[0], cfg.base[1] + Math.sin(t * cfg.speed + cfg.phase) * 0.22, cfg.base[2]);
    g.rotation.y = t * cfg.spin + cfg.phase;
    g.rotation.z = Math.sin(t * cfg.speed * 0.8 + cfg.phase) * cfg.tilt;
  });
  return (
    <group ref={ref} scale={cfg.scale}>
      {children}
    </group>
  );
}

function Droplets({ animate }: { animate: boolean }) {
  const COUNT = 46;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
        z: (Math.cos(i * 78.233) * 12345.678) % 1,
        s: 0.45 + ((i * 37) % 10) / 14,
        v: 0.12 + ((i * 53) % 10) / 55,
        o: (i * 0.61803) % 1,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = animate ? state.clock.elapsedTime : 0;
    seeds.forEach((d, i) => {
      const life = (t * d.v + d.o) % 1;
      dummy.position.set(d.x * 4.2 + Math.sin(t * 0.7 + i) * 0.15, -2.6 + life * 6.2, d.z * 2.4 - 0.6);
      const k = d.s * Math.sin(life * Math.PI) * 0.1;
      dummy.scale.setScalar(Math.max(k, 0.0001));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 18, 18]} />
      <meshPhysicalMaterial color="#9ad7ff" emissive={MINT} emissiveIntensity={0.35} transmission={0.5} roughness={0.05} transparent opacity={0.9} />
    </instancedMesh>
  );
}

/** The scan ring: a mint ring that sweeps up and down through the products, like the face scan line. */
function ScanRing({ animate }: { animate: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    const t = animate ? state.clock.elapsedTime : 1.2;
    g.current.position.y = Math.sin(t * 0.7) * 2.2 + 0.3;
    const s = 1 + Math.sin(t * 1.4) * 0.03;
    g.current.scale.set(s, s, s);
  });
  return (
    <group ref={g} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[3.6, 0.02, 12, 180]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[3.6, 0.1, 12, 180]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.14} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Backdrop() {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <mesh position={[0.2, 0.2, -6]}>
      <planeGeometry args={[13, 13]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function World({ animate }: { animate: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!root.current) return;
    const t = animate ? state.clock.elapsedTime : 0;
    const px = animate ? state.pointer.x : 0;
    const py = animate ? state.pointer.y : 0;
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, Math.sin(t * 0.22) * 0.3 + px * 0.28, 0.06);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -py * 0.1, 0.06);
  });

  const serum: Floaty = { base: [-0.15, -1.55, 0.2], scale: 1.12, speed: 0.9, phase: 0.2, tilt: 0.03, spin: 0.12 };
  const jar: Floaty = { base: [2.15, -1.75, 1.0], scale: 0.88, speed: 1.1, phase: 1.7, tilt: 0.05, spin: -0.18 };
  const pump: Floaty = { base: [-2.55, -1.8, -0.7], scale: 0.9, speed: 0.8, phase: 3.1, tilt: 0.04, spin: 0.1 };
  const tube: Floaty = { base: [1.55, -1.65, -2.0], scale: 0.9, speed: 1.0, phase: 4.4, tilt: 0.07, spin: -0.12 };

  return (
    <group ref={root}>
      <Floating cfg={pump} animate={animate}><PumpBottle /></Floating>
      <Floating cfg={tube} animate={animate}><Tube /></Floating>
      <Floating cfg={serum} animate={animate}><SerumBottle /></Floating>
      <Floating cfg={jar} animate={animate}><Jar /></Floating>
      <Droplets animate={animate} />
      <ScanRing animate={animate} />
    </group>
  );
}

export default function Scene({ animate, active, onReady }: { animate: boolean; active: boolean; onReady?: () => void }) {
  const small = typeof window !== "undefined" && window.innerWidth < 640;
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, small ? 1.4 : 1.8]}
      camera={{ position: [0, 0.6, 12.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
        onReady?.();
      }}
    >
      <Environment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-5, 2, -2]} intensity={40} color="#4d7bff" />
      <pointLight position={[4, -1, 3]} intensity={18} color={MINT} />
      <Backdrop />
      <World animate={animate} />
    </Canvas>
  );
}
