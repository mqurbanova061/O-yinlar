import * as THREE from 'three';

// Composite 3-12 part procedural 3D models with bottom-center pivots and varied PBR roughness/metalness

export function buildVehicleGroup(options: {
  bodyColor: number;
  accentColor?: number;
  isKart?: boolean;
}): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: options.bodyColor,
    metalness: 0.65,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: options.accentColor ?? 0xf59e0b,
    metalness: 0.4,
    roughness: 0.35,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.25,
    metalness: 0.88,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  // 1. Chassis lower skirt
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(options.isKart ? 1.45 : 1.85, 0.36, options.isKart ? 2.5 : 3.9),
    bodyMat
  );
  chassis.position.y = 0.48;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 2. Sculpted upper hood & cabin
  if (options.isKart) {
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.0), accentMat);
    nose.position.set(0, 0.66, -0.75);
    nose.castShadow = true;
    group.add(nose);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.7), cabinMat);
    seat.position.set(0, 0.85, 0.2);
    seat.castShadow = true;
    group.add(seat);

    // Driver helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), accentMat);
    helmet.position.set(0, 1.28, 0.15);
    helmet.castShadow = true;
    group.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.2), cabinMat);
    visor.position.set(0, 1.28, -0.04);
    group.add(visor);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 1.95), cabinMat);
    cabin.position.set(0, 0.88, 0.15);
    cabin.castShadow = true;
    group.add(cabin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 3.85), accentMat);
    stripe.position.set(0, 0.68, 0);
    group.add(stripe);
  }

  // 3. Rear spoiler
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(options.isKart ? 1.35 : 1.75, 0.1, 0.35),
    accentMat
  );
  wing.position.set(0, options.isKart ? 0.95 : 1.02, options.isKart ? 1.15 : 1.75);
  wing.castShadow = true;
  group.add(wing);

  // 4. Headlights & taillights
  const hlGeo = new THREE.BoxGeometry(0.32, 0.12, 0.08);
  const hlL = new THREE.Mesh(hlGeo, glowMat);
  hlL.position.set(-0.56, 0.52, options.isKart ? -1.25 : -1.96);
  const hlR = new THREE.Mesh(hlGeo, glowMat);
  hlR.position.set(0.56, 0.52, options.isKart ? -1.25 : -1.96);
  group.add(hlL, hlR);

  const tlL = new THREE.Mesh(hlGeo, tailMat);
  tlL.position.set(-0.56, 0.52, options.isKart ? 1.25 : 1.96);
  const tlR = new THREE.Mesh(hlGeo, tailMat);
  tlR.position.set(0.56, 0.52, options.isKart ? 1.25 : 1.96);
  group.add(tlL, tlR);

  // 5. Four wheels with metallic rims
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.28, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions: [number, number, number][] = options.isKart
    ? [
        [-0.78, 0.34, -0.82],
        [0.78, 0.34, -0.82],
        [-0.82, 0.34, 0.85],
        [0.82, 0.34, 0.85],
      ]
    : [
        [-0.95, 0.34, -1.22],
        [0.95, 0.34, -1.22],
        [-0.95, 0.34, 1.22],
        [0.95, 0.34, 1.22],
      ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheel.add(rim);
    group.add(wheel);
  });

  return group;
}

export function buildTreeGroup(scale = 1, leafColor = 0x2e7d32): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9, metalness: 0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.72, metalness: 0 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 2.2, 10), trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.0, 9), leafMat);
  c1.position.y = 2.6;
  c1.castShadow = true;
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.7, 9), leafMat);
  c2.position.y = 3.6;
  c2.castShadow = true;
  const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 9), leafMat);
  c3.position.y = 4.45;
  c3.castShadow = true;
  group.add(c1, c2, c3);

  group.scale.setScalar(scale);
  return group;
}

export type AnimalKind = 'bunny' | 'bear' | 'puppy' | 'cat' | 'duck';

