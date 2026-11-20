/*
  The world behind every page.

  Story in one object:
    Six "tool" panels (inbox, sheet, tasks, CRM, docs, chat) start scattered,
    with amber packets of information being dragged between them by hand.
    As the visitor scrolls, the panels line up around a small AI core,
    connection lines draw themselves in, and the packets turn into a calm
    cyan flow that runs on its own.

  Every page section sets targets on `state` (see data-scene in the HTML)
  and the render loop eases toward them.
*/
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';

const AMBER = new THREE.Color('#ffb15c');
const CYAN = new THREE.Color('#7fe9ff');
const IDLE = new THREE.Color('#c9d2dc');

const TOOLS = [
  { label: 'INBOX', rows: [0.8, 0.55, 0.7, 0.4] },
  { label: 'SHEET', grid: true },
  { label: 'TASKS', checks: true },
  { label: 'CRM', rows: [0.6, 0.85, 0.5, 0.7] },
  { label: 'DOCS', rows: [0.9, 0.9, 0.75, 0.9, 0.5] },
  { label: 'CHAT', bubbles: true },
];

function makePanelTexture(tool) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');
  const r = 26;
  const rr = (x, y, w, h, rad) => {
    g.beginPath();
    g.roundRect(x, y, w, h, rad);
  };
  // glass fill
  rr(6, 6, 500, 308, r);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.stroke();
  // header
  g.fillStyle = 'rgba(255,255,255,1)';
  g.beginPath();
  g.arc(40, 44, 7, 0, Math.PI * 2);
  g.fill();
  g.font = '700 28px Urbanist, sans-serif';
  g.fillText(tool.label, 60, 53);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(28, 78, 456, 2);

  g.fillStyle = 'rgba(255,255,255,0.45)';
  if (tool.grid) {
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 4; x++) {
        g.globalAlpha = 0.25 + ((x + y) % 3) * 0.15;
        g.fillRect(30 + x * 114, 100 + y * 40, 104, 28);
      }
    g.globalAlpha = 1;
  } else if (tool.checks) {
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 3;
      g.strokeRect(32, 104 + i * 50, 24, 24);
      g.fillRect(72, 110 + i * 50, 200 + ((i * 97) % 180), 12);
    }
  } else if (tool.bubbles) {
    rr(30, 104, 280, 50, 18);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    rr(200, 170, 280, 50, 18);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    rr(30, 236, 220, 50, 18);
    g.fill();
  } else {
    tool.rows.forEach((w, i) => {
      g.fillRect(32, 108 + i * 42, 440 * w, 14);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// deterministic pseudo-random so the "mess" looks the same each visit
function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function initScene(canvas, { reducedMotion = false } = {}) {
  const isSmall = window.matchMedia('(max-width: 820px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  renderer.setClearColor('#07080a', 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#07080a', 9, 26);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight('#7fe9ff', 30, 20);
  rim.position.set(0, 0, 2);
  scene.add(rim);

  // Public, tweenable state
  const state = {
    chaos: 1, // 1 = scattered, 0 = arranged around the core
    connect: 0, // connection lines drawn in
    flow: 0, // 0 = amber manual packets, 1 = cyan automatic flow
    core: 0, // AI core visibility
    pain: 0, // amber alarm / jitter on panels
    calm: 0, // softer, brighter, slower
    offsetX: 2.2, // shift world right so copy can sit on the left
    offsetY: 0,
    camZ: 12,
    tilt: 0,
    packets: 1, // packet visibility
  };

  const world = new THREE.Group();
  scene.add(world);

  // ── Tool panels ────────────────────────────────────────────
  const R = rand(7);
  const bodyGeo = new RoundedBoxGeometry(1.9, 1.2, 0.09, 4, 0.07);
  const faceGeo = new THREE.PlaneGeometry(1.86, 1.16);
  const panels = TOOLS.map((tool, i) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshStandardMaterial({ color: '#0d1014', metalness: 0.4, roughness: 0.35 })
    );
    const faceMat = new THREE.MeshBasicMaterial({
      map: makePanelTexture(tool),
      transparent: true,
      depthWrite: false,
      color: IDLE.clone(),
      toneMapped: false,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.05;
    group.add(body, face);
    world.add(group);

    const chaosPos = new THREE.Vector3((R() - 0.5) * 11, (R() - 0.5) * 6.5, -R() * 5 + 0.5);
    const chaosRot = new THREE.Euler((R() - 0.5) * 1.2, (R() - 0.5) * 1.6, (R() - 0.5) * 0.9);
    const a = (i / TOOLS.length) * Math.PI * 2 + Math.PI / 6;
    const orderPos = new THREE.Vector3(Math.cos(a) * 3.9, Math.sin(a) * 2.35, Math.sin(a * 2) * 0.4);
    const orderRot = new THREE.Euler(-orderPos.y * 0.06, -orderPos.x * 0.07, 0);
    return { group, faceMat, chaosPos, chaosRot, orderPos, orderRot, phase: R() * 10 };
  });

  // ── AI core ────────────────────────────────────────────────
  const core = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.95, 1),
    new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.55, toneMapped: false })
  );
  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 3),
    new THREE.MeshBasicMaterial({ color: '#e9fbff', toneMapped: false })
  );
  const ringGeo = new THREE.TorusGeometry(1.35, 0.008, 6, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.6, toneMapped: false });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = 1.2;
  ring2.rotation.y = 1.1;
  core.add(shell, heart, ring1, ring2);
  core.scale.setScalar(0.001);
  world.add(core);

  // ── Connection lines (node ⇄ core, plus around the ring) ──
  const SEG = 48;
  const curves = [];
  const lineMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, toneMapped: false });
  const makeLine = () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    const line = new THREE.Line(geo, lineMat);
    line.frustumCulled = false;
    world.add(line);
    return line;
  };
  panels.forEach((p, i) => {
    curves.push({ from: i, to: 'core', line: makeLine(), curve: new THREE.QuadraticBezierCurve3() });
    curves.push({ from: i, to: (i + 1) % panels.length, line: makeLine(), curve: new THREE.QuadraticBezierCurve3() });
  });
  const corePos = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  function nodePos(idx) {
    return idx === 'core' ? corePos : panels[idx].group.position;
  }
  function updateCurves() {
    curves.forEach((c, k) => {
      const a = nodePos(c.from);
      const b = nodePos(c.to);
      c.curve.v0.copy(a);
      c.curve.v2.copy(b);
      c.curve.v1.copy(a).add(b).multiplyScalar(0.5);
      c.curve.v1.z += 0.8 + (k % 3) * 0.3;
      const arr = c.line.geometry.attributes.position.array;
      for (let s = 0; s <= SEG; s++) {
        c.curve.getPoint(s / SEG, tmpV);
        arr[s * 3] = tmpV.x;
        arr[s * 3 + 1] = tmpV.y;
        arr[s * 3 + 2] = tmpV.z;
      }
      c.line.geometry.attributes.position.needsUpdate = true;
      c.line.geometry.setDrawRange(0, Math.floor((SEG + 1) * state.connect));
    });
  }

  // ── Packets of information ─────────────────────────────────
  const PACKETS = isSmall ? 18 : 30;
  const packetMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    PACKETS
  );
  packetMesh.frustumCulled = false;
  world.add(packetMesh);
  const packets = Array.from({ length: PACKETS }, (_, i) => ({
    t: R(),
    speed: 0.12 + R() * 0.12,
    curve: i % curves.length,
    // manual (chaos) hop between two random panels
    a: Math.floor(R() * panels.length),
    b: Math.floor(R() * panels.length),
    hop: R(),
  }));
  const pColor = new THREE.Color();
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();

  // ── Dust ───────────────────────────────────────────────────
  const DUST = isSmall ? 500 : 1100;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (R() - 0.5) * 34;
    dustPos[i * 3 + 1] = (R() - 0.5) * 20;
    dustPos[i * 3 + 2] = -R() * 18 + 3;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: '#8fa3b5', size: 0.03, transparent: true, opacity: 0.55, sizeAttenuation: true })
  );
  scene.add(dust);

  // ── Post-processing ────────────────────────────────────────
  let composer = null;
  if (!isSmall) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.55, 0.12));
    composer.addPass(new OutputPass());
  }

  // ── Input ──────────────────────────────────────────────────
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    // pull back on narrow screens so the ring still fits
    camera.userData.fit = w / h < 1 ? 1.55 : 1;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Loop ───────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let running = true;
  const tint = new THREE.Color();
  const narrowShift = () => (window.innerWidth < 820 ? 0 : 1);

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const speed = reducedMotion ? 0.25 : 1;

    mouse.sx += (mouse.x - mouse.sx) * 0.04;
    mouse.sy += (mouse.y - mouse.sy) * 0.04;

    world.position.x = state.offsetX * narrowShift();
    world.position.y = state.offsetY;
    world.rotation.y = mouse.sx * 0.25 + Math.sin(t * 0.1) * 0.05 * speed;
    world.rotation.x = mouse.sy * 0.15 + state.tilt;

    camera.position.z = state.camZ * camera.userData.fit;
    camera.position.x = mouse.sx * 0.6;
    camera.position.y = -mouse.sy * 0.4;
    camera.lookAt(world.position.x * 0.35, 0, 0);

    const ch = state.chaos;
    panels.forEach((p, i) => {
      const jitter = state.pain * 0.035 * Math.sin(t * 38 + i * 3);
      const bob = Math.sin(t * 0.6 * speed + p.phase) * 0.12 * (0.4 + ch);
      p.group.position.lerpVectors(p.orderPos, p.chaosPos, ch);
      p.group.position.y += bob;
      p.group.position.x += jitter;
      p.group.rotation.set(
        THREE.MathUtils.lerp(p.orderRot.x, p.chaosRot.x, ch) + Math.sin(t * 0.4 + p.phase) * 0.04,
        THREE.MathUtils.lerp(p.orderRot.y, p.chaosRot.y, ch) + mouse.sx * 0.1,
        THREE.MathUtils.lerp(p.orderRot.z, p.chaosRot.z, ch)
      );
      // colour: idle → amber when stressed → cyan when flowing
      const alarm = state.pain * (0.55 + 0.45 * Math.sin(t * 5 + i * 1.7));
      tint.copy(IDLE).lerp(CYAN, state.flow * 0.75).lerp(AMBER, alarm);
      p.faceMat.color.copy(tint).multiplyScalar(0.85 + state.calm * 0.3);
    });

    // core
    const cs = Math.max(0.001, state.core);
    core.scale.setScalar(cs * (1 + Math.sin(t * 2) * 0.03));
    core.position.copy(corePos);
    shell.rotation.y += dt * 0.35 * speed;
    shell.rotation.x += dt * 0.15 * speed;
    ring1.rotation.z += dt * 0.5 * speed;
    ring2.rotation.x += dt * 0.4 * speed;

    lineMat.opacity = state.connect * (0.35 + state.calm * 0.25);
    updateCurves();

    // packets
    packets.forEach((pk, i) => {
      pk.t += dt * pk.speed * speed * (0.6 + state.flow * 0.8);
      if (pk.t > 1) {
        pk.t -= 1;
        pk.a = pk.b;
        pk.b = (pk.b + 1 + Math.floor(Math.random() * (panels.length - 1))) % panels.length;
      }
      // manual path: jerky hop between two panels (pauses mid-way = "someone copying")
      const hopT = THREE.MathUtils.smoothstep(pk.t, 0.15, 0.45) * 0.5 + THREE.MathUtils.smoothstep(pk.t, 0.6, 0.95) * 0.5;
      pA.lerpVectors(panels[pk.a].group.position, panels[pk.b].group.position, hopT);
      pA.y += Math.sin(hopT * Math.PI) * 0.9;
      // automatic path: glide along a connection curve
      const c = curves[pk.curve];
      c.curve.getPoint((pk.t + i * 0.13) % 1, pB);
      pA.lerp(pB, state.flow);

      const vis = state.packets * (state.flow > 0.5 ? Math.min(1, state.connect * 1.4) : 1);
      scl.setScalar(Math.max(0.0001, vis * (0.8 + 0.4 * Math.sin(t * 3 + i))));
      m4.compose(pA, quat, scl);
      packetMesh.setMatrixAt(i, m4);
      pColor.copy(AMBER).lerp(CYAN, state.flow);
      packetMesh.setColorAt(i, pColor);
    });
    packetMesh.instanceMatrix.needsUpdate = true;
    packetMesh.instanceColor.needsUpdate = true;

    dust.rotation.y = t * 0.01 * speed;
    rim.intensity = 10 + state.core * 40;

    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) {
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  });

  return {
    state,
    to(targets, duration = 1.8) {
      gsap.to(state, { ...targets, duration: reducedMotion ? 0.01 : duration, ease: 'power3.inOut', overwrite: 'auto' });
    },
    set(targets) {
      Object.assign(state, targets);
    },
  };
}
