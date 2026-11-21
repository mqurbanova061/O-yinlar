import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls, VirtualInputState } from '../components/MobileControls';
import {
  addOutdoorLighting,
  createGrassTexture,
  createRoadTexture,
  createThreeContext,
} from '../three/engine';
import {
  AnimalKind,
  buildAnimalGroup,
  buildCharacterGroup,
  buildTreeGroup,
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
// 6. 3D AVTOMOBIL POYGASI (6-9 yosh)
// =====================================================================
export const KartRacing3D: React.FC<GameSessionProps> = ({
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
      bgColor: 0x38bdf8,
      fogColor: 0xbae6fd,
      fogNear: 25,
      fogFar: 95,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x0284c7 });

    // Ocean & island bridge road
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.18, metalness: 0.15, clearcoat: 0.8 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.2;
    scene.add(water);

    const roadTex = createRoadTexture(renderer, 3);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.5, 220),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.72 })
    );
    road.position.set(0, -0.25, -80);
    road.receiveShadow = true;
    scene.add(road);

    // Bridge guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 220), railMat);
    railL.position.set(-5.4, 0.38, -80);
    const railR = railL.clone();
    railR.position.x = 5.4;
    scene.add(railL, railR);

    // Arches along bridge
    const archMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 });
    const arches: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const ag = new THREE.Group();
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), archMat);
      pL.position.set(-5.2, 2.5, 0);
      const pR = pL.clone();
      pR.position.x = 5.2;
      const top = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.6, 0.7), archMat);
      top.position.set(0, 5.1, 0);
      ag.add(pL, pR, top);
      ag.position.z = -i * 22;
      scene.add(ag);
      arches.push(ag);
    }

    const kart = buildVehicleGroup({ bodyColor: 0x06b6d4, accentColor: 0xf59e0b, isKart: true });
    kart.position.set(0, 0, 2);
    scene.add(kart);

    camera.position.set(0, 3.8, 8.6);
    camera.lookAt(0, 1.0, -6);

    const targetDistance = 320 + level * 90;
    let distance = 0;
    let speed = 18;
    let lives = 3;
    let ended = false;

    interface RoadObj {
      mesh: THREE.Group;
      type: 'coin' | 'cone' | 'rival';
    }
    const objs: RoadObj[] = [];
    let spawnCooldown = 0.5;

    const updateHud = () => {
      const pct = Math.min(100, Math.round((distance / targetDistance) * 100));
      callbacksRef.current.onObjectiveUpdate(`Masofa: ${pct}% · Jonlar: ${'❤️'.repeat(lives)}`);
    };
    updateHud();

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const boost = keysRef.current.up || touchRef.current.action;

      const targetSpeed = (boost ? 32 : 21) + level * 1.8;
      speed = THREE.MathUtils.damp(speed, targetSpeed, 4, dt);
      roadTex.offset.y -= speed * dt * 0.045;

      let steer = 0;
      if (left) steer -= 1;
      if (right) steer += 1;
      kart.position.x = THREE.MathUtils.clamp(kart.position.x + steer * 8.5 * dt, -4.0, 4.0);
      kart.rotation.y = THREE.MathUtils.damp(kart.rotation.y, -steer * 0.22, 10, dt);
      kart.rotation.z = THREE.MathUtils.damp(kart.rotation.z, -steer * 0.08, 10, dt);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, kart.position.x * 0.65, 6, dt);
      camera.fov = THREE.MathUtils.damp(camera.fov, boost ? 70 : 60, 5, dt);
      camera.updateProjectionMatrix();

      arches.forEach((a) => {
        a.position.z += speed * dt;
        if (a.position.z > 12) a.position.z -= 132;
      });

      distance += speed * dt;
      updateHud();
      if (distance >= targetDistance) {
        ended = true;
        callbacksRef.current.onScoreChange(100);
        callbacksRef.current.onVictory();
        return;
      }

      spawnCooldown -= dt;
      if (spawnCooldown <= 0) {
        spawnCooldown = Math.max(0.35, 0.72 - level * 0.06);
        const laneX = [-3.0, 0, 3.0][Math.floor(Math.random() * 3)];
        const roll = Math.random();
        const g = new THREE.Group();
        let type: RoadObj['type'] = 'coin';
        if (roll < 0.45) {
          type = 'coin';
          const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 })
          );
          coin.rotation.x = Math.PI / 2;
          coin.position.y = 0.85;
          g.add(coin);
        } else if (roll < 0.78) {
          type = 'cone';
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.55, 1.1, 12),
            new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 })
          );
          cone.position.y = 0.55;
          cone.castShadow = true;
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.12, 1.1),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
          );
          base.position.y = 0.06;
          g.add(cone, base);
        } else {
          type = 'rival';
          const rival = buildVehicleGroup({ bodyColor: 0xef4444, accentColor: 0xffffff, isKart: true });
          rival.scale.setScalar(0.9);
          g.add(rival);
        }
        g.position.set(laneX, 0, -78);
        scene.add(g);
        objs.push({ mesh: g, type });
      }

      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        const relSpeed = o.type === 'rival' ? speed * 0.65 : speed;
        o.mesh.position.z += relSpeed * dt;
        if (o.type === 'coin') o.mesh.rotation.y = elapsed * 3.5;

        const dz = Math.abs(o.mesh.position.z - kart.position.z);
        const dx = Math.abs(o.mesh.position.x - kart.position.x);
        if (dz < 1.55 && dx < 1.25) {
          scene.remove(o.mesh);
          objs.splice(i, 1);
          if (o.type === 'coin') {
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(20);
          } else {
            lives--;
            gameAudio.playError();
            updateHud();
            if (lives <= 0) {
              ended = true;
              callbacksRef.current.onGameOver();
              return;
            }
          }
        } else if (o.mesh.position.z > 12) {
          scene.remove(o.mesh);
          objs.splice(i, 1);
        }
      }
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <TouchControls inputRef={touchRef} mode="lr" actionLabel="Tezlanish" />
      )}
    </div>
  );
};