export function buildAnimalGroup(kind: AnimalKind): THREE.Group {
  const group = new THREE.Group();
  const palette: Record<AnimalKind, { main: number; accent: number }> = {
    bunny: { main: 0xf8fafc, accent: 0xf472b6 },
    bear: { main: 0x92400e, accent: 0xfde68a },
    puppy: { main: 0xd97706, accent: 0x451a03 },
    cat: { main: 0xfb923c, accent: 0xfef3c7 },
    duck: { main: 0xfacc15, accent: 0xea580c },
  };
  const colors = palette[kind];
  const bodyMat = new THREE.MeshStandardMaterial({ color: colors.main, roughness: 0.65, metalness: 0.05 });
  const accentMat = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.2 });

  // Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.65, 18, 16), bodyMat);
  torso.scale.set(1, 1.15, 0.92);
  torso.position.y = 0.72;
  torso.castShadow = true;
  group.add(torso);

  // Belly patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 14), accentMat);
  belly.position.set(0, 0.68, 0.32);
  group.add(belly);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 16), bodyMat);
  head.position.set(0, 1.65, 0.08);
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.075, 10, 10);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.18, 1.72, 0.52);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.18, 1.72, 0.52);
  group.add(eyeL, eyeR);

  // Nose or Beak
  if (kind === 'duck') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 10), accentMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.6, 0.68);
    group.add(beak);
  } else {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), accentMat);
    nose.position.set(0, 1.6, 0.58);
    group.add(nose);
  }

  // Ears by animal type
  if (kind === 'bunny') {
    const earGeo = new THREE.CapsuleGeometry(0.11, 0.55, 6, 10);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.22, 2.38, 0.05);
    earL.rotation.z = 0.14;
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.22, 2.38, 0.05);
    earR.rotation.z = -0.14;
    group.add(earL, earR);
  } else if (kind === 'bear') {
    const earGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.38, 2.08, 0.05);
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.38, 2.08, 0.05);
    group.add(earL, earR);
  } else if (kind === 'cat') {
    const earGeo = new THREE.ConeGeometry(0.17, 0.35, 8);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.28, 2.15, 0.06);
    earL.rotation.z = 0.2;
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.28, 2.15, 0.06);
    earR.rotation.z = -0.2;
    group.add(earL, earR);
  } else if (kind === 'puppy') {
    const earGeo = new THREE.BoxGeometry(0.18, 0.44, 0.14);
    const earL = new THREE.Mesh(earGeo, accentMat);
    earL.position.set(-0.48, 1.66, 0.06);
    earL.rotation.z = 0.25;
    const earR = new THREE.Mesh(earGeo, accentMat);
    earR.position.set(0.48, 1.66, 0.06);
    earR.rotation.z = -0.25;
    group.add(earL, earR);
  }

  // Feet
  const footGeo = new THREE.SphereGeometry(0.2, 12, 10);
  const footL = new THREE.Mesh(footGeo, kind === 'duck' ? accentMat : bodyMat);
  footL.scale.set(1, 0.55, 1.35);
  footL.position.set(-0.26, 0.12, 0.22);
  const footR = new THREE.Mesh(footGeo, kind === 'duck' ? accentMat : bodyMat);
  footR.scale.set(1, 0.55, 1.35);
  footR.position.set(0.26, 0.12, 0.22);
  group.add(footL, footR);

  return group;
}

export function buildCharacterGroup(suitColor = 0x06b6d4, visorColor = 0xf59e0b): THREE.Group {
  const group = new THREE.Group();
  const suitMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.45, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: visorColor,
    metalness: 0.5,
    roughness: 0.1,
    clearcoat: 1,
  });

  const legGeo = new THREE.CapsuleGeometry(0.14, 0.45, 6, 10);
  const legL = new THREE.Mesh(legGeo, darkMat);
  legL.position.set(-0.2, 0.36, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, darkMat);
  legR.position.set(0.2, 0.36, 0);
  legR.castShadow = true;
  group.add(legL, legR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.78, 0.42), suitMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.22), darkMat);
  pack.position.set(0, 1.08, 0.28);
  group.add(pack);

  const armGeo = new THREE.CapsuleGeometry(0.11, 0.42, 6, 10);
  const armL = new THREE.Mesh(armGeo, suitMat);
  armL.position.set(-0.46, 1.05, 0);
  const armR = new THREE.Mesh(armGeo, suitMat);
  armR.position.set(0.46, 1.05, 0);
  group.add(armL, armR);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), suitMat);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.26), visorMat);
  visor.position.set(0, 1.74, -0.2);
  group.add(visor);

  return group;
}

