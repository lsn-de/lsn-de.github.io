let searchScope = 'all';
const searchKinds = [['all', '全部'], ['drama', '短剧'], ['image', '图片模板'], ['video', '视频模板']];

function openGlobalSearch() {
  go('globalSearch');
  searchScope = 'all';
  render();
  $('#global-search-input').focus({ preventScroll: true });
}
function globalSearchIndex() {
  const titles = dramas.map((item, index) => ({ kind: 'drama', index, title: item.name, image: item.cover || `assets/${item.img}.jpg`, detail: `${item.genre} · 全 ${item.eps} 集`, terms: [item.name, item.en, item.genre, ...(item.genres || [])].join(' ') }));
  const templates = ['image', 'video'].flatMap(kind => faceTemplates.map((item, index) => ({ item, index })).filter(({ item }) => !item.relatedOnly).map(({ item, index }) => ({ kind, index, title: item.title, image: `assets/${item.image}.jpg`, detail: kind === 'image' ? '80 金币 / 次' : `${item.videoSeconds}s · ${item.videoSeconds * 25} 金币`, terms: [item.title, ...item.tags].join(' ') })));
  return [...titles, ...templates];
}
function globalMatches() {
  const term = query.normalize('NFKC').trim().toLocaleLowerCase();
  return globalSearchIndex().filter(item => (!term || item.terms.normalize('NFKC').toLocaleLowerCase().includes(term)) && (searchScope === 'all' || item.kind === searchScope));
}
function globalSearchCard(item) {
  return `<button class="global-search-card" data-search-kind="${item.kind}" onclick="${item.kind === 'drama' ? `openDrama(${item.index})` : `openSearchTemplate('${item.kind}',${item.index})`}" aria-label="${esc(item.title)} · ${searchKinds.find(([kind]) => kind === item.kind)[1]}"><div><img src="${item.image}" alt="" loading="lazy"><span>${I(item.kind === 'drama' ? 'play' : item.kind === 'image' ? 'image' : 'video')}</span></div><h3>${esc(item.title)}</h3><small>${esc(item.detail)}</small></button>`;
}
function globalSearchContent() {
  const matches = globalMatches();
  if (!matches.length) return `<div class="global-search-empty">${I('search')}<h2>没有找到相关内容</h2><p>试试剧名、模板名称或风格，<br>例如「海边」或「Romance」。</p><button class="secondary" onclick="resetGlobalSearch()">重新探索</button></div>`;
  return `${!query ? `<div class="global-search-suggestions"><p>试试这些灵感</p><div>${['都市', '海边', 'Hidden Agenda', 'Romance'].map(term => `<button onclick="setGlobalSearchTerm('${term}')">${term}</button>`).join('')}</div></div>` : ''}${searchKinds.slice(1).map(([kind, label]) => {
    const group = matches.filter(item => item.kind === kind);
    if (!group.length) return '';
    const visible = searchScope === 'all' && !query ? group.slice(0, 4) : group;
    return `<section class="global-search-group"><div class="global-search-heading"><h2>${label}<small>${group.length}</small></h2>${visible.length < group.length ? `<button onclick="selectSearchScope('${kind}')">查看全部 ${I('arrow')}</button>` : ''}</div><div class="global-search-grid">${visible.map(globalSearchCard).join('')}</div></section>`;
  }).join('')}`;
}
function globalSearch() {
  return `<div class="global-search-page"><div class="global-search-sticky"><header><button onclick="back()" class="iconbtn" aria-label="返回">${I('back')}</button><label>${I('search')}<input id="global-search-input" type="search" aria-label="搜索短剧与换脸模板" placeholder="搜索短剧、换脸模板" value="${esc(query)}" oninput="query=this.value;updateGlobalSearch()"><button id="global-search-clear" onclick="resetGlobalSearch()" aria-label="清空搜索" ${query ? '' : 'hidden'}>×</button></label><button onclick="back()">取消</button></header><nav aria-label="搜索内容类型">${searchKinds.map(([kind, label]) => `<button class="${searchScope === kind ? 'selected' : ''}" aria-pressed="${searchScope === kind}" data-search-scope="${kind}" onclick="selectSearchScope('${kind}')">${label}</button>`).join('')}</nav></div><div class="global-search-body"><p id="global-search-summary" role="status">${query ? `找到 ${globalMatches().length} 项相关内容` : '发现好故事，也找到下一次创作灵感'}</p><div class="global-search-results">${globalSearchContent()}</div></div></div>`;
}
function updateGlobalSearch() {
  $('#global-search-summary').textContent = query ? `找到 ${globalMatches().length} 项相关内容` : '发现好故事，也找到下一次创作灵感';
  $('#global-search-clear').hidden = !query;
  $('.global-search-results').innerHTML = globalSearchContent();
  document.querySelectorAll('[data-search-scope]').forEach(button => {
    const active = button.dataset.searchScope === searchScope;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function selectSearchScope(kind) {
  if (!searchKinds.some(([id]) => id === kind)) return;
  searchScope = kind;
  updateGlobalSearch();
}
function setGlobalSearchTerm(term) {
  query = term;
  $('#global-search-input').value = term;
  updateGlobalSearch();
}
function resetGlobalSearch() {
  searchScope = 'all';
  setGlobalSearchTerm('');
  $('#global-search-input').focus({ preventScroll: true });
}
function openSearchTemplate(type, index) {
  go('face');
  faceType = type;
  template = index;
  faceStep = 2;
  facePhoto = '';
  render();
}
