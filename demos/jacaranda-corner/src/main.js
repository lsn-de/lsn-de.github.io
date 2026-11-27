// 主程序：渲染器 / 相机与轨道控制 / 灯光 / 环境反射 / 时间模式 / 动画循环
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, BG } from './config.js';
import { createMaterials, canvas2d, hex } from './core.js';
import { buildBuilding } from './building.js';
import { createExplorer } from './explore.js';
import { buildTree, createPetals, scatterFallen } from './trees.js?v=3';
import { buildBase, buildBench, buildLamp, buildFence, contactDecal, makeGlow } from './props.js';

// ---------- 渲染器 ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
const camera = new THREE.PerspectiveCamera(35, app.clientWidth / app.clientHeight, 0.1, 300);

// 接近正面的三分之四视角，略微俯视：入口 / 阳台 / 长椅可见，屋顶少量露出
const CAM_START = new THREE.Vector3(19.5, 12.0, 24.5);
const CAM_END = new THREE.Vector3(18.8, 11.0, 23.5);
const TARGET = new THREE.Vector3(0, 4.7, 0);
function fitCameraPosition(position,focus=TARGET) {
  const scale=Math.max(1,1.12/(app.clientWidth/app.clientHeight));
  return position.clone().sub(focus).multiplyScalar(scale).add(focus);
}
camera.position.copy(fitCameraPosition(CAM_START));
camera.lookAt(TARGET);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 9;
controls.maxDistance = 65;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = 1.46;
controls.zoomSpeed = 0.8;
controls.update();

const M = createMaterials(renderer);

