import * as THREE from 'three';

// Free inspection camera: independent from the exterior orbit controls.
export function createExplorer({camera,controls,app,shell,roof,interiors,stopIntro,resetExterior}){
  const panel=document.getElementById('explorer'),toggle=document.getElementById('explore-toggle');
  const inputs=['x','y','z','yaw','pitch'].map(k=>document.getElementById('cam-'+k));
  const keys=new Set(),rotation=new THREE.Euler(0,0,0,'YXZ');
  let active=false,drag=null,elapsed=0,draftDirty=false;
  inputs.forEach(el=>el.addEventListener("input",()=>{draftDirty=true;}));
  const cut=document.getElementById('cutaway'),ceiling=document.getElementById('hide-roof');
  const floorNames=['一楼 · 咖啡馆','二楼 · 阅读休息室','三楼 · 生活工作室'];
  function sync(){
    rotation.setFromQuaternion(camera.quaternion,'YXZ');
    const vals=[camera.position.x,camera.position.y,camera.position.z,THREE.MathUtils.radToDeg(rotation.y),THREE.MathUtils.radToDeg(rotation.x)];
    inputs.forEach((el,i)=>{if(!draftDirty&&document.activeElement!==el)el.value=vals[i].toFixed(i<3?2:1);});
    app.dataset.camera=JSON.stringify(vals.map(n=>+n.toFixed(3)));
    app.dataset.navigation=active?'free':'orbit';
  }
  function visibility(){
    shell.visible=!cut.checked;interiors.curtainGroups.forEach(g=>g.visible=!cut.checked);roof.visible=!ceiling.checked&&!cut.checked;
    const limit=Number(document.getElementById('visible-floors').value);
    interiors.floorGroups.forEach((g,i)=>g.visible=i<limit);
    interiors.stairGroups.forEach((g,i)=>g.visible=i<limit-1);
    app.dataset.cutaway=String(cut.checked);app.dataset.visibleFloors=String(limit);
  }
  function start(){
    stopIntro();active=true;keys.clear();controls.enabled=false;controls.autoRotate=false;
    document.getElementById('orbit-toggle').classList.remove('active');
    document.getElementById('orbit-toggle').setAttribute('aria-pressed','false');
    camera.fov=65;camera.near=.035;camera.updateProjectionMatrix();
    document.body.classList.add('exploring');document.querySelector('.hint').textContent='拖动转头 · WASD 移动 · Q / E 升降 · Esc 回外景';sync();
  }
  function preset(floor){
    draftDirty=false;document.getElementById('camera-error').textContent='';start();const y=interiors.levels[floor];
    if(floor===0){camera.position.set(1.0,y+1.45,-2.8);camera.lookAt(-.8,y+.95,1.5);}
    else {camera.position.set(.1,y+1.45,1.05);camera.lookAt(.2,y+.95,-2.5);}
    document.getElementById('explore-status').textContent=floorNames[floor];
    document.querySelectorAll('[data-floor]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.floor)===floor)));
    cut.checked=false;ceiling.checked=false;document.getElementById('visible-floors').value='3';visibility();sync();
  }
  function leave(){
    active=false;draftDirty=false;keys.clear();drag=null;document.getElementById('camera-error').textContent='';controls.enabled=true;
    controls.autoRotate=false;camera.fov=35;camera.near=.1;camera.updateProjectionMatrix();
    cut.checked=false;ceiling.checked=false;document.getElementById('visible-floors').value='3';visibility();
    document.body.classList.remove('exploring');document.querySelector('.hint').textContent='拖动旋转 · 滚轮缩放 · 1 / 2 / 3 切换光照';document.getElementById('explore-status').textContent='建筑外景';
    document.querySelectorAll('[data-floor]').forEach(b=>b.setAttribute('aria-pressed','false'));
    sync();
  }
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
  document.querySelectorAll('[data-floor]').forEach(b=>b.addEventListener('click',()=>preset(Number(b.dataset.floor))));
  document.getElementById('section-view').addEventListener('click',()=>{
    leave();stopIntro();cut.checked=true;ceiling.checked=true;visibility();
    camera.position.set(15,11,18);controls.target.set(0,4,-.6);
    camera.position.sub(controls.target).multiplyScalar(Math.max(1,1.12/(app.clientWidth/app.clientHeight))).add(controls.target);controls.update();
    document.getElementById('explore-status').textContent='三层剖面 · 拖动旋转';sync();
  });
  [cut,ceiling,document.getElementById('visible-floors')].forEach(el=>el.addEventListener('change',visibility));
  document.getElementById('apply-camera').addEventListener('click',()=>{
    const values=inputs.map(el=>Number(el.value));
    if(inputs.some(el=>!el.checkValidity()||el.value.trim()==='')||values.some(n=>!Number.isFinite(n))){document.getElementById('camera-error').textContent='请按字段范围填写位置与角度。';return;}
    draftDirty=false;start();camera.position.set(...values.slice(0,3));rotation.set(THREE.MathUtils.degToRad(values[4]),THREE.MathUtils.degToRad(values[3]),0,'YXZ');camera.quaternion.setFromEuler(rotation);
    document.getElementById('camera-error').textContent='';document.getElementById('explore-status').textContent='自定义摄像机';sync();
  });
  function move(key,distance){
    if(!active)start();
    const direction=new THREE.Vector3();
    if(key==='w'||key==='s'){camera.getWorldDirection(direction);camera.position.addScaledVector(direction,key==='w'?distance:-distance);}
    else if(key==='a'||key==='d'){direction.set(1,0,0).applyQuaternion(camera.quaternion);camera.position.addScaledVector(direction,key==='d'?distance:-distance);}
    else camera.position.y+=key==='e'?distance:-distance;
    camera.position.clamp(new THREE.Vector3(-30,-1,-30),new THREE.Vector3(30,30,30));
  }
  const editable=el=>el?.matches('input,select,textarea,[contenteditable]');
  window.addEventListener('keydown',e=>{
    if(editable(e.target))return;
    if(e.key==='Escape'){leave();resetExterior();return;}
    if(active&&'wasdqe'.includes(e.key.toLowerCase())&&e.key.length===1){const key=e.key.toLowerCase();if(!keys.has(key))move(key,.06);keys.add(key);e.preventDefault();}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();drag=null;});
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{move(b.dataset.move,.35);sync();}));
  const canvas=app.querySelector('canvas');canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',e=>{if(!active)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!active||!drag||drag.id!==e.pointerId)return;
    rotation.setFromQuaternion(camera.quaternion,'YXZ');rotation.y-=(e.clientX-drag.x)*.004;rotation.x=THREE.MathUtils.clamp(rotation.x-(e.clientY-drag.y)*.004,-1.48,1.48);
    camera.quaternion.setFromEuler(rotation);drag.x=e.clientX;drag.y=e.clientY;sync();
  });
  const end=e=>{if(drag?.id===e.pointerId)drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('wheel',e=>{if(active){e.preventDefault();move(e.deltaY<0?'w':'s',.22);sync();}},{passive:false});
  sync();visibility();
  return {get active(){return active;},leave,preset,update(dt){
    if(active){const speed=Number(document.getElementById('camera-speed').value);for(const key of keys)move(key,dt*speed);}
    elapsed+=dt;if(elapsed>.15){sync();elapsed=0;}
  }};
}
