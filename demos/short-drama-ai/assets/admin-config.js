function initAdminConfiguration() {
  // Fill only missing fields so existing configuration and historical charges survive.
  db.templates.forEach(template => {
    if (template.prompt == null) template.prompt = '';
    if (template.price == null) template.price = db.models.find(model => model.id === template.model)?.price ?? (template.type === '视频' ? 25 : 80);
  });
  db.memberPlans.forEach(plan => {
    if (plan.chatCount == null) plan.chatCount = 0;
    if (plan.imageFreeCount == null) plan.imageFreeCount = memberFreeCount(plan, 'image');
    if (plan.videoFreeCount == null) plan.videoFreeCount = memberFreeCount(plan, 'video');
    if (!plan.unlockScope) plan.unlockScope = 'all';
    if (!Array.isArray(plan.unlockCategories)) plan.unlockCategories = [];
    if (!Array.isArray(plan.unlockDramas)) plan.unlockDramas = [];
  });
  db.dramas.forEach(drama => { if (!drama.billingMode) drama.billingMode = 'episodes'; });
  fields.templates = fields.templates.filter(field => field[0] !== 'price');
  fields.templates.push(['prompt', '提示词', 'textarea']);
  fields.templates.push(['price', '换脸金币单价 *', 'number']);
  fields.templates.find(field => field[0] === 'cover')[1] = '封面上传 *';
  fields.templates.find(field => field[0] === 'asset')[1] = '模板素材上传 *';
  initAdminTemplateUploads();
}

function templateCoinPrice(template) {
  return template.price ?? 0;
}

function memberEntitlements(plan) {
  return {
    chatCount: plan.chatCount,
    imageFreeCount: plan.imageFreeCount,
    videoFreeCount: plan.videoFreeCount,
    unlockScope: plan.unlockScope,
    unlockCategories: [...plan.unlockCategories],
    unlockDramas: [...plan.unlockDramas]
  };
}

function memberUnlockLabel(plan) {
  if (plan.unlockScope === 'none') return '不解锁';
  if (plan.unlockScope === 'all') return '全部短剧';
  return `${plan.unlockCategories.length} 个分类 · ${plan.unlockDramas.length} 部短剧`;
}

function memberFreeCount(entitlements, feature) {
  const key = feature === 'image' ? 'imageFreeCount' : 'videoFreeCount';
  if (entitlements?.[key] != null) return entitlements[key];
  // Preserve previously configured totals when upgrading to the two simple fields.
  return (entitlements?.freeUses || []).filter(quota => quota.feature === feature)
    .reduce((total, quota) => total + Number(quota.count || 0), 0);
}

function memberFreeUseSummary(entitlements) {
  return `图片 ${esc(memberFreeCount(entitlements, 'image'))} 次<br>视频 ${esc(memberFreeCount(entitlements, 'video'))} 次`;
}

function adminMemberEntitlementDetail(key) {
  if (!requirePerm('users.view')) return;
  const record = find('memberships', key);
  if (!record) return;
  const entitlements = record.entitlements || {};
  modal('会员权益 · ' + names.user(record.user), details({ '会员套餐': record.name, '有效期至': record.until.slice(0, 10), '图片免费换脸次数': memberFreeCount(entitlements, 'image') + ' 次', '视频免费换脸次数': memberFreeCount(entitlements, 'video') + ' 次', '每期对话次数': entitlements.chatCount ?? '未记录', '短剧解锁': entitlements.unlockScope ? memberUnlockLabel(entitlements) : '未记录' }) + '<p class="config-help">此处展示开通或续期时保存的权益。套餐调整不改变已开通会员的权益记录。</p>');
}

