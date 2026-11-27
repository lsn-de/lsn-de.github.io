import * as THREE from 'three';
import { Builder, canvas2d } from './core.js';

// Shared materials and merged geometry keep the furnished windows inexpensive.
export function createInteriorKit(M) {
  const make=(name,color,extra={})=>{
    const m=new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
    m.name=name;return m;
  };
  const C={
    plaster:make('room-plaster',0xbfae97),
    walnut:make('walnut',0x694731),
    oak:make('oak',0xa37b51),
    marble:make('warm-stone',0xe4d7bb),
    brass:make('antique-brass',0xb39556,{metalness:.55,roughness:.38}),
    ceramic:make('ivory-ceramic',0xece0c8,{roughness:.38}),
    sage:make('sage-upholstery',0x607769),
    plum:make('plum-upholstery',0x795b7d),
    leaf:make('plant-leaves',0x456b50),
    flower:make('small-purple-flowers',0xb78bc7),
    pastry:make('pastry',0xc99552),
    black:make('coffee-machine',0x30373b,{metalness:.25,roughness:.4}),
    paper:make('paper',0xd9cbb0),
    curtain:[], bulbs:[],
  };
  const litSurfaces=[C.plaster,C.walnut,C.oak,C.marble,C.ceramic,C.sage,C.plum,C.paper,C.pastry];
  const surfaceBatch=make('furnished-surfaces',0xffffff,{vertexColors:true,emissive:0xffffff});
  surfaceBatch.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb;');
  };
  surfaceBatch.customProgramCacheKey=()=>'furnished-surfaces-v1';
  for(const m of litSurfaces)m.userData.vertexBatch=surfaceBatch;
  for(const strength of [1,.72,.34,.025]) {
    const curtain=make('linen-'+strength,strength<.1?0x6d6572:0xd8c4aa);
    curtain.emissive.set(0xa78960);curtain.userData.strength=strength;C.curtain.push(curtain);
    const bulb=make('lamp-'+strength,0xe0bb78,{emissive:0xffc67d});
    bulb.userData.strength=strength;C.bulbs.push(bulb);
  }
  let B=new Builder();const E=new Builder();
  const floorBuilders=[B,new Builder(),new Builder()],floorGroups=[];
  const levels=[.22,2.96,5.56],stairGroups=[];
  const curtainBuilders=[new Builder(),new Builder(),new Builder()],curtainGroups=[];
  const furnishingBounds=[];
  function label(text,w,h,bg,ink,font=40){
    const [c,ctx]=canvas2d(512,256);ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split('\n');lines.forEach((line,i)=>{
      ctx.font=`${i===0?font:font*.55}px Georgia`;
      ctx.fillText(line,256,128+(i-(lines.length-1)/2)*61);
    });
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=4;
    return new THREE.MeshStandardMaterial({map:texture,roughness:.85,emissive:0x685239,emissiveIntensity:.12});
  }
  const backSign=label('JACARANDA\nCOFFEE & SLOW MORNINGS',1,1,'#655346','#eee0bd',46);
  const menuMat=label('MENU\nCOFFEE · PASTRIES\nTAKE A LITTLE MOMENT',1,1,'#35443d','#ebdfbd',56);
  const bladeMat=label('J\nCOFFEE',1,1,'#5a425c','#ead8b6',92);
  function plant(builder,x,y,z,s=1,flowers=false) {
    builder.cyl(M.terracotta,.14*s,.105*s,.25*s,10,x,y+.125*s,z);
    builder.cyl(C.walnut,.12*s,.12*s,.018*s,10,x,y+.253*s,z);
    for(let i=0;i<5;i++){
      const a=i*2.4,dx=Math.cos(a)*.13*s,dz=Math.sin(a)*.13*s;
      builder.cyl(C.leaf,.012*s,.015*s,(.26+i*.035)*s,5,x+dx*.5,y+(.34+i*.015)*s,z+dz*.5);
      builder.sph(C.leaf,.10*s,x+dx,y+(.4+i*.035)*s,z+dz,.55,1.4,.7);
      if(flowers)builder.sph(C.flower,.065*s,x+dx,y+(.53+i*.035)*s,z+dz,1,.65,1);
    }
  }
  function cup(builder,x,y,z,s=1){
    builder.cyl(C.ceramic,.095*s,.095*s,.018*s,12,x,y+.009*s,z);
    builder.cyl(C.ceramic,.058*s,.044*s,.075*s,10,x,y+.055*s,z);
    builder.cyl(C.walnut,.048*s,.048*s,.004*s,10,x,y+.095*s,z);
    builder.torus(C.ceramic,.028*s,.009*s,x+.067*s,y+.061*s,z);
  }
  function chair(builder,x,z,ry,scale=1,baseY=.02){
    const L=(dx,dy,dz)=>[x+(dx*Math.cos(ry)+dz*Math.sin(ry))*scale,baseY+dy*scale,z+(-dx*Math.sin(ry)+dz*Math.cos(ry))*scale];
    for(const dx of [-.19,.19])for(const dz of [-.17,.17])builder.box(M.iron,.035*scale,.43*scale,.035*scale,...L(dx,.215,dz),ry);
    builder.cyl(C.sage,.255*scale,.255*scale,.065*scale,16,...L(0,.46,0));
    for(const dx of [-.2,.2])builder.box(M.iron,.028*scale,.5*scale,.028*scale,...L(dx,.69,-.18),ry);
    builder.box(C.sage,.44*scale,.18*scale,.065*scale,...L(0,.82,-.2),ry);
  }
  function table(builder,x,z,r=.36,y=.02){
    builder.cyl(C.marble,r,r,.065,20,x,y+.76,z);
    builder.cyl(C.brass,.035,.055,.7,10,x,y+.37,z);
    builder.cyl(M.iron,.23,.25,.035,12,x,y+.02,z);
    cup(builder,x-.11,y+.795,z+.06,.8);
    builder.cyl(C.ceramic,.045,.06,.13,10,x+.15,y+.86,z-.05);
    builder.cyl(C.leaf,.009,.009,.17,5,x+.15,y+.98,z-.05);
    for(let i=0;i<3;i++)builder.sph(C.flower,.048,x+.15+Math.cos(i*2.1)*.04,y+1.06,z-.05+Math.sin(i*2.1)*.04);
  }
  function room(W,w,h,group,index){
    const P=(x,y,z)=>[W.cx+x*W.c+z*W.s,W.cy+y,W.cz-x*W.s+z*W.c];
    const box=(m,a,b,c,x,y,z)=>B.box(m,a,b,c,...P(x,y,z),W.ry);
    const cyl=(m,rt,rb,hh,x,y,z)=>B.cyl(m,rt,rb,hh,10,...P(x,y,z));
    B=curtainBuilders[W.cy>5.4?2:1];
    // Folded linen panels frame the view without covering the entire aperture.
    for(const sign of [-1,1])for(let j=0;j<3;j++){
      cyl(C.curtain[group],.035,.045,h-.12,sign*(w/2-.055-j*.036),.015,-.09);
    }
    box(C.brass,w-.04,.018,.018,0,h/2-.075,-.05);
    B=floorBuilders[0];
  }

  function cafe(){
    B=floorBuilders[0];
    B.box(C.sage,6.2,1.05,.05,0,.75,-4.35);
    B.box(C.brass,6.2,.025,.06,0,1.29,-4.31);
    // Front bar: positioned in the line of sight through the left shop window.
    B.box(C.walnut,1.65,.81,.55,-2.14,.64,1.58);
    for(const x of [-2.65,-2.15,-1.65])B.box(C.oak,.43,.61,.025,x,.66,1.87);
    B.box(C.marble,1.77,.09,.65,-2.14,1.09,1.58);
    B.box(C.black,.58,.40,.31,-2.65,1.34,1.65);
    B.box(C.brass,.6,.045,.35,-2.65,1.55,1.65);
    B.box(C.brass,.58,.035,.06,-2.65,1.26,1.85);
    for(const x of [-2.79,-2.51]){
      B.cyl(C.brass,.025,.025,.14,8,x,1.27,1.83);
      cup(B,x,1.13,1.86,.65);
    }
    B.cyl(C.black,.075,.075,.17,12,-1.77,1.25,1.44);
    B.cyl(C.ceramic,.085,.07,.15,12,-1.77,1.4,1.44);
    // Display counter faces the side windows.
    B.box(C.walnut,.58,.8,1.55,2.3,.63,-1.65);
    B.box(C.marble,.67,.07,1.67,2.3,1.07,-1.65);
    for(const z of [-2.18,-1.66,-1.14]){
      B.box(C.ceramic,.39,.025,.35,2.3,1.13,z);
      for(const x of [2.2,2.4])B.sph(C.pastry,.095,x,1.2,z,.8,.5,1.1);
    }
    B.box(C.brass,.026,.46,1.65,2.01,1.34,-1.65);
    B.box(C.brass,.026,.46,1.65,2.59,1.34,-1.65);
    for(const z of [-2.46,-.84])B.box(C.brass,.6,.025,.025,2.3,1.56,z);
    B.box(M.shopGlass,.58,.42,1.57,2.3,1.35,-1.65);
    for(const y of [.65,1.25,1.83]){
      B.box(C.oak,2.6,.055,.25,.1,y,-4.17);
      for(let j=0;j<5;j++){
        const x=-.95+j*.46;
        if(j%3===0)B.cyl(C.ceramic,.085,.065,.19,10,x,y+.13,-4.16);
        else B.box(j%2?C.paper:C.plum,.12,.22,.13,x,y+.14,-4.15);
      }
    }
    curtainBuilders[0].plane(backSign,2.1,.85,-.9,2.12,-4.32);
    table(B,.70,1.33,.36,.23);chair(B,.11,1.33,-Math.PI/2,.85,.23);chair(B,1.29,1.33,Math.PI/2,.85,.23);
    table(B,2.32,-3.55,.31,.23);chair(B,1.78,-3.55,-Math.PI/2,.8,.23);
    B.box(C.sage,.40,.12,.67,2.77,.7,-3.56);
    B.box(C.sage,.075,.55,.67,3.0,.91,-3.56);
    plant(B,-1.25,.23,-2.0,1.1);
    // Three small pendant shades share one emissive material; no per-bulb lights.
    for(const [x,z] of [[-2.15,1.45],[.7,1.33],[2.32,-3.55]]){
      B.cyl(C.brass,.012,.012,.34,6,x,2.48,z);
      B.cyl(C.sage,.085,.24,.16,16,x,2.23,z);
      B.cyl(C.bulbs[0],.18,.18,.025,12,x,2.145,z);
    }
  }
  function streets(parent){
    const sets=[{x:1.15,z:4.35,axis:'x'},{x:4.43,z:-3.55,axis:'z'}];
    for(const s of sets){
      table(E,s.x,s.z,.33);
      const alongX=s.axis==='x',dx=alongX?.57:0,dz=alongX?0:.57;
      chair(E,s.x-dx,s.z-dz,alongX?-Math.PI/2:Math.PI,.8);
      chair(E,s.x+dx,s.z+dz,alongX?Math.PI/2:0,.8);
      furnishingBounds.push({name:'terrace-'+s.axis,minX:s.x-(alongX?.79:.34),maxX:s.x+(alongX?.79:.34),minZ:s.z-(alongX?.34:.79),maxZ:s.z+(alongX?.34:.79)});
    }
    for(const [x,z,s] of [[-3.05,3.27,1.05],[2.13,3.22,1],[4.08,-2.45,.8]])plant(E,x,.02,z,s,true);
    // Menu is beside the straight entrance and behind the bench, leaving the door clear.
    const mx=-1.7,mz=3.38;
    for(const sign of [-1,1])E.box(C.oak,.045,.91,.045,mx+sign*.24,.46,mz,0,0,sign*.07);
    E.box(C.oak,.60,.76,.065,mx,.58,mz);
    E.plane(menuMat,.51,.66,mx,.59,mz+.039);
    E.box(C.oak,.50,.045,.42,mx,.08,mz-.12);
    E.box(C.brass,.12,.025,.08,mx,.99,mz);
    // Two-sided, projecting blade sign. Separate faces remain legible from either side.
    E.box(M.iron,.045,.07,.80,3.58,2.54,.95);
    E.box(M.iron,.045,.42,.045,3.58,2.36,1.27);
    E.box(C.brass,.055,.57,.55,3.59,2.05,1.23);
    E.plane(bladeMat,.48,.50,3.623,2.05,1.23,Math.PI/2);
    E.plane(bladeMat,.48,.50,3.557,2.05,1.23,-Math.PI/2);
    E.finish(parent,{name:'cafe-terrace',cast:true,receive:true});
  }
  function completeFloors(parent){
    const slabMat=C.oak;
    for(let floor=0;floor<3;floor++){
      B=floorBuilders[floor];const y=levels[floor];
      // A continuous floor follows the rounded footprint. Upper slabs have a real stairwell hole.
      const shape=new THREE.Shape();shape.moveTo(-3.17,-4.37);shape.lineTo(3.17,-4.37);
      shape.lineTo(3.17,1.4);shape.absarc(2.2,1.4,.97,0,Math.PI/2,false);
      shape.lineTo(-3.17,2.37);shape.closePath();
      if(floor){const hole=new THREE.Path();hole.moveTo(-3.07,-3.62);hole.lineTo(-3.07,.22);hole.lineTo(-1.8,.22);hole.lineTo(-1.8,-3.62);hole.closePath();shape.holes.push(hole);}
      const slab=new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false,curveSegments:16});
      slab.rotateX(Math.PI/2);slab.translate(0,y,0);B.add(slabMat,slab);
      // Slim floorboard joints stop at the stair void.
      for(let x=-3.0;x<3.05;x+=.3){
        const hole=floor&&x< -1.8;
        const end=x>2.2?1.4+Math.sqrt(.97**2-(x-2.2)**2):2.35;
        const start=hole?.24:-4.35;B.box(C.walnut,.008,.002,end-start,x,y+.002,(end+start)/2);
      }
      if(floor){
        B.box(C.sage,6.25,.65,.035,0,y+.325,-4.35);
        B.box(C.brass,6.25,.025,.04,0,y+.66,-4.33);
        // Guard the open stairwell; leave the landing and bottom approach accessible.
        for(let z=-3.45;z<.15;z+=.32)B.box(C.brass,.024,.88,.024,-1.77,y+.44,z);
        B.box(C.walnut,.055,.055,3.8,-1.77,y+.91,-1.7);
      }
      if(floor<2){
        const roomBuilder=B;B=new Builder();
        const rise=levels[floor+1]-y,steps=16,run=3.72;
        for(let i=0;i<steps;i++){
          const top=y+rise*(i+1)/steps,z=-3.5+(i+.5)*run/steps;
          B.box(C.oak,1.12,.075,run/steps+.012,-2.45,top-.0375,z);
          B.box(C.walnut,1.12,rise/steps,.025,-2.45,top-rise/steps/2,z-run/steps/2);
          B.box(C.brass,.022,.85,.022,-3.02,top+.425,z);
        }
        const length=Math.hypot(run,rise),angle=-Math.atan2(rise,run);
        B.box(C.walnut,.055,.055,length,-3.02,y+rise/2+.89,-1.64,0,angle);
        B.box(C.walnut,.08,.15,length,-2.94,y+rise/2-.12,-1.64,0,angle);
        B.box(C.walnut,.08,.15,length,-1.96,y+rise/2-.12,-1.64,0,angle);
        const flight=new THREE.Group();flight.name='stairs-'+(floor+1);B.finish(flight,{name:'interior',cast:false,receive:false});stairGroups.push(flight);B=roomBuilder;
      }
      if(floor===1){
        // Full reading lounge: books, writing desk, sofa and a generous central aisle.
        for(const y0 of [.25,.65,1.05,1.45,1.85]){
          B.box(C.walnut,2.65,.055,.3,.25,y+y0,-4.13);
          for(let j=0;j<12;j++)B.box([C.sage,C.plum,C.paper][j%3],.11,.23+(j%3)*.035,.18,-.95+j*.21,y+y0+.16,-4.1);
        }
        B.box(C.plum,1.9,.25,.72,1.92,y+.37,-1.5);
        B.box(C.plum,.17,.55,.75,1.02,y+.55,-1.5);B.box(C.plum,.17,.55,.75,2.82,y+.55,-1.5);
        B.box(C.plum,1.9,.65,.16,1.92,y+.65,-1.83);
        B.box(C.paper,.44,.28,.12,1.4,y+.7,-1.7,0,0,.12);
        B.box(C.sage,.44,.28,.12,2.3,y+.7,-1.7,0,0,-.1);
        B.box(C.marble,1.12,.065,.6,1.9,y+.42,-.45);
        for(const x of [1.48,2.32])B.box(C.brass,.035,.38,.035,x,y+.19,-.45);
        B.box(C.paper,.3,.025,.23,1.75,y+.47,-.45);cup(B,2.14,y+.46,-.4);
        B.box(C.oak,1.45,.07,.64,-.55,y+.78,1.7);
        for(const x of [-1.18,.08])for(const z of [1.45,1.94])B.box(C.brass,.035,.75,.035,x,y+.375,z);
        chair(B,-.55,.95,Math.PI,1,y);plant(B,2.8,y,-3.7,1.25);plant(B,-2.8,y,1.7,1.1);
        curtainBuilders[floor].plane(label('THE READING ROOM\nA QUIET CHAPTER',1,1,'#615568','#eddfc6'),1.5,.22,.3,y+2.24,-4.32);
      }
      if(floor===2){
        // A furnished open studio, rather than independent boxes behind each window.
        B.box(C.walnut,1.5,.33,2.0,2.06,y+.2,-3.0);
        B.box(C.ceramic,1.48,.21,1.9,2.06,y+.46,-3.0);
        B.box(C.plum,1.5,.07,1.05,2.06,y+.59,-2.58);
        B.box(C.sage,1.55,.82,.12,2.06,y+.5,-4.02);
        for(const x of [1.69,2.4])B.box(C.paper,.56,.13,.39,x,y+.63,-3.61);
        B.box(C.walnut,.5,.55,.52,2.88,y+.275,-1.55);
        B.cyl(C.brass,.045,.07,.32,10,2.88,y+.72,-1.55);B.cyl(C.bulbs[0],.15,.22,.24,12,2.88,y+.99,-1.55);
        B.box(C.oak,2.0,.075,.65,.0,y+.78,1.65);
        for(const x of [-.87,.87])for(const z of [1.4,1.9])B.box(C.walnut,.06,.76,.06,x,y+.38,z);
        chair(B,0,.85,Math.PI,1,y);
        B.box(C.black,.62,.42,.035,0,y+1.08,1.83);B.box(C.brass,.08,.15,.12,0,y+.86,1.83);
        B.box(C.paper,.42,.018,.29,-.55,y+.83,1.62);cup(B,.64,y+.83,1.6);
        B.box(C.sage,.7,.08,1.4,2.6,y+.56,.3);B.box(C.sage,.12,.45,1.4,2.94,y+.8,.3);
        plant(B,-2.65,y,1.65,1.2);plant(B,2.8,y,1.6,.85);
        curtainBuilders[floor].plane(label('ATELIER\nJACARANDA DAYS',1,1,'#68796b','#efdfc5'),1.3,.22,0,y+2.18,-4.32);
      }
      if(floor){
        B.cyl(C.brass,.012,.012,.25,6,.1,y+2.22,-.7);
        B.cyl(C.brass,.5,.5,.035,20,.1,y+2.08,-.7);
        for(let j=0;j<6;j++){const a=j*Math.PI/3;B.sph(C.bulbs[0],.09,.1+Math.cos(a)*.43,y+2.04,-.7+Math.sin(a)*.43);}
      }
      const group=new THREE.Group();group.name='floor-'+(floor+1);parent.add(group);
      B.finish(group,{name:'interior',cast:false,receive:false});if(stairGroups[floor])group.add(stairGroups[floor]);floorGroups.push(group);
      const dressing=new THREE.Group();dressing.name='window-dressing';group.add(dressing);
      curtainBuilders[floor].finish(dressing,{name:'interior',cast:false,receive:false});curtainGroups.push(dressing);
    }
  }
  function finish(parent){
    completeFloors(parent);streets(parent);
    return {furnishingBounds,floorGroups,curtainGroups,stairGroups,levels,update(win){
      surfaceBatch.emissiveIntensity=.10+win*.20;
      for(const m of C.curtain)m.emissiveIntensity=win*.16*m.userData.strength;
      for(const m of C.bulbs)m.emissiveIntensity=(.04+win*1.25)*(m.userData.strength<.1?0:m.userData.strength);
    }};
  }
  return {room,cafe,finish,C,plant};
}
