// 道具：方形薄底座 + 地面、紫色木条长椅、街角路灯、接触阴影、光晕精灵
import * as THREE from 'three';
import { PAL, DIM } from './config.js';
import { Builder } from './core.js';

// 薄底座（双层台沿）+ 铺装地面 + 人行道
export function buildBase(M, parent) {
  const S = DIM.base;
  const B = new Builder();
  B.box(M.base, S, 0.42, S, 0, -0.21, 0);
  B.box(M.baseDark, S - 0.6, 0.12, S - 0.6, 0, -0.45, 0);
  B.finish(parent, { cast: false, receive: true, name: 'plinth' });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.14, S - 0.14), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.008;
  ground.receiveShadow = true;
  parent.add(ground);

  const B2 = new Builder();
  const roadTex=M.ground.map.clone();roadTex.repeat.set(5,5);roadTex.needsUpdate=true;
  const asphalt=new THREE.MeshStandardMaterial({color:0x484550,map:roadTex,roughness:.88,metalness:.025,envMapIntensity:.35});
  const stone = new THREE.MeshStandardMaterial({color:0xd3c9d2,roughness:.95});
  const stripe = new THREE.MeshStandardMaterial({color:0xa8a0ae,roughness:1});
  B2.box(asphalt,14,.035,1.35,0,.025,6.23);
  B2.box(asphalt,1.35,.035,12.65,6.23,.025,-.67);
  for(let i=0;i<28;i++) {
    B2.box(stone,.485,.12,.23,-6.75+i*.5,.07,5.48);
    B2.box(stone,.23,.12,.485,5.48,.07,-6.75+i*.5);
  }
  for(let i=0;i<9;i++) {
    B2.box(stripe,.85,.008,.045,-6.3+i*1.5,.047,6.35);
    B2.box(stripe,.045,.008,.85,6.35,.047,-6.3+i*1.5);
  }
  B2.finish(parent,{name:'street',cast:false,receive:true});
  // Pavement joints follow the scale of the miniature.
  const joints=new THREE.MeshStandardMaterial({color:0x938997,roughness:1});
  const P=new Builder();
  for(let x=-6.5;x<=5.2;x+=.65) P.box(joints,.009,.002,1.85,x,.017,4.45);
  for(const z of [3.7,4.4,5.1]) P.box(joints,11.7,.002,.009,-.65,.017,z);
  P.finish(parent,{name:'pavement',cast:false,receive:true});

}

// 紫色木条长椅（铁艺腿架 + 三条座面 + 斜靠背 + 扶手）
export function buildBench(M) {
  const g = new THREE.Group();
  g.name = 'bench';
  const B = new Builder();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    B.box(M.iron, 0.07, 0.42, 0.07, sx * 0.78, 0.22, sz * 0.28);
  }
  B.box(M.iron, 1.58, 0.05, 0.05, 0, 0.13, 0.28);
  B.box(M.iron, 1.58, 0.05, 0.05, 0, 0.13, -0.28);
  for (let i = 0; i < 3; i++) B.box(i % 2 ? M.benchA : M.benchB, 1.74, 0.05, 0.14, 0, 0.46, -0.16 + i * 0.16);
  for (let i = 0; i < 2; i++) B.box(i % 2 ? M.benchA : M.benchB, 1.74, 0.11, 0.045, 0, 0.63 + i * 0.19, -0.3, 0, -0.18);
  for (const sx of [-1, 1]) {
    B.box(M.iron, 0.08, 0.05, 0.66, sx * 0.8, 0.64, 0);
    B.box(M.iron, 0.06, 0.22, 0.06, sx * 0.8, 0.52, -0.26);
  }
  B.finish(g, { name: 'bench' });
  return g;
}

// 前庭白色矮栅栏（沿人行道后缘与左缘，参考图同款）
export function buildFence(M) {
  const g = new THREE.Group();
  g.name = 'fence';
  const B = new Builder();
  function run(axis, fixed, from, to) {
    const len = Math.abs(to - from);
    const mid = (from + to) / 2;
    const sign = to > from ? 1 : -1;
    // 横轨
    for (const y of [0.16, 0.32]) {
      if (axis === 'x') B.box(M.trim, len, 0.045, 0.035, mid, y, fixed);
      else B.box(M.trim, 0.035, 0.045, len, fixed, y, mid);
    }
    // 立柱 + 顶珠
    const n = Math.max(2, Math.round(len / 0.5));
    for (let i = 0; i <= n; i++) {
      const p = from + sign * len * i / n;
      if (axis === 'x') {
        B.box(M.trim, 0.055, 0.4, 0.055, p, 0.2, fixed);
        B.sph(M.trim, 0.045, p, 0.42, fixed);
      } else {
        B.box(M.trim, 0.055, 0.4, 0.055, fixed, 0.2, p);
        B.sph(M.trim, 0.045, fixed, 0.42, p);
      }
    }
  }
  run('x', 5.28, -4.55, 3.3);   // 前缘
  run('z', -5.05, 2.62, 5.28);  // 左缘
  B.finish(g, { name: 'fence' });
  return g;
}

// 街角路灯：灯柱 + 暖光灯厢 + 点光源 + 光晕 + 地面光池
export function buildLamp(M, x, z) {
  const g = new THREE.Group();
  g.name = 'lamp';
  const B = new Builder();
  B.cyl(M.baseDark, 0.16, 0.2, 0.14, 12, 0, 0.07, 0);
  B.cyl(M.iron, 0.05, 0.068, 2.9, 10, 0, 1.5, 0);
  B.cyl(M.iron, 0.03, 0.03, 0.14, 8, 0, 2.99, 0);
  B.box(M.iron, 0.3, 0.05, 0.3, 0, 3.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    B.cyl(M.iron, 0.016, 0.016, 0.3, 6, sx * 0.11, 3.2, sz * 0.11);
  }
  B.box(M.lampGlass, 0.2, 0.26, 0.2, 0, 3.2, 0);
  B.cone(M.iron, 0.21, 0.14, 4, 0, 3.42, 0);
  B.sph(M.iron, 0.035, 0, 3.52, 0);
  B.finish(g, { name: 'lamp' });

  const light = new THREE.PointLight(0xffb45e, 0, 9.5, 2);
  light.position.set(0, 3.2, 0);
  g.add(light);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: M.glowTex, color: 0xffc98a, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.scale.set(1.5, 1.5, 1);
  glow.position.set(0, 3.2, 0);
  g.add(glow);

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 28),
    new THREE.MeshBasicMaterial({ map: M.glowTex, color: 0xffb45e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pool.scale.set(1.12,.8,1);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  g.add(pool);

  g.position.set(x, 0, z);
  return { group: g, light, glow, pool };
}

// 接触阴影贴片（配合实时阴影，加强"落座感"）
export function contactDecal(parent, M, x, z, r, opacity) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ map: M.shadowTex, color: 0x3a3f4a, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  parent.add(m);
  return m;
}

//  additive 光晕精灵（窗光 / 灯光）
export function makeGlow(M, color, w, h, opacity = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: M.glowTex, color, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.set(w, h, 1);
  return s;
}