// =====================================================================
// 7. MATEMATIK SARGUZASHT (6-9 yosh)
// =====================================================================
function makeQuestion(level: number) {
  const maxN = 8 + level * 6;
  const a = Math.floor(Math.random() * maxN) + 2;
  const b = Math.floor(Math.random() * maxN) + 1;
  const useMul = level >= 3 && Math.random() < 0.35;
  const useSub = !useMul && Math.random() < 0.45 && a >= b;
  let text = '';
  let ans = 0;
  if (useMul) {
    const m1 = Math.floor(Math.random() * 8) + 2;
    const m2 = Math.floor(Math.random() * 6) + 2;
    text = `${m1} × ${m2} = ?`;
    ans = m1 * m2;
  } else if (useSub) {
    text = `${a} - ${b} = ?`;
    ans = a - b;
  } else {
    text = `${a} + ${b} = ?`;
    ans = a + b;
  }
  const choices = new Set<number>([ans]);
  while (choices.size < 3) {
    const offset = Math.floor(Math.random() * 7) - 3;
    const cand = Math.max(0, ans + (offset === 0 ? 2 : offset));
    choices.add(cand);
  }
  const arr = Array.from(choices).sort(() => Math.random() - 0.5);
  return { text, ans, arr };
}

function makeNumberPlate(num: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 116px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 128, 134);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.2, 0.3),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0ea5e9, emissiveIntensity: 0.25 })
  );
}

