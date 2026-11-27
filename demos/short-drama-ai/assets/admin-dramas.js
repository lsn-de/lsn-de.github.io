'use strict';

// Short-drama management follows the supplied legacy console references.
const dramaView = { q: '', category: '', language: '', flag: '', tab: 'all', filters: false, recycle: false, sort: '', direction: 1, page: 1, selected: new Set() };
const dramaFlags = ['必看', '新剧', '推荐'];

function initAdminDramas() {
  db.dramas.forEach(drama => {
    if (drama.flags == null) drama.flags = drama.featured === '是' ? ['推荐'] : [];
    if (drama.description == null) drama.description = '';
    if (drama.score == null) drama.score = '';
    if (drama.updated == null) drama.updated = drama.published || '';
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-drama-check]')) {
      if (el.checked) dramaView.selected.add(el.value); else dramaView.selected.delete(el.value);
      syncDramaSelection();
    }
    if (el.matches('[data-drama-check-all]')) {
      document.querySelectorAll('[data-drama-check]').forEach(box => {
        box.checked = el.checked;
        if (el.checked) dramaView.selected.add(box.value); else dramaView.selected.delete(box.value);
      });
      syncDramaSelection();
    }
    if (el.matches('[data-drama-filter]')) queryDramas();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches('[data-drama-query]')) { event.preventDefault(); queryDramas(); }
  });
  save();
}

