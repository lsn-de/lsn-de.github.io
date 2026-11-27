// 蓝花楹：程序化弯干分叉 + 花簇沿细枝分布；树梢轻摆分组；花瓣飘落与落地花瓣
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './config.js';
import { paint } from './core.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);

// 单棵树：返回 { group, canopy, height, phase }
// group = 树干与低层枝（不动），canopy = 上层枝与花簇（摆动）
export function buildTree(seed, M, opt = {}) {
  const rng=mulberry32(seed), wood=[], flowers=[], anchors=[];
  const H=opt.height || 10.2, spread=opt.spread || 3.3;
  const root=new THREE.Vector3(opt.x || 0,0,opt.z || 0);
  const outward=root.x < -3.7 ? new THREE.Vector3(-1,0,0) : root.x>4.5 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,0,-1);
  const tangent=new THREE.Vector3(-outward.z,0,outward.x);
  const bark=new THREE.Color(0x54463f);
  function inside(q,margin=.22){
    const x=q.x+root.x,z=q.z+root.z;
    return q.y<9.05 && x>-3.7-margin && x<4.5+margin && z>-4.9-margin && z<3.75+margin;
  }
  function safe(q,force=false){
    if(force || q.y<9.35){
      if(outward.x<0)q.x=Math.min(q.x,-4.04-root.x);
      else if(outward.x>0)q.x=Math.max(q.x,5.02-root.x);
      else q.z=Math.min(q.z,-5.2-root.z);
    }
    return q;
  }
  function branch(a,end,r0,r1,bend=.12,waypoints=null){
    safe(end,a.y<9.35);
    const mid=a.clone().lerp(end,.5);
    mid.addScaledVector(tangent,(rng()-.5)*bend);
    mid.addScaledVector(outward,bend*.18);
    mid.y-=bend*.12;safe(mid,a.y<9.35);
    const curve=new THREE.CatmullRomCurve3(waypoints || [a.clone(),mid,end.clone()]);
    const segments=waypoints?20:r0>.12?9:r0>.04?6:3,radial=r0>.08?8:5;
    const g=new THREE.TubeGeometry(curve,segments,1,radial,false),positions=g.attributes.position;
    for(let i=0;i<=segments;i++){
      const u=i/segments,c=curve.getPointAt(u),r=THREE.MathUtils.lerp(r0,r1,u);
      for(let j=0;j<=radial;j++){
        const k=i*(radial+1)+j;
        const v=new THREE.Vector3().fromBufferAttribute(positions,k).sub(c);
        v.multiplyScalar(r*(1+.045*Math.cos(j*2.7+seed))).add(c);positions.setXYZ(k,v.x,v.y,v.z);
      }
    }
    g.computeVertexNormals();
    const color=bark.clone().multiplyScalar(.88+rng()*.22);
    wood.push(paint(g,color));
    return end;
  }
  function spray(base,direction,size=1,n=26){
    const dir=direction.clone().normalize(),side=new THREE.Vector3(-dir.z,0,dir.x).normalize();
    const length=(.7+rng()*.45)*size;
    const tint=new THREE.Color(PAL.jac[Math.floor(rng()*PAL.jac.length)]);
    for(let j=0;j<n;j++){
      const u=rng(),width=(.15+Math.sin(u*Math.PI)*.23)*size;
      const q=base.clone().addScaledVector(dir,u*length).addScaledVector(side,(rng()-.5)*width*2);
      q.y+=(rng()-.5)*.38*size-.22*u*u*size;
      if(inside(q,.28))continue;
      const r=(.075+rng()*.075)*(1-u*.23)*size;
      const g=new THREE.IcosahedronGeometry(r,0);
      g.scale(1.35,.45+rng()*.35,.82);g.rotateX((rng()-.5)*.9);g.rotateY(rng()*6.28);g.translate(q.x,q.y,q.z);
      const elevation=THREE.MathUtils.clamp((q.y-H*.55)/(H*.4),0,1);
      const color=tint.clone().multiplyScalar((.70+elevation*.35)*(.92+rng()*.16));
      flowers.push(paint(g,color));
      if(j%4===0)anchors.push(q.clone());
    }
  }
  // Curved trunk with forks starting at different heights, rather than one umbrella joint.
  const trunk=[];
  const lean=(rng()-.5)*1.0;
  for(let i=0;i<=8;i++){
    const u=i/8,q=new THREE.Vector3();
    q.addScaledVector(tangent,Math.sin(u*2.4+seed)*.3*u+lean*u*u);
    q.addScaledVector(outward,.12*Math.sin(u*Math.PI));q.y=H*.45*u;safe(q,true);trunk.push(q);
  }
  branch(trunk[0],trunk[trunk.length-1],.28,.115,.2,trunk);
  const treeTurn=rng()*.5;
  for(let i=0;i<6;i++){
    const angle=-1.6+i*.64+treeTurn+(rng()-.5)*.28;
    const dir=outward.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle));
    const reach=spread*(.66+rng()*.24);
    const start=trunk[4+(i%4)].clone();
    const elbow=start.clone().addScaledVector(dir,reach*.43);elbow.y=H*(.57+rng()*.075);
    branch(start,elbow,.13,.066,.8);
    spray(elbow,dir,.95,28);
    for(let j=0;j<3;j++){
      const turn=(j-1)*.52+(rng()-.5)*.24;
      const fd=dir.clone().applyAxisAngle(UP,turn);
      const tip=elbow.clone().addScaledVector(fd,reach*(.42+rng()*.22));tip.y=H*(.72+rng()*.13);
      branch(elbow,tip,.058,.024,.48);
      for(let k=0;k<2;k++){
        const td=fd.clone().applyAxisAngle(UP,(k-.5)*.85);
        const end=tip.clone().addScaledVector(td,.4+rng()*.6);end.y+=H*(.015+rng()*.06);
        branch(tip,end,.022,.005,.12);
        spray(end,td, .85+rng()*.3);
        const droop=td.clone().applyAxisAngle(UP,(rng()-.5)*1.1);droop.y=-.3;
        spray(end.clone().lerp(tip,.3),droop,.8+rng()*.25);
      }
      spray(elbow.clone().lerp(tip,.7),fd,.72,18);
    }
  }
  const group=new THREE.Group(),canopy=new THREE.Group();
  const woodGeo=mergeGeometries(wood,false),flowerGeo=mergeGeometries(flowers,false);
  const wm=new THREE.Mesh(woodGeo,M.tree),fm=new THREE.Mesh(flowerGeo,M.flower);
  wm.name='curved-trunk';fm.name='flower-sprays';wm.castShadow=true;wm.receiveShadow=true;fm.castShadow=true;fm.receiveShadow=true;
  group.add(wm);canopy.add(fm);group.add(canopy);group.name='jacaranda-'+seed;
  const bounds=new THREE.Box3();woodGeo.computeBoundingBox();flowerGeo.computeBoundingBox();bounds.copy(woodGeo.boundingBox).union(flowerGeo.boundingBox);
  const radius=Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z));
  for(const g of wood.concat(flowers))g.dispose();
  return {group,canopy,height:bounds.max.y,radius,bounds,anchors,phase:rng()*Math.PI*2};
}