export const MathAdventure3D: React.FC<GameSessionProps> = ({
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
  const [questionText, setQuestionText] = useState('');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 55,
      bgColor: 0x1e1b4b,
      fogColor: 0x1e1b4b,
      fogNear: 20,
      fogFar: 75,
    });
    const { scene, camera } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xc7d2fe, groundColor: 0x312e81 });

    // Ancient stone runner path
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.5, 220),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    );
    track.position.set(0, -0.25, -85);
    track.receiveShadow = true;
    scene.add(track);

    const hero = buildCharacterGroup(0x8b5cf6, 0xfacc15);
    hero.position.set(0, 0, 2);
    scene.add(hero);

    camera.position.set(0, 4.5, 8.8);
    camera.lookAt(0, 1.8, -8);

    const lanePositions = [-3.2, 0, 3.2];
    let laneIdx = 1;
    let laneCooldown = 0;

    let round = 0;
    const totalRounds = 5 + level;
    let lives = 3;
    let ended = false;

    let currentQ = makeQuestion(level);
    let gateGroup = new THREE.Group();

    const spawnGate = () => {
      scene.remove(gateGroup);
      currentQ = makeQuestion(level);
      setQuestionText(currentQ.text);
      callbacksRef.current.onObjectiveUpdate(
        `Misol: ${currentQ.text} (${round + 1}/${totalRounds}) · Jonlar: ${'❤️'.repeat(lives)}`
      );

      gateGroup = new THREE.Group();
      currentQ.arr.forEach((val, i) => {
        const plate = makeNumberPlate(val);
        plate.position.set(lanePositions[i], 1.4, 0);
        gateGroup.add(plate);
      });
      gateGroup.position.z = -52;
      scene.add(gateGroup);
    };
    spawnGate();

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      laneCooldown = Math.max(0, laneCooldown - dt);
      const goLeft = keysRef.current.left || touchRef.current.left;
      const goRight = keysRef.current.right || touchRef.current.right;
      if (laneCooldown <= 0) {
        if (goLeft && laneIdx > 0) {
          laneIdx--;
          laneCooldown = 0.22;
          gameAudio.playClick();
        } else if (goRight && laneIdx < 2) {
          laneIdx++;
          laneCooldown = 0.22;
          gameAudio.playClick();
        }
      }

      hero.position.x = THREE.MathUtils.damp(hero.position.x, lanePositions[laneIdx], 12, dt);
      hero.position.y = Math.abs(Math.sin(elapsed * 10)) * 0.16;

      const gateSpeed = 12 + level * 1.4;
      gateGroup.position.z += gateSpeed * dt;

      if (gateGroup.position.z >= 1.2) {
        const chosenVal = currentQ.arr[laneIdx];
        if (chosenVal === currentQ.ans) {
          gameAudio.playSuccess();
          callbacksRef.current.onScoreChange(30);
          round++;
          if (round >= totalRounds) {
            ended = true;
            callbacksRef.current.onVictory();
            return;
          }
          spawnGate();
        } else {
          lives--;
          gameAudio.playError();
          if (lives <= 0) {
            ended = true;
            callbacksRef.current.onGameOver();
            return;
          }
          spawnGate();
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
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-10">
            <div className="rounded-2xl border border-violet-400/40 bg-[#141033]/95 px-6 py-2.5 text-center shadow-xl">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">{questionText}</div>
            </div>
          </div>
          <TouchControls inputRef={touchRef} mode="lr" />
        </>
      )}
    </div>
  );
};

// =====================================================================
// 8. XOTIRA O'YINI (6-9 yosh)
// =====================================================================
const CARD_EMBLEMS = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15, 0xa855f7, 0xf97316, 0x06b6d4, 0xec4899];

