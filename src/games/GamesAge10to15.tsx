import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls, VirtualInputState } from '../components/MobileControls';
import {
  addOutdoorLighting,
  createGrassTexture,
  createPitchTexture,
  createRoadTexture,
  createThreeContext,
} from '../three/engine';
import {
  buildCharacterGroup,
  buildSoccerBall,
  buildSpaceshipGroup,
  buildVehicleGroup,
} from '../three/models';
import { GameSessionProps } from '../types';
import { gameAudio } from '../utils/audio';

function useLatestRef<T>(val: T) {
  const ref = useRef(val);
  ref.current = val;
  return ref;
}

function useKeyboardRef() {
  const keys = useRef({ left: false, right: false, up: false, down: false, space: false });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.current.down = true;
      if (e.key === ' ') keys.current.space = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.current.down = false;
      if (e.key === ' ') keys.current.space = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  return keys;
}

// =====================================================================
// 11. 3D SUPER RACING (10-15 yosh)
// =====================================================================
export const SuperRacing3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
  onGameOver,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory, onGameOver });
  const keysRef = useKeyboardRef();
  const touchRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });
  const [hudStats, setHudStats] = useState({ speedKmh: 0, nitro: 100 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 62,
      bgColor: 0x090d1a,
      fogColor: 0x090d1a,
      fogNear: 25,
      fogFar: 105,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x38bdf8, groundColor: 0x0f172a, sunColor: 0xfde68a });

    const roadTex = createRoadTexture(renderer, 4);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.4, 240),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.6, metalness: 0.15 })
    );
    road.position.set(0, -0.2, -90);
    road.receiveShadow = true;
    scene.add(road);

    // Neon highway barriers & light poles
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const neonMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.5 });
    const poles: THREE.Group[] = [];
    for (let i = 0; i < 12; i++) {
      const pg = new THREE.Group();
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.25), barrierMat);
      postL.position.set(-7.4, 2.1, 0);
      const lampL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.22), neonMat);
      lampL.position.set(-6.9, 4.1, 0);
      const postR = postL.clone();
      postR.position.x = 7.4;
      const lampR = lampL.clone();
      lampR.position.x = 6.9;
      pg.add(postL, lampL, postR, lampR);
      pg.position.z = -i * 18;
      scene.add(pg);
      poles.push(pg);
    }

    const car = buildVehicleGroup({ bodyColor: 0xf59e0b, accentColor: 0x0f172a });
    car.position.set(0, 0, 2);
    scene.add(car);

    camera.position.set(0, 3.6, 8.2);
    camera.lookAt(0, 1.0, -10);

    const targetDist = 520 + level * 140;
    let dist = 0;
    let speed = 26;
    let nitro = 100;
    let shield = 3;
    let ended = false;

    const rivals: { mesh: THREE.Group; isFuel: boolean }[] = [];
    let spawnTimer = 0.4;

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const brake = keysRef.current.down || touchRef.current.down;
      const useNitro = (keysRef.current.space || touchRef.current.action) && nitro > 5;

      let targetSpeed = 30 + level * 2.5;
      if (useNitro) {
        targetSpeed = 52 + level * 3;
        nitro = Math.max(0, nitro - dt * 32);
      } else {
        nitro = Math.min(100, nitro + dt * 8);
      }
      if (brake) targetSpeed = 16;

      speed = THREE.MathUtils.damp(speed, targetSpeed, 4.5, dt);
      roadTex.offset.y -= speed * dt * 0.04;

      let steer = 0;
      if (left) steer -= 1;
      if (right) steer += 1;
      car.position.x = THREE.MathUtils.clamp(car.position.x + steer * 11 * dt, -5.4, 5.4);
      car.rotation.y = THREE.MathUtils.damp(car.rotation.y, -steer * 0.18, 10, dt);
      car.rotation.z = THREE.MathUtils.damp(car.rotation.z, -steer * 0.06, 10, dt);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, car.position.x * 0.65, 6, dt);
      camera.fov = THREE.MathUtils.damp(camera.fov, useNitro ? 76 : 62, 5, dt);
      camera.updateProjectionMatrix();

      poles.forEach((p) => {
        p.position.z += speed * dt;
        if (p.position.z > 14) p.position.z -= 216;
      });

      dist += speed * dt;
      const pct = Math.min(100, Math.round((dist / targetDist) * 100));
      callbacksRef.current.onObjectiveUpdate(
        `Finish: ${pct}% · Himoya: ${'🛡️'.repeat(shield)}`
      );
      setHudStats({ speedKmh: Math.round(speed * 4.2), nitro: Math.round(nitro) });

      if (dist >= targetDist) {
        ended = true;
        callbacksRef.current.onScoreChange(120);
        callbacksRef.current.onVictory();
        return;
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.28, 0.65 - level * 0.06);
        const lanes = [-4.6, -1.55, 1.55, 4.6];
        const lx = lanes[Math.floor(Math.random() * lanes.length)];
        const isFuel = Math.random() < 0.25;
        let mesh: THREE.Group;
        if (isFuel) {
          mesh = new THREE.Group();
          const cell = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.65, 0),
            new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.9 })
          );
          cell.position.y = 0.9;
          mesh.add(cell);
        } else {
          const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xa855f7];
          mesh = buildVehicleGroup({ bodyColor: colors[Math.floor(Math.random() * colors.length)] });
        }
        mesh.position.set(lx, 0, -95);
        scene.add(mesh);
        rivals.push({ mesh, isFuel });
      }

      for (let i = rivals.length - 1; i >= 0; i--) {
        const r = rivals[i];
        r.mesh.position.z += (r.isFuel ? speed : speed * 0.68) * dt;
        if (r.isFuel) r.mesh.rotation.y = elapsed * 3;

        const dz = Math.abs(r.mesh.position.z - car.position.z);
        const dx = Math.abs(r.mesh.position.x - car.position.x);
        if (dz < 2.6 && dx < 1.55) {
          scene.remove(r.mesh);
          rivals.splice(i, 1);
          if (r.isFuel) {
            nitro = Math.min(100, nitro + 40);
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(25);
          } else {
            shield--;
            gameAudio.playError();
            if (shield <= 0) {
              ended = true;
              callbacksRef.current.onGameOver();
              return;
            }
          }
        } else if (r.mesh.position.z > 14) {
          if (!r.isFuel) callbacksRef.current.onScoreChange(5);
          scene.remove(r.mesh);
          rivals.splice(i, 1);
        }
      }
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <>
          <div className="pointer-events-none absolute top-14 right-3 sm:right-6 z-10 rounded-xl border border-slate-700 bg-[#0D131F]/90 px-4 py-2.5 text-right">
            <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">{hudStats.speedKmh} km/s</div>
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${hudStats.nitro}%` }} />
            </div>
          </div>
          <TouchControls inputRef={touchRef} mode="lr" actionLabel="Nitro" />
        </>
      )}
    </div>
  );
};

// =====================================================================
// 12. BLOKLI QURILISH SARGUZASHTI (Minecraft-inspired 3D Builder)
// =====================================================================
const VOXEL_PALETTE = [
  { id: 'grass', label: 'O‘t', hex: 0x22c55e },
  { id: 'wood', label: 'Yog‘och', hex: 0x92400e },
  { id: 'stone', label: 'Tosh', hex: 0x64748b },
  { id: 'brick', label: 'G‘isht', hex: 0xdc2626 },
  { id: 'gold', label: 'Oltin', hex: 0xfacc15 },
  { id: 'glass', label: 'Shisha', hex: 0x38bdf8 },
];

export const VoxelBuilder3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });
  const [selectedMat, setSelectedMat] = useState(0);
  const [toolMode, setToolMode] = useState<'place' | 'break'>('place');
  const selectedMatRef = useLatestRef(selectedMat);
  const toolModeRef = useLatestRef(toolMode);
  const camAngleRef = useRef({ yaw: 0.65, pitch: 0.55 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 50,
      bgColor: 0x7dd3fc,
      fogColor: 0xbae6fd,
      fogNear: 25,
      fogFar: 80,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x15803d });

    // Base grid platform
    const gridSize = 10;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    const blocks: THREE.Mesh[] = [];
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(gridSize, 0.5, gridSize),
      baseMat
    );
    floorMesh.position.set(0, -0.25, 0);
    floorMesh.receiveShadow = true;
    floorMesh.userData.isFloor = true;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x0f172a, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Pre-seed starter voxel pillars so world immediately looks alive
    const seedCoords: [number, number, number, number][] = [
      [-2, 0.5, -2, 1], [-2, 1.5, -2, 1], [-2, 2.5, -2, 0],
      [2, 0.5, -2, 2], [2, 1.5, -2, 2], [3, 0.5, -2, 4],
    ];
    seedCoords.forEach(([x, y, z, mIdx]) => {
      const mat = new THREE.MeshStandardMaterial({
        color: VOXEL_PALETTE[mIdx].hex,
        roughness: mIdx === 5 ? 0.1 : 0.7,
        transparent: mIdx === 5,
        opacity: mIdx === 5 ? 0.7 : 1,
      });
      const m = new THREE.Mesh(blockGeo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      blocks.push(m);
    });

    const targetBlocks = 8 + level * 4;
    let placedCount = 0;
    let completed = false;
    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Yangi bloklar quring: ${placedCount}/${targetBlocks} (Sudrab kamerani aylantiring)`
      );
    };
    updateObj();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragStart: { x: number; y: number } | null = null;
    let isDragging = false;

    const onPointerDown = (e: PointerEvent) => {
      dragStart = { x: e.clientX, y: e.clientY };
      isDragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart || statusRef.current !== 'playing') return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 6) {
        isDragging = true;
        camAngleRef.current.yaw -= dx * 0.008;
        camAngleRef.current.pitch = THREE.MathUtils.clamp(camAngleRef.current.pitch + dy * 0.006, 0.2, 1.25);
        dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDrag = isDragging;
      dragStart = null;
      isDragging = false;
      if (wasDrag || statusRef.current !== 'playing' || completed) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const targets: THREE.Object3D[] = [floorMesh, ...blocks];
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) return;
      const hit = hits[0];

      const shouldBreak = e.button === 2 || e.shiftKey || toolModeRef.current === 'break';
      if (shouldBreak) {
        if (hit.object !== floorMesh) {
          const idx = blocks.indexOf(hit.object as THREE.Mesh);
          if (idx >= 0) {
            scene.remove(blocks[idx]);
            blocks.splice(idx, 1);
            gameAudio.playClick();
          }
        }
        return;
      }

      if (!hit.face) return;
      const pos = hit.point.clone().addScaledVector(hit.face.normal, 0.5);
      const gx = Math.round(pos.x - 0.5) + 0.5;
      const gy = Math.max(0.5, Math.floor(pos.y) + 0.5);
      const gz = Math.round(pos.z - 0.5) + 0.5;

      if (Math.abs(gx) > 5 || Math.abs(gz) > 5 || gy > 9) return;
      const occupied = blocks.some(
        (b) => Math.abs(b.position.x - gx) < 0.1 && Math.abs(b.position.y - gy) < 0.1 && Math.abs(b.position.z - gz) < 0.1
      );
      if (occupied) return;

      const pal = VOXEL_PALETTE[selectedMatRef.current];
      const mat = new THREE.MeshStandardMaterial({
        color: pal.hex,
        roughness: pal.id === 'glass' ? 0.1 : 0.65,
        metalness: pal.id === 'gold' ? 0.75 : 0.05,
        transparent: pal.id === 'glass',
        opacity: pal.id === 'glass' ? 0.72 : 1,
      });
      const nb = new THREE.Mesh(blockGeo, mat);
      nb.position.set(gx, gy, gz);
      nb.castShadow = true;
      nb.receiveShadow = true;
      scene.add(nb);
      blocks.push(nb);

      placedCount++;
      gameAudio.playCollect();
      callbacksRef.current.onScoreChange(15);
      updateObj();
      if (placedCount >= targetBlocks) {
        completed = true;
        callbacksRef.current.onScoreChange(60);
        setTimeout(() => callbacksRef.current.onVictory(), 450);
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    ctx.startLoop(() => {
      const dist = 14.5;
      const { yaw, pitch } = camAngleRef.current;
      camera.position.set(
        Math.sin(yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist + 1.5,
        Math.cos(yaw) * Math.cos(pitch) * dist
      );
      camera.lookAt(0, 1.5, 0);
    });

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      baseGeo.dispose();
      ctx.dispose();
    };
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#0D131F]/95 px-3 py-2 shadow-xl max-w-[95vw]">
          <button
            type="button"
            onClick={() => setToolMode((m) => (m === 'place' ? 'break' : 'place'))}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              toolMode === 'place' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}
          >
            {toolMode === 'place' ? 'Qo‘yish' : 'Buzish'}
          </button>
          {VOXEL_PALETTE.map((mat, idx) => (
            <button
              key={mat.id}
              type="button"
              onClick={() => {
                setSelectedMat(idx);
                setToolMode('place');
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                selectedMat === idx && toolMode === 'place'
                  ? 'border-amber-400 bg-amber-500/20 text-white'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300'
              }`}
            >
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: `#${mat.hex.toString(16).padStart(6, '0')}` }}
              />
              <span>{mat.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 13. 3D FUTBOL CHEMPIONI (10-15 yosh)
// =====================================================================
export const FootballChallenge3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
  onGameOver,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory, onGameOver });
  const keysRef = useKeyboardRef();
  const touchRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });
  const shootFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 50,
      bgColor: 0x0b132b,
      fogColor: 0x0b132b,
      fogNear: 28,
      fogFar: 90,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x166534 });

    const pitchTex = createPitchTexture(renderer);
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 54),
      new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.85 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Goalposts at z = -14
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.4 });
    const goalGroup = new THREE.Group();
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), postMat);
    postL.position.set(-4.2, 1.6, 0);
    const postR = postL.clone();
    postR.position.x = 4.2;
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8.64, 12), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 3.2, 0);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 3.2, 2.0),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, wireframe: true, transparent: true, opacity: 0.35 })
    );
    net.position.set(0, 1.6, -1.0);
    goalGroup.add(postL, postR, crossbar, net);
    goalGroup.position.set(0, 0, -14);
    scene.add(goalGroup);

    // Goalkeeper
    const keeper = buildCharacterGroup(0xfacc15, 0x0f172a);
    keeper.position.set(0, 0, -13.2);
    scene.add(keeper);

    // Aim reticle
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    reticle.position.set(0, 1.4, -13.8);
    scene.add(reticle);

    const ball = buildSoccerBall(0.42);
    ball.position.set(0, 0.42, 0);
    scene.add(ball);

    camera.position.set(0, 3.4, 7.5);
    camera.lookAt(0, 1.4, -14);

    let aimX = 0;
    let aimY = 1.4;
    let ballVel = new THREE.Vector3();
    let shooting = false;
    let shotsLeft = 5 + level;
    let goals = 0;
    const goalTarget = 3 + Math.floor(level / 2);
    let ended = false;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Gollar: ${goals}/${goalTarget} · Qolgan zarbalar: ${shotsLeft}`
      );
    };
    updateObj();

    const triggerShot = () => {
      if (statusRef.current !== 'playing' || shooting || ended) return;
      shooting = true;
      gameAudio.playJump();
      const target = new THREE.Vector3(aimX, aimY, -14);
      const dir = target.sub(ball.position).normalize();
      ballVel.copy(dir).multiplyScalar(24);
    };
    shootFnRef.current = triggerShot;

    let prevSpace = false;
    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      // Keeper patrol
      const keeperSpeed = 2.0 + level * 0.55;
      keeper.position.x = Math.sin(elapsed * keeperSpeed) * 3.1;

      if (!shooting) {
        const left = keysRef.current.left || touchRef.current.left;
        const right = keysRef.current.right || touchRef.current.right;
        const up = keysRef.current.up || touchRef.current.up;
        const down = keysRef.current.down || touchRef.current.down;

        aimX = THREE.MathUtils.clamp(aimX + ((right ? 1 : 0) - (left ? 1 : 0)) * 6.5 * dt, -3.9, 3.9);
        aimY = THREE.MathUtils.clamp(aimY + ((up ? 1 : 0) - (down ? 1 : 0)) * 4.2 * dt, 0.5, 2.9);
        reticle.position.set(aimX, aimY, -13.8);

        if (keysRef.current.space && !prevSpace) triggerShot();
      } else {
        ball.position.addScaledVector(ballVel, dt);
        ball.rotation.x -= dt * 12;

        // Check keeper block
        if (
          ball.position.z <= -12.6 &&
          ball.position.z >= -13.8 &&
          Math.abs(ball.position.x - keeper.position.x) < 0.95 &&
          ball.position.y < 2.2
        ) {
          shotsLeft--;
          shooting = false;
          ball.position.set(0, 0.42, 0);
          gameAudio.playError();
          updateObj();
        } else if (ball.position.z <= -14.2) {
          shotsLeft--;
          shooting = false;
          const insideGoal = Math.abs(ball.position.x) < 4.0 && ball.position.y < 3.1;
          if (insideGoal) {
            goals++;
            gameAudio.playSuccess();
            callbacksRef.current.onScoreChange(50);
          } else {
            gameAudio.playError();
          }
          ball.position.set(0, 0.42, 0);
          updateObj();

          if (goals >= goalTarget) {
            ended = true;
            callbacksRef.current.onVictory();
            return;
          } else if (shotsLeft <= 0) {
            ended = true;
            callbacksRef.current.onGameOver();
            return;
          }
        }
      }
      prevSpace = keysRef.current.space;
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <TouchControls
          inputRef={touchRef}
          mode="dpad"
          actionLabel="Zarba!"
          onActionPress={() => shootFnRef.current()}
        />
      )}
    </div>
  );
};

// =====================================================================
// 14. KOSMIK TADQIQOTCHI (10-15 yosh)
// =====================================================================
export const SpaceExplorer3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
  onGameOver,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory, onGameOver });
  const keysRef = useKeyboardRef();
  const touchRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 60,
      bgColor: 0x050814,
      fogColor: 0x050814,
      fogNear: 30,
      fogFar: 110,
    });
    const { scene, camera } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x38bdf8, groundColor: 0x1e1b4b, sunPos: [20, 20, -10] });

    // Instanced starfield
    const starCount = 260;
    const starMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
      starCount
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      dummy.position.set(
        THREE.MathUtils.randFloat(-45, 45),
        THREE.MathUtils.randFloat(-25, 25),
        THREE.MathUtils.randFloat(-95, 10)
      );
      dummy.updateMatrix();
      starMesh.setMatrixAt(i, dummy.matrix);
    }
    starMesh.computeBoundingSphere();
    scene.add(starMesh);

    const ship = buildSpaceshipGroup();
    ship.position.set(0, 0, 2);
    scene.add(ship);

    camera.position.set(0, 3.2, 9.2);
    camera.lookAt(0, 0, -10);

    const lasers: THREE.Mesh[] = [];
    const asteroids: { mesh: THREE.Mesh; isRing: boolean }[] = [];
    let fireCooldown = 0;
    let spawnCooldown = 0.5;
    let hull = 3;
    let destroyed = 0;
    const targetDestroy = 10 + level * 4;
    let ended = false;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Asteroidlar: ${destroyed}/${targetDestroy} · Qalqon: ${'🛡️'.repeat(hull)}`
      );
    };
    updateObj();

    const laserGeo = new THREE.BoxGeometry(0.14, 0.14, 1.4);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const astGeo = new THREE.DodecahedronGeometry(1.1, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });

    ctx.startLoop((dt) => {
      if (statusRef.current !== 'playing' || ended) return;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;
      const fire = keysRef.current.space || touchRef.current.action;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vy = (up ? 1 : 0) - (down ? 1 : 0);
      ship.position.x = THREE.MathUtils.clamp(ship.position.x + vx * 11 * dt, -7.5, 7.5);
      ship.position.y = THREE.MathUtils.clamp(ship.position.y + vy * 8 * dt, -4.0, 4.5);
      ship.rotation.z = THREE.MathUtils.damp(ship.rotation.z, -vx * 0.4, 8, dt);
      ship.rotation.x = THREE.MathUtils.damp(ship.rotation.x, vy * 0.25, 8, dt);

      fireCooldown = Math.max(0, fireCooldown - dt);
      if (fire && fireCooldown <= 0) {
        fireCooldown = 0.2;
        const l1 = new THREE.Mesh(laserGeo, laserMat);
        l1.position.set(ship.position.x - 0.7, ship.position.y, ship.position.z - 1.2);
        const l2 = new THREE.Mesh(laserGeo, laserMat);
        l2.position.set(ship.position.x + 0.7, ship.position.y, ship.position.z - 1.2);
        scene.add(l1, l2);
        lasers.push(l1, l2);
        gameAudio.playClick();
      }

      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.position.z -= 55 * dt;
        if (l.position.z < -85) {
          scene.remove(l);
          lasers.splice(i, 1);
        }
      }

      spawnCooldown -= dt;
      if (spawnCooldown <= 0) {
        spawnCooldown = Math.max(0.32, 0.78 - level * 0.08);
        const isRing = Math.random() < 0.22;
        const mesh = isRing
          ? new THREE.Mesh(
              new THREE.TorusGeometry(1.4, 0.16, 8, 20),
              new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.8 })
            )
          : new THREE.Mesh(astGeo, astMat);
        mesh.position.set(THREE.MathUtils.randFloat(-6.8, 6.8), THREE.MathUtils.randFloat(-3.2, 3.8), -80);
        scene.add(mesh);
        asteroids.push({ mesh, isRing });
      }

      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.mesh.position.z += (20 + level * 2.5) * dt;
        if (!a.isRing) {
          a.mesh.rotation.x += dt * 1.4;
          a.mesh.rotation.y += dt * 1.1;
        }

        // Laser hit
        if (!a.isRing) {
          let hit = false;
          for (let j = lasers.length - 1; j >= 0; j--) {
            if (lasers[j].position.distanceTo(a.mesh.position) < 1.5) {
              scene.remove(lasers[j]);
              lasers.splice(j, 1);
              hit = true;
              break;
            }
          }
          if (hit) {
            scene.remove(a.mesh);
            asteroids.splice(i, 1);
            destroyed++;
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(20);
            updateObj();
            if (destroyed >= targetDestroy) {
              ended = true;
              callbacksRef.current.onVictory();
              return;
            }
            continue;
          }
        }

        // Ship collision
        if (a.mesh.position.distanceTo(ship.position) < (a.isRing ? 1.85 : 1.5)) {
          scene.remove(a.mesh);
          asteroids.splice(i, 1);
          if (a.isRing) {
            gameAudio.playSuccess();
            callbacksRef.current.onScoreChange(35);
          } else {
            hull--;
            gameAudio.playError();
            updateObj();
            if (hull <= 0) {
              ended = true;
              callbacksRef.current.onGameOver();
              return;
            }
          }
        } else if (a.mesh.position.z > 10) {
          scene.remove(a.mesh);
          asteroids.splice(i, 1);
        }
      }
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <TouchControls inputRef={touchRef} mode="dpad" actionLabel="Lazer" />
      )}
    </div>
  );
};

