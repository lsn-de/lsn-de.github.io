let faceCanvasPointer = null;

function faceGallery() {
  return bar('选择' + (faceType === 'image' ? '图片' : '视频') + '模板', `<button class="face-history-entry" data-od-id="face-history-entry" onclick="go('faceHistory')">换脸记录</button>`) + `<div class="content face-gallery"><div class="chips">${['image', 'video'].map(type => `<button class="chip ${faceType === type ? 'selected' : ''}" onclick="faceType='${type}';render()">${type === 'image' ? '图片模板' : '视频模板'}</button>`).join('')}</div>${faceTagFilters(faceType)}<div class="poster-grid">${filteredFaceTemplates(faceType).map(({ item, index }) => `<button class="poster-card" data-od-id="face-template-${index}" onclick="selectFaceTemplate(${index})"><div class="poster">${img(item.image, item.title + '模板')}<span class="tag">${faceType === 'image' ? '80 金币' : item.videoSeconds + ' 秒 · ' + item.videoSeconds * 25 + ' 金币'}</span><div class="poster-title">${item.title}</div></div>${faceTemplateTags(item.tags)}</button>`).join('')}</div></div>`;
}
function faceWorkspace() {
  const selected = faceTemplates[template];
  const seconds = faceType === 'video' ? currentVideoSeconds() : 0;
  const previous = faceTemplates[(template + faceTemplates.length - 1) % faceTemplates.length];
  const next = faceTemplates[(template + 1) % faceTemplates.length];
  return `<section class="face-workspace" aria-label="${faceType === 'image' ? '图片' : '视频'}换脸创作"><img class="face-studio-ambient" src="assets/${selected.image}.jpg" alt=""><header class="face-workspace-header"><button class="iconbtn" onclick="back()" aria-label="返回">${I('back')}</button><span>创作工作台</span><button data-od-id="face-history-entry" onclick="go('faceHistory')" aria-label="换脸记录">${I('image')}<span>记录</span></button></header><nav class="face-studio-modes" aria-label="创作类型"><button class="${faceType === 'image' ? 'selected' : ''}" aria-pressed="${faceType === 'image'}" onclick="setFaceStudioType('image')">图片换脸</button><button class="${faceType === 'video' ? 'selected' : ''}" aria-pressed="${faceType === 'video'}" onclick="setFaceStudioType('video')">视频换脸</button></nav><div class="face-canvas" tabindex="0" role="group" aria-label="模板预览，可左右滑动切换模板" onpointerdown="faceCanvasStart(event)" onpointerup="faceCanvasEnd(event)" onpointercancel="faceCanvasPointer=null" onkeydown="faceCanvasKey(event)"><img class="face-canvas-neighbor previous" src="assets/${previous.image}.jpg" alt=""><img class="face-canvas-neighbor next" src="assets/${next.image}.jpg" alt=""><div class="face-canvas-art"><img class="face-canvas-image" src="assets/${selected.image}.jpg" alt="${esc(selected.title)}模板预览" fetchpriority="high">${faceType === 'video' ? `<span class="face-canvas-media-label">${I('video')}${seconds}s</span><button class="face-canvas-video-preview" aria-label="预览视频模板" onclick="toast('当前展示模板静态预览，视频源尚未接入')">${I('play')}</button>` : ''}</div><button class="face-canvas-arrow previous" aria-label="上一个模板" onclick="switchFaceTemplate(-1)">${I('back')}</button><button class="face-canvas-arrow next" aria-label="下一个模板" onclick="switchFaceTemplate(1)">${I('arrow')}</button><div class="face-canvas-copy"><div><h2>${esc(selected.title)}</h2><p>${selected.tags.map(esc).join(' · ')}<span>${faceType === 'image' ? '一张照片，成为画面中的你' : '让你的主角时刻，动起来'}</span></p></div><div class="face-canvas-tools"><button class="face-all-templates" onclick="faceStudioGallery()">全部模板 ${I('arrow')}</button>${faceFavoriteButton()}</div></div></div><div class="face-create-dock"><input id="face-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onchange="uploadFace(this)" hidden><button class="face-upload-tile ${facePhoto ? 'has-photo' : ''}" data-od-id="face-upload" onclick="document.getElementById('face-photo-input').click()" aria-label="${facePhoto ? '更换人脸照片' : '上传人脸照片'}">${facePhoto ? `<img src="${facePhoto}" alt="已选择的人脸照片">` : `${I('plus')}<span>人脸照片</span>`}</button><button class="face-upload-prompt" onclick="document.getElementById('face-photo-input').click()"><span>${facePhoto ? '照片已就绪' : '添加你的照片'}</span><small>${facePhoto ? '点击更换' : '上传正面清晰人像'}</small></button><button class="face-generate" data-od-id="face-submit" ${facePhoto ? '' : 'disabled'} onclick="submitTask()"><span>生成 ${I('arrow')}</span><small>${I('coin')}<b data-face-cost>${faceTaskCost()}</b></small></button></div><div class="face-studio-footnote"><span>JPG / PNG / WebP · 最大 10MB</span><button onclick="showFacePhotoRequirements()">照片要求 ${I('arrow')}</button></div></section>`;
}
function setFaceStudioType(type) {
  if (!['image', 'video'].includes(type)) return;
  faceType = type;
  render();
}
function selectStudioTemplate(index) {
  template = index;
  render();
}
function faceStudioGallery() {
  stack.push(navigationSnapshot());
  faceStep = 1;
  render();
  $('#screen').scrollTop = 0;
}
function faceStudioMount() {
  // The canvas is navigated with arrows, swipe and the full template gallery.
}
function showFacePhotoRequirements() { modal('照片要求', faceUploadNotice()); }
function faceCanvasStart(event) {
  if (event.target.closest('button')) return;
  faceCanvasPointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function faceCanvasEnd(event) {
  const start = faceCanvasPointer;
  faceCanvasPointer = null;
  if (!start || start.id !== event.pointerId) return;
  const dx = event.clientX - start.x;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(event.clientY - start.y)) switchFaceTemplate(dx < 0 ? 1 : -1);
}
function faceCanvasKey(event) {
  if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  switchFaceTemplate(event.key === 'ArrowLeft' ? -1 : 1);
  $('.face-canvas')?.focus({ preventScroll: true });
}