export const MemoryGame3D: React.FC<GameSessionProps> = ({
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

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, { fov: 46, bgColor: 0x0f172a, fogColor: 0x0f172a, fogNear: 18, fogFar: 45 });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 8.8, 7.6);
    camera.lookAt(0, 0, 0.3);
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x1e293b });

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.4, 9.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 })
    );
    table.position.y = -0.25;
    table.receiveShadow = true;
    scene.add(table);

    const pairs = Math.min(4 + level, 8);
    const cols = 4;
    const rows = Math.ceil((pairs * 2) / cols);
    const values = [...Array(pairs).keys(), ...Array(pairs).keys()].sort(() => Math.random() - 0.5);

    interface Card3D {
      group: THREE.Group;
      pairId: number;
      flipped: boolean;
      matched: boolean;
      targetRotZ: number;
    }
    const cards: Card3D[] = [];
    const backMat = new THREE.MeshPhysicalMaterial({ color: 0x334155, roughness: 0.35, clearcoat: 0.6 });

    values.forEach((pairId, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const g = new THREE.Group();

      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 1.45), backMat);
      tile.castShadow = true;
      g.add(tile);

      // Hidden 3D gem on bottom face (revealed when flipped 180 deg)
      const gemColor = CARD_EMBLEMS[pairId % CARD_EMBLEMS.length];
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshPhysicalMaterial({ color: gemColor, emissive: gemColor, emissiveIntensity: 0.25, roughness: 0.2 })
      );
      gem.position.y = -0.38;
      g.add(gem);

      g.traverse((ch) => (ch.userData.cardIdx = idx));
      const x = (c - (cols - 1) / 2) * 1.9;
      const z = (r - (rows - 1) / 2) * 1.9;
      g.position.set(x, 0.25, z);
      scene.add(g);

      cards.push({ group: g, pairId, flipped: false, matched: false, targetRotZ: 0 });
    });

    let firstPick: number | null = null;
    let locked = false;
    let matchedCount = 0;
    let movesLeft = pairs * 3 + 4;
    let ended = false;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Topilgan juftliklar: ${matchedCount}/${pairs} · Qolgan urinishlar: ${movesLeft}`
      );
    };
    updateObj();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'playing' || locked || ended) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cards.map((c) => c.group), true);
      if (!hits.length) return;
      const idx = hits[0].object.userData.cardIdx as number | undefined;
      if (idx === undefined) return;
      const card = cards[idx];
      if (card.flipped || card.matched) return;

      card.flipped = true;
      card.targetRotZ = Math.PI;
      gameAudio.playClick();

      if (firstPick === null) {
        firstPick = idx;
      } else {
        const prevIdx = firstPick;
        const prev = cards[prevIdx];
        movesLeft--;
        if (prev.pairId === card.pairId) {
          prev.matched = true;
          card.matched = true;
          matchedCount++;
          firstPick = null;
          gameAudio.playSuccess();
          callbacksRef.current.onScoreChange(40);
          updateObj();
          if (matchedCount >= pairs) {
            ended = true;
            setTimeout(() => callbacksRef.current.onVictory(), 500);
          }
        } else {
          locked = true;
          firstPick = null;
          updateObj();
          setTimeout(() => {
            prev.flipped = false;
            prev.targetRotZ = 0;
            card.flipped = false;
            card.targetRotZ = 0;
            locked = false;
            if (movesLeft <= 0 && !ended) {
              ended = true;
              callbacksRef.current.onGameOver();
            }
          }, 680);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    ctx.startLoop((dt, elapsed) => {
      cards.forEach((c, i) => {
        c.group.rotation.z = THREE.MathUtils.damp(c.group.rotation.z, c.targetRotZ, 12, dt);
        c.group.position.y = (c.flipped || c.matched ? 0.45 : 0.22) + Math.sin(elapsed * 2 + i) * 0.03;
      });
    });

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      ctx.dispose();
    };
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
};

// =====================================================================
// 9. 3D HAYVONOT OLAMI (6-9 yosh)
// =====================================================================
const SAFARI_LIST: { kind: AnimalKind; name: string }[] = [
  { kind: 'bunny', name: 'Quyon' },
  { kind: 'bear', name: 'Ayiq' },
  { kind: 'puppy', name: 'Kuchuk' },
  { kind: 'cat', name: 'Mushuk' },
  { kind: 'duck', name: 'O‘rdak' },
];

export const AnimalWorld3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });
  const keysRef = useKeyboardRef();
  const touchRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });
  const scanTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 54,
      bgColor: 0x7dd3fc,
      fogColor: 0xbae6fd,
      fogNear: 25,
      fogFar: 75,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x15803d });

    const grassTex = createGrassTexture(renderer, '#22c55e', '#4ade80');
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(45, 36),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pond
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, roughness: 0.15, clearcoat: 0.9 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-8, 0.02, -5);
    scene.add(pond);

    // Trees
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = 16 + (i % 3) * 4;
      const t = buildTreeGroup(1.0 + (i % 2) * 0.25);
      t.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      scene.add(t);
    }

    const player = buildCharacterGroup(0x10b981, 0xfef08a);
    player.position.set(0, 0, 8);
    scene.add(player);

    const count = Math.min(3 + level, 5);
    const animals = SAFARI_LIST.slice(0, count).map((a, i) => {
      const ang = (i / count) * Math.PI * 2 + 0.5;
      const rad = 9.5;
      const group = buildAnimalGroup(a.kind);
      group.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);

      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
      );
      beacon.position.y = 3.0;
      group.add(beacon);
      scene.add(group);
      return { ...a, group, beacon, scanned: false };
    });

    let found = 0;
    let ended = false;
    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Hayvonlarga yaqinlashib Skaner (Space) bosing: ${found}/${count}`
      );
    };
    updateObj();

    const tryScan = () => {
      if (statusRef.current !== 'playing' || ended) return;
      let hitAny = false;
      animals.forEach((a) => {
        if (!a.scanned && a.group.position.distanceTo(player.position) < 4.2) {
          a.scanned = true;
          a.beacon.visible = false;
          found++;
          hitAny = true;
          gameAudio.playSuccess();
          callbacksRef.current.onScoreChange(35);
          updateObj();
        }
      });
      if (!hitAny) gameAudio.playClick();
      if (found >= count && !ended) {
        ended = true;
        setTimeout(() => callbacksRef.current.onVictory(), 450);
      }
    };
    scanTriggerRef.current = tryScan;

    let prevSpace = false;
    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vz = (down ? 1 : 0) - (up ? 1 : 0);
      if (vx !== 0 || vz !== 0) {
        const len = Math.hypot(vx, vz);
        player.position.x = THREE.MathUtils.clamp(player.position.x + (vx / len) * 7.5 * dt, -16, 16);
        player.position.z = THREE.MathUtils.clamp(player.position.z + (vz / len) * 7.5 * dt, -16, 16);
        const targetYaw = Math.atan2(-vx, -vz);
        player.rotation.y = targetYaw;
      }

      if (keysRef.current.space && !prevSpace) tryScan();
      prevSpace = keysRef.current.space;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 6, dt);
      camera.position.y = 7.5;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 10.5, 6, dt);
      camera.lookAt(player.position.x, 1.2, player.position.z);

      animals.forEach((a, i) => {
        a.beacon.rotation.y = elapsed * 2;
        a.group.rotation.y = Math.sin(elapsed + i) * 0.5;
      });
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
          actionLabel="Skaner"
          onActionPress={() => scanTriggerRef.current()}
        />
      )}
    </div>
  );
};