// 飘落花瓣（InstancedMesh，每帧绕树冠区循环）
export function createPetals(M,count,trees){
  const rng=mulberry32(20261111),shape=new THREE.Shape();
  shape.moveTo(0,-.052);shape.bezierCurveTo(-.05,-.01,-.032,.05,0,.061);shape.bezierCurveTo(.043,.043,.037,-.018,0,-.052);
  const geo=new THREE.ShapeGeometry(shape,4),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getY(i)*25)*.009);
  geo.computeVertexNormals();
  const fades=new THREE.InstancedBufferAttribute(new Float32Array(count),1);
  geo.setAttribute('instanceFade',fades);
  const mat=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.85,emissive:0xa67bc5,emissiveIntensity:.3,transparent:true,depthWrite:false});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float instanceFade; varying float vPetalFade;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPetalFade=instanceFade;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPetalFade;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vPetalFade;');
  };
  const mesh=new THREE.InstancedMesh(geo,mat,count);mesh.name='falling-petals';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
  const dummy=new THREE.Object3D(),col=new THREE.Color(),particles=[];
  const colors=[0xc7a5ee,0xd9b7ef,0xab8ad8,0xbaa0e5,0xe3c7f4];
  function footprint(x,z,margin=.12){
    if(x<-3.4-margin || x>3.4+margin || z<-4.6-margin || z>2.6+margin)return false;
    return x<=2.2 || z<=1.4 || (x-2.2)**2+(z-1.4)**2<(1.2+margin)**2;
  }
  function veranda(x,z){
    return (x>-3.55 && x<2.2 && z>2.45 && z<3.65) || (x>3.25 && x<4.5 && z>-4.7 && z<1.4) || (x>=2.2 && z>=1.4 && (x-2.2)**2+(z-1.4)**2<2.3**2);
  }
  function blocked(x,y,z){return y<8.68 && footprint(x,z);}

  function spawn(p){
    for(let n=0;n<24;n++){
      const tree=trees[Math.floor(rng()*trees.length)];
      const point=tree.anchors[Math.floor(rng()*tree.anchors.length)].clone();
      tree.canopy.updateWorldMatrix(true,false);tree.canopy.localToWorld(point);
      p.x=point.x;p.y=point.y-.05;p.z=point.z;
      if(!blocked(p.x,p.y,p.z))break;
    }
    p.phase=rng()*6.283;p.speed=.24+rng()*.22;p.spin=(rng()-.5)*1.6;p.scale=.85+rng()*.85;
    p.age=0;p.landed=false;p.fade=1;p.retire=0;p.landingY=null;p.birthFade=false;
  }
  function advance(p,dt,t,wind){
    p.age+=dt;
    if(p.landed || p.retire>0){p.retire+=dt;p.fade=Math.max(0,1-p.retire/1.8);return;}
    if(p.landingY!==null){
      p.y=Math.max(p.landingY,p.y-p.speed*dt);
      if(p.y<=p.landingY){p.landed=true;p.retire=.001;}return;
    }
    const nx=p.x+(.07+Math.sin(t*.65+p.phase)*.22)*dt*wind;
    const nz=p.z+(.18+Math.cos(t*.55+p.phase)*.16)*dt*wind;
    const ny=p.y-p.speed*dt;
    if(blocked(nx,ny,nz)){
      if(p.y>=8.68){
        p.x=nx;p.z=nz;p.landingY=footprint(nx,nz,-.28)?8.4:8.65;
        p.y=Math.max(p.landingY,ny);return;
      }
      // Slide along the building boundary, retaining continuous positions.
      if(!blocked(nx,ny,p.z))p.x=nx;
      if(!blocked(p.x,ny,nz))p.z=nz;
      p.y=ny;
    }else {p.x=nx;p.y=ny;p.z=nz;}
    if(veranda(p.x,p.z)){
      const surface=p.y+dt*p.speed>5.4 ? 5.4 : p.y+dt*p.speed>3.09 ? 3.09 : null;
      if(surface!==null && p.y<=surface){p.y=surface;p.landed=true;p.retire=.001;}
    }
    const floor=(p.z>5.56 || p.x>5.56)?.057:.024;
    if(p.y<=floor){p.y=floor;p.landed=true;p.retire=.001;}
    if(Math.abs(p.x)>8.7 || Math.abs(p.z)>8.7 || ((Math.abs(p.x)>6.93 || Math.abs(p.z)>6.93) && p.y<1.1))p.retire=.001;
  }
  for(let i=0;i<count;i++){
    const p={};spawn(p);
    const age=rng()*p.y/p.speed*.88;
    for(let t=0;t<age;t+=.2){advance(p,.2,t,.8);if(p.landed || p.retire>0)break;}
    if(p.retire>0)p.retire=rng()*1.4;
    particles.push(p);col.set(colors[Math.floor(rng()*colors.length)]);mesh.setColorAt(i,col);
  }
  mesh.instanceColor.needsUpdate=true;
  function update(dt,t,wind){
    for(let i=0;i<count;i++){
      const p=particles[i];advance(p,dt,t,wind);
      if(p.fade<=0 && !p.birthFade){spawn(p);p.fade=0;p.birthFade=true;}
      if(p.birthFade){p.fade=Math.min(1,p.age/.8);if(p.fade>=1)p.birthFade=false;}
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(Math.sin(t*1.2+p.phase)*.85,t*p.spin+p.phase,Math.sin(t*.9+p.phase)*.7);
      dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);fades.setX(i,p.fade);
    }
    mesh.instanceMatrix.needsUpdate=true;fades.needsUpdate=true;
  }
  return {mesh,update,particles};
}

// 树下半透光缝隙间的落地花瓣
export function scatterFallen(M,trees,seed){
  const rng=mulberry32(seed ?? 99),geos=[];
  for(const tree of trees){
    tree.canopy.updateWorldMatrix(true,false);
    for(let i=0;i<500;i++){
      const anchor=tree.anchors[Math.floor(rng()*tree.anchors.length)].clone();tree.canopy.localToWorld(anchor);
      const x=anchor.x+(rng()-.5)*1.4,z=anchor.z+rng()*1.5;
      if(Math.abs(x)>6.9 || Math.abs(z)>6.9 || (x>-3.55 && x<4.5 && z>-4.8 && z<3.8))continue;
      const g=new THREE.PlaneGeometry(.03+rng()*.025,.045+rng()*.025);
      const y=(z>5.56 || x>5.56)?.047:.017;
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,rng()*6.283)),new THREE.Vector3(1,1,1)));
      geos.push(paint(g,PAL.jac[Math.floor(rng()*PAL.jac.length)]));
    }
  }
  const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();
  const mesh=new THREE.Mesh(merged,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));mesh.name='fallen-petals';mesh.receiveShadow=true;
  return mesh;
}
