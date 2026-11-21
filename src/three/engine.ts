import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    cachedSoftwareGl = false;
  }
  return cachedSoftwareGl;
}

export interface ThreeSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  dispose: () => void;
  startLoop: (onUpdate: (dt: number, elapsed: number) => void) => void;
  stopLoop: () => void;
}

export function createThreeContext(
  container: HTMLElement,
  options?: {
    fov?: number;
    near?: number;
    far?: number;
    bgColor?: number;
    fogColor?: number;
    fogNear?: number;
    fogFar?: number;
    fogDensity?: number;
  }
): ThreeSceneContext {
  const isSoftwareGl = detectSoftwareGl();
  const width = Math.max(container.clientWidth || window.innerWidth, 320);
  const height = Math.max(container.clientHeight || window.innerHeight, 240);

  const scene = new THREE.Scene();
  const bg = options?.bgColor ?? 0x0b101b;
  scene.background = new THREE.Color(bg);
  if (options?.fogDensity) {
    scene.fog = new THREE.FogExp2(options.fogColor ?? bg, options.fogDensity);
  } else if (options?.fogFar) {
    scene.fog = new THREE.Fog(options.fogColor ?? bg, options.fogNear ?? 15, options.fogFar);
  }

  const camera = new THREE.PerspectiveCamera(
    options?.fov ?? 55,
    width / height,
    options?.near ?? 0.1,
    options?.far ?? 350
  );
  camera.position.set(0, 5, 10);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // Studio environment reflections for metallic/glass PBR materials
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  const handleContextLost = (e: Event) => {
    e.preventDefault();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

  const onResize = () => {
    const w = Math.max(container.clientWidth || 1, 1);
    const h = Math.max(container.clientHeight || 1, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  let frameId = 0;
  let running = false;
  const clock = new THREE.Clock();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!running) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  const startLoop = (onUpdate: (dt: number, elapsed: number) => void) => {
    if (running) return;
    running = true;
    clock.start();

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Ignore pre-compile issues
      }
    }

    const tick = () => {
      if (!running) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.08);
      const elapsed = clock.getElapsedTime();
      onUpdate(dt, elapsed);
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }
  };

  const stopLoop = () => {
    running = false;
    cancelAnimationFrame(frameId);
    clearTimeout(frameId);
  };

  const dispose = () => {
    stopLoop();
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
    envTex.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    isSoftwareGl,
    dispose,
    startLoop,
    stopLoop,
  };
}

export function addOutdoorLighting(
  scene: THREE.Scene,
  options?: {
    skyColor?: number;
    groundColor?: number;
    hemiIntensity?: number;
    sunColor?: number;
    sunIntensity?: number;
    sunPos?: [number, number, number];
    shadowBounds?: number;
  }
) {
  const hemi = new THREE.HemisphereLight(
    options?.skyColor ?? 0xdbeafe,
    options?.groundColor ?? 0x334155,
    options?.hemiIntensity ?? 0.85
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(
    options?.sunColor ?? 0xfff3d6,
    options?.sunIntensity ?? 1.55
  );
  const pos = options?.sunPos ?? [18, 28, 16];
  sun.position.set(pos[0], pos[1], pos[2]);
  sun.castShadow = true;
  const d = options?.shadowBounds ?? 24;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x60a5fa, 0.45);
  rim.position.set(-14, 12, -16);
  scene.add(rim);

  return { hemi, sun, rim };
}

export function createGrassTexture(renderer: THREE.WebGLRenderer, baseHex = '#2e7d32', speckHex = '#3fa34d'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 650; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 3 === 0 ? speckHex : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 3, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createRoadTexture(renderer: THREE.WebGLRenderer, lanes = 3): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e2430';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 1200; i++) {
    const x = (i * 89) % 512;
    const y = (i * 179) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Edge stripes
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(14, 0, 12, 512);
  ctx.fillRect(486, 0, 12, 512);

  // Dashed lane lines
  ctx.fillStyle = '#e2e8f0';
  for (let l = 1; l < lanes; l++) {
    const lx = (512 / lanes) * l - 4;
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(lx, y + 10, 8, 34);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createCheckerTexture(renderer: THREE.WebGLRenderer, c1 = '#f8fafc', c2 = '#1e293b'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const step = 32;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = ((x / step + y / step) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x, y, step, step);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createPitchTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Mowed grass stripes
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1b6e35' : '#217d3e';
    ctx.fillRect(0, i * 64, 512, 64);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, 464, 720);

  // Halfway line & center circle
  ctx.beginPath();
  ctx.moveTo(24, 384);
  ctx.lineTo(488, 384);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(256, 384, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Penalty box top & bottom
  ctx.strokeRect(126, 24, 260, 110);
  ctx.strokeRect(126, 634, 260, 110);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