// ---------- 灯光 ----------
const hemi = new THREE.HemisphereLight(0xcfe0f2, 0xa89a80, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2df, 2.7);
sun.position.set(9, 15, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(window.innerWidth < 700 ? 2048 : 4096, window.innerWidth < 700 ? 2048 : 4096);
sun.shadow.camera.left = -9.5; sun.shadow.camera.right = 9.5;
sun.shadow.camera.top = 9.5; sun.shadow.camera.bottom = -9.5;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 50;
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.025;
scene.add(sun);

// ---------- 环境反射（玻璃 / 金属随天色变化） ----------
const pmrem = new THREE.PMREMGenerator(renderer);
function envTexture(top, mid, bot) {
  const [c, x] = canvas2d(64, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, hex(top)); g.addColorStop(0.5, hex(mid)); g.addColorStop(1, hex(bot));
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function setEnv(top, mid, bot) {
  const tex = envTexture(top, mid, bot);
  const rt = pmrem.fromEquirectangular(tex);
  if (scene.environment) scene.environment.dispose();
  scene.environment = rt.texture;
  tex.dispose();
}

// ---------- 场景搭建 ----------
const world = new THREE.Group();
scene.add(world);

buildBase(M, world);

const { spots, interiors, shell, roof } = buildBuilding(M, world);

// 蓝花楹：建筑两侧与后方围合，前低后高（按实测冠径布位，冠层基本收在底座内）
const treeDefs = [
  {x:-4.6,z:1.0,s:1,seed:11,height:9.1,spread:2.5},
  {x:-4.8,z:2.8,s:1,seed:23,height:6.8,spread:1.6},
  {x:5.1,z:-1.3,s:1,seed:41,height:11.8,spread:2.8},
  {x:-4.4,z:-4.2,s:1,seed:53,height:11.4,spread:3.0},
  {x:3.8,z:-5.45,s:1,seed:67,height:13.1,spread:3.0},
  {x:-.6,z:-5.4,s:1,seed:71,height:11.7,spread:2.6},
];
const trees = [];
for (const d of treeDefs) {
  const t = buildTree(d.seed, M, d);
  t.group.position.set(d.x, 0.012, d.z);
  t.group.scale.setScalar(d.s);
  // Tree geometry is generated in world-aligned local coordinates for facade clearance.
  world.add(t.group);
  trees.push(t);
  contactDecal(world,M,d.x,d.z,.65*d.s,.48);
  contactDecal(world,M,d.x,d.z,1.65*d.s,.12);
}

const bench = buildBench(M);
bench.position.set(-2.0, 0.012, 4.2);
bench.rotation.y = 0;
world.add(bench);
const benchShadow=contactDecal(world,M,bench.position.x,bench.position.z,1.15,.45);
benchShadow.scale.set(1,.48,1);



const lamps = [buildLamp(M, -5.45, 3.7), buildLamp(M, 5.25, 2.7)];
for (const l of lamps) {
  world.add(l.group);
  contactDecal(world,M,l.group.position.x,l.group.position.z,.48,.42);
}

world.add(scatterFallen(M, trees, 7));

const petals = createPetals(M, 320, trees);
world.add(petals.mesh);

// 夜间窗光（暖色 additive 精灵）
const glowSprites = spots.map(s => {
  const g = makeGlow(M, 0xffc07a, s.w * 1.7, s.h * 1.7, 0);
  g.position.set(s.x, s.y, s.z);
  g.userData.strength=s.strength;
  world.add(g);
  return g;
});

const windowBounce=new THREE.PointLight(0xffd4a0,0,6.5,2);
windowBounce.position.set(-.8,1.85,1.3);scene.add(windowBounce);
// A cool rim gives the outer petals shape without flattening the inner canopy.
const rim=new THREE.DirectionalLight(0xb2a7ed,.35);
rim.position.set(-6,10,-8);scene.add(rim);

// ---------- 时间模式 ----------
const state = {
  sunPos: new THREE.Vector3(), sunColor: new THREE.Color(), sunI: 0,
  hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0,
  win: 0, lamp: 0,
};
const target = {
  sunPos: new THREE.Vector3(), sunColor: new THREE.Color(), sunI: 0,
  hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0,
  win: 0, lamp: 0,
};

const layers = [document.getElementById('bgA'), document.getElementById('bgB')];
let curLayer = 0;

function setMode(name, instant = false) {
  const m = MODES[name];
  if (!m) return;
  app.dataset.mode=name;app.dataset.settled='false';
  target.sunPos.set(...m.sun.pos);
  target.sunColor.set(m.sun.color);
  target.sunI = m.sun.intensity;
  target.hemiSky.set(m.hemi.sky);
  target.hemiGround.set(m.hemi.ground);
  target.hemiI = m.hemi.intensity;
  target.win = m.window;
  target.lamp = m.lamp;
  if (instant) {
    state.sunPos.copy(target.sunPos);
    state.sunColor.copy(target.sunColor);
    state.sunI = target.sunI;
    state.hemiSky.copy(target.hemiSky);
    state.hemiGround.copy(target.hemiGround);
    state.hemiI = target.hemiI;
    state.win = target.win;
    state.lamp = target.lamp;
  }
  document.body.classList.remove('mode-day', 'mode-dusk', 'mode-night');
  document.body.classList.add('mode-' + name);
  const next = 1 - curLayer;
  layers[next].style.background = BG[name];
  layers[next].style.opacity = '1';
  layers[curLayer].style.opacity = '0';
  curLayer = next;
  setEnv(m.env.top, m.env.mid, m.env.bot);
  document.querySelectorAll('#seg button').forEach(b => { b.classList.toggle('on',b.dataset.mode===name);b.setAttribute('aria-pressed',String(b.dataset.mode===name)); });
}

document.querySelectorAll('#seg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
window.addEventListener('keydown', e => {
  if(e.target?.matches('input,select,textarea,[contenteditable]'))return;
  if (e.key === '1') setMode('day');
  else if (e.key === '2') setMode('dusk');
  else if (e.key === '3') setMode('night');
});

// 支持 ?mode=day|dusk|night 指定初始模式
const urlMode = new URLSearchParams(location.search).get('mode');
setMode(MODES[urlMode] ? urlMode : 'dusk', true);

document.getElementById('cafe-view').addEventListener('click', () => {
  autoOrbit=false;document.getElementById('orbit-toggle').classList.remove('active');document.getElementById('orbit-toggle').setAttribute('aria-pressed','false');
  explorer.leave();intro=false;
  const focus=new THREE.Vector3(0,1.7,.15);
  camera.position.copy(fitCameraPosition(new THREE.Vector3(10.5,4.0,13.5),focus));
  controls.target.copy(focus);controls.update();
});
document.getElementById('reset-view').addEventListener('click', () => {
  autoOrbit=false;document.getElementById('orbit-toggle').classList.remove('active');document.getElementById('orbit-toggle').setAttribute('aria-pressed','false');
  explorer.leave();intro=false; camera.position.copy(fitCameraPosition(CAM_END)); controls.target.copy(TARGET); controls.update();
});
let autoOrbit=false;
document.getElementById('orbit-toggle').addEventListener('click', e => {
  if(explorer.active){explorer.leave();camera.position.copy(fitCameraPosition(CAM_END));controls.target.copy(TARGET);}
  autoOrbit=!autoOrbit; controls.autoRotate=autoOrbit; controls.autoRotateSpeed=.45;
  e.currentTarget.classList.toggle('active',autoOrbit);
  e.currentTarget.setAttribute('aria-pressed',String(autoOrbit));
});
const explorer=createExplorer({camera,controls,app,shell,roof,interiors,
  stopIntro(){intro=false;autoOrbit=false;controls.autoRotate=false;},
  resetExterior(){intro=false;camera.position.copy(fitCameraPosition(CAM_END));controls.target.copy(TARGET);controls.update();}
});
const floorLights=interiors.levels.map(y=>{
 const light=new THREE.PointLight(0xffdfb7,5,8,2);light.position.set(.2,y+1.9,-1.1);scene.add(light);return light;
});
// ---------- 动画循环 ----------
const clock = new THREE.Clock();
let time = 0;
let introT = 0;
let intro = true;
const debugMode=new URLSearchParams(location.search).has('debug');
const frameTimes=[];
let debugFrames=0;
let lastFrame=performance.now();
controls.addEventListener('start', () => { intro = false; });

function tick() {
  requestAnimationFrame(tick);
  const now=performance.now();
  const frameMs=now-lastFrame;lastFrame=now;
  if(debugMode && frameMs<250){frameTimes.push(frameMs);if(frameTimes.length>120)frameTimes.shift();}
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  // 平滑过渡当前光照参数
  const k = 1 - Math.exp(-dt * 2.8);
  state.sunPos.lerp(target.sunPos, k); sun.position.copy(state.sunPos);
  state.sunColor.lerp(target.sunColor, k); sun.color.copy(state.sunColor);
  state.sunI += (target.sunI - state.sunI) * k; sun.intensity = state.sunI;
  state.hemiSky.lerp(target.hemiSky, k); state.hemiGround.lerp(target.hemiGround, k);
  hemi.color.copy(state.hemiSky); hemi.groundColor.copy(state.hemiGround);
  state.hemiI += (target.hemiI - state.hemiI) * k; hemi.intensity = state.hemiI;
  state.win += (target.win - state.win) * k;
  state.lamp += (target.lamp - state.lamp) * k;

  M.glass.emissiveIntensity = state.win * .72;
  for(const mat of M.windowGroups)mat.emissiveIntensity=state.win*.24*mat.userData.strength;
  interiors.update(state.win);
  windowBounce.intensity=state.win*7;
  for(const light of floorLights)light.intensity=3+state.win*5;
  rim.intensity=.18+state.win*.3;
  M.lampGlass.emissiveIntensity = state.win * 1.15;
  for (const l of lamps) {
    l.light.intensity = state.lamp * 6.5;
    l.glow.material.opacity = state.lamp * 0.68;
    l.pool.material.opacity = state.lamp * 0.24;
  }
  for (const g of glowSprites){g.visible=!explorer.active&&shell.visible;g.material.opacity = state.win * 0.08 * g.userData.strength;}

  // 树梢轻摆（整体风场 + 每棵树相位）
  const wind = 0.65 + 0.35 * Math.sin(time * 0.32);
  for (const t of trees) {
    t.canopy.rotation.z = Math.sin(time * 0.9 + t.phase) * 0.002 * wind;
    t.canopy.rotation.x = Math.sin(time * 0.72 + t.phase * 1.7) * 0.0015 * wind;
    t.group.rotation.z = Math.sin(time * 0.5 + t.phase * 0.6) * 0.0008 * wind;
  }
  petals.update(dt, time, wind);

  // 开场推镜
  if (intro) {
    introT = Math.min(1, introT + dt / 2.6);
    const e = introT < 0.5 ? 4 * introT * introT * introT : 1 - Math.pow(-2 * introT + 2, 3) / 2;
    camera.position.lerpVectors(fitCameraPosition(CAM_START), fitCameraPosition(CAM_END), e);
    if (introT >= 1) intro = false;
  }

  app.dataset.intro=intro?'playing':'complete';
  app.dataset.settled=String(state.sunPos.distanceTo(target.sunPos)<.02 && Math.abs(state.sunI-target.sunI)<.005 && Math.abs(state.win-target.win)<.003);
  if(!explorer.active)controls.update();
  explorer.update(dt);
  renderer.render(scene, camera);
  if(debugMode && ++debugFrames%30===0){
    const sorted=frameTimes.slice().sort((a,b)=>a-b);
    renderer.domElement.dataset.sceneStats=JSON.stringify({frames:debugFrames,frameMs: +(frameTimes.reduce((a,b)=>a+b,0)/Math.max(1,frameTimes.length)).toFixed(2),p95Ms:+(sorted[Math.floor(sorted.length*.95)]||0).toFixed(2),petalsAlive:petals.particles.filter(p=>p.fade>.05 && !p.landed && p.retire===0).length,petalsVisible:petals.particles.filter(p=>p.fade>.05).length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,ready:!intro});
  }
}
tick();
requestAnimationFrame(() => document.body.classList.add('ready'));

let lastAspect=app.clientWidth/app.clientHeight,lastFree=explorer.active;
function resizeScene(){
  const newAspect=app.clientWidth/app.clientHeight;
  const ratio=Math.max(1,1.12/newAspect)/Math.max(1,1.12/lastAspect);
  if(!explorer.active&&!lastFree)camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
  lastFree=explorer.active;
  lastAspect=newAspect;
  camera.aspect = app.clientWidth / app.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(app.clientWidth, app.clientHeight);
}
window.addEventListener("resize",resizeScene);
new ResizeObserver(resizeScene).observe(app);

// 调试 / 测试句柄（控制台可直接调用 __diom.setView([x,y,z],[tx,ty,tz])）
window.__diom = {
  camera, controls, scene, renderer,
  setMode: (name) => setMode(name),
  setView(pos, tgt) {
    intro = false;
    camera.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(tgt[0], tgt[1], tgt[2]);
    controls.update();
  },
};


