import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls, VirtualInputState } from '../components/MobileControls';
import { addOutdoorLighting, createGrassTexture, createThreeContext } from '../three/engine';
import { AnimalKind, buildAnimalGroup, buildFruitGroup, buildTreeGroup, buildVehicleGroup } from '../three/models';
import { GameSessionProps } from '../types';
import { gameAudio } from '../utils/audio';

function useLatestRef<T>(val: T) {
  const ref = useRef(val);
  ref.current = val;
  return ref;
}

// =====================================================================
// 1. RANGLARNI O'RGANISH (3-5 yosh)
// =====================================================================
const COLOR_ITEMS = [
  { id: 'qizil', label: 'Qizil', hex: 0xef4444 },
  { id: 'kok', label: 'Ko‘k', hex: 0x3b82f6 },
  { id: 'yashil', label: 'Yashil', hex: 0x22c55e },
  { id: 'sariq', label: 'Sariq', hex: 0xfacc15 },
  { id: 'binafsha', label: 'Binafsha', hex: 0xa855f7 },
  { id: 'toq_sariq', label: 'Apelsin rang', hex: 0xf97316 },
];

export const LearnColors3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });
  const [targetName, setTargetName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 48,
      bgColor: 0x87ceeb,
      fogColor: 0xbae6fd,
      fogNear: 18,
      fogFar: 55,
    });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 5.2, 10.5);
    camera.lookAt(0, 1.0, 0);

    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x166534, sunPos: [10, 18, 12] });

    const grassTex = createGrassTexture(renderer, '#22c55e', '#4ade80');
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(35, 32),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.88 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Decorative background trees
    [[-8, -6], [8, -7], [-11, -2], [11, -3], [0, -10]].forEach(([tx, tz]) => {
      const t = buildTreeGroup(0.95);
      t.position.set(tx, 0, tz);
      scene.add(t);
    });

    const count = Math.min(3 + level, 6);
    const pool = [...COLOR_ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
    const items: { id: string; label: string; group: THREE.Group; basePos: THREE.Vector3; bounce: number }[] = [];

    const spacing = 2.8;
    const startX = -((count - 1) * spacing) / 2;

    pool.forEach((c, idx) => {
      const group = new THREE.Group();
      const x = startX + idx * spacing;
      const z = (idx % 2 === 0 ? 0.5 : -0.6);

      // Pedestal
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.05, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
      );
      ped.position.y = 0.175;
      ped.receiveShadow = true;
      ped.castShadow = true;
      group.add(ped);

      // Toy car / spinning top / star multi-part object in that color
      const toy = buildVehicleGroup({ bodyColor: c.hex, accentColor: 0xffffff, isKart: true });
      toy.scale.setScalar(0.68);
      toy.position.y = 0.35;
      toy.userData.colorId = c.id;
      group.add(toy);

      group.traverse((ch) => {
        ch.userData.colorId = c.id;
      });
      group.position.set(x, 0, z);
      scene.add(group);
      items.push({ id: c.id, label: c.label, group, basePos: new THREE.Vector3(x, 0, z), bounce: 0 });
    });

    let queue = [...pool].sort(() => Math.random() - 0.5);
    let currentIdx = 0;
    const setPrompt = () => {
      const target = queue[currentIdx];
      setTargetName(target.label);
      callbacksRef.current.onObjectiveUpdate(
        `${target.label} rangli o‘yinchoqni toping! (${currentIdx + 1}/${queue.length})`
      );
    };
    setPrompt();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'playing') return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(items.map((it) => it.group), true);
      if (hits.length === 0) return;

      const pickedId = hits[0].object.userData.colorId as string | undefined;
      if (!pickedId) return;
      const target = queue[currentIdx];
      const matchedItem = items.find((it) => it.id === pickedId);
      if (matchedItem) matchedItem.bounce = 1.0;

      if (pickedId === target.id) {
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(25);
        setFeedback(`To‘g‘ri! Bu ${target.label} rang!`);
        currentIdx++;
        if (currentIdx >= queue.length) {
          setTimeout(() => callbacksRef.current.onVictory(), 550);
        } else {
          setPrompt();
        }
      } else {
        gameAudio.playError();
        setFeedback(`Qayta urinib ko‘ring! ${target.label} rangini izlang.`);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    ctx.startLoop((dt, elapsed) => {
      items.forEach((it, idx) => {
        it.group.children[1].rotation.y = elapsed * 0.7 + idx;
        if (it.bounce > 0) {
          it.bounce = Math.max(0, it.bounce - dt * 2.5);
          it.group.position.y = Math.sin(it.bounce * Math.PI) * 0.9;
        } else {
          it.group.position.y = 0;
        }
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
      {status === 'playing' && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="rounded-2xl border border-white/15 bg-[#0D131F]/90 px-6 py-3 shadow-xl">
            <div className="text-xs text-slate-400">So‘ralgan rang</div>
            <div className="font-display text-2xl font-bold text-amber-400">{targetName}</div>
            {feedback && <div className="mt-1 text-xs text-emerald-300">{feedback}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 2. HAYVONLARNI TOP (3-5 yosh)
// =====================================================================
const ANIMALS: { kind: AnimalKind; name: string }[] = [
  { kind: 'bunny', name: 'Quyoncha' },
  { kind: 'bear', name: 'Ayiqcha' },
  { kind: 'puppy', name: 'Kuchukcha' },
  { kind: 'cat', name: 'Mushukcha' },
  { kind: 'duck', name: 'O‘rdakcha' },
];

export const FindAnimals3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });
  const [targetLabel, setTargetLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 46,
      bgColor: 0x7dd3fc,
      fogColor: 0xbae6fd,
      fogNear: 18,
      fogFar: 55,
    });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 5.5, 11.5);
    camera.lookAt(0, 1.1, 0);
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x15803d });

    const grassTex = createGrassTexture(renderer, '#16a34a', '#22c55e');
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(35, 32),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    [[-9, -6], [9, -6], [-6, -9], [6, -9], [0, -11]].forEach(([tx, tz]) => {
      const t = buildTreeGroup(1.1);
      t.position.set(tx, 0, tz);
      scene.add(t);
    });

    const count = Math.min(3 + Math.floor(level / 2), 5);
    const chosen = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, count);
    const actors: { kind: AnimalKind; name: string; group: THREE.Group; jump: number }[] = [];

    const spacing = 2.9;
    const startX = -((count - 1) * spacing) / 2;
    chosen.forEach((a, i) => {
      const g = buildAnimalGroup(a.kind);
      g.position.set(startX + i * spacing, 0, i % 2 === 0 ? 0.6 : -0.9);
      g.traverse((ch) => {
        ch.userData.animalKind = a.kind;
      });
      scene.add(g);
      actors.push({ ...a, group: g, jump: 0 });
    });

    const order = [...chosen].sort(() => Math.random() - 0.5);
    let idx = 0;
    const updateTarget = () => {
      const cur = order[idx];
      setTargetLabel(cur.name);
      callbacksRef.current.onObjectiveUpdate(`${cur.name}ni topib bosing! (${idx + 1}/${order.length})`);
    };
    updateTarget();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'playing') return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(actors.map((a) => a.group), true);
      if (!hits.length) return;
      const kind = hits[0].object.userData.animalKind as AnimalKind | undefined;
      if (!kind) return;
      const actor = actors.find((a) => a.kind === kind);
      if (actor) actor.jump = 1.0;

      if (kind === order[idx].kind) {
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(30);
        setMsg(`Barakalla! Bu ${order[idx].name}!`);
        idx++;
        if (idx >= order.length) {
          setTimeout(() => callbacksRef.current.onVictory(), 500);
        } else {
          updateTarget();
        }
      } else {
        gameAudio.playError();
        setMsg(`Boshqa hayvoncha! ${order[idx].name}ni qidiring.`);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    ctx.startLoop((dt, elapsed) => {
      actors.forEach((a, i) => {
        a.group.rotation.y = Math.sin(elapsed * 1.4 + i) * 0.25;
        if (a.jump > 0) {
          a.jump = Math.max(0, a.jump - dt * 2.2);
          a.group.position.y = Math.sin(a.jump * Math.PI) * 1.1;
        } else {
          a.group.position.y = Math.abs(Math.sin(elapsed * 2 + i)) * 0.08;
        }
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
      {status === 'playing' && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="rounded-2xl border border-white/15 bg-[#0D131F]/90 px-6 py-3 shadow-xl">
            <div className="text-xs text-slate-400">Qaysi hayvonchani topamiz?</div>
            <div className="font-display text-2xl font-bold text-emerald-400">{targetLabel}</div>
            {msg && <div className="mt-1 text-xs text-amber-300">{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 3. SHAKLLARNI AJRAT (3-5 yosh)
// =====================================================================
const SHAPES = [
  { id: 'kub', label: 'Kub', color: 0xf43f5e },
  { id: 'shar', label: 'Shar', color: 0x3b82f6 },
  { id: 'konus', label: 'Konus', color: 0xf59e0b },
  { id: 'silindr', label: 'Silindr', color: 0x10b981 },
  { id: 'piramida', label: 'Piramida', color: 0xa855f7 },
];

export const ShapeMatching3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });
  const [shapePrompt, setShapePrompt] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, { fov: 46, bgColor: 0x1e293b, fogColor: 0x1e293b, fogNear: 18, fogFar: 45 });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 4.8, 10);
    camera.lookAt(0, 1.0, 0);
    addOutdoorLighting(scene, { skyColor: 0xfef3c7, groundColor: 0x334155 });

    // Wooden studio tabletop
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 })
    );
    table.position.y = -0.25;
    table.receiveShadow = true;
    scene.add(table);

    const count = Math.min(3 + Math.floor(level / 2), 5);
    const chosen = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, count);
    const objects: { id: string; label: string; group: THREE.Group; spinBoost: number }[] = [];
    const spacing = 2.6;
    const startX = -((count - 1) * spacing) / 2;

    chosen.forEach((s, i) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({ color: s.color, roughness: 0.25, clearcoat: 0.85 });
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.2, 20), baseMat);
      base.position.y = 0.1;
      base.receiveShadow = true;
      g.add(base);

      let geo: THREE.BufferGeometry;
      if (s.id === 'kub') geo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
      else if (s.id === 'shar') geo = new THREE.SphereGeometry(0.68, 22, 20);
      else if (s.id === 'konus') geo = new THREE.ConeGeometry(0.7, 1.35, 20);
      else if (s.id === 'silindr') geo = new THREE.CylinderGeometry(0.55, 0.55, 1.25, 20);
      else geo = new THREE.ConeGeometry(0.8, 1.3, 4);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.05;
      mesh.castShadow = true;
      g.add(mesh);

      // Decorative accent ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 8, 24), baseMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.21;
      g.add(ring);

      g.traverse((ch) => (ch.userData.shapeId = s.id));
      g.position.set(startX + i * spacing, 0, 0);
      scene.add(g);
      objects.push({ ...s, group: g, spinBoost: 0 });
    });

    const queue = [...chosen].sort(() => Math.random() - 0.5);
    let qIdx = 0;
    const refreshPrompt = () => {
      const cur = queue[qIdx];
      setShapePrompt(cur.label);
      callbacksRef.current.onObjectiveUpdate(`"${cur.label}" shaklini tanlang (${qIdx + 1}/${queue.length})`);
    };
    refreshPrompt();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'playing') return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(objects.map((o) => o.group), true);
      if (!hits.length) return;
      const sid = hits[0].object.userData.shapeId as string | undefined;
      if (!sid) return;
      const hitObj = objects.find((o) => o.id === sid);
      if (hitObj) hitObj.spinBoost = 1;

      if (sid === queue[qIdx].id) {
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(25);
        setHint(`Ajoyib! Bu ${queue[qIdx].label}!`);
        qIdx++;
        if (qIdx >= queue.length) {
          setTimeout(() => callbacksRef.current.onVictory(), 500);
        } else {
          refreshPrompt();
        }
      } else {
        gameAudio.playError();
        setHint(`Yana bir urining — ${queue[qIdx].label} shaklini bosing.`);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    ctx.startLoop((dt, elapsed) => {
      objects.forEach((o, i) => {
        const shapeMesh = o.group.children[1];
        shapeMesh.rotation.y = elapsed * 0.9 + i;
        if (o.spinBoost > 0) {
          o.spinBoost = Math.max(0, o.spinBoost - dt * 2.4);
          shapeMesh.position.y = 1.05 + Math.sin(o.spinBoost * Math.PI) * 0.65;
        }
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
      {status === 'playing' && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="rounded-2xl border border-white/15 bg-[#0D131F]/90 px-6 py-3 shadow-xl">
            <div className="text-xs text-slate-400">Shakl nomi</div>
            <div className="font-display text-2xl font-bold text-cyan-400">{shapePrompt}</div>
            {hint && <div className="mt-1 text-xs text-emerald-300">{hint}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 4. MEVALARNI YIG' (3-5 yosh)
// =====================================================================
export const CollectFruits3D: React.FC<GameSessionProps> = ({
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
  const inputRef = useRef<VirtualInputState>({ left: false, right: false, up: false, down: false, action: false, action2: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, { fov: 50, bgColor: 0x7dd3fc, fogColor: 0xbae6fd, fogNear: 18, fogFar: 50 });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 5.2, 12.5);
    camera.lookAt(0, 2.5, 0);
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x15803d });

    const grassTex = createGrassTexture(renderer, '#22c55e', '#4ade80');
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 30),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Orchard trees backdrop
    [-7, -3.5, 0, 3.5, 7].forEach((tx) => {
      const t = buildTreeGroup(1.15);
      t.position.set(tx, 0, -5.5);
      scene.add(t);
    });

    // 3D Composite Wooden Basket
    const basket = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.82, 0.85, 16), woodMat);
    body.position.y = 0.45;
    body.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 8, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.88;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.1, 16), rimMat);
    base.position.y = 0.05;
    basket.add(body, rim, base);
    scene.add(basket);

    const targetCount = 8 + level * 3;
    let collected = 0;
    let misses = 0;
    const maxMisses = 5;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Mevalar: ${collected}/${targetCount} · Xatolar: ${misses}/${maxMisses}`
      );
    };
    updateObj();

    const keys = { left: false, right: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let pointerTargetX: number | null = null;
    const onPointerMove = (e: PointerEvent) => {
      if (statusRef.current !== 'playing') return;
      if (e.buttons > 0 || e.pointerType === 'mouse') {
        const rect = renderer.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerTargetX = THREE.MathUtils.clamp(nx * 6.5, -5.8, 5.8);
      }
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    interface FallingItem {
      mesh: THREE.Group;
      kind: 'apple' | 'orange' | 'banana' | 'grape' | 'pinecone';
      speed: number;
    }
    const items: FallingItem[] = [];
    let spawnTimer = 0.5;
    let ended = false;

    ctx.startLoop((dt) => {
      if (statusRef.current !== 'playing' || ended) return;

      const moveLeft = keys.left || inputRef.current.left;
      const moveRight = keys.right || inputRef.current.right;
      if (moveLeft) {
        pointerTargetX = null;
        basket.position.x -= dt * 9.0;
      } else if (moveRight) {
        pointerTargetX = null;
        basket.position.x += dt * 9.0;
      } else if (pointerTargetX !== null) {
        basket.position.x = THREE.MathUtils.damp(basket.position.x, pointerTargetX, 10, dt);
      }
      basket.position.x = THREE.MathUtils.clamp(basket.position.x, -5.8, 5.8);

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.65, 1.35 - level * 0.12);
        const kinds: FallingItem['kind'][] = ['apple', 'orange', 'banana', 'grape', 'pinecone'];
        const kind = Math.random() < 0.2 ? 'pinecone' : kinds[Math.floor(Math.random() * 4)];
        const mesh = buildFruitGroup(kind);
        mesh.position.set(THREE.MathUtils.randFloat(-5.4, 5.4), 8.2, 0);
        scene.add(mesh);
        items.push({ mesh, kind, speed: THREE.MathUtils.randFloat(3.0, 4.2 + level * 0.35) });
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.mesh.position.y -= it.speed * dt;
        it.mesh.rotation.y += dt * 1.8;

        const dx = Math.abs(it.mesh.position.x - basket.position.x);
        const dy = it.mesh.position.y;
        if (dy <= 1.05 && dy >= 0.2 && dx < 1.25) {
          scene.remove(it.mesh);
          items.splice(i, 1);
          if (it.kind === 'pinecone') {
            misses++;
            gameAudio.playError();
            updateObj();
            if (misses >= maxMisses) {
              ended = true;
              callbacksRef.current.onGameOver();
              return;
            }
          } else {
            collected++;
            gameAudio.playCollect();
            callbacksRef.current.onScoreChange(15);
            updateObj();
            if (collected >= targetCount) {
              ended = true;
              callbacksRef.current.onVictory();
              return;
            }
          }
        } else if (dy < -0.5) {
          scene.remove(it.mesh);
          items.splice(i, 1);
        }
      }
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      ctx.dispose();
    };
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && <TouchControls inputRef={inputRef} mode="lr" />}
    </div>
  );
};

// =====================================================================
// 5. ODDIY PAZLLAR (3-5 yosh)
// =====================================================================
const PUZZLE_COLORS = [
  { name: 'Oltin', hex: 0xf59e0b },
  { name: 'Moviy', hex: 0x06b6d4 },
  { name: 'Zumrad', hex: 0x10b981 },
  { name: 'Pushti', hex: 0xec4899 },
];

export const EasyPuzzles3D: React.FC<GameSessionProps> = ({
  level,
  status,
  onScoreChange,
  onObjectiveUpdate,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useLatestRef(status);
  const callbacksRef = useLatestRef({ onScoreChange, onObjectiveUpdate, onVictory });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, { fov: 46, bgColor: 0x172033, fogColor: 0x172033, fogNear: 15, fogFar: 42 });
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 4.4, 9.2);
    camera.lookAt(0, 1.2, 0);
    addOutdoorLighting(scene, { skyColor: 0xfef3c7, groundColor: 0x1e293b });

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x263248, roughness: 0.7 })
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridN = level >= 3 ? 3 : 2;
    const totalBlocks = gridN * gridN;
    const targetColorIdx = (level - 1) % PUZZLE_COLORS.length;
    const targetInfo = PUZZLE_COLORS[targetColorIdx];

    // Reference beacon crystal on top
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshPhysicalMaterial({ color: targetInfo.hex, emissive: targetInfo.hex, emissiveIntensity: 0.35, roughness: 0.15 })
    );
    beacon.position.set(0, 3.6, 0);
    scene.add(beacon);

    callbacksRef.current.onObjectiveUpdate(
      `Barcha 3D kubiklarni bosib "${targetInfo.name}" rangga keltiring!`
    );

    const blocks: { mesh: THREE.Mesh; colorIdx: number; targetRotY: number }[] = [];
    const spacing = 1.65;
    const offset = ((gridN - 1) * spacing) / 2;

    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        let initialIdx = Math.floor(Math.random() * PUZZLE_COLORS.length);
        if (r === 0 && c === 0 && initialIdx === targetColorIdx) {
          initialIdx = (targetColorIdx + 1) % PUZZLE_COLORS.length;
        }
        const mat = new THREE.MeshPhysicalMaterial({
          color: PUZZLE_COLORS[initialIdx].hex,
          roughness: 0.25,
          clearcoat: 0.85,
        });
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), mat);
        cube.position.set(c * spacing - offset, 0.8 + (gridN - 1 - r) * 1.45 - (gridN === 3 ? 0.5 : 0), 0);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData.blockIndex = blocks.length;
        scene.add(cube);
        blocks.push({ mesh: cube, colorIdx: initialIdx, targetRotY: 0 });
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let solved = false;

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'playing' || solved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(blocks.map((b) => b.mesh), false);
      if (!hits.length) return;
      const idx = hits[0].object.userData.blockIndex as number;
      const block = blocks[idx];
      block.colorIdx = (block.colorIdx + 1) % PUZZLE_COLORS.length;
      block.targetRotY += Math.PI / 2;
      (block.mesh.material as THREE.MeshPhysicalMaterial).color.setHex(PUZZLE_COLORS[block.colorIdx].hex);
      gameAudio.playClick();
      callbacksRef.current.onScoreChange(10);

      if (blocks.every((b) => b.colorIdx === targetColorIdx)) {
        solved = true;
        callbacksRef.current.onScoreChange(50);
        setTimeout(() => callbacksRef.current.onVictory(), 500);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    ctx.startLoop((dt, elapsed) => {
      beacon.rotation.y = elapsed * 1.3;
      beacon.position.y = (gridN === 3 ? 4.3 : 3.5) + Math.sin(elapsed * 2.5) * 0.14;
      blocks.forEach((b) => {
        b.mesh.rotation.y = THREE.MathUtils.damp(b.mesh.rotation.y, b.targetRotY, 12, dt);
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
