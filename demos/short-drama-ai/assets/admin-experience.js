function adminIcon(name) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"/>',
    dramas: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
    templates: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="8" r="2"/><path d="m3 18 6-6 4 3 4-5 4 6"/>',
    memberships: '<path d="m3 6 4 4 5-7 5 7 4-4-2 14H5Z"/><path d="M7 16h10"/>',
    signin: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-12 6 2 2 4-4"/>',
    orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    analytics: '<path d="M3 3v18h18M7 16v-5M12 16V7M17 16V4"/>',
    platform: '<path d="M9 3h6l1 4 4 1v7l-4 1-1 5H9l-1-5-4-1V8l4-1Z"/><circle cx="12" cy="12" r="3"/>',
    roles: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    appRecords: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M10 19h4"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    refresh: '<path d="M20 10a8 8 0 1 0-2 8M20 3v7h-7"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9m3-10v12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.platform}</svg>`;
}
function initAdminExperience() {
  if (!Array.isArray(db.memberPlans)) db.memberPlans = [{ id: 'VIP30', name: 'VIP 月度会员', days: 30, amount: 9.99, currency: 'USD', coins: 3000, benefits: '会员短剧解锁、专属角色体验', status: '上架' }];
  if (!Array.isArray(db.memberships)) db.memberships = [];
  initAdminConfiguration();
  db.comments.forEach(comment => { if (comment.status === '已删除') comment.status = '已隐藏'; });
  menu.splice(2, 0, ['会员管理', [['memberships', '', '会员用户', 'users.view'], ['memberPlans', '', '会员套餐', 'marketing.view']]]);
  menu.splice(menu.length - 1, 0, ['App 本地数据', [['appRecords', '', 'App 本地数据', 'users.view']]]);
  filterSchemas.memberships = { search: '用户ID或昵称', searchFields: ['user'], fields: [userPick(), pick('plan', '会员套餐', () => db.memberPlans.map(plan => [plan.id, plan.name])), pick('state', '会员状态', ['生效中', '已到期', '已停用'], { value: membershipState }), timePick('start', '开通时间')] };
  filterSchemas.memberPlans = { search: '套餐编号、名称或权益', searchFields: ['id', 'name', 'benefits'], fields: [statusPick(['上架', '下架'])] };
  filterSchemas.appTasks = { search: '任务编号或创作类型', searchFields: ['id', 'type'], fields: [statusPick(['排队中', '处理中', '完成', '失败'])] };
  save();
  $('#admin-menu-toggle').onclick = () => setAdminNavigation(true);
  $('#admin-nav-dismiss').onclick = () => setAdminNavigation(false);
  $('#nav').addEventListener('click', event => { if (event.target.closest('[data-page]')) setAdminNavigation(false); });
  window.addEventListener('hashchange', () => setAdminNavigation(false));
  window.addEventListener('storage', event => { if (event.key === 'hongguo-demo-v1' && page === 'appRecords') render(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setAdminNavigation(false);
    const dialog = $('#modal .dialog');
    if (event.key !== 'Tab' || !dialog) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const originalModal = modal, originalClose = close;
  let returnFocus;
  modal = function (...args) {
    if (!$('#modal .dialog')) returnFocus = document.activeElement;
    originalModal(...args);
    $('#modal .dialog').setAttribute('tabindex', '-1');
    $('#modal .dialog button')?.focus();
    $('main').inert = true;
    $('aside').inert = true;
    $('body > header').inert = true;
  };
  close = function () {
    const wasOpen = Boolean($('#modal .dialog'));
    originalClose();
    $('main').inert = false;
    $('aside').inert = false;
    $('body > header').inert = false;
    if (wasOpen && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
}
function setAdminNavigation(open) {
  document.body.classList.toggle('admin-nav-open', open);
  $('#admin-menu-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('#nav button')?.focus();
}
function membershipState(record) {
  return record.status === '已停用' ? '已停用' : new Date(record.until).getTime() > Date.now() ? '生效中' : '已到期';
}
function adminMembershipLabel(user) {
  const record = db.memberships.find(item => item.user === user && membershipState(item) === '生效中');
  return record ? record.name + ' · ' + record.until.slice(0, 10) : '未开通';
}
function adminUserDetail(user) {
  if (!requirePerm('users.view') || !user) return;
  const initial = Array.from(user.name || user.id)[0];
  const avatar = `<div class="admin-user-avatar" role="img" aria-label="用户头像"><span aria-hidden="true">${esc(initial)}</span>${user.avatar ? `<img src="${esc(user.avatar)}" alt="" aria-hidden="true">` : ''}</div>`;
  modal('用户详情 · ' + user.name,
    `<div class="admin-user-identity">${avatar}<div><strong>${esc(user.name)}</strong><small>${esc(user.id)}</small></div>${can('ledger.view') ? '<button id="userLedger" class="primary">关联流水</button>' : ''}</div>` +
    details({ '用户ID': user.id, '昵称': user.name, '性别': user.gender || '未设置', '邮箱': user.email, '手机号': user.phone || '未绑定', '地区': user.region, '账号时区': user.timezone, '界面语言': user.language, '金币余额': user.coins, '登录方式': user.login, '邀请码': user.invite, '直属邀请人': user.inviter || '无', '会员信息': adminMembershipLabel(user.id), '状态': user.status, '最近登录': user.last }) +
    `<div class="subhead">收藏</div>${table([['内容类型', 'type'], ['内容ID', 'content'], ['状态', 'status'], ['时间', 'time']], db.collections.filter(item => item.user === user.id))}<div class="subhead">观看进度</div>${table([['短剧', 'drama'], ['集数', 'episode'], ['位置', 'position'], ['时间', 'time']], db.watch.filter(item => item.user === user.id))}<div class="subhead">登录与绑定</div>${table([['方式', 'method'], ['绑定标识', 'binding'], ['结果', 'result'], ['时间', 'time']], db.logins.filter(item => item.user === user.id))}<div class="subhead">直属邀请关系</div>${table([['用户', 'id'], ['昵称', 'name'], ['注册时间', 'created']], db.users.filter(item => item.inviter === user.id))}`,
    '<button id="closeFooter">关闭</button>');
  const image = $('#modal .admin-user-avatar img');
  if (image) image.addEventListener('error', () => { image.hidden = true; });
  const ledgerButton = $('#userLedger');
  if (ledgerButton) ledgerButton.onclick = () => {
    if (!requirePerm('ledger.view')) return;
    close();
    go('ledger');
    filterState('ledger').user = user.id;
    render();
  };
}
function adminDashboard() {
  const totalTasks = db.tasks.length, success = db.tasks.filter(item => item.status === '成功').length;
  const pending = [
    ['订单待到账', db.orders.filter(item => item.status === '已支付待到账').length, 'orders', 'orders.view'],
    ['换脸处理中', db.tasks.filter(item => ['处理中', '排队中'].includes(item.status)).length, 'tasks', 'tasks.view'],
    ['用户待反馈', db.feedback.filter(item => item.status !== '已处理').length, 'feedback', 'platform.view']
  ].filter(item => can(item[3]));
  const lastDate = db.users.map(item => item.created.slice(0, 10)).sort().at(-1) || new Date().toLocaleDateString('sv-SE');
  const dates = Array.from({ length: 7 }, (_, i) => { const date = new Date(lastDate + 'T12:00:00'); date.setDate(date.getDate() - 6 + i); return date.toLocaleDateString('sv-SE'); });
  const amounts = dates.map(date => db.users.filter(item => item.created.startsWith(date)).length);
  const max = Math.max(...amounts, 1);
  const points = amounts.map((value, i) => `${40 + i * 92},${173 - value / max * 115}`).join(' ');
  const visibleDramas = can('dramas.view') ? db.dramas.slice().sort((a, b) => b.plays - a.plays).slice(0, 3) : [];
  const heading = header('运营概览', '让每一份内容，都找到它的观众。', `<div class="admin-page-actions"><span class="admin-date">${adminIcon('clock')}${esc(new Date().toLocaleDateString('zh-CN'))}</span><a class="admin-front-link" href="index.html" target="_blank" rel="noopener">预览 App ${adminIcon('arrow')}</a></div>`);
  return heading + `<section class="admin-overview-banner"><div><span class="admin-eyebrow">HONGGUO / OPERATIONS</span><h2>今天的故事，从这里开始。</h2><p>内容、创作与用户，尽在一个工作台。</p></div><div class="admin-banner-stamp" aria-hidden="true">h<span>ENTERTAINMENT</span></div></section><div class="stats admin-kpis">${stat('注册用户', db.users.length, '覆盖 ' + new Set(db.users.map(item => item.region)).size + ' 个地区', adminIcon('users'))}${stat('累计短剧播放', db.dramas.reduce((sum, item) => sum + item.plays, 0).toLocaleString(), db.dramas.filter(item => item.status !== '已下架').length + ' 部剧目正在展示', adminIcon('dramas'))}${stat('换脸任务', totalTasks, '任务成功率 ' + (totalTasks ? Math.round(success / totalTasks * 100) : 0) + '%', adminIcon('templates'))}${stat('有效会员', db.memberships.filter(item => membershipState(item) === '生效中').length, '会员状态按有效期计算', adminIcon('memberships'))}</div><div class="admin-dashboard-grid"><section class="panel admin-trend"><div class="panel-title"><span>用户增长<small>最近一条注册记录所在的 7 天</small></span><span class="admin-chart-key"><i></i>新增用户</span></div><div class="admin-line-chart"><svg viewBox="0 0 632 210" role="img" aria-label="最近七天注册用户：${amounts.join('、')}" preserveAspectRatio="none"><defs><linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#df785e" stop-opacity=".2"/><stop offset="1" stop-color="#df785e" stop-opacity="0"/></linearGradient></defs>${[58, 115, 173].map(y => `<path d="M20 ${y}H612" stroke="#ecebe8" stroke-dasharray="4 5" fill="none"/>`).join('')}<polygon points="40,188 ${points} 592,188" fill="url(#admin-area)" stroke="none"/><polyline points="${points}" fill="none" stroke="#cf6248" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${amounts.map((value, i) => `<circle cx="${40 + i * 92}" cy="${173 - value / max * 115}" r="4" fill="#fff" stroke="#cf6248" stroke-width="2"><title>${dates[i]} · ${value} 人</title></circle>`).join('')}</svg><div class="admin-chart-labels">${dates.map(date => `<span>${date.slice(5).replace('-', '/')}</span>`).join('')}</div></div></section><section class="panel admin-pending"><div class="panel-title"><span>待处理事项<small>需要你关注的运营动态</small></span><b>${pending.reduce((sum, item) => sum + item[1], 0)}</b></div>${pending.length ? pending.map(([name, count, target], i) => `<button class="admin-pending-item" data-page="${target}"><span class="admin-pending-symbol symbol-${i}">${adminIcon(target === 'tasks' ? 'templates' : target === 'feedback' ? 'users' : 'orders')}</span><span>${name}</span><b>${count}</b>${adminIcon('arrow')}</button>`).join('') : '<div class="empty">当前身份暂无待办</div>'}</section></div><div class="admin-dashboard-grid"><section class="panel"><div class="panel-title"><span>内容表现<small>按累计播放排序</small></span>${can('dramas.view') ? '<button class="admin-text-button" data-page="dramas">管理短剧 →</button>' : ''}</div><div class="admin-story-list">${visibleDramas.length ? visibleDramas.map((drama, i) => `<div class="admin-story"><span class="admin-story-rank">0${i + 1}</span><img src="${esc(drama.cover)}" alt="${esc(drama.name)}封面"><div><h3>${esc(drama.name)}</h3><small>${esc(drama.category)} · ${esc(drama.language)}</small></div><b>${drama.plays.toLocaleString()}<small>播放</small></b></div>`).join('') : '<div class="empty">当前身份未开放内容查看</div>'}</div></section><section class="panel"><div class="panel-title"><span>常用工作台<small>快速开始今天的运营</small></span></div><div class="admin-workspace-links">${[['templates', 'templates', '换脸模板', 'models.view'], ['users', 'users', '用户管理', 'users.view'], ['orders', 'orders', '订单查询', 'orders.view'], ['memberships', 'memberships', '会员用户', 'users.view']].filter(item => can(item[3])).map(([target, icon, label]) => `<button data-page="${target}">${adminIcon(icon)}<span>${label}</span>${adminIcon('arrow')}</button>`).join('')}</div><p class="admin-local-note"><span class="status-dot"></span>本地交互原型 · 数据保存在当前浏览器</p></section></div>`;
}
function adminMemberships() {
  const active = db.memberships.filter(record => membershipState(record) === '生效中');
  return header('会员用户', '查看会员权益与有效期，人工变更保留完整操作记录', can('users.edit') ? '<button class="primary" data-act="grantMember">开通会员</button>' : '') + `<div class="stats admin-member-stats">${stat('有效会员', active.length, '当前权益生效中', adminIcon('memberships'))}${stat('已到期', db.memberships.filter(record => membershipState(record) === '已到期').length, '按当前时间计算', adminIcon('clock'))}${stat('已停用', db.memberships.filter(record => record.status === '已停用').length, '人工停用保留记录', adminIcon('users'))}</div>` + list('memberships', [['用户', 'user', value => esc(names.user(value)) + '<br><small>' + esc(value) + '</small>'], ['会员套餐', 'name'], ['开通时间', 'start', value => esc(value.slice(0, 10))], ['有效期至', 'until', value => esc(value.slice(0, 10))], ['状态', 'status', (_, record) => status(membershipState(record))], ['来源', 'source']], { actions: record => btn('权益详情', 'memberEntitlementDetail', record.id) + (can('users.edit') ? btn('续期', 'renewMember', record.id) + (record.status !== '已停用' ? btn('停用', 'revokeMember', record.id) : '') : '') });
}
function adminMemberPlans() {
  return header('会员套餐', '配置图片、视频免费换脸次数、会员周期与其他权益') + list('memberPlans', [['套餐编号', 'id'], ['套餐名称', 'name'], ['图片免费次数', 'imageFreeCount', value => value + ' 次'], ['视频免费次数', 'videoFreeCount', value => value + ' 次'], ['有效天数', 'days'], ['价格', 'amount', (value, record) => esc(record.currency) + ' ' + value.toFixed(2)], ['每期金币', 'coins'], ['对话次数 / 期', 'chatCount'], ['短剧解锁', 'unlockScope', (_, record) => esc(memberUnlockLabel(record))], ['展示权益', 'benefits'], ['状态', 'status', status]], { new: '新增套餐', perm: 'marketing.edit', actions: can('marketing.edit') ? record => btn('编辑套餐', 'editMemberPlan', record.id) : null, note: '套餐为管理端演示配置。用户端套餐尚未通过服务端发布；人工开通不自动增加金币或生成付费订单。' });
}
function adminTaskDetail(record) {
  const template = find('templates', record.template);
  const result = record.result === '已过期' ? '历史结果不可用' : record.result;
  modal('换脸任务 · ' + record.id, `<div class="admin-result-layout"><div class="admin-result-preview">${templateMediaImage(template?.cover || 'assets/woman.jpg', 'alt="模板参考预览"')}<span>模板参考 · 本地模拟</span></div><div><div class="admin-result-heading"><small>${esc(record.type)}换脸</small><h3>${esc(template?.name || record.template)}</h3>${status(record.status)}</div>${details({ '任务编号': record.id, '用户': record.user + ' · ' + names.user(record.user), '模型': find('models', record.model)?.name, '时长': record.duration ? record.duration + ' 秒' : '图片', '原价': record.price + ' 金币', '扣费': record.charge + ' 金币', '退还金币': record.returned, '供应商成本': 'USD ' + record.cost, '提交时间': record.created, '完成时间': record.finished || '未完成', '结果状态': result, '失败原因': record.reason || '无' })}</div></div><p class="admin-local-note">作品与创作记录持续保留，用户可手动删除。后台任务与扣退费流水独立留存。</p>`);
}
function appLocalSnapshot() {
  try { return JSON.parse(localStorage.getItem('hongguo-demo-v1') || 'null'); }
  catch { return null; }
}
function adminAppRecords() {
  const app = appLocalSnapshot();
  if (!app) return header('App 本地数据', '查看同一浏览器中用户端的实际模拟数据') + '<section class="panel"><div class="empty">当前浏览器尚无 App 数据<br><a class="admin-front-link" href="index.html" target="_blank" rel="noopener">打开 App 开始体验 →</a></div></section>';
  const tasks = [...(Array.isArray(app.faceTasks) ? app.faceTasks : [])];
  if (app.task?.id && !tasks.some(task => task.id === app.task.id)) tasks.push(app.task);
  const orders = Array.isArray(app.orders) ? app.orders : [];
  return header('App 本地数据', '只读查看当前浏览器的用户端记录；与后台示例账本分别保存', '<button data-act="refreshApp">' + adminIcon('refresh') + ' 刷新数据</button>') + `<div class="stats">${stat('用户端金币', Number(app.coins || 0).toLocaleString(), '当前设备钱包', adminIcon('coin'))}${stat('会员状态', app.vip ? '已开通' : '未开通', '用户端本地状态', adminIcon('memberships'))}${stat('创作记录', can('tasks.view') ? tasks.length : '—', can('tasks.view') ? '保留全部时间范围' : '需任务查看权限', adminIcon('templates'))}${stat('用户端订单', can('orders.view') ? orders.length : '—', can('orders.view') ? '实际模拟购买记录' : '需订单查看权限', adminIcon('orders'))}</div>${can('tasks.view') ? '<section class="panel"><div class="panel-title">创作记录 <small>同源 App 数据变动时自动刷新</small></div>' + managedTable('appTasks', [['任务编号', 'id'], ['类型', 'type', value => value === 'video' ? '视频' : '图片'], ['状态', 'status', status], ['消耗金币', 'cost'], ['提交时间', 'at', value => esc(new Date(value).toLocaleString('zh-CN'))]], tasks.slice().sort((a, b) => b.at - a.at)) + '</section>' : ''}${can('orders.view') ? '<section class="panel"><div class="panel-title">用户端购买记录</div>' + table([['订单号', 'id'], ['类型', 'type', value => value === 'vip' ? '会员' : '金币'], ['名称', 'name'], ['状态', 'status', status], ['金额', 'price', value => esc(value ?? '—')]], orders) + '</section>' : ''}<p class="admin-local-note">仅可读取同一浏览器、同一站点的本地数据。清除浏览器数据会清空记录；跨设备管理需接入真实服务端。</p>`;
}
function adminExperienceAction(actionName, key) {
  if (adminConfigurationAction(actionName, key)) return true;
  if (actionName === 'refreshApp') { render(); toast('已读取最新 App 本地数据'); return true; }
  if (actionName === 'grantMember' || actionName === 'renewMember') {
    if (!requirePerm('users.edit')) return true;
    const current = actionName === 'renewMember' ? find('memberships', key) : null;
    if (actionName === 'renewMember' && !current) { toast('会员状态已变化，请刷新后重试'); return true; }
    const available = db.memberPlans.filter(plan => plan.status === '上架');
    if (!available.length) { toast('请先上架会员套餐'); return true; }
    const initialPlan = available.find(plan => plan.id === current?.plan) || available[0];
    const renewalBase = current && membershipState(current) === '生效中' ? new Date(current.until).getTime() : Date.now();
    const renewalDate = plan => new Date(renewalBase + plan.days * 86400000).toISOString().slice(0, 10);
    const memberFields = [['user', '用户 *', 'select', current ? [current.user] : db.users.filter(user => user.status === '启用').map(user => user.id)], ['plan', '会员套餐 *', 'select', available.map(plan => plan.id)], ...(current ? [['renewUntil', '续费到期日期 *', 'date']] : []), ['reason', '操作原因 *', 'textarea']];
    form(current ? '续期会员' : '开通会员', memberFields, { user: current?.user, plan: initialPlan.id, renewUntil: renewalDate(initialPlan) }, data => {
      if (!requirePerm('users.edit')) throw Error('权限不足');
      checkRequired(data, ['user', 'plan', 'reason', ...(current ? ['renewUntil'] : [])]);
      const user = find('users', data.user), plan = find('memberPlans', data.plan);
      if (!user || user.status !== '启用' || !plan || plan.status !== '上架') throw Error('用户或套餐当前不可用');
      const existing = db.memberships.find(record => record.user === user.id);
      if (current && existing !== current) throw Error('会员状态已变化，请刷新后重试');
      const before = existing ? { ...existing } : null;
      const active = existing && membershipState(existing) === '生效中';
      const startAt = active ? new Date(existing.until).getTime() : Date.now();
      let until = new Date(startAt + plan.days * 86400000).toISOString();
      if (current) {
        const selected = new Date(data.renewUntil + 'T23:59:59.999Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.renewUntil) || !Number.isFinite(selected.getTime()) || selected.toISOString().slice(0, 10) !== data.renewUntil) throw Error('请选择有效的续费到期日期');
        if (data.renewUntil <= new Date(startAt).toISOString().slice(0, 10)) throw Error(active ? '续费到期日期须晚于原有效期日期' : '续费到期日期须晚于当前日期');
        until = selected.toISOString();
      }
      const next = { id: existing?.id || id('VIP'), user: user.id, plan: plan.id, name: plan.name, start: active ? existing.start : new Date().toISOString(), until, status: '启用', source: '人工开通', reason: data.reason, entitlements: memberEntitlements(plan) };
      if (existing) Object.assign(existing, next); else db.memberships.unshift(next);
      audit(current || active ? '续期会员' : '开通会员', next.id, data.reason, before, next);
    }, current ? '续费到期日期默认按套餐天数计算，可手动选择；须晚于原有效期日期，已到期或已停用会员须晚于当前日期。人工续期不自动发放金币。' : '用户选择显示账号 ID。人工开通仅设置管理端会员权益，金币须按现有调币流程单独处理。');
    if (current) {
      const dateInput = $('#editForm [name="renewUntil"]');
      dateInput.min = new Date(renewalBase + 86400000).toISOString().slice(0, 10);
      dateInput.required = true;
      let manuallySelected = false;
      dateInput.addEventListener('input', () => { manuallySelected = true; });
      $('#editForm [name="plan"]').addEventListener('change', event => {
        const plan = available.find(item => item.id === event.target.value);
        if (plan && !manuallySelected) dateInput.value = renewalDate(plan);
      });
    }
    return true;
  }
  if (actionName === 'revokeMember') {
    if (!requirePerm('users.edit')) return true;
    const record = find('memberships', key);
    form('停用会员', [['reason', '停用原因 *', 'textarea']], {}, data => {
      if (!requirePerm('users.edit')) throw Error('权限不足');
      checkRequired(data, ['reason']);
      if (!record || record.status === '已停用') throw Error('会员状态已变化');
      const before = { ...record };
      record.status = '已停用';
      audit('停用会员', record.id, data.reason, before, record);
    }, '停止该用户的管理端会员权益，保留开通记录和操作日志。');
    return true;
  }
  return false;
}