// =====================================================================
// 15. 3D PARKUR SARGUZASHTI (10-15 yosh)
// =====================================================================
export const ParkourAdventure3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
  onGameOver,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory, onGameOver });
  const keysRef = useKeyboardRef();
  const touchRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 58,
      bgColor: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 25,
      fogFar: 90,
    });
    const { scene, camera } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x93c5fd, groundColor: 0x1e293b });

    // Distant twilight city blocks below
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(5, 14 + (i % 4) * 5, 5),
        bldgMat
      );
      b.position.set((i % 2 === 0 ? -1 : 1) * (11 + (i % 3) * 5), -10, -i * 5);
      scene.add(b);
    }

    interface Plat {
      mesh: THREE.Mesh;
      baseX: number;
      moveAmp: number;
      moveSpeed: number;
      w: number;
      d: number;
      y: number;
    }
    const plats: Plat[] = [];
    const total = 7 + level;
    const platMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

    for (let i = 0; i < total; i++) {
      const w = i === 0 || i === total - 1 ? 4.8 : 3.2;
      const d = i === 0 || i === total - 1 ? 4.8 : 3.2;
      const y = i * 0.55;
      const baseX = i === 0 ? 0 : Math.sin(i * 1.3) * 2.5;
      const moveAmp = i > 1 && i < total - 1 && i % 2 === 0 ? 2.4 : 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), moveAmp > 0 ? accentMat : platMat);
      m.position.set(baseX, y - 0.25, -i * 5.8);
      m.receiveShadow = true;
      m.castShadow = true;
      scene.add(m);
      plats.push({ mesh: m, baseX, moveAmp, moveSpeed: 1.2 + level * 0.2, w, d, y });
    }

    const stars: { mesh: THREE.Mesh; taken: boolean }[] = [];
    const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.7 });
    plats.slice(1, -1).forEach((p) => {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), starMat);
      s.position.set(p.baseX, p.y + 1.0, p.mesh.position.z);
      scene.add(s);
      stars.push({ mesh: s, taken: false });
    });

    const lastPlat = plats[plats.length - 1];
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 2.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.85, transparent: true, opacity: 0.75 })
    );
    beacon.position.set(lastPlat.baseX, lastPlat.y + 1.4, lastPlat.mesh.position.z);
    scene.add(beacon);

    const player = buildCharacterGroup(0xf97316, 0x38bdf8);
    player.position.set(0, 0, 0);
    scene.add(player);

    let vy = 0;
    let grounded = true;
    let ended = false;
    callbacksRef.current.onObjectiveUpdate('Platformalardan sakrab yashil finish mayog‘iga yeting!');

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      plats.forEach((p, idx) => {
        if (p.moveAmp > 0) {
          p.mesh.position.x = p.baseX + Math.sin(elapsed * p.moveSpeed + idx) * p.moveAmp;
        }
      });

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;
      const jump = keysRef.current.space || touchRef.current.action;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vz = (down ? 1 : 0) - (up ? 1 : 0);
      player.position.x += vx * 7.2 * dt;
      player.position.z += vz * 7.2 * dt;
      if (vx !== 0 || vz !== 0) player.rotation.y = Math.atan2(-vx, -vz);

      if (jump && grounded) {
        vy = 9.8;
        grounded = false;
        gameAudio.playJump();
      }
      vy -= 22 * dt;
      player.position.y += vy * dt;

      grounded = false;
      for (const p of plats) {
        const px = p.mesh.position.x;
        const pz = p.mesh.position.z;
        if (
          Math.abs(player.position.x - px) <= p.w / 2 + 0.35 &&
          Math.abs(player.position.z - pz) <= p.d / 2 + 0.35 &&
          player.position.y <= p.y + 0.2 &&
          player.position.y >= p.y - 0.85 &&
          vy <= 0
        ) {
          player.position.y = p.y;
          vy = 0;
          grounded = true;
          break;
        }
      }

      stars.forEach((s) => {
        if (!s.taken) {
          s.mesh.rotation.y = elapsed * 2.5;
          if (s.mesh.position.distanceTo(player.position) < 1.35) {
            s.taken = true;
            s.mesh.visible = false;
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(25);
          }
        }
      });

      if (player.position.distanceTo(beacon.position) < 1.9) {
        ended = true;
        callbacksRef.current.onScoreChange(80);
        callbacksRef.current.onVictory();
        return;
      }

      if (player.position.y < -6) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 7, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, player.position.y + 4.8, 7, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 8.5, 7, dt);
      camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z - 2.5);
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <TouchControls inputRef={touchRef} mode="dpad" actionLabel="Sakrash" />
      )}
    </div>
  );
};
