// 奶油色三层街角建筑：真实窗洞、窗后房间、咖啡馆与连续转角阳台。
import * as THREE from 'three';
import { Builder, placed } from './core.js';
import { createInteriorKit } from './interiors.js';

// ---- 布局常量 ----
const FZ = 2.6;    // 正立面外皮（z）
const SX = 3.4;    // 侧立面外皮（x）
const BZ = -4.6;   // 背
const LX = -3.4;   // 左
const R = 1.2;     // 圆弧转角半径
const CX = SX - R; // 转角圆心 x = 2.3
const CZ = FZ - R; // 转角圆心 z = 1.5
const F0 = 2.8, F1 = 5.4, F2 = 8.0, PAR = 8.55; // 层高 / 檐口
const HALF = Math.PI / 2;

export function buildBuilding(M, parent) {
  let B = new Builder();
  const shell=new THREE.Group();shell.name="exterior-shell";parent.add(shell);
  const roof=new THREE.Group();roof.name="removable-roof";parent.add(roof);
  const wallBuilder=B;
  const interiorKit=createInteriorKit(M);
  const openings=[];
  let windowIndex=0;
  const roomOrder=[0,1,0,2,0,3,1,0,1,2,0,1,2,0,1,3];
  const spots = []; // 夜间窗光位置

  // 局部坐标 → 世界坐标（绕 Y 旋转 ry）
  function off(W, lx, ly, lz) {
    return [W.cx + lx * W.c + lz * W.s, W.cy + ly, W.cz - lx * W.s + lz * W.c];
  }
  const winLocal = (cx, cy, cz, ry) => ({ cx, cy, cz, ry, c: Math.cos(ry), s: Math.sin(ry) });

  // ---- 墙身 ----
  // Assemble actual window openings rather than placing glass over solid walls.
  function punchedWall(axis,fixed,from,to,centers){
    const block=(a,b,lo,hi)=>{
      if(b-a<.001||hi-lo<.001)return;
      if(axis==='x')B.box(M.wall,b-a,hi-lo,.22,(a+b)/2,(lo+hi)/2,fixed);
      else B.box(M.wall,.22,hi-lo,b-a,fixed,(lo+hi)/2,(a+b)/2);
    };
    let previous=F0;
    for(const y of [4.3,6.7]){
      block(from,to,previous,y-.75);
      let start=from;
      for(const c of centers){block(start,c-.475,y-.75,y+.75);start=c+.475;}
      block(start,to,y-.75,y+.75);previous=y+.75;
    }
    block(from,to,previous,F2);
  }
  punchedWall('x',FZ-.11,LX,CX,[-2.2,-.45,1.3]);
  punchedWall('z',SX-.11,BZ,CZ,[-3.6,-1.7,.2]);
  function arcBand(lo,hi,a=0,len=HALF){
    B.cyl(M.wallDS,R,R,hi-lo,28,CX,(lo+hi)/2,CZ,0,true,a,len);
  }
  const arcGap=Math.asin(.41/R);
  let arcY=0;
  for(const [lo,hi] of [[.2,2.5],[3.625,4.975],[6.025,7.375]]){
    const gap=lo<1?Math.asin(.54/R):arcGap,side=HALF/2-gap;
    arcBand(arcY,lo);arcBand(lo,hi,0,side);arcBand(lo,hi,HALF/2+gap,side);arcY=hi;
  }
  arcBand(arcY,F2);
  B.box(M.shade, CX - LX + 0.04, 0.28, 0.24, (LX + CX) / 2, 0.14, FZ - 0.12);               // 正立面勒脚
  B.box(M.shade, 0.24, 0.28, CZ - BZ + 0.04, SX - 0.12, 0.14, (BZ + CZ) / 2);               // 侧立面勒脚
  // 背墙与左墙（整面实墙，围合成完整体量）
  B.box(M.wall, SX - LX, F0, 0.22, (LX + SX) / 2, F0 / 2, BZ + 0.11);
  B.box(M.wall, 0.22, F0, FZ - BZ, LX + 0.11, F0 / 2, (BZ + FZ) / 2);
  punchedWall('x',BZ+.11,LX,SX,[-2.2,0,2.2]);
  punchedWall('z',LX+.11,BZ,FZ,[-3.2,.4]);
  B.box(M.shade, SX - LX + 0.04, 0.28, 0.24, (LX + SX) / 2, 0.14, BZ + 0.12);
  B.box(M.shade, 0.24, 0.28, FZ - BZ + 0.04, LX + 0.12, 0.14, (BZ + FZ) / 2);

  // 底层壁柱（橱窗与门洞之间）
  const pierX = (x0, x1) => B.box(M.wall, x1 - x0, F0, 0.22, (x0 + x1) / 2, F0 / 2, FZ - 0.11);
  pierX(LX, -2.95); pierX(-1.45, -0.975); pierX(0.075, 0.55); pierX(2.05, CX);
  const pierZ = (z0, z1) => B.box(M.wall, 0.22, F0, z1 - z0, SX - 0.11, F0 / 2, (z0 + z1) / 2);
  pierZ(BZ, -4.35); pierZ(-2.85, -2.45); pierZ(-0.95, -0.55); pierZ(0.95, CZ);

  // ---- 层间线脚 ----
  function cornice(y) {
    B.box(M.trim, CX - LX + 0.3, 0.16, 0.3, (LX + CX) / 2, y + 0.08, FZ - 0.02);
    B.box(M.trim, 0.3, 0.16, CZ - BZ + 0.3, SX - 0.02, y + 0.08, (BZ + CZ) / 2);
    B.cyl(M.trim, R + 0.15, R + 0.15, 0.16, 28, CX, y + 0.08, CZ, 0, true, 0, HALF);
    B.box(M.trim, SX - LX + 0.3, 0.16, 0.3, (LX + SX) / 2, y + 0.08, BZ + 0.02);
    B.box(M.trim, 0.3, 0.16, FZ - BZ + 0.3, LX - 0.02, y + 0.08, (BZ + FZ) / 2);
  }
  cornice(F0); cornice(F1);

  B=new Builder();
  // ---- 檐口与山墙屋顶 ----
  B.box(M.wall, CX - LX, PAR - F2, 0.22, (LX + CX) / 2, (F2 + PAR) / 2, FZ - 0.11);
  B.box(M.wall, 0.22, PAR - F2, CZ - BZ, SX - 0.11, (F2 + PAR) / 2, (BZ + CZ) / 2);
  B.cyl(M.wallDS, R, R, PAR - F2, 28, CX, (F2 + PAR) / 2, CZ, 0, true, 0, HALF);
  B.box(M.wall, SX - LX, PAR - F2, 0.22, (LX + SX) / 2, (F2 + PAR) / 2, BZ + 0.11);
  B.box(M.wall, 0.22, PAR - F2, FZ - BZ, LX + 0.11, (F2 + PAR) / 2, (BZ + FZ) / 2);
  B.box(M.trim, CX - LX + 0.26, 0.08, 0.3, (LX + CX) / 2, PAR + 0.04, FZ - 0.02);
  B.box(M.trim, 0.3, 0.08, CZ - BZ + 0.26, SX - 0.02, PAR + 0.04, (BZ + CZ) / 2);
  B.cyl(M.trim, R + 0.13, R + 0.13, 0.08, 28, CX, PAR + 0.04, CZ, 0, true, 0, HALF);
  B.box(M.trim, SX - LX + 0.26, 0.08, 0.3, (LX + SX) / 2, PAR + 0.04, BZ + 0.02);
  B.box(M.trim, 0.3, 0.08, FZ - BZ + 0.26, LX - 0.02, PAR + 0.04, (BZ + FZ) / 2);

  // Recessed roof: the cream parapet keeps the silhouette quiet.
  const roofShape=new THREE.Shape();
  roofShape.moveTo(LX+.15,BZ+.15);roofShape.lineTo(SX-.15,BZ+.15);
  roofShape.lineTo(SX-.15,CZ);roofShape.absarc(CX,CZ,R-.15,0,HALF,false);
  roofShape.lineTo(LX+.15,FZ-.15);roofShape.closePath();
  const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:.10,bevelEnabled:false,curveSegments:24});
  roofGeo.rotateX(Math.PI/2);roofGeo.translate(0,PAR-.18,0);
  const roofMat=M.roof.clone();roofMat.side=THREE.DoubleSide;B.add(roofMat,roofGeo);
  // Inner parapet faces and a solid coping ring make the roof read as masonry.
  B.box(M.shade,CX-LX,.24,.06,(LX+CX)/2,PAR-.06,FZ-.24);
  B.box(M.shade,.06,.24,CZ-BZ,SX-.24,PAR-.06,(BZ+CZ)/2);
  B.box(M.shade,SX-LX,.24,.06,0,PAR-.06,BZ+.24);
  B.box(M.shade,.06,.24,FZ-BZ,LX+.24,PAR-.06,-1);
  B.cyl(M.shade,R-.24,R-.24,.24,28,CX,PAR-.06,CZ,0,true,0,HALF);
  const coping=new THREE.Shape();
  coping.absarc(CX,CZ,R+.13,0,HALF,false);
  coping.lineTo(CX,CZ+R-.25);coping.absarc(CX,CZ,R-.25,HALF,0,true);coping.closePath();
  const cap=new THREE.ExtrudeGeometry(coping,{depth:.08,bevelEnabled:false});
  cap.rotateX(Math.PI/2);cap.translate(0,PAR+.08,0);B.add(M.trim,cap);
  // Subtle standing seams, placed behind the front parapet.
  const seamMat=new THREE.MeshStandardMaterial({color:0x8c8189,roughness:.95});
  for(let x=-3.05;x<2.2;x+=.75)B.box(seamMat,.018,.012,6.5,x,PAR-.172,-1.1);
  B.finish(roof,{cast:true,receive:true,name:"roof"});B=wallBuilder;
  // Fine masonry courses at street level.
  for (let y=.4;y<2.8;y+=.38) {
    for(const [a,b] of [[LX,-2.95],[-1.45,-.975],[.075,.55],[2.05,CX]])
      B.box(M.shade,b-a,.018,.012,(a+b)/2,y,FZ+.008);
    for(const [a,b] of [[BZ,-4.35],[-2.85,-2.45],[-.95,-.55],[.95,CZ]])
      B.box(M.shade,.012,.018,b-a,SX+.008,y,(a+b)/2);
  }
  // ---- 窗户 ----
  function addWindow(cx, cy, cz, ry, w, h, frameMat, opts = {}) {
    const W = winLocal(cx, cy, cz, ry);
    const d = 0.1;
    B.box(frameMat, w + 0.16, 0.08, d, ...off(W, 0, -h / 2 - 0.04, 0.01), ry);
    B.box(frameMat, w + 0.16, 0.08, d, ...off(W, 0, h / 2 + 0.04, 0.01), ry);
    B.box(frameMat, 0.08, h + 0.16, d, ...off(W, -w / 2 - 0.04, 0, 0.01), ry);
    B.box(frameMat, 0.08, h + 0.16, d, ...off(W, w / 2 + 0.04, 0, 0.01), ry);
    const index=windowIndex++,roomGroup=roomOrder[index%roomOrder.length];
    const roomMat=M.windowGroups[roomGroup];
    B.plane(M.shopGlass,w-.06,h-.06,...off(W,0,0,.025),ry);
    interiorKit.room(W,w,h,roomGroup,index);
    openings.push({...W,w,h,type:'room'});
    B.box(frameMat, 0.045, h - 0.06, 0.035, ...off(W, 0, 0, 0.045), ry);
    for(const ly of [-h/6,h/6])B.box(frameMat,w-.06,.035,.035,...off(W,0,ly,.05),ry);
    B.box(M.trim, w + 0.26, 0.09, 0.22, ...off(W, 0, -h / 2 - 0.11, 0.05), ry);
    B.box(M.trim, w + 0.3, 0.12, 0.16, ...off(W, 0, h / 2 + 0.13, 0.02), ry);
    if (opts.pediment) {
      const sh = new THREE.Shape();
      sh.moveTo(-(w / 2 + 0.2), 0); sh.lineTo(w / 2 + 0.2, 0); sh.lineTo(0, 0.36); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false });
      B.add(M.trim, placed(g, ...off(W, 0, h / 2 + 0.22, -0.06), ry));
    }
    const gp = off(W, 0, 0, 0.14);
    spots.push({x:gp[0],y:cy,z:gp[2],w,h,strength:roomMat.userData.strength});
  }

  const fwY1 = 4.3, fwY2 = 6.7, fwH = 1.5, fwW = 0.95;
  for (const x of [-2.2, -0.45, 1.3]) addWindow(x, fwY1, FZ, 0, fwW, fwH, M.trim);
  for (const x of [-2.2, -0.45, 1.3]) addWindow(x, fwY2, FZ, 0, fwW, fwH, M.trim, {});
  for (const z of [-3.6, -1.7, 0.2]) addWindow(SX, fwY1, z, HALF, fwW, fwH, M.trim);
  for (const z of [-3.6, -1.7, 0.2]) addWindow(SX, fwY2, z, HALF, fwW, fwH, M.trim, {});
  // 圆弧转角上的转角窗
  const ca = Math.PI / 4;
  const ccx = CX + Math.cos(ca) * R, ccz = CZ + Math.sin(ca) * R;
  addWindow(ccx, fwY1, ccz, ca, 0.8, 1.35, M.trim);
  addWindow(ccx, fwY2, ccz, ca, 0.8, 1.35, M.trim, {});
  // 背墙与左墙窗（临树一侧，少而规整，夜间透暖光）
  for (const x of [-2.2, 0, 2.2]) {
    addWindow(x, fwY1, BZ, Math.PI, fwW, fwH, M.trim);
    addWindow(x, fwY2, BZ, Math.PI, fwW, fwH, M.trim, {});
  }
  for (const z of [-3.2, 0.4]) {
    addWindow(LX, fwY1, z, -HALF, fwW, fwH, M.trim);
    addWindow(LX, fwY2, z, -HALF, fwW, fwH, M.trim, {});
  }

  // ---- 底层橱窗 ----
  function addShopfront(cx, cy, cz, ry, w, h) {
    const W = winLocal(cx, cy, cz, ry);
    B.box(M.wood, w + 0.24, 0.4, 0.2, ...off(W, 0, -h / 2 - 0.2, 0.06), ry);            // 窗台壁板
    B.box(M.wood, w + 0.18, 0.08, 0.14, ...off(W, 0, h / 2 + 0.04, 0.02), ry);            // 上楣
    B.box(M.wood, 0.08, h + 0.12, 0.14, ...off(W, -w / 2 - 0.04, 0, 0.02), ry);
    B.box(M.wood, 0.08, h + 0.12, 0.14, ...off(W, w / 2 + 0.04, 0, 0.02), ry);
    B.plane(M.shopGlass, w - 0.08, h - 0.08, ...off(W, 0, 0, 0.03), ry);
    openings.push({...W,w,h,type:'shop'});
    B.box(M.wood, 0.05, h - 0.08, 0.04, ...off(W, 0, 0, 0.05), ry);                       // 中竖梃
    B.box(M.wood, w - 0.08, 0.05, 0.04, ...off(W, 0, 0.42, 0.05), ry);                    // 横梃
  }
  addShopfront(-2.2, 1.45, FZ, 0, 1.5, 1.9);
  addShopfront(1.3, 1.45, FZ, 0, 1.5, 1.9);
  addShopfront(SX, 1.45, -3.6, HALF, 1.5, 1.9);
  addShopfront(SX, 1.45, -1.7, HALF, 1.5, 1.9);
  addShopfront(SX, 1.45, 0.2, HALF, 1.5, 1.9);
  // 招牌板
  for (const x of [-2.2, 1.3]) {
    B.box(M.trim, 1.7, 0.34, 0.1, x, F0 - 0.42, FZ - 0.02);
    B.box(M.woodDark, 1.5, 0.06, 0.06, x, F0 - 0.62, FZ + 0.02);
  }

  // ---- 入口双开门 ----
  function addDoor(cx, cz, ry) {
    const W = winLocal(cx, 1.2, cz, ry);
    B.box(M.trim, 0.12, 2.5, 0.26, ...off(W, -0.58, 0, -0.02), ry);
    B.box(M.trim, 0.12, 2.5, 0.26, ...off(W, 0.58, 0, -0.02), ry);
    B.box(M.trim, 1.28, 0.14, 0.26, ...off(W, 0, 1.2, -0.02), ry);
    for(const x of [-.26,.26]){
      B.box(M.woodDark,.48,.74,.07,...off(W,x,-.7,.07),ry);
      for(const edge of [-1,1])B.box(M.woodDark,.055,2.15,.07,...off(W,x+edge*.215,0,.07),ry);
      B.box(M.woodDark,.48,.06,.07,...off(W,x,1.045,.07),ry);
      B.box(M.woodDark,.48,.055,.07,...off(W,x,-.3,.07),ry);
      B.plane(M.shopGlass,.37,1.27,...off(W,x,.37,.09),ry);
    }
    B.plane(M.shopGlass, 0.85, 0.35, ...off(W, 0, 1.32, 0.0), ry);
    B.box(M.trim, 1.15, 0.1, 0.16, ...off(W, 0, 1.54, 0.0), ry);
    B.box(M.shade, 1.5, 0.09, 0.34, ...off(W, 0, -1.155, 0.3), ry);
    B.box(M.shade, 1.7, 0.09, 0.34, ...off(W, 0, -1.065, 0.62), ry);
    for(const x of [-.08,.08]){
      B.box(interiorKit.C.brass,.025,.22,.035,...off(W,x,.03,.16),ry);
      for(const y of [-.06,.12])B.box(interiorKit.C.brass,.035,.025,.07,...off(W,x,y,.13),ry);
    }
  }
  addDoor(-0.45, FZ, 0);
  addDoor(ccx+.02, ccz+.02, ca);

  // ---- 铁艺阳台 ----
  function addBalcony(cx, cz, ry, width, depth, y) {
    const W = winLocal(cx, y, cz, ry);
    B.box(M.trim, width, 0.09, depth, ...off(W, 0, 0, depth / 2 - 0.06), ry);
    B.box(M.shade, width - 0.1, 0.06, depth - 0.12, ...off(W, 0, -0.08, depth / 2 - 0.06), ry);
    for (let i = -1; i <= 1; i++) B.box(M.trim, 0.14, 0.22, 0.16, ...off(W, i * width / 3, -0.16, depth - 0.18), ry);
    const h = 0.55;
    B.box(M.iron, width, 0.06, 0.09, ...off(W, 0, h, depth - 0.06), ry);
    B.box(M.iron, width, 0.045, 0.05, ...off(W, 0, 0.05, depth - 0.06), ry);
    B.box(M.trim, width, 0.05, 0.06, ...off(W, 0, -0.13, depth - 0.1), ry); // 檐口饰边
    const n = Math.max(3, Math.floor(width / 0.16));
    for (let i = 0; i <= n; i++) {
      const lx = -width / 2 + 0.09 + (width - 0.18) * i / n;
      B.box(M.iron, 0.035, h - 0.12, 0.035, ...off(W, lx, h / 2, depth - 0.06), ry);
      B.torus(M.iron, 0.05, 0.012, ...off(W, lx, h * 0.45, depth - 0.06), ry); // 铸铁花饰
    }
    for (const sx of [-1, 1]) {
      B.box(M.iron, 0.06, 0.06, depth - 0.12, ...off(W, sx * width / 2, h, depth / 2 - 0.06), ry);
      B.box(M.iron, 0.045, 0.045, depth - 0.12, ...off(W, sx * width / 2, 0.05, depth / 2 - 0.06), ry);
      for (let i = 0; i <= 3; i++) {
        const lz = 0.12 + (depth - 0.24) * i / 3;
        B.box(M.iron, 0.035, h - 0.12, 0.035, ...off(W, sx * width / 2, h / 2, lz), ry);
      }
    }
  }
  addBalcony(-.6, FZ, 0, 5.6, 1.0, 3.0);
  addBalcony(SX, -1.6, HALF, 6.0, 1.0, 3.0);
  // Continuous rounded corner balcony, rail and slender veranda columns.
  for(let i=0;i<24;i++) {
    const a=(i+.5)/24*HALF, r=R+.5, x=CX+Math.cos(a)*r,z=CZ+Math.sin(a)*r;
    B.box(M.trim,r*HALF/24+.025,.09,1.0,x,3,z,HALF-a);
    const rr=R+.94,rx=CX+Math.cos(a)*rr,rz=CZ+Math.sin(a)*rr;
    B.box(M.iron,rr*HALF/24+.015,.045,.045,rx,3.55,rz,HALF-a);
    B.box(M.iron,.024,.48,.024,rx,3.28,rz);
    B.box(M.iron,rr*HALF/24+.015,.035,.04,rx,3.05,rz,HALF-a);
  }
  for(const x of [-3.25,-.6,2.1]) {
    B.cyl(M.trim,.035,.045,2.25,10,x,4.16,FZ+.88);
    B.cyl(M.trim,.07,.07,.1,10,x,3.07,FZ+.88);
  }
  for(const z of [-4.35,-1.6,1.25]) B.cyl(M.trim,.035,.045,2.25,10,SX+.88,4.16,z);
  B.box(M.shade,5.9,.10,1.18,-.6,5.32,FZ+.48);
  B.box(M.shade,1.18,.10,6.15,SX+.48,5.32,-1.6);
  for(let i=0;i<24;i++) {
    const a=(i+.5)/24*HALF,r=R+.5;
    B.box(M.shade,r*HALF/24+.03,.1,1.18,CX+Math.cos(a)*r,5.32,CZ+Math.sin(a)*r,HALF-a);
  }

  // ---- 条纹雨棚（二层阳台上方 + 底层橱窗） ----
  function addAwning(cx, cy, cz, ry, width, depth) {
    const W = winLocal(cx, cy, cz, ry);
    B.box(M.awning, width, 0.06, depth, ...off(W, 0, 0.04, depth / 2 + 0.02), ry, 0.16);
    const ty = 0.04 - Math.tan(0.16) * depth;
    B.box(interiorKit.C.plum,width,.12,.025,...off(W,0,ty,depth+.075),ry);
    for (const sx of [-1, 1]) {
      const lx = sx * (width / 2 - 0.25);
      B.cyl(M.iron, 0.018, 0.018, depth * 1.05, 6, ...off(W, lx, -0.06, depth / 2), ry, false, 0, Math.PI * 2, HALF + 0.16);
    }
  }
  addAwning(-2.2,2.61,FZ,0,1.75,.48);
  addAwning(1.3,2.61,FZ,0,1.75,.48);
  addAwning(SX,2.61,-3.6,HALF,1.75,.48);
  // Window boxes sit on selected sills and remain clear of the balcony rail.
  for(const [x,z,ry] of [[-2.2,FZ,0],[SX,-1.7,HALF]]){
    const W=winLocal(x,5.85,z,ry);
    B.box(interiorKit.C.sage,.72,.15,.20,...off(W,0,0,.16),ry);
    for(let j=0;j<5;j++){
      const p=off(W,(j-2)*.13,.14,.18);
      B.sph(interiorKit.C.leaf,.095,...p,1,.65,.8);
      B.sph(interiorKit.C.flower,.075,p[0],p[1]+.07,p[2],1,.6,1);
    }
  }
  interiorKit.cafe();
  const interiors=interiorKit.finish(parent);
  B.finish(shell, { cast: true, receive: true, name: 'building' });
  function lettering(text,x,y,z,w,h,size,color) {
    const c=document.createElement('canvas'); c.width=1024;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`${size}px Georgia`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
    mesh.position.set(x,y,z);shell.add(mesh);
  }
  lettering('JACARANDA COFFEE',-2.2,2.57,FZ+.568,1.55,.12,58,'#f2e2c5');
  lettering('COFFEE & PATISSERIE',1.3,2.57,FZ+.568,1.55,.12,52,'#f2e2c5');
  lettering('EST. 1892',-.4,8.25,FZ+.02,1.4,.18,58,'#695d61');
  return { spots, interiors, openings, shell, roof };
}