function dramaIsLive(record) { return !record.deleted && record.status !== '已下架'; }
function dramaMetric(record, key) {
  if (key === 'sales') return db.orders.filter(order => order.type === '短剧解锁' && order.status === '已完成' && (order.drama === record.id || order.content?.startsWith(record.name + ' · '))).length;
  if (key === 'likes') return db.likes.filter(item => item.drama === record.id && item.status === '点赞').length;
  if (key === 'collections') return db.collections.filter(item => item.type === '短剧' && item.content === record.id && item.status === '收藏').length;
  if (key === 'shares') return record.shares ?? null;
  return record[key];
}
function dramaRows() {
  const state = dramaView, term = state.q.toLowerCase();
  const rows = db.dramas.filter(record => Boolean(record.deleted) === state.recycle
    && (!term || [record.id, record.name, record.subtitle, record.tags].join(' ').toLowerCase().includes(term))
    && (!state.category || record.category === state.category)
    && (!state.language || record.language === state.language)
    && (!state.flag || record.flags?.includes(state.flag))
    && (state.recycle || state.tab === 'all' || (state.tab === 'live' ? dramaIsLive(record) : !dramaIsLive(record))));
  if (state.sort) rows.sort((a, b) => {
    const x = dramaMetric(a, state.sort), y = dramaMetric(b, state.sort);
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'zh-CN', { numeric: true })) * state.direction;
  });
  return rows;
}
function dramaSelectOptions(values, selected, label) {
  return `<option value="">${esc(label)}</option>` + values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
}
function adminDramaPage() {
  const state = dramaView, rows = dramaRows(), editable = can('content.publish'), pageSize = 10;
  state.page = Math.max(1, Math.min(state.page, Math.ceil(rows.length / pageSize) || 1));
  const shown = rows.slice((state.page - 1) * pageSize, state.page * pageSize);
  const sortHead = (name, key) => `<th scope="col"><button class="drama-sort" data-act="dramaSort" data-id="${key}">${name}<span>${state.sort === key ? state.direction === 1 ? '↑' : '↓' : '↕'}</span></button></th>`;
  return header('短剧管理', '短剧列表') + `<section class="legacy-dramas" aria-label="短剧管理列表">
    <div class="drama-import-bar"><button class="drama-filter-toggle" data-act="dramaFilters" aria-expanded="${state.filters}">筛选条件<span class="drama-switch ${state.filters ? 'on' : ''}"></span></button>
    ${editable ? '<button class="drama-gold" data-act="dramaDemo">↓ 导入测试数据</button><button class="drama-gold" data-act="dramaTemplate">↓ 下载模板</button><button class="drama-gold" data-act="dramaImport">↓ 批量导入剧集</button><button class="drama-gold" data-act="dramaDirectory">↓ 目录导入</button>' : ''}
    <div class="drama-search"><input type="search" data-drama-query aria-label="请输入ID、标题、标签" placeholder="请输入ID、标题、标签" value="${esc(state.q)}"><button data-act="dramaQuery" aria-label="搜索短剧">⌕</button></div></div>
    <div class="drama-filter-panel" ${state.filters ? '' : 'hidden'}><label>分类<select data-drama-filter="category">${dramaSelectOptions(db.categories.map(item => item.name), state.category, '全部分类')}</select></label><label>语言<select data-drama-filter="language">${dramaSelectOptions([...new Set(db.dramas.map(item => item.language))], state.language, '全部语言')}</select></label><label>标志<select data-drama-filter="flag">${dramaSelectOptions(dramaFlags, state.flag, '全部标志')}</select></label><button data-act="dramaReset">重置</button></div>
    <div class="drama-list-panel"><div class="drama-toolbar"><button data-act="dramaRefresh" aria-label="刷新短剧列表">⟳</button>${editable && !state.recycle ? '<button class="drama-purple" data-act="new" data-id="dramas">＋ 添加</button><button class="drama-purple" data-act="dramaPrice">✎ 价格修改</button>' : ''}
    <div class="drama-status-tabs" role="group" aria-label="上下架筛选">${[['all', '全部'], ['live', '上架'], ['offline', '下架']].map(([key, label]) => `<button data-act="dramaTab" data-id="${key}" aria-pressed="${state.tab === key}" ${state.recycle ? 'disabled' : ''}>${label}</button>`).join('')}</div><span data-drama-selection></span><button class="drama-recycle ${state.recycle ? 'active' : ''}" data-act="dramaRecycle">${state.recycle ? '返回列表' : '♲ 回收站'}</button></div>
    <div class="table-wrap"><table data-table="dramas" class="drama-table"><thead><tr><th><input type="checkbox" data-drama-check-all aria-label="全选本页短剧" ${shown.length && shown.every(item => state.selected.has(item.id)) ? 'checked' : ''}></th>${sortHead('ID', 'id')}<th>语言</th><th>标题</th>${sortHead('总集数', 'episodes')}${sortHead('销量', 'sales')}${sortHead('播放量', 'plays')}${sortHead('点赞量', 'likes')}${sortHead('收藏量', 'collections')}${sortHead('转发量', 'shares')}${sortHead('排序', 'sort')}${sortHead('更新时间', 'updated')}<th class="drama-operation">操作</th></tr></thead><tbody>${shown.map(record => `<tr><td><input type="checkbox" data-drama-check value="${esc(record.id)}" aria-label="选择短剧 ${esc(record.id)}" ${state.selected.has(record.id) ? 'checked' : ''}></td><td>${esc(record.id)}</td><td>${esc(record.language)}</td><td><div class="drama-title-cell"><img src="${esc(record.cover)}" alt="${esc(record.name)}封面"><div><button class="drama-title-link" data-act="${editable ? 'editDrama' : 'episodes'}" data-id="${esc(record.id)}">${esc(record.name)}</button><div>分类：<span class="drama-category">${esc(record.category || '暂无')}</span></div><div>标志：${(record.flags || []).map(flag => `<span class="drama-flag">${esc(flag)}</span>`).join('')}</div><div>标签：${esc(record.tags || '')}</div></div></div></td>${['episodes', 'sales', 'plays', 'likes', 'collections', 'shares', 'sort', 'updated'].map(key => `<td>${esc(dramaMetric(record, key) ?? '—')}</td>`).join('')}<td class="drama-operation">${state.recycle ? editable ? btn('恢复', 'dramaRestore', record.id) : '—' : editable ? btn(dramaIsLive(record) ? '下架' : '上架', 'toggleDrama', record.id) + btn('编辑', 'editDrama', record.id) + btn('复制', 'dramaCopy', record.id) + btn('媒体处理', 'dramaMedia', record.id) + btn('删除', 'dramaDelete', record.id) : btn('剧集', 'episodes', record.id)}</td></tr>`).join('') || '<tr><td colspan="13" class="empty">暂无短剧</td></tr>'}</tbody></table></div>
    <div class="pagination"><span>共 ${rows.length} 条记录</span><div><button data-act="dramaPrev" ${state.page === 1 ? 'disabled' : ''}>‹</button><span>${state.page} / ${Math.max(1, Math.ceil(rows.length / pageSize))}</span><button data-act="dramaNext" ${state.page * pageSize >= rows.length ? 'disabled' : ''}>›</button></div></div></div></section>`;
}
function syncDramaSelection() {
  const count = $('#main [data-drama-selection]');
  if (count) count.textContent = dramaView.selected.size ? `已选 ${dramaView.selected.size} 部` : '';
  const boxes = [...document.querySelectorAll('[data-drama-check]')], all = $('[data-drama-check-all]');
  if (all) { all.checked = boxes.length > 0 && boxes.every(box => box.checked); all.indeterminate = boxes.some(box => box.checked) && !all.checked; }
}
function queryDramas() {
  dramaView.q = $('[data-drama-query]')?.value.trim() || '';
  document.querySelectorAll('[data-drama-filter]').forEach(input => dramaView[input.dataset.dramaFilter] = input.value);
  dramaView.page = 1; render();
}
function dramaDialogStyle(kind) { $('#modal .dialog').classList.add('drama-dialog', kind); }
function dramaValidateLive(record, episodes) {
  if (!record.language || !record.name || !record.subtitle || !record.description || !record.cover) throw Error('请补齐语言、标题、副标题、简介和封面后上架');
  if (!episodes.length || episodes.some(episode => !episode.asset || !episode.subtitle)) throw Error('请补齐剧集视频和字幕后上架');
  if (record.episodes !== episodes.length) throw Error('总集数与已配置剧集数量不一致');
}

