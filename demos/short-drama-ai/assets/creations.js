function creationDate(task) {
  return new Date(task.at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function creationDownloadIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
}
function creationHistory() {
  const records = faceRecords();
  return bar('换脸记录') + `<div class="content creation-history" data-od-id="face-history-page"><div class="creation-history-heading"><span>共 ${records.length} 件作品</span><button onclick="openFace(faceType)">继续创作 ${I('plus')}</button></div>${records.length ? `<div class="creation-history-list">${records.map((task, index) => {
    const selected = faceTemplates[task.template];
    return `<article class="creation-history-card" data-od-id="face-history-record-${index}"><button class="creation-history-open" onclick="openHistoryTask('${task.id}')" aria-label="${task.status === '完成' ? '查看结果' : '查看进度'}"><div class="creation-history-cover">${img(selected.image, selected.title + '作品预览')}${task.type === 'video' ? `<span>${I('video')}${task.videoSeconds}s</span>` : ''}</div><div><small>${task.type === 'image' ? '图片换脸' : '视频换脸'}</small><h3>${esc(selected.title)}</h3><time>${creationDate(task)}</time><span class="creation-status ${task.status === '完成' ? 'complete' : ''}">${task.status === '完成' ? I('check') : ''}${esc(task.status)}</span></div></button>${task.status === '完成' ? `<button class="creation-history-save" onclick="downloadResult('${task.id}')" aria-label="保存${esc(selected.title)}">${creationDownloadIcon()}</button>` : ''}</article>`;
  }).join('')}</div>` : `<div class="creation-history-empty">${I('image')}<h2>还没有创作记录</h2><p>从一个喜欢的模板开始，<br>把灵感变成你的作品。</p><button class="primary" onclick="openFace(faceType)">开始创作 ${I('arrow')}</button></div>`}</div>`;
}
function creationTask() {
  const task = viewedTask();
  if (!task) return bar('我的作品') + `<div class="content"><div class="creation-history-empty">${I('image')}<h2>这件作品已被删除</h2><p>去创作新的作品吧。</p><button class="primary" onclick="openFace()">开始创作</button></div></div>`;
  const selected = faceTemplates[task.template];
  const done = task.status === '完成';
  const working = ['排队中', '处理中'].includes(task.status);
  return `<section class="creation-detail">${bar(done ? '我的作品' : '生成进度', `<button class="iconbtn" onclick="creationActions()" aria-label="作品操作">${I('more')}</button>`)}<div class="creation-detail-scroll"><div class="creation-result-frame ${done ? '' : 'pending'}">${img(selected.image, done ? '模拟结果：模板原图，未真实换脸' : selected.title + '模板预览', done ? 'result-image' : 'creation-pending-image')}<span class="creation-media-label">${I(task.type === 'image' ? 'image' : 'video')}${task.type === 'image' ? '图片作品' : '视频预览'}</span>${done ? '<span class="creation-demo-label">演示作品</span>' : `<div class="creation-progress-overlay"><div class="${working ? 'creation-working-ring' : 'creation-failed-mark'}">${working ? '' : I('more')}</div><h2>${esc(task.status)}</h2><p>${task.status === '排队中' ? '作品已提交，正在等待处理' : task.status === '处理中' ? '正在处理你的作品，请稍候' : '预扣金币已退还，可重新创作'}</p></div>`}</div><div class="creation-title-row"><div><h2>${esc(selected.title)}</h2><time>${creationDate(task)}</time></div><span class="creation-status ${done ? 'complete' : ''}">${done ? I('check') : ''}${esc(task.status)}</span></div>${done ? `<p class="creation-preview-note">${task.type === 'video' ? '当前为模板图片预览，尚未生成真实视频。' : '演示结果为模板原图，尚未进行真实换脸。'}</p>` : working ? `<ol class="creation-progress-steps"><li class="complete">照片已上传</li><li class="current">${esc(task.status)}</li><li>生成完成</li></ol>` : ''}<div class="creation-facts"><div><small>创作类型</small><b>${task.type === 'image' ? '图片换脸' : '视频换脸'}</b></div><div><small>消耗金币</small><b class="gold">${task.cost}<span> 金币</span></b></div>${task.type === 'video' ? `<div><small>视频时长</small><b>${task.videoSeconds}<span> 秒</span></b></div>` : ''}</div><details class="creation-metadata"><summary>作品信息 ${I('arrow')}</summary><dl><div><dt>任务编号</dt><dd>${esc(task.id)}</dd></div><div><dt>生成时间</dt><dd>${creationDate(task)}</dd></div></dl></details></div><footer class="creation-result-actions">${done ? `<button class="secondary" onclick="recreateTask()">${I('plus')}再创作</button><button class="primary" onclick="downloadResult()">${creationDownloadIcon()}${task.type === 'image' ? '保存图片' : '保存预览图'}</button>` : `<button class="secondary" onclick="go('faceHistory')" data-od-id="generation-history-entry">查看换脸记录 ${I('arrow')}</button>${working ? '' : '<button class="primary" onclick="recreateTask()">重新创作</button>'}`}</footer></section>`;
}
function creationActions() {
  const task = viewedTask();
  if (!task) return;
  modal('作品操作', `<button class="list-row" onclick="closeModal();go('faceHistory')">全部作品 ${I('image')}</button>${task.status === '完成' ? `<button class="list-row" onclick="closeModal();shareTask()">分享作品 ${I('arrow')}</button><button class="list-row" onclick="deleteTask()">删除作品 ${I('more')}</button>` : ''}`);
}
function recreateTask() {
  const task = viewedTask();
  if (!task) return;
  go('face');
  faceStep = 2;
  faceType = task.type;
  template = task.template;
  facePhoto = '';
  render();
}
function profileMembership() {
  const vipOrders = (state.orders || []).filter(order => order.type === 'vip' && !order.sample && order.status === '已完成' && Number.isFinite(order.validUntil));
  const validUntil = vipOrders.length ? Math.max(...vipOrders.map(order => order.validUntil)) : null;
  const detail = state.vip ? validUntil ? `有效期至 ${new Date(validUntil).toLocaleDateString('zh-CN')}` : '会员权益已开通' : '每月 3,000 金币 · 会员短剧解锁';
  return `<section class="profile-membership ${state.vip ? 'member-active' : ''}" data-od-id="profile-membership" aria-label="我的会员">
    <div class="member-card-brand"><span>HONGGUO MEMBERSHIP</span><div class="member-card-tier"><span>${state.vip ? '月度会员' : 'VIP 会员'}</span><b aria-hidden="true">V</b></div></div>
    <div class="member-card-identity">${img('hero', '演示账户头像', 'avatar')}<div>${state.auth?.loggedIn ? `<h2>${esc(state.auth.nickname)}</h2><small>ID: HG102601</small>` : '<button type="button" class="auth-profile-login" onclick="openAuth()">登录 / 注册</button><small>你的专属娱乐空间</small>'}</div><div class="member-card-actions"><button class="member-card-access" onclick="go('store')">${state.vip ? '查看权益' : '了解会员'} ${I('arrow')}</button>${state.vip ? `<small class="member-card-expiry">${detail}</small>` : ''}</div></div>
    ${state.vip ? '' : `<div class="member-card-benefits"><h3>开通 VIP 会员</h3><p>${detail}</p></div>`}
    <div class="profile-summary"><button onclick="go('favorites')" aria-label="我的收藏"><b>${state.favs.length + (state.faceFavs || []).length}</b><span>我的收藏</span></button><button onclick="dramaCategory='历史';go('dramas')" aria-label="观看记录"><b>${state.history.length}</b><span>观看记录</span></button><button onclick="tab('coins')" aria-label="金币余额"><b class="gold">${state.coins.toLocaleString()}</b><span>金币余额</span></button></div>
  </section>`;
}