export function buildSpaceshipGroup(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 0.8,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    metalness: 0.45,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    metalness: 0.2,
    roughness: 0.08,
    clearcoat: 1,
  });
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
  });

  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.2, 8), hullMat);
  fuselage.rotation.x = -Math.PI / 2;
  fuselage.castShadow = true;
  group.add(fuselage);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 14), glassMat);
  cockpit.scale.set(0.9, 0.65, 1.8);
  cockpit.position.set(0, 0.28, -0.25);
  group.add(cockpit);

  const wingGeo = new THREE.BoxGeometry(3.2, 0.1, 0.95);
  const wings = new THREE.Mesh(wingGeo, trimMat);
  wings.position.set(0, -0.05, 0.45);
  wings.castShadow = true;
  group.add(wings);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.85), trimMat);
  fin.position.set(0, 0.48, 0.85);
  group.add(fin);

  const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 12), hullMat);
  engineL.rotation.x = Math.PI / 2;
  engineL.position.set(-0.7, -0.05, 1.15);
  const engineR = engineL.clone();
  engineR.position.x = 0.7;
  group.add(engineL, engineR);

  const glowL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), thrusterMat);
  glowL.position.set(-0.7, -0.05, 1.55);
  const glowR = glowL.clone();
  glowR.position.x = 0.7;
  group.add(glowL, glowR);

  return group;
}

export function buildFruitGroup(kind: 'apple' | 'orange' | 'banana' | 'grape' | 'pinecone'): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });

  if (kind === 'apple') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.28, clearcoat: 0.7 })
    );
    body.position.y = 0.45;
    body.castShadow = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), stemMat);
    stem.position.y = 0.94;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.12), leafMat);
    leaf.position.set(0.12, 0.96, 0);
    leaf.rotation.z = 0.4;
    group.add(body, stem, leaf);
  } else if (kind === 'orange') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
    );
    body.position.y = 0.44;
    body.castShadow = true;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.14), leafMat);
    leaf.position.set(0.08, 0.88, 0);
    group.add(body, leaf);
  } else if (kind === 'banana') {
    const curve = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.13, 10, 18, Math.PI * 0.85),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 })
    );
    curve.position.y = 0.45;
    curve.rotation.z = Math.PI * 0.55;
    curve.castShadow = true;
    group.add(curve);
  } else if (kind === 'grape') {
    const grapeMat = new THREE.MeshPhysicalMaterial({ color: 0x9333ea, roughness: 0.3, clearcoat: 0.5 });
    const offsets: [number, number, number][] = [
      [0, 0.3, 0],
      [-0.18, 0.5, 0.1],
      [0.18, 0.5, -0.1],
      [0, 0.52, -0.18],
      [-0.15, 0.72, -0.05],
      [0.15, 0.72, 0.08],
    ];
    offsets.forEach(([x, y, z]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), grapeMat);
      b.position.set(x, y, z);
      b.castShadow = true;
      group.add(b);
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), stemMat);
    stem.position.y = 0.94;
    group.add(stem);
  } else {
    // Pinecone (hazard to avoid)
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.75, 8), coneMat);
    c1.position.y = 0.45;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), coneMat);
    c2.position.y = 0.32;
    group.add(c1, c2);
  }
  return group;
}

export function buildSoccerBall(radius = 0.42): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.35, clearcoat: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 20), whiteMat);
  sphere.castShadow = true;
  group.add(sphere);

  const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.01, 0), darkMat);
  patch.scale.setScalar(0.995);
  // Subtle pentagon bands
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.88, radius * 0.07, 6, 12), darkMat);
  group.add(ring);
  ring.rotation.x = Math.PI / 3;
  const ring2 = ring.clone();
  ring2.rotation.y = Math.PI / 2;
  group.add(ring2);
  patch.visible = false;
  return group;
}