function adminMemberPlanForm(record) {
  if (!requirePerm('marketing.edit')) return;
  const values = record || { days: 30, amount: 9.99, currency: 'USD', coins: 3000, chatCount: 0, imageFreeCount: 0, videoFreeCount: 0, status: '下架', unlockScope: 'none', unlockCategories: [], unlockDramas: [] };
  const planFields = [['name', '套餐名称 *'], ['days', '有效天数 *', 'number'], ['amount', '价格 *', 'number'], ['currency', '币种 *', 'select', ['USD', 'SGD', 'GBP']], ['coins', '每期金币 *', 'number'], ['chatCount', '每期对话次数 *', 'number'], ['imageFreeCount', '图片免费换脸次数', 'number'], ['videoFreeCount', '视频免费换脸次数', 'number'], ['status', '状态', 'select', ['上架', '下架']], ['benefits', '展示权益 *', 'textarea']];
  form(record ? '编辑会员套餐' : '新增会员套餐', planFields, values, data => {
    if (!requirePerm('marketing.edit')) throw Error('权限不足');
    checkRequired(data, ['name', 'currency', 'benefits']);
    positive(data.days); positive(data.coins, true); positive(data.chatCount, true);
    if (data.amount <= 0 || data.days > 3660) throw Error('请输入有效价格和天数（1—3660）');
    if (!['USD', 'SGD', 'GBP'].includes(data.currency) || !['上架', '下架'].includes(data.status)) throw Error('请选择有效的币种和状态');
    positive(data.imageFreeCount, true); positive(data.videoFreeCount, true);
    data.unlockCategories = [...document.querySelectorAll('[name="unlockCategories"]:checked')].map(input => input.value);
    data.unlockDramas = [...document.querySelectorAll('[name="unlockDramas"]:checked')].map(input => input.value);
    if (!['all', 'selected', 'none'].includes(data.unlockScope)) throw Error('请选择短剧解锁范围');
    if (data.unlockScope === 'selected') {
      if (!data.unlockCategories.length && !data.unlockDramas.length) throw Error('请至少选择一个分类或一部短剧');
      if (data.unlockCategories.some(id => !find('categories', id)) || data.unlockDramas.some(id => !find('dramas', id))) throw Error('所选内容已变化，请重新选择');
    } else { data.unlockCategories = []; data.unlockDramas = []; }
    if (record) update('会员套餐', record, data);
    else {
      const next = { ...data, id: id('VIP') };
      db.memberPlans.unshift(next);
      audit('新增会员套餐', next.id, '套餐配置', '', next);
    }
  }, '图片、视频免费换脸次数按会员套餐周期配置，0 表示不赠送。修改仅影响后续开通或续期，已开通会员保留原权益。');
  const grid = $('#editForm .form-grid');
  grid.insertAdjacentHTML('beforeend', `<fieldset class="config-section wide"><legend>短剧解锁权益</legend><label class="field">短剧解锁范围<select name="unlockScope"><option value="none">不解锁</option><option value="all">全部短剧</option><option value="selected">指定分类和短剧</option></select></label><div data-unlock-selection><p class="config-help">分类和单部短剧可同时多选，会员可观看任一所选范围内的剧集。</p>${configChoiceList('unlockCategories', '选择分类', db.categories, values.unlockCategories)}${configChoiceList('unlockDramas', '选择短剧', db.dramas, values.unlockDramas)}</div></fieldset>`);
  const scope = $('#editForm [name="unlockScope"]');
  scope.value = values.unlockScope;
  const draw = () => { $('#editForm [data-unlock-selection]').hidden = scope.value !== 'selected'; };
  scope.onchange = draw;
  draw();
}

function configChoiceList(name, title, records, selected) {
  return `<fieldset class="config-choices"><legend>${esc(title)}（可多选）</legend><label class="config-choice-search">筛选${esc(title.slice(2))}<input type="search" data-choice-search placeholder="输入名称筛选" autocomplete="off"></label><div class="config-choice-items">${records.map(record => `<label class="check" data-choice-label><input type="checkbox" name="${name}" value="${esc(record.id)}" ${selected.includes(record.id) ? 'checked' : ''}><span>${esc(record.name)}${['停用', '已下架'].includes(record.status) ? '（' + esc(record.status) + '）' : ''}</span></label>`).join('') || '<small>暂无可选内容</small>'}</div><p data-choice-empty hidden class="config-help">没有匹配的内容</p></fieldset>`;
}

document.addEventListener('input', event => {
  if (!event.target.matches('[data-choice-search]')) return;
  const group = event.target.closest('.config-choices');
  const term = event.target.value.trim().toLowerCase();
  const labels = [...group.querySelectorAll('[data-choice-label]')];
  labels.forEach(label => { label.hidden = !label.textContent.toLowerCase().includes(term); });
  group.querySelector('[data-choice-empty]').hidden = !labels.length || labels.some(label => !label.hidden);
});

function bindTemplateModel(record) {
  const select = $('#editForm [name="model"]');
  const types = [...document.querySelectorAll('#editForm [name="type"]')];
  const grid = $('#editForm .form-grid');
  const input = $('#editForm [name="price"]');
  const label = input.closest('label');
  grid.insertAdjacentHTML('beforeend', '<div class="config-derived wide" data-template-pricing><small>图片按次、视频按秒计费，保存后按此模板价格使用。</small></div>');
  const panel = $('#editForm [data-template-pricing]');
  panel.prepend(label);
  input.min = '1';
  input.step = '1';
  input.required = true;
  input.setAttribute('aria-label', '换脸金币单价');
  const priceField = document.createElement('span');
  priceField.className = 'template-price-input';
  input.before(priceField);
  priceField.append(input);
  priceField.insertAdjacentHTML('beforeend', '<span data-template-price-unit></span>');
  const updateUnit = () => {
    const type = types.find(input => input.checked)?.value || '图片';
    $('[data-template-price-unit]').textContent = '金币 / ' + (type === '视频' ? '秒' : '次');
  };
  const draw = () => {
    const type = types.find(input => input.checked)?.value || '图片';
    const selected = select.value || record.model;
    const models = db.models.filter(model => model.type === type);
    select.innerHTML = models.map(model => `<option value="${esc(model.id)}">${esc(model.name)} · ${esc(model.id)}${model.status === '启用' ? '' : '（已停用）'}</option>`).join('');
    if (models.some(model => model.id === selected)) select.value = selected;
    else select.value = models.find(model => model.status === '启用')?.id || models[0]?.id || '';
    updateUnit();
  };
  types.forEach(input => input.addEventListener('change', draw));
  draw();
}

function adminDramaForm(record) {
  return adminDramaEditor(record);
}

function adminConfigurationAction(actionName, key) {
  if (actionName === 'memberEntitlementDetail') { adminMemberEntitlementDetail(key); return true; }
  if (actionName === 'editMemberPlan' || (actionName === 'new' && key === 'memberPlans')) { adminMemberPlanForm(actionName === 'editMemberPlan' ? find('memberPlans', key) : null); return true; }
  if (actionName === 'editDrama' || (actionName === 'new' && key === 'dramas')) { adminDramaForm(actionName === 'editDrama' ? find('dramas', key) : null); return true; }
  return false;
}