function adminDramaEditor(record) {
  if (!requirePerm('content.publish') || record?.deleted) return;
  const values = { language: '', name: '', subtitle: '', description: '', cover: '', landscape: '', animation: '', flags: [], tags: '', category: '', episodes: 1, score: '', publishState: '上架', sort: 0, copyright: '', billingMode: 'episodes', ...(record || {}) };
  if (record) values.publishState = dramaIsLive(record) ? '上架' : '下架';
  const languages = [...new Set(['简体中文', '繁體中文', 'English', '越南语', '阿拉伯语', '西班牙语', '泰语', ...db.languages.map(item => item.name), ...db.dramas.map(item => item.language)])];
  const basicFields = [['language', '语言 *', 'select', ['', ...languages]], ['name', '标题 *'], ['subtitle', '副标题 *'], ['description', '简介 *', 'textarea'], ['cover', '封面 *'], ['landscape', '横图封面'], ['animation', '动态图'], ['flags', '标志', 'select', ['', ...dramaFlags]], ['tags', '标签'], ['category', '分类', 'select', ['', ...db.categories.map(item => item.name)]], ['episodes', '总集数 *', 'number'], ['score', '评分 *', 'number'], ['publishState', '状态 *', 'radio', ['上架', '下架']], ['sort', '排序', 'number'], ['copyright', '版权方'], ['billingMode', '付费模式', 'select', ['episodes', 'free']]];
  let drafts = record ? db.episodes.filter(item => item.drama === record.id).map(item => ({ ...item })).sort((a, b) => a.sort - b.sort) : [];
  let step = 0;
  function validateBasic(data) {
    checkRequired(data, ['language', 'name', 'subtitle', 'description', 'cover']);
    if (!String($('#editForm [name="score"]').value).trim()) throw Error('请填写评分');
    positive(data.episodes); positive(data.sort, true);
    if (!Number.isFinite(data.score) || data.score < 0 || data.score > 10) throw Error('评分须在 0—10 之间');
    if (!languages.includes(data.language) || !['上架', '下架'].includes(data.publishState)) throw Error('请选择有效语言和状态');
    if (data.category && !db.categories.some(item => item.name === data.category)) throw Error('请选择有效分类');
  }
  form(record ? '编辑短剧' : '添加短剧', basicFields, { ...values, flags: '' }, data => {
    if (!requirePerm('content.publish')) throw Error('权限不足');
    validateBasic(data);
    if (step === 0) { showStep(1); throw Error('请在剧集步骤确认后保存'); }
    readDrafts();
    const orders = new Set();
    const episodes = drafts.map((draft, index) => {
      const next = { ...draft, name: draft.name.trim() || `第${index + 1}集` };
      positive(next.sort);
      if (orders.has(next.sort)) throw Error('剧集顺序重复'); orders.add(next.sort);
      checkRequired(next, ['asset', 'subtitle']);
      if (data.billingMode === 'free') { next.rule = '免费'; next.coins = 0; next.vipCoins = 0; }
      if (!['免费', '金币', '广告'].includes(next.rule)) throw Error('请选择有效的剧集解锁方式');
      if (next.rule === '金币') positive(next.coins); else next.coins = 0;
      if (next.vipCoins != null) positive(next.vipCoins, true);
      return next;
    });
    if (episodes.length && data.episodes !== episodes.length) throw Error('总集数与已配置剧集数量不一致，请返回基础信息修改');
    data.flags = [...$('#editForm [data-drama-flags]').selectedOptions].map(option => option.value);
    data.featured = data.flags.includes('推荐') ? '是' : '否';
    data.vipFree = $('#editForm [name="vipFree"]').checked;
    data.region = record?.region || '美国';
    const publishState = data.publishState; delete data.publishState;
    if (publishState === '上架') dramaValidateLive(data, episodes);
    const dramaId = record?.id || id('DR');
    const before = record ? { ...record, episodeRules: db.episodes.filter(item => item.drama === dramaId).map(item => ({ ...item })) } : '';
    const next = { ...data, status: publishState === '下架' ? '已下架' : record?.status === '完结' ? '完结' : '连载', updated: now() };
    if (record) Object.assign(record, next);
    else db.dramas.unshift({ ...next, id: dramaId, published: publishState === '上架' ? now() : '', plays: 0, visitors: 0 });
    if (publishState === '上架' && !find('dramas', dramaId).published) find('dramas', dramaId).published = now();
    episodes.forEach(episode => {
      const existing = episode.id && db.episodes.find(item => item.id === episode.id && item.drama === dramaId);
      if (existing) Object.assign(existing, episode);
      else db.episodes.push({ ...episode, id: id('EP'), drama: dramaId });
    });
    audit(record ? '更新短剧及剧集' : '新增短剧', dramaId, '短剧资料及价格配置', before, { ...find('dramas', dramaId), episodeRules: db.episodes.filter(item => item.drama === dramaId) });
  });
  dramaDialogStyle('drama-editor-dialog');
  const grid = $('#editForm .form-grid'); grid.classList.add('drama-basic-fields');
  grid.insertAdjacentHTML('beforebegin', '<div class="drama-steps"><button type="button" data-drama-step="0" aria-current="step">基础信息</button><span>〉</span><button type="button" data-drama-step="1">剧集</button></div>');
  const scope = $('#editForm [name="flags"]'); scope.multiple = true; scope.dataset.dramaFlags = ''; scope.remove(0);
  [...scope.options].forEach(option => option.selected = values.flags.includes(option.value));
  scope.hidden = true;
  const flagField = document.createElement('div'); flagField.className = 'field drama-flags-field';
  scope.closest('label').replaceWith(flagField); flagField.innerHTML = '<span>标志</span>'; flagField.append(scope);
  flagField.insertAdjacentHTML('beforeend', `<details class="drama-flags-picker"><summary></summary><div>${dramaFlags.map(flag => `<label class="check"><input type="checkbox" value="${flag}" ${values.flags.includes(flag) ? 'checked' : ''}>${flag}</label>`).join('')}</div></details><small>必看：首页必看模块展示，新剧：首页新剧模块展示，推荐：搜索页推荐模块展示</small>`);
  const drawFlags = () => { const selected = [...flagField.querySelectorAll('input:checked')].map(input => input.value); [...scope.options].forEach(option => option.selected = selected.includes(option.value)); flagField.querySelector('summary').textContent = selected.join('、') || '选择'; };
  flagField.addEventListener('change', drawFlags); drawFlags();
  const tagInput = $('#editForm [name="tags"]'); tagInput.placeholder = '输入标签，多个标签用逗号分隔';
  const tagWrap = document.createElement('div'); tagWrap.className = 'drama-tag-input'; tagInput.before(tagWrap); tagWrap.append(tagInput);
  tagWrap.insertAdjacentHTML('afterbegin', '<button type="button" class="drama-purple" aria-label="添加标签">＋</button>'); tagWrap.querySelector('button').onclick = event => { event.preventDefault(); tagInput.focus(); };
  $('#editForm [name="copyright"]').placeholder = '选择或填写版权方';
  for (const [key, ratio, accept] of [['cover', '建议尺寸比例：3:4', 'image/*'], ['landscape', '建议尺寸比例：16:9，为了显示效果最好，请上传横版封面图', 'image/*'], ['animation', '配置后首页模块优先展示，建议必看模块第一个短剧上传动态图', 'image/gif,image/webp,video/mp4']]) {
    const input = $(`#editForm [name="${key}"]`), label = input.closest('label');
    label.classList.add('drama-upload-field');
    const caption = document.createElement('span'); caption.textContent = label.firstChild.textContent; label.firstChild.replaceWith(caption);
    const wrap = document.createElement('div'); wrap.className = 'drama-upload-controls';
    input.before(wrap); wrap.append(input); input.placeholder = '填写素材路径或选择文件'; input.setAttribute('aria-label', caption.textContent);
    const pick = document.createElement('input'); pick.type = 'file'; pick.accept = accept; pick.hidden = true;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'drama-upload-pick'; button.setAttribute('aria-label', '上传' + caption.textContent.replace(' *', '')); button.textContent = '+';
    const preview = document.createElement('img'); preview.hidden = !input.value; preview.alt = caption.textContent + '预览'; if (input.value) preview.src = input.value;
    button.prepend(preview); wrap.prepend(button); wrap.append(pick);
    const help = document.createElement('small'); help.textContent = ratio; wrap.append(help);
    button.onclick = event => { event.preventDefault(); pick.click(); };
    input.oninput = () => { preview.hidden = !input.value; if (input.value) preview.src = input.value; };
    pick.onchange = async () => {
      const file = pick.files[0]; if (!file) return;
      if (file.size > 3 * 1024 * 1024) { $('#formError').textContent = '本地预览文件请小于 3MB，也可填写素材路径'; return; }
      const reader = new FileReader();
      reader.onload = () => { input.value = reader.result; preview.hidden = key === 'animation' && file.type.startsWith('video/'); if (!preview.hidden) preview.src = reader.result; };
      reader.onerror = () => { $('#formError').textContent = '文件读取失败，请重试'; };
      reader.readAsDataURL(file);
    };
  }
  const mode = $('#editForm [name="billingMode"]');
  mode.querySelector('[value="episodes"]').textContent = '逐集配置'; mode.querySelector('[value="free"]').textContent = '全部免费';
  const episodeStep = document.createElement('section'); episodeStep.className = 'drama-episode-step'; episodeStep.hidden = true;
  episodeStep.innerHTML = '<div class="drama-episode-options"></div><p class="config-help">按集维护视频、字幕、单集价格与 VIP 价格；已有剧集保留原编号。</p><div data-episode-drafts></div><button type="button" class="config-add-episode drama-purple">＋ 新增一集</button>';
  grid.after(episodeStep); episodeStep.querySelector('.drama-episode-options').append(mode.closest('label'));
  episodeStep.querySelector('.drama-episode-options').insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" name="vipFree" ${values.vipFree ? 'checked' : ''}>VIP用户免费</label>`);
  $('#cancelForm').insertAdjacentHTML('afterend', '<button type="button" id="dramaPrevious">上一步</button><button type="button" class="drama-purple" id="dramaNext">下一步</button>');
  $('#saveForm').textContent = '保存';
  function showStep(next) {
    step = next; grid.hidden = Boolean(step); episodeStep.hidden = !step;
    $('#dramaPrevious').hidden = !step; $('#dramaNext').hidden = Boolean(step); $('#saveForm').hidden = !step;
    document.querySelectorAll('[data-drama-step]').forEach(button => { if (Number(button.dataset.dramaStep) === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    $('#formError').textContent = ''; $('#modal .dialog-body').scrollTop = 0;
  }
  function nextStep() {
    try {
      const data = Object.fromEntries(new FormData($('#editForm'))); ['episodes', 'score', 'sort'].forEach(key => data[key] = Number(data[key]));
      validateBasic(data); showStep(1);
    } catch (error) { $('#formError').textContent = error.message; }
  }
  $('#dramaNext').onclick = nextStep; $('#dramaPrevious').onclick = () => showStep(0);
  document.querySelectorAll('[data-drama-step]').forEach(button => button.onclick = () => Number(button.dataset.dramaStep) === 1 ? nextStep() : showStep(0));
  function readDrafts() {
    document.querySelectorAll('[data-episode-draft]').forEach((row, index) => {
      for (const key of ['name', 'asset', 'subtitle', 'rule']) drafts[index][key] = row.querySelector(`[data-episode-field="${key}"]`).value;
      drafts[index].coins = Number(row.querySelector('[data-episode-field="coins"]').value);
      const vipPrice = row.querySelector('[data-episode-field="vipCoins"]').value;
      if (vipPrice !== '' || drafts[index].vipCoins !== undefined) drafts[index].vipCoins = vipPrice === '' ? null : Number(vipPrice);
      if (row.dataset.freePreview) { drafts[index].rule = row.dataset.previousRule; drafts[index].coins = Number(row.dataset.previousCoins); }
    });
  }
  function updateBilling() {
    document.querySelectorAll('[data-episode-draft]').forEach(row => {
      const rule = row.querySelector('[data-episode-field="rule"]'), coins = row.querySelector('[data-episode-field="coins"]');
      if (mode.value === 'free') {
        if (!row.dataset.freePreview) { row.dataset.previousRule = rule.value; row.dataset.previousCoins = coins.value; row.dataset.freePreview = 'true'; }
        rule.value = '免费';
      } else if (row.dataset.freePreview) { rule.value = row.dataset.previousRule; coins.value = row.dataset.previousCoins; delete row.dataset.freePreview; }
      rule.disabled = mode.value === 'free'; coins.disabled = mode.value === 'free' || rule.value !== '金币'; if (coins.disabled) coins.value = '0';
      row.querySelector('summary span').textContent = rule.value + (rule.value === '金币' ? ' · ' + coins.value + ' 积分' : '');
    });
  }
  function drawEpisodes() {
    $('[data-episode-drafts]').innerHTML = drafts.map(episode => `<details open data-episode-draft class="config-episode"><summary>第 ${episode.sort} 集<span></span></summary><div class="form-grid"><label class="field">集名<input data-episode-field="name" value="${esc(episode.name)}"></label><label class="field">解锁方式<select data-episode-field="rule">${['免费', '金币', '广告'].map(rule => `<option ${episode.rule === rule ? 'selected' : ''}>${rule}</option>`).join('')}</select></label><label class="field">视频素材路径<input data-episode-field="asset" value="${esc(episode.asset)}"></label><label class="field">字幕路径<input data-episode-field="subtitle" value="${esc(episode.subtitle)}"></label><label class="field">单集价格（积分）<input type="number" min="0" step="1" data-episode-field="coins" value="${episode.coins}"></label><label class="field">单集VIP价格（积分）<input type="number" min="0" step="1" placeholder="未设置" data-episode-field="vipCoins" value="${esc(episode.vipCoins ?? '')}"></label></div></details>`).join('') || '<div class="empty">尚未配置剧集，点击“新增一集”开始添加。</div>';
    updateBilling();
  }
  mode.onchange = updateBilling; $('[data-episode-drafts]').addEventListener('change', updateBilling);
  $('.config-add-episode').onclick = () => { readDrafts(); const sort = Math.max(0, ...drafts.map(item => item.sort)) + 1; drafts.push({ name: `第${sort}集`, sort, asset: '', subtitle: '', rule: '免费', coins: 0, vipCoins: null }); drawEpisodes(); $('[data-episode-drafts]').lastElementChild.querySelector('input').focus(); };
  $('#editForm').onsubmit = event => { event.preventDefault(); if (step === 0) nextStep(); else $('#saveForm').click(); };
  drawEpisodes(); showStep(0);
}

function adminDramaPrices() {
  if (!requirePerm('content.publish')) return;
  const chosen = db.dramas.filter(item => !item.deleted && dramaView.selected.has(item.id));
  const visibleIds = dramaRows().filter(item => !item.deleted).map(item => item.id);
  modal('批量设置价格', `<form id="dramaPriceForm"><div id="formError" class="error" role="alert"></div><label class="drama-price-scope"><span class="sr-only">修改范围</span><select name="scope" aria-label="修改范围"><option value="">选择</option><option value="selected" ${chosen.length ? 'selected' : ''}>已选短剧（${chosen.length} 部）</option><option value="filtered">当前筛选结果（${visibleIds.length} 部）</option></select></label>${[['normal', '单集价格'], ['vip', '单集VIP价格']].map(([key, label]) => `<div class="drama-price-row"><strong>${label}</strong><span>：</span><div class="drama-price-input"><span>前</span><input type="number" min="0" step="1" name="${key}Count" aria-label="${label}前几集"><span>集</span></div><div class="drama-price-input"><input type="number" min="0" step="1" name="${key}Price" aria-label="${label}前几集积分"><span>积分</span></div><div class="drama-price-input"><span>其余</span><input type="number" min="0" step="1" name="${key}Rest" aria-label="${label}其余积分" placeholder="不修改留空"><span>积分</span></div></div>`).join('')}<label class="check drama-price-vip"><input name="vipFree" type="checkbox">VIP用户免费</label></form>`, '<button id="cancelPrices">取消</button><button id="savePrices" class="drama-purple">确定</button>');
  dramaDialogStyle('drama-price-dialog'); $('#cancelPrices').onclick = close;
  $('#dramaPriceForm').onsubmit = event => { event.preventDefault(); $('#savePrices').click(); };
  $('#savePrices').onclick = () => {
    try {
      if (!requirePerm('content.publish')) throw Error('权限不足');
      const raw = Object.fromEntries(new FormData($('#dramaPriceForm')));
      const ids = raw.scope === 'selected' ? chosen.map(item => item.id) : raw.scope === 'filtered' ? visibleIds : [];
      if (!ids.length) throw Error('请选择有效的短剧范围');
      const edits = {};
      for (const prefix of ['normal', 'vip']) {
        const count = raw[prefix + 'Count'], price = raw[prefix + 'Price'], rest = raw[prefix + 'Rest'];
        if ((count === '') !== (price === '')) throw Error('前几集和对应积分需一起填写');
        for (const value of [count, price, rest]) if (value !== '') positive(Number(value), true);
        edits[prefix] = { count: count === '' ? null : Number(count), price: price === '' ? null : Number(price), rest: rest === '' ? null : Number(rest) };
      }
      const records = ids.map(key => find('dramas', key));
      if (records.some(item => !item || item.deleted)) throw Error('短剧状态已变化，请重新选择');
      const episodes = db.episodes.filter(item => ids.includes(item.drama));
      if (!episodes.length) throw Error('所选短剧尚未配置剧集');
      const before = { dramas: records.map(item => ({ ...item })), episodes: episodes.map(item => ({ ...item })) };
      const updates = [];
      for (const drama of records) {
        const sorted = episodes.filter(item => item.drama === drama.id).sort((a, b) => a.sort - b.sort);
        sorted.forEach((episode, index) => {
          const next = { ...episode };
          for (const prefix of ['normal', 'vip']) {
            const edit = edits[prefix], price = edit.count != null && index < edit.count ? edit.price : edit.rest;
            if (price == null) continue;
            if (prefix === 'normal') { next.coins = price; next.rule = price === 0 ? '免费' : '金币'; }
            else next.vipCoins = price;
          }
          updates.push([episode, next]);
        });
      }
      if (!updates.some(([old, next]) => old.rule !== next.rule || old.coins !== next.coins || old.vipCoins !== next.vipCoins) && !records.some(item => Boolean(item.vipFree) !== Boolean(raw.vipFree))) throw Error('请填写需要修改的价格或调整 VIP 免费设置');
      updates.forEach(([old, next]) => Object.assign(old, next));
      records.forEach(item => { item.vipFree = Boolean(raw.vipFree); if (edits.normal.price != null || edits.normal.rest != null) item.billingMode = 'episodes'; item.updated = now(); });
      audit('批量设置短剧价格', ids.join(','), '按集配置普通及VIP价格', before, { dramas: records, episodes });
      close(); render(); toast('价格已更新');
    } catch (error) { $('#formError').textContent = error.message; }
  };
}

function dramaDownloadTemplate() {
  const blob = new Blob([JSON.stringify([{ dramaId: '短剧ID', name: '第1集', sort: 1, asset: 'video/01.mp4', subtitle: 'subtitle/01.srt', rule: '免费', coins: 0, vipCoins: 0 }], null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = '短剧剧集导入模板.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
function adminDramaImport(directory = false) {
  if (!requirePerm('content.publish')) return;
  const available = db.dramas.filter(item => !item.deleted);
  form(directory ? '目录导入' : '批量导入剧集', [['drama', '目标短剧 *', 'select', ['', ...available.map(item => item.id)]], ['payload', '剧集数据（JSON） *', 'textarea']], { drama: available.find(item => dramaView.selected.has(item.id))?.id }, data => {
    if (!requirePerm('content.publish')) throw Error('权限不足');
    const drama = find('dramas', data.drama);
    if (!drama || drama.deleted) throw Error('请选择有效的目标短剧');
    let rows; try { rows = JSON.parse(data.payload); } catch { throw Error('剧集数据需为有效 JSON 数组'); }
    if (!Array.isArray(rows) || !rows.length || rows.length > 200) throw Error('每次导入 1—200 集');
    const existing = db.episodes.filter(item => item.drama === drama.id), sorts = new Set(existing.map(item => item.sort));
    const next = rows.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error(`第 ${index + 1} 行格式错误`);
      if (row.dramaId && row.dramaId !== drama.id) throw Error(`第 ${index + 1} 行短剧 ID 与目标不一致`);
      const item = { name: String(row.name || '').trim(), sort: Number(row.sort), asset: String(row.asset || '').trim(), subtitle: String(row.subtitle || '').trim(), rule: row.rule || '免费', coins: Number(row.coins ?? 0), vipCoins: row.vipCoins == null ? null : Number(row.vipCoins) };
      checkRequired(item, ['name', 'asset', 'subtitle']); positive(item.sort); positive(item.coins, true); if (item.vipCoins != null) positive(item.vipCoins, true);
      if (sorts.has(item.sort)) throw Error(`第 ${index + 1} 行集数已存在或重复`); sorts.add(item.sort);
      if (!['免费', '金币', '广告'].includes(item.rule)) throw Error(`第 ${index + 1} 行解锁方式无效`);
      if (drama.billingMode === 'free') { item.rule = '免费'; item.coins = 0; item.vipCoins = 0; }
      else if (item.rule === '金币') positive(item.coins); else item.coins = 0;
      return { ...item, id: id('EP'), drama: drama.id };
    });
    const before = { ...drama }; db.episodes.push(...next); drama.episodes = existing.length + next.length; drama.updated = now();
    audit(directory ? '目录导入剧集' : '批量导入剧集', drama.id, `导入 ${next.length} 集`, before, { ...drama, imported: next });
  }, directory ? '选择包含视频和字幕的目录，按同名文件配对并预览后保存。此原型仅登记相对路径，不上传文件。' : '下载模板后填写，选择 JSON 文件或粘贴内容。一次导入到一部短剧，校验全部通过后保存，不覆盖已有剧集。');
  dramaDialogStyle('drama-import-dialog');
  const select = $('#editForm [name="drama"]'); [...select.options].forEach(option => { const item = find('dramas', option.value); if (item) option.textContent = item.id + ' · ' + item.name; });
  $('#editForm .form-grid').insertAdjacentHTML('afterbegin', `<label class="field wide">${directory ? '选择目录' : '选择 JSON 文件'}<input type="file" data-drama-import-file ${directory ? 'webkitdirectory multiple' : 'accept=".json,application/json"'}></label>`);
  $('[data-drama-import-file]').onchange = async event => {
    try {
      const files = [...event.target.files];
      if (!directory) { if (files[0]) $('#editForm [name="payload"]').value = await files[0].text(); return; }
      const videos = files.filter(file => /\.(mp4|m3u8|webm|mov)$/i.test(file.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!videos.length) throw Error('目录中未找到视频文件');
      const used = new Set(), rows = videos.map((file, index) => {
        const base = file.webkitRelativePath.replace(/\.[^.]+$/, ''), subtitles = files.filter(item => item.webkitRelativePath.replace(/\.[^.]+$/, '') === base && /\.(srt|vtt|ass)$/i.test(item.name));
        if (subtitles.length !== 1) throw Error(`${file.name} 需有且只有一个同名字幕文件`);
        const num = Number(file.name.match(/\d+/)?.[0] || index + 1); if (used.has(num)) throw Error('目录视频的集数重复，请调整文件名'); used.add(num);
        return { name: `第${num}集`, sort: num, asset: file.webkitRelativePath, subtitle: subtitles[0].webkitRelativePath, rule: '免费', coins: 0 };
      });
      $('#editForm [name="payload"]').value = JSON.stringify(rows, null, 2); $('#formError').textContent = '';
    } catch (error) { $('#editForm [name="payload"]').value = ''; $('#formError').textContent = error.message; }
  };
}

function adminDramaAction(actionName, key) {
  if (actionName === 'editDrama' || (actionName === 'new' && key === 'dramas')) { adminDramaEditor(actionName === 'editDrama' ? find('dramas', key) : null); return true; }
  if (actionName === 'toggleDrama') {
    if (!requirePerm('content.publish')) return true;
    const record = find('dramas', key); if (!record || record.deleted) return true;
    const live = dramaIsLive(record);
    confirmAction(live ? '下架短剧' : '上架短剧', live ? '确认下架此短剧？历史剧集和业务记录保留。' : '确认上架此短剧？保存前将校验资料与剧集。', () => {
      if (!can('content.publish') || record.deleted) throw Error('权限或短剧状态已变化');
      if (!live) dramaValidateLive(record, db.episodes.filter(item => item.drama === key));
      const before = { ...record }; record.status = live ? '已下架' : '连载'; record.updated = now(); if (!live && !record.published) record.published = now(); audit('短剧上下架', key, '内容运营', before, record);
    }); return true;
  }
  if (!actionName.startsWith('drama')) return false;
  if (!requirePerm('dramas.view')) return true;
  if (actionName === 'dramaFilters') { dramaView.filters = !dramaView.filters; render(); return true; }
  if (actionName === 'dramaQuery') { queryDramas(); return true; }
  if (actionName === 'dramaReset') { Object.assign(dramaView, { q: '', category: '', language: '', flag: '', page: 1 }); render(); return true; }
  if (actionName === 'dramaRefresh') { render(); syncDramaSelection(); return true; }
  if (actionName === 'dramaTab') { if (!['all', 'live', 'offline'].includes(key)) return true; dramaView.tab = key; dramaView.page = 1; render(); return true; }
  if (actionName === 'dramaRecycle') { dramaView.recycle = !dramaView.recycle; dramaView.page = 1; dramaView.selected.clear(); render(); return true; }
  if (actionName === 'dramaSort') { if (dramaView.sort === key) dramaView.direction *= -1; else { dramaView.sort = key; dramaView.direction = 1; } render(); return true; }
  if (actionName === 'dramaPrev' || actionName === 'dramaNext') { dramaView.page += actionName === 'dramaPrev' ? -1 : 1; render(); return true; }
  if (!requirePerm('content.publish')) return true;
  if (actionName === 'dramaPrice') { adminDramaPrices(); return true; }
  if (actionName === 'dramaTemplate') { dramaDownloadTemplate(); return true; }
  if (actionName === 'dramaImport' || actionName === 'dramaDirectory') { adminDramaImport(actionName === 'dramaDirectory'); return true; }
  if (actionName === 'dramaDemo') {
    confirmAction('导入测试数据', '新增一部下架的测试短剧及两个示例剧集，用于检查管理流程。', () => {
      if (!can('content.publish')) throw Error('权限不足');
      const drama = { id: id('DR'), name: '测试短剧', subtitle: 'Demo Short Drama', description: '用于预览管理功能的测试数据。', cover: 'assets/romance.jpg', language: 'English', region: '美国', category: db.categories[0]?.name || '', flags: ['新剧'], tags: '测试', episodes: 2, score: 8, sort: 0, status: '已下架', billingMode: 'episodes', plays: 0, visitors: 0, published: '', updated: now() };
      db.dramas.unshift(drama); const episodes = [1, 2].map(sort => ({ id: id('EP'), drama: drama.id, name: `第${sort}集`, sort, asset: `demo-${sort}.mp4`, subtitle: `demo-${sort}.srt`, rule: '免费', coins: 0 })); db.episodes.push(...episodes); audit('导入短剧测试数据', drama.id, '本地测试', '', { drama, episodes });
    }); return true;
  }
  const record = find('dramas', key); if (!record) return true;
  if (actionName === 'dramaRestore') {
    confirmAction('恢复短剧', '恢复后保持下架，原剧集编号及历史关联保留。', () => { if (!can('content.publish')) throw Error('权限不足'); const before = { ...record }; delete record.deleted; record.status = '已下架'; record.updated = now(); audit('恢复短剧', key, '从回收站恢复', before, record); }); return true;
  }
  if (record.deleted) return true;
  if (actionName === 'dramaDelete') {
    confirmAction('删除短剧', '将此短剧移入回收站，可恢复；保留剧集和历史关联。', () => { if (!can('content.publish')) throw Error('权限不足'); const before = { ...record }; record.deleted = true; record.status = '已下架'; record.updated = now(); dramaView.selected.delete(key); audit('删除短剧', key, '移入回收站', before, record); }); return true;
  }
  if (actionName === 'dramaCopy') {
    confirmAction('复制短剧', '复制资料、剧集及价格配置，生成新编号并保持下架。', () => {
      if (!can('content.publish') || record.deleted) throw Error('权限或短剧状态已变化');
      const next = { ...record, flags: [...(record.flags || [])], id: id('DR'), name: record.name + '（副本）', status: '已下架', published: '', updated: now(), plays: 0, visitors: 0 }; delete next.shares;
      db.dramas.unshift(next); const episodes = db.episodes.filter(item => item.drama === key).map(item => ({ ...item, id: id('EP'), drama: next.id })); db.episodes.push(...episodes); next.episodes = episodes.length; audit('复制短剧', next.id, '复制自 ' + key, '', { drama: next, episodes });
    }); return true;
  }
  if (actionName === 'dramaMedia') {
    const rows = db.episodes.filter(item => item.drama === key).sort((a, b) => a.sort - b.sort);
    modal('媒体处理 · ' + record.name, '<p class="config-help">核对剧集素材与字幕路径，点击“维护剧集”修改。当前原型不执行服务端转码。</p>' + table([['剧集', 'name'], ['视频', 'asset'], ['字幕', 'subtitle'], ['检查', 'id', (_, row) => esc(row.asset && row.subtitle ? '路径已配置' : '缺少素材或字幕')]], rows), '<button id="closeFooter">关闭</button><button class="drama-purple" id="editDramaMedia">维护剧集</button>'); dramaDialogStyle('drama-media-dialog'); $('#editDramaMedia').onclick = () => { adminDramaEditor(record); $('#dramaNext').click(); }; return true;
  }
  return true;
}