// =====================================================================
// 10. SEHRLI OROL SARGUZASHTI (6-9 yosh)
// =====================================================================
export const MagicIsland3D: React.FC<GameSessionProps> = ({
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
      fov: 55,
      bgColor: 0x0284c7,
      fogColor: 0x7dd3fc,
      fogNear: 25,
      fogFar: 85,
    });
    const { scene, camera } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x0369a1 });

    // Floating 3D islands
    interface IslandPlat {
      mesh: THREE.Group;
      x: number;
      y: number;
      z: number;
      rx: number;
      rz: number;
    }
    const islands: IslandPlat[] = [];
    const totalIslands = 5 + level;
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.78 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

    for (let i = 0; i < totalIslands; i++) {
      const g = new THREE.Group();
      const x = i === 0 ? 0 : Math.sin(i * 1.1) * 3.2;
      const y = i * 0.45;
      const z = -i * 6.5;
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 4.2), grassMat);
      top.receiveShadow = true;
      top.castShadow = true;
      const under = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.2, 6), rockMat);
      under.rotation.x = Math.PI;
      under.position.y = -1.4;
      g.add(top, under);
      g.position.set(x, y, z);
      scene.add(g);
      islands.push({ mesh: g, x, y: y + 0.35, z, rx: 2.25, rz: 2.25 });
    }

    // Crystals on islands
    const crystals: { mesh: THREE.Mesh; taken: boolean }[] = [];
    const cryMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45, roughness: 0.15 });
    islands.slice(1, -1).forEach((isl) => {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), cryMat);
      c.position.set(isl.x, isl.y + 1.0, isl.z);
      scene.add(c);
      crystals.push({ mesh: c, taken: false });
    });

    // Golden portal on final island
    const lastIsl = islands[islands.length - 1];
    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.16, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
    );
    portal.position.set(lastIsl.x, lastIsl.y + 1.5, lastIsl.z);
    scene.add(portal);

    const player = buildCharacterGroup(0x3b82f6, 0xfef08a);
    player.position.set(0, 0.35, 0);
    scene.add(player);

    let vy = 0;
    let grounded = true;
    let ended = false;
    let collected = 0;

    callbacksRef.current.onObjectiveUpdate(
      `Orollardan sakrab o‘ting va oltin portalga yeting! (${crystals.length} ta kristal)`
    );

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;
      const jump = keysRef.current.space || touchRef.current.action;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vz = (down ? 1 : 0) - (up ? 1 : 0);
      player.position.x += vx * 6.5 * dt;
      player.position.z += vz * 6.5 * dt;
      if (vx !== 0 || vz !== 0) {
        player.rotation.y = Math.atan2(-vx, -vz);
      }

      if (jump && grounded) {
        vy = 9.4;
        grounded = false;
        gameAudio.playJump();
      }

      vy -= 21 * dt;
      player.position.y += vy * dt;

      grounded = false;
      for (const isl of islands) {
        if (
          Math.abs(player.position.x - isl.x) <= isl.rx &&
          Math.abs(player.position.z - isl.z) <= isl.rz &&
          player.position.y <= isl.y + 0.18 &&
          player.position.y >= isl.y - 0.9 &&
          vy <= 0
        ) {
          player.position.y = isl.y;
          vy = 0;
          grounded = true;
          break;
        }
      }

      crystals.forEach((c) => {
        if (!c.taken) {
          c.mesh.rotation.y = elapsed * 2.4;
          if (c.mesh.position.distanceTo(player.position) < 1.35) {
            c.taken = true;
            c.mesh.visible = false;
            collected++;
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(25);
            callbacksRef.current.onObjectiveUpdate(
              `Kristallar: ${collected}/${crystals.length} · Oltin portalga yeting!`
            );
          }
        }
      });

      portal.rotation.y = elapsed * 1.5;
      if (player.position.distanceTo(portal.position) < 1.7) {
        ended = true;
        callbacksRef.current.onScoreChange(60);
        callbacksRef.current.onVictory();
        return;
      }

      if (player.position.y < -6) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, player.position.y + 5.2, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 8.5, 6, dt);
      camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z - 2);
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
