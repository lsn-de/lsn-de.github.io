// 核心工具：三渲二材质 / 程序化贴图 / 几何构建器
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './config.js';

export const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// 三渲二色阶贴图（4 级明暗，最近邻过滤 —— 硬边卡通阴影）
let _gm = null;
export function gradientMap() {
  if (_gm) return _gm;
  const data = new Uint8Array([64, 142, 206, 255]);
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  _gm = t;
  return t;
}

// 径向光晕（路灯光斑 / 窗光 / 地面光池）
export function glowTexture() {
  const [c, x] = canvas2d(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,.72)');
  g.addColorStop(0.55, 'rgba(255,255,255,.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 接触阴影（柔和黑色径向渐变，贴地使用）
export function shadowTexture() {
  const [c, x] = canvas2d(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,.82)');
  g.addColorStop(0.45, 'rgba(0,0,0,.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// 地面 / 人行道 canvas 贴图（噪点 + 铺装线 + 暗角）
export function groundTexture(base, line, lineAlpha, paver) {
  const [c, x] = canvas2d(512, 512);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = 'rgba(0,0,0,.045)';
    x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.8 + 0.4, 0, 7); x.fill();
  }
  for (let i = 0; i < 800; i++) {
    x.fillStyle = 'rgba(255,255,255,.05)';
    x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.4 + 0.4, 0, 7); x.fill();
  }
  x.strokeStyle = line; x.lineWidth = 1.5;
  x.globalAlpha = lineAlpha;
  for (let i = 0; i <= 512; i += paver) {
    x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i + 0.5); x.lineTo(512, i + 0.5); x.stroke();
  }
  x.globalAlpha = 1;
  const v = x.createRadialGradient(256, 256, 170, 256, 256, 365);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(50,55,75,.12)');
  x.fillStyle = v; x.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 雨棚条纹贴图
export function stripeTexture(a, b, n) {
  const [c, x] = canvas2d(256, 32);
  for (let i = 0; i < n; i++) {
    x.fillStyle = i % 2 ? a : b;
    x.fillRect(i * 256 / n, 0, 256 / n + 1, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- 几何变换 ----
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);

export function placed(geo, x, y, z, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  _v.set(x, y, z);
  _m.compose(_v, _q, _one);
  geo.applyMatrix4(_m);
  return geo;
}

// 顶点着色（供合并后的单网格多色使用）
export function paint(geo, color) {
  if (geo.index) geo = geo.toNonIndexed();
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// 按材质收集几何体，最后合并成单网格（减少 draw call）
export class Builder {
  constructor() { this.map = new Map(); }
  add(mat, geo) {
    if (geo.index) geo = geo.toNonIndexed();
    if(mat.userData.vertexBatch){geo=paint(geo,mat.color);mat=mat.userData.vertexBatch;}
    let a = this.map.get(mat);
    if (!a) { a = []; this.map.set(mat, a); }
    a.push(geo);
  }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    this.add(mat, placed(new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx, rz));
  }
  plane(mat, w, h, x, y, z, ry = 0) {
    this.add(mat, placed(new THREE.PlaneGeometry(w, h), x, y, z, ry));
  }
  cyl(mat, rt, rb, h, seg, x, y, z, ry = 0, open = false, ts = 0, tl = Math.PI * 2, rx = 0) {
    this.add(mat, placed(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl), x, y, z, ry, rx));
  }
  cone(mat, r, h, seg, x, y, z, ry = 0, rx = 0) {
    this.add(mat, placed(new THREE.ConeGeometry(r, h, seg), x, y, z, ry, rx));
  }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(sx, sy, sz);
    this.add(mat, placed(g, x, y, z));
  }
  torus(mat, r, tube, x, y, z, ry = 0) {
    this.add(mat, placed(new THREE.TorusGeometry(r, tube, 6, 12), x, y, z, ry));
  }
  finish(parent, opt = {}) {
    const { cast = true, receive = true, name = '' } = opt;
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      if (!merged) { console.warn('[builder] merge failed:', mat.name); continue; }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = mat.userData.noShadow ? false : cast;
      mesh.receiveShadow = receive;
      if (name) mesh.name = name + ':' + (mat.name || 'mat');
      parent.add(mesh);
    }
    this.map.clear();
  }
}

export function toon(color, opt = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .87 }, opt));
}

export function createMaterials(renderer) {
  const aniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  const groundTex = groundTexture(hex(PAL.ground), '#8f8672', 0.1, 128);
  groundTex.repeat.set(3, 3); groundTex.anisotropy = aniso;
  const walkTex = groundTexture(hex(PAL.walk), '#a89c84', 0.13, 64);
  walkTex.repeat.set(2, 1); walkTex.anisotropy = aniso;
  const awningTex = stripeTexture(hex(PAL.awningA), hex(PAL.awningB), 8);
  awningTex.repeat.set(1, 1);

  const M = {
    gm: gradientMap(),
    wall: toon(PAL.wall),
    wallDS: toon(PAL.wall, { side: THREE.DoubleSide }),
    trim: toon(PAL.trim),
    shade: toon(PAL.shade),
    roof: toon(PAL.roof),
    iron: new THREE.MeshStandardMaterial({ color: PAL.iron, metalness: 0.35, roughness: 0.6, envMapIntensity: 1.1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x777482, roughness: 0.3, metalness: 0.02,
      clearcoat: 0.35, clearcoatRoughness: 0.18,
      envMapIntensity: 0.65, emissive: 0xffcf8c, emissiveIntensity: 0,
    }),
    wood: toon(PAL.wood),
    woodDark: toon(PAL.woodDark),
    benchA: toon(PAL.benchA),
    benchB: toon(PAL.benchB),
    tree: toon(0xffffff, { vertexColors: true }),
    flower: new THREE.MeshStandardMaterial({vertexColors:true, roughness:1, emissive:0x1d152d, emissiveIntensity:.08, flatShading:true}),
    petal: new THREE.MeshToonMaterial({ gradientMap: gradientMap(), side: THREE.DoubleSide }),
    ground: toon(0xffffff, { map: groundTex }),
    walk: toon(0xffffff, { map: walkTex }),
    base: toon(PAL.base),
    baseDark: toon(PAL.baseDark),
    awning: toon(0xffffff, { map: awningTex }),
    lampGlass: new THREE.MeshToonMaterial({ color: 0xffe2b0, gradientMap: gradientMap(), emissive: 0xffd591, emissiveIntensity: 0 }),
    terracotta: toon(PAL.terracotta),
    glowTex: glowTexture(),
    shadowTex: shadowTexture(),
  };
  M.glass.userData.noShadow = true;
  // Thin glazing lets the real furniture remain visible without costly transmission.
  M.shopGlass=new THREE.MeshStandardMaterial({color:0xc7bfc6,transparent:true,opacity:.13,depthWrite:false,
    roughness:.22,metalness:.08,envMapIntensity:.65,side:THREE.DoubleSide,forceSinglePass:true});
  M.shopGlass.name='clear-shop-glazing';M.shopGlass.userData.noShadow=true;
  const roomPresets=[{strength:1,color:0xffd294},{strength:.72,color:0xffdeac},{strength:.34,color:0xffbf7e},{strength:.025,color:0xadb6d4}];
  M.windowGroups=roomPresets.map(p=>{
    const mat=M.glass.clone();mat.emissive.set(p.color);mat.userData={noShadow:true,strength:p.strength};
    if(p.strength<.1)mat.color.set(0x555666);
    return mat;
  });
  M.benchA.roughness=.72;M.benchB.roughness=.76;
  M.lampGlass.userData.noShadow = true;
  return M;
}
