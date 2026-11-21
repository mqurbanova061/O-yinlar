import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TouchControls, VirtualInputState } from '../components/MobileControls';
import {
  addOutdoorLighting,
  createCheckerTexture,
  createGrassTexture,
  createPitchTexture,
  createThreeContext,
} from '../three/engine';
import {
  buildCharacterGroup,
  buildSoccerBall,
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
// 16. REALISTIK 3D AVTO SIMULYATOR (16-20 yosh)
// =====================================================================
export const RealisticCarSim3D: React.FC<GameSessionProps> = ({
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
  const [camHood, setCamHood] = useState(false);
  const camHoodRef = useLatestRef(camHood);
  const [speedKmh, setSpeedKmh] = useState(0);

  useEffect(() => {
    const onKeyC = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') setCamHood((v) => !v);
    };
    window.addEventListener('keydown', onKeyC);
    return () => window.removeEventListener('keydown', onKeyC);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 58,
      bgColor: 0x0f172a,
      fogColor: 0x0f172a,
      fogNear: 35,
      fogFar: 135,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x93c5fd, groundColor: 0x1e293b, sunPos: [25, 35, 15], shadowBounds: 45 });

    const grassTex = createGrassTexture(renderer, '#1e3a2f', '#264d3d');
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(130, 48),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Circular racing circuit (radius 34)
    const trackRadius = 34;
    const roadRing = new THREE.Mesh(
      new THREE.RingGeometry(trackRadius - 5.5, trackRadius + 5.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.72, metalness: 0.1 })
    );
    roadRing.rotation.x = -Math.PI / 2;
    roadRing.position.y = 0.02;
    roadRing.receiveShadow = true;
    scene.add(roadRing);

    // Red/white apex curbs
    const curbTex = createCheckerTexture(renderer, '#ef4444', '#f8fafc');
    curbTex.repeat.set(24, 1);
    const outerCurb = new THREE.Mesh(
      new THREE.RingGeometry(trackRadius + 5.5, trackRadius + 6.5, 64),
      new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6 })
    );
    outerCurb.rotation.x = -Math.PI / 2;
    outerCurb.position.y = 0.03;
    scene.add(outerCurb);

    // Checkpoints around the ring
    const totalCheckpoints = 6 + level * 2;
    let activeCp = 0;
    let passed = 0;
    const cpRadius = trackRadius;

    const beacon = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.25, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
    );
    scene.add(beacon);

    const placeBeacon = (idx: number) => {
      const ang = (idx / 6) * Math.PI * 2 + Math.PI / 6;
      beacon.position.set(Math.cos(ang) * cpRadius, 2.2, Math.sin(ang) * cpRadius);
      beacon.rotation.y = -ang;
    };
    placeBeacon(0);

    const car = buildVehicleGroup({ bodyColor: 0x334155, accentColor: 0xec4899 });
    car.position.set(trackRadius, 0, 0);
    scene.add(car);

    let speed = 0;
    let heading = 0;
    let timeLeft = Math.max(42, 65 - level * 5);
    let ended = false;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Nazorat nuqtalari: ${passed}/${totalCheckpoints} · Vaqt: ${Math.ceil(timeLeft)}s`
      );
    };
    updateObj();

    ctx.startLoop((dt) => {
      if (statusRef.current !== 'playing' || ended) return;

      timeLeft -= dt;
      if (timeLeft <= 0) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      const throttle = keysRef.current.up || touchRef.current.up;
      const brake = keysRef.current.down || touchRef.current.down;
      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;

      if (throttle) speed += 16 * dt;
      else if (brake) speed -= 22 * dt;
      else speed *= Math.pow(0.45, dt);

      speed = THREE.MathUtils.clamp(speed, -10, 32);

      const steerRate = (Math.abs(speed) > 0.8 ? 1 : 0.2) * (speed >= 0 ? 1 : -1);
      if (left) heading += 1.65 * steerRate * dt;
      if (right) heading -= 1.65 * steerRate * dt;

      car.rotation.y = heading;
      car.position.x -= Math.sin(heading) * speed * dt;
      car.position.z -= Math.cos(heading) * speed * dt;

      // Soft boundary at outer arena
      const distFromCenter = Math.hypot(car.position.x, car.position.z);
      if (distFromCenter > 56) {
        car.position.multiplyScalar(56 / distFromCenter);
        speed *= 0.6;
      }

      setSpeedKmh(Math.round(Math.abs(speed) * 4.5));
      updateObj();

      // Check beacon pass
      const dx = car.position.x - beacon.position.x;
      const dz = car.position.z - beacon.position.z;
      if (Math.hypot(dx, dz) < 5.5) {
        passed++;
        activeCp = (activeCp + 1) % 6;
        placeBeacon(activeCp);
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(40);
        if (passed >= totalCheckpoints) {
          ended = true;
          callbacksRef.current.onScoreChange(Math.round(timeLeft * 2));
          callbacksRef.current.onVictory();
          return;
        }
      }

      // Camera Chase vs Hood
      const fwdX = -Math.sin(heading);
      const fwdZ = -Math.cos(heading);
      if (camHoodRef.current) {
        camera.position.set(car.position.x + fwdX * 0.6, 1.45, car.position.z + fwdZ * 0.6);
        camera.lookAt(car.position.x + fwdX * 18, 1.2, car.position.z + fwdZ * 18);
      } else {
        const targetCamX = car.position.x - fwdX * 8.2;
        const targetCamZ = car.position.z - fwdZ * 8.2;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 7, dt);
        camera.position.y = 3.6;
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 7, dt);
        camera.lookAt(car.position.x + fwdX * 4, 1.0, car.position.z + fwdZ * 4);
      }
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <>
          <div className="pointer-events-none absolute top-14 right-3 sm:right-6 z-10 rounded-xl border border-slate-700 bg-[#0D131F]/90 px-4 py-2 text-right">
            <div className="font-mono text-2xl font-bold text-pink-400 tabular-nums">{speedKmh}</div>
            <div className="text-[11px] text-slate-400">km/soat</div>
          </div>
          <TouchControls
            inputRef={touchRef}
            mode="drive"
            actionLabel={camHood ? 'Tashqi kamera' : 'Kapot kamera'}
            onActionPress={() => setCamHood((v) => !v)}
          />
        </>
      )}
    </div>
  );
};

// =====================================================================
// 17. 3D OCHIQ DUNYO SARGUZASHTI (16-20 yosh)
// =====================================================================
function valleyHeight(x: number, z: number) {
  return Math.sin(x * 0.06) * Math.cos(z * 0.06) * 1.4;
}

export const OpenWorld3D: React.FC<GameSessionProps> = ({
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

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 58,
      bgColor: 0x38bdf8,
      fogColor: 0xbae6fd,
      fogNear: 30,
      fogFar: 115,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x166534, shadowBounds: 40 });

    const grassTex = createGrassTexture(renderer, '#16a34a', '#22c55e');
    const terrainGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, valleyHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Pine trees
    for (let i = 0; i < 28; i++) {
      const ang = i * 2.399;
      const rad = 14 + (i % 5) * 9;
      const tx = Math.cos(ang) * rad;
      const tz = Math.sin(ang) * rad;
      const t = buildTreeGroup(1.1 + (i % 3) * 0.25);
      t.position.set(tx, valleyHeight(tx, tz), tz);
      scene.add(t);
    }

    const rover = buildVehicleGroup({ bodyColor: 0x14b8a6, accentColor: 0xfacc15 });
    rover.position.set(0, valleyHeight(0, 0), 0);
    scene.add(rover);

    const beaconCount = 4 + level;
    const beacons: { group: THREE.Group; active: boolean }[] = [];
    for (let i = 0; i < beaconCount; i++) {
      const ang = (i / beaconCount) * Math.PI * 2 + 0.4;
      const rad = 22 + (i % 2) * 16;
      const bx = Math.cos(ang) * rad;
      const bz = Math.sin(ang) * rad;
      const by = valleyHeight(bx, bz);

      const g = new THREE.Group();
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.7, 3.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
      );
      pillar.position.y = 1.8;
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.65, 0),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
      );
      orb.position.y = 4.2;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 22, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.38 })
      );
      beam.position.y = 11;
      g.add(pillar, orb, beam);
      g.position.set(bx, by, bz);
      scene.add(g);
      beacons.push({ group: g, active: false });
    }

    let heading = 0;
    let speed = 0;
    let found = 0;
    let ended = false;
    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `Ochiq dunyo mayog‘lari: ${found}/${beaconCount} (Nur ustunlariga boring)`
      );
    };
    updateObj();

    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      const throttle = keysRef.current.up || touchRef.current.up;
      const reverse = keysRef.current.down || touchRef.current.down;
      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;

      if (throttle) speed += 18 * dt;
      else if (reverse) speed -= 16 * dt;
      else speed *= Math.pow(0.35, dt);
      speed = THREE.MathUtils.clamp(speed, -8, 18);

      if (left) heading += 1.9 * dt;
      if (right) heading -= 1.9 * dt;

      rover.rotation.y = heading;
      rover.position.x = THREE.MathUtils.clamp(rover.position.x - Math.sin(heading) * speed * dt, -68, 68);
      rover.position.z = THREE.MathUtils.clamp(rover.position.z - Math.cos(heading) * speed * dt, -68, 68);
      rover.position.y = valleyHeight(rover.position.x, rover.position.z);

      beacons.forEach((b) => {
        b.group.children[1].rotation.y = elapsed * 2;
        if (!b.active && rover.position.distanceTo(b.group.position) < 3.6) {
          b.active = true;
          b.group.children[2].visible = false;
          (b.group.children[1] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x10b981,
            emissiveIntensity: 1.0,
          });
          found++;
          gameAudio.playSuccess();
          callbacksRef.current.onScoreChange(50);
          updateObj();
          if (found >= beaconCount && !ended) {
            ended = true;
            setTimeout(() => callbacksRef.current.onVictory(), 450);
          }
        }
      });

      const fwdX = -Math.sin(heading);
      const fwdZ = -Math.cos(heading);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, rover.position.x - fwdX * 10, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, rover.position.y + 4.8, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, rover.position.z - fwdZ * 10, 6, dt);
      camera.lookAt(rover.position.x + fwdX * 4, rover.position.y + 1.3, rover.position.z + fwdZ * 4);
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && <TouchControls inputRef={touchRef} mode="dpad" actionLabel="Tormoz" />}
    </div>
  );
};

// =====================================================================
// 18. REALISTIK FUTBOL SIMULYATORI (16-20 yosh)
// =====================================================================
export const RealisticFootballSim3D: React.FC<GameSessionProps> = ({
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
  const kickFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 52,
      bgColor: 0x071024,
      fogColor: 0x071024,
      fogNear: 35,
      fogFar: 95,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0xe0f2fe, groundColor: 0x166534, shadowBounds: 35 });

    const pitchTex = createPitchTexture(renderer);
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 52),
      new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.85 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Goal at z = -23
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.4 });
    const gL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 10), postMat);
    gL.position.set(-4.5, 1.6, -23);
    const gR = gL.clone();
    gR.position.x = 4.5;
    const gBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9.2, 10), postMat);
    gBar.rotation.z = Math.PI / 2;
    gBar.position.set(0, 3.2, -23);
    scene.add(gL, gR, gBar);

    const player = buildCharacterGroup(0x22c55e, 0xfacc15);
    player.position.set(0, 0, 12);
    scene.add(player);

    const ball = buildSoccerBall(0.42);
    ball.position.set(0, 0.42, 10.5);
    scene.add(ball);

    const keeper = buildCharacterGroup(0xfacc15, 0x0f172a);
    keeper.position.set(0, 0, -21.8);
    scene.add(keeper);

    // Patrolling defenders
    const defenderCount = 1 + level;
    const defenders = Array.from({ length: defenderCount }).map((_, i) => {
      const d = buildCharacterGroup(0xef4444, 0xffffff);
      d.position.set((i % 2 === 0 ? -1 : 1) * 4, 0, -4 - i * 4.5);
      scene.add(d);
      return d;
    });

    let ballVel = new THREE.Vector3();
    let ballFree = false;
    let goals = 0;
    const targetGoals = 2 + level;
    let timeLeft = 75;
    let ended = false;

    const resetPlay = () => {
      player.position.set(0, 0, 12);
      ball.position.set(0, 0.42, 10.5);
      ballVel.set(0, 0, 0);
      ballFree = false;
    };

    const kickBall = () => {
      if (statusRef.current !== 'playing' || ended) return;
      if (ball.position.distanceTo(player.position) < 2.6) {
        ballFree = true;
        const dir = new THREE.Vector3(0, 0.18, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        ballVel.copy(dir).multiplyScalar(25);
        gameAudio.playJump();
      }
    };
    kickFnRef.current = kickBall;

    let prevSpace = false;
    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      timeLeft -= dt;
      callbacksRef.current.onObjectiveUpdate(
        `Gollar: ${goals}/${targetGoals} · Qolgan vaqt: ${Math.ceil(timeLeft)}s`
      );
      if (timeLeft <= 0) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vz = (down ? 1 : 0) - (up ? 1 : 0);
      if (vx !== 0 || vz !== 0) {
        const len = Math.hypot(vx, vz);
        player.position.x = THREE.MathUtils.clamp(player.position.x + (vx / len) * 9.2 * dt, -15, 15);
        player.position.z = THREE.MathUtils.clamp(player.position.z + (vz / len) * 9.2 * dt, -22, 22);
        player.rotation.y = Math.atan2(-vx, -vz);
      }

      if (keysRef.current.space && !prevSpace) kickBall();
      prevSpace = keysRef.current.space;

      // Dribble ball when near player
      if (!ballFree) {
        const fwdX = -Math.sin(player.rotation.y);
        const fwdZ = -Math.cos(player.rotation.y);
        ball.position.x = THREE.MathUtils.damp(ball.position.x, player.position.x + fwdX * 1.15, 14, dt);
        ball.position.z = THREE.MathUtils.damp(ball.position.z, player.position.z + fwdZ * 1.15, 14, dt);
        ball.position.y = 0.42;
      } else {
        ball.position.addScaledVector(ballVel, dt);
        ballVel.y -= 9.8 * dt;
        if (ball.position.y < 0.42) {
          ball.position.y = 0.42;
          ballVel.y = Math.abs(ballVel.y) * 0.45;
        }
        ballVel.multiplyScalar(Math.pow(0.65, dt));
        if (ballVel.length() < 1.2 && ball.position.distanceTo(player.position) < 1.8) {
          ballFree = false;
        }
      }

      // Keeper & Defenders patrol
      keeper.position.x = Math.sin(elapsed * (2.2 + level * 0.4)) * 3.6;
      defenders.forEach((d, idx) => {
        d.position.x = Math.sin(elapsed * 1.8 + idx * 2.1) * 7.5;
        if (d.position.distanceTo(ball.position) < 1.1) {
          gameAudio.playError();
          resetPlay();
        }
      });

      // Keeper save
      if (
        ball.position.z < -21.0 &&
        ball.position.z > -22.8 &&
        Math.abs(ball.position.x - keeper.position.x) < 1.05
      ) {
        gameAudio.playError();
        resetPlay();
      }

      // Goal scored
      if (ball.position.z <= -23.1 && Math.abs(ball.position.x) < 4.3 && ball.position.y < 3.1) {
        goals++;
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(80);
        resetPlay();
        if (goals >= targetGoals) {
          ended = true;
          callbacksRef.current.onVictory();
          return;
        }
      } else if (Math.abs(ball.position.x) > 16 || ball.position.z < -25 || ball.position.z > 25) {
        resetPlay();
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.5, 6, dt);
      camera.position.y = 9.5;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 13.5, 6, dt);
      camera.lookAt(ball.position.x, 0.8, ball.position.z - 4);
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
          onActionPress={() => kickFnRef.current()}
        />
      )}
    </div>
  );
};

// =====================================================================
// 19. 3D SHAHAR HAYDASH (16-20 yosh)
// =====================================================================
export const CityDriving3D: React.FC<GameSessionProps> = ({
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
      bgColor: 0x0b1120,
      fogColor: 0x0b1120,
      fogNear: 28,
      fogFar: 95,
    });
    const { scene, camera } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x60a5fa, groundColor: 0x0f172a, shadowBounds: 45 });

    // City asphalt ground
    const cityGround = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 })
    );
    cityGround.rotation.x = -Math.PI / 2;
    cityGround.receiveShadow = true;
    scene.add(cityGround);

    // City blocks on a grid (streets at multiples of 16)
    const buildings: { x: number; z: number; halfW: number; halfD: number }[] = [];
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.55 });

    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        if (gx === 0 && gz === 0) continue;
        const bx = gx * 18;
        const bz = gz * 18;
        const h = 6 + ((Math.abs(gx * 3 + gz * 5)) % 4) * 3.5;
        const b = new THREE.Mesh(new THREE.BoxGeometry(9.5, h, 9.5), blockMat);
        b.position.set(bx, h / 2, bz);
        b.castShadow = true;
        b.receiveShadow = true;
        scene.add(b);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.35, 8.8), winMat);
        cap.position.set(bx, h + 0.18, bz);
        scene.add(cap);

        buildings.push({ x: bx, z: bz, halfW: 5.2, halfD: 5.2 });
      }
    }

    const car = buildVehicleGroup({ bodyColor: 0xf59e0b, accentColor: 0x0f172a });
    car.position.set(0, 0, 0);
    scene.add(car);

    const deliveryBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 4.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9, transparent: true, opacity: 0.65 })
    );
    scene.add(deliveryBeacon);

    const intersections = [-27, -9, 9, 27];
    const placeTarget = () => {
      const tx = intersections[Math.floor(Math.random() * intersections.length)];
      const tz = intersections[Math.floor(Math.random() * intersections.length)];
      deliveryBeacon.position.set(tx, 2.25, tz);
    };
    placeTarget();

    let heading = 0;
    let speed = 0;
    let deliveries = 0;
    const goalDeliveries = 3 + level;
    let timeLeft = 75;
    let ended = false;

    ctx.startLoop((dt) => {
      if (statusRef.current !== 'playing' || ended) return;

      timeLeft -= dt;
      callbacksRef.current.onObjectiveUpdate(
        `Yetkazib berish: ${deliveries}/${goalDeliveries} · Vaqt: ${Math.ceil(timeLeft)}s`
      );
      if (timeLeft <= 0) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      const throttle = keysRef.current.up || touchRef.current.up;
      const reverse = keysRef.current.down || touchRef.current.down;
      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const handbrake = keysRef.current.space || touchRef.current.action;

      if (handbrake) speed *= Math.pow(0.05, dt);
      else if (throttle) speed += 17 * dt;
      else if (reverse) speed -= 14 * dt;
      else speed *= Math.pow(0.4, dt);
      speed = THREE.MathUtils.clamp(speed, -8, 22);

      if (Math.abs(speed) > 0.3) {
        const dir = speed >= 0 ? 1 : -1;
        if (left) heading += 2.1 * dir * dt;
        if (right) heading -= 2.1 * dir * dt;
      }

      const prevX = car.position.x;
      const prevZ = car.position.z;
      car.rotation.y = heading;
      car.position.x = THREE.MathUtils.clamp(car.position.x - Math.sin(heading) * speed * dt, -46, 46);
      car.position.z = THREE.MathUtils.clamp(car.position.z - Math.cos(heading) * speed * dt, -46, 46);

      // Building AABB collision
      for (const b of buildings) {
        if (
          Math.abs(car.position.x - b.x) < b.halfW + 0.9 &&
          Math.abs(car.position.z - b.z) < b.halfD + 0.9
        ) {
          car.position.x = prevX;
          car.position.z = prevZ;
          speed *= -0.3;
          break;
        }
      }

      if (Math.hypot(car.position.x - deliveryBeacon.position.x, car.position.z - deliveryBeacon.position.z) < 3.2) {
        deliveries++;
        timeLeft += 10;
        gameAudio.playSuccess();
        callbacksRef.current.onScoreChange(60);
        if (deliveries >= goalDeliveries) {
          ended = true;
          callbacksRef.current.onVictory();
          return;
        }
        placeTarget();
      }

      const fwdX = -Math.sin(heading);
      const fwdZ = -Math.cos(heading);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, car.position.x - fwdX * 9.5, 6, dt);
      camera.position.y = 5.2;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, car.position.z - fwdZ * 9.5, 6, dt);
      camera.lookAt(car.position.x + fwdX * 3, 1.2, car.position.z + fwdZ * 3);
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && <TouchControls inputRef={touchRef} mode="drive" actionLabel="Tormoz" />}
    </div>
  );
};

// =====================================================================
// 20. OMON QOLISH TADQIQOTI (16-20 yosh)
// =====================================================================
export const SurvivalExploration3D: React.FC<GameSessionProps> = ({
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
  const [warmth, setWarmth] = useState(100);
  const actionFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createThreeContext(container, {
      fov: 55,
      bgColor: 0x0c1322,
      fogColor: 0x0c1322,
      fogNear: 15,
      fogFar: 58,
    });
    const { scene, camera, renderer } = ctx;
    addOutdoorLighting(scene, { skyColor: 0x64748b, groundColor: 0x0f172a, sunIntensity: 0.75 });

    const grassTex = createGrassTexture(renderer, '#143326', '#1b4332');
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(55, 36),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Central Campfire
    const fireGroup = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 8), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 4) * Math.PI;
      log.position.y = 0.16;
      fireGroup.add(log);
    }
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.5 })
    );
    flame.position.y = 0.8;
    const fireLight = new THREE.PointLight(0xfb923c, 6, 18, 1.5);
    fireLight.position.y = 1.6;
    fireGroup.add(flame, fireLight);
    scene.add(fireGroup);

    // Forest trees
    for (let i = 0; i < 24; i++) {
      const ang = i * 2.4;
      const rad = 11 + (i % 4) * 5.5;
      const t = buildTreeGroup(1.1 + (i % 2) * 0.25, 0x14532d);
      t.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      scene.add(t);
    }

    // Gatherable resources (wood logs & glowing crystals/berries)
    const targetRes = 6 + level * 2;
    const resources: { mesh: THREE.Group; taken: boolean }[] = [];
    for (let i = 0; i < targetRes + 2; i++) {
      const ang = (i / (targetRes + 2)) * Math.PI * 2 + 0.3;
      const rad = 8 + (i % 3) * 6;
      const g = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.85 })
      );
      box.rotation.z = Math.PI / 2;
      box.position.y = 0.25;
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 })
      );
      marker.position.y = 1.1;
      g.add(box, marker);
      g.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      scene.add(g);
      resources.push({ mesh: g, taken: false });
    }

    const player = buildCharacterGroup(0xea580c, 0xfef08a);
    player.position.set(0, 0, 3.2);
    scene.add(player);

    let warmthVal = 100;
    let gathered = 0;
    let ended = false;

    const updateObj = () => {
      callbacksRef.current.onObjectiveUpdate(
        `O‘tin/Resurslar: ${gathered}/${targetRes} (Gulxan yonida isining!)`
      );
    };
    updateObj();

    const gatherAction = () => {
      if (statusRef.current !== 'playing' || ended) return;
      resources.forEach((r) => {
        if (!r.taken && r.mesh.position.distanceTo(player.position) < 2.6) {
          r.taken = true;
          r.mesh.visible = false;
          gathered++;
          warmthVal = Math.min(100, warmthVal + 14);
          gameAudio.playCollect();
          callbacksRef.current.onScoreChange(30);
          updateObj();
          if (gathered >= targetRes) {
            ended = true;
            callbacksRef.current.onScoreChange(70);
            setTimeout(() => callbacksRef.current.onVictory(), 400);
          }
        }
      });
    };
    actionFnRef.current = gatherAction;

    let prevSpace = false;
    ctx.startLoop((dt, elapsed) => {
      if (statusRef.current !== 'playing' || ended) return;

      flame.scale.y = 0.9 + Math.sin(elapsed * 9) * 0.16;

      const left = keysRef.current.left || touchRef.current.left;
      const right = keysRef.current.right || touchRef.current.right;
      const up = keysRef.current.up || touchRef.current.up;
      const down = keysRef.current.down || touchRef.current.down;

      const vx = (right ? 1 : 0) - (left ? 1 : 0);
      const vz = (down ? 1 : 0) - (up ? 1 : 0);
      if (vx !== 0 || vz !== 0) {
        const len = Math.hypot(vx, vz);
        player.position.x = THREE.MathUtils.clamp(player.position.x + (vx / len) * 7.5 * dt, -26, 26);
        player.position.z = THREE.MathUtils.clamp(player.position.z + (vz / len) * 7.5 * dt, -26, 26);
        player.rotation.y = Math.atan2(-vx, -vz);
      }

      if (keysRef.current.space && !prevSpace) gatherAction();
      prevSpace = keysRef.current.space;

      // Auto-gather if walking right over it as well for smooth playability
      resources.forEach((r) => {
        if (!r.taken) {
          r.mesh.children[1].rotation.y = elapsed * 2;
          if (r.mesh.position.distanceTo(player.position) < 1.55) {
            gatherAction();
          }
        }
      });

      const distToFire = player.position.length();
      if (distToFire < 4.5) {
        warmthVal = Math.min(100, warmthVal + dt * 18);
      } else {
        warmthVal -= dt * (4.5 + level * 0.8);
      }
      setWarmth(Math.max(0, Math.round(warmthVal)));

      if (warmthVal <= 0) {
        ended = true;
        callbacksRef.current.onGameOver();
        return;
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 6, dt);
      camera.position.y = 7.2;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 9.5, 6, dt);
      camera.lookAt(player.position.x, 1.0, player.position.z);
    });

    return () => ctx.dispose();
  }, [level]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'playing' && (
        <>
          <div className="pointer-events-none absolute top-14 right-3 sm:right-6 z-10 rounded-xl border border-slate-700 bg-[#0D131F]/90 px-4 py-2">
            <div className="text-[11px] text-slate-400">Issiqlik</div>
            <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all ${warmth > 35 ? 'bg-orange-400' : 'bg-rose-500'}`}
                style={{ width: `${warmth}%` }}
              />
            </div>
          </div>
          <TouchControls
            inputRef={touchRef}
            mode="dpad"
            actionLabel="Yig‘ish"
            onActionPress={() => actionFnRef.current()}
          />
        </>
      )}
    </div>
  );
};
