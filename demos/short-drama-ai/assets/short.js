let shortCategory = 'selected';
let shortBanner = 0;
let shortEpisodeRange = 0;
let shortEpisodeTab = 'list';
const shortIds = new Map();

function initShortCatalog() {
  // Keep legacy indices stable so existing favorites and viewing history still resolve.
  SHORT_CATALOG.titles.forEach(title => {
    shortIds.set(title.id, dramas.length);
    dramas.push({ name: title.title, en: title.title, cover: title.cover, genre: title.genres[0] || 'Drama', genres: title.genres, eps: title.episodes, lang: 'English', desc: title.description, sourceId: title.id, hots: title.hots, favorites: title.favorites, likes: title.likes });
  });
}
function shortTitle(id) { return dramas[shortIds.get(id)]; }
function shortOpen(id) { openDrama(shortIds.get(id)); }
function shortCover(d, loading = 'lazy') { return `<img src="${esc(d.cover || 'assets/' + d.img + '.jpg')}" alt="${esc(d.name)}" loading="${loading}" decoding="async">`; }
function shortCategories() {
  return `<nav class="short-categories" aria-label="Short genres">${['selected', ...SHORT_CATALOG.genres].map(genre => `<button class="${shortCategory === genre ? 'selected' : ''}" aria-pressed="${shortCategory === genre}" onclick="shortSelectCategory('${genre}')">${genre}</button>`).join('')}</nav>`;
}
function shortSelectCategory(genre) {
  if (!['selected', ...SHORT_CATALOG.genres].includes(genre)) return;
  shortCategory = genre;
  const scroll = $('#screen').scrollTop;
  render();
  $('#screen').scrollTop = scroll;
  $('.short-categories .selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function shortCard(d, index = shortIds.get(d.sourceId)) {
  return `<button class="short-catalog-card" data-genres="${esc((d.genres || [d.genre]).join(','))}" onclick="openDrama(${index})" aria-label="Watch ${esc(d.name)}">${shortCover(d)}<h3>${esc(d.name)}</h3></button>`;
}
function shortDiscovery(embedded = false) {
  const list = SHORT_CATALOG.titles.filter(d => d.genres.includes(shortCategory));
  return `<div class="short-module${embedded ? ' embedded' : ''}" lang="en" data-od-id="short-module">${embedded ? '' : `<header class="short-header"><h2>Short</h2><div><button aria-label="Search shorts" onclick="openShortSearch()">${I('search')}</button><button aria-label="Daily rewards" onclick="tab('coins')"><img src="assets/short/box.png" alt=""></button></div></header>`}${shortCategories()}${shortCategory !== 'selected' ? `<div class="short-catalog-grid">${list.map(d => shortCard(shortTitle(d.id))).join('') || '<p class="empty">More stories coming soon</p>'}</div>` : `<section class="short-banner" aria-label="Featured shorts"><div class="short-banner-track" onscroll="shortBannerChanged(this)" tabindex="0" aria-label="Swipe to explore recommendations">${SHORT_CATALOG.banners.map((banner, index) => `<button class="short-banner-slide" onclick="shortOpen(${banner.id})" aria-label="Watch ${esc(banner.title)}"><img src="${banner.image}" alt="${esc(banner.title)}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'}><span>${esc(banner.title)}</span></button>`).join('')}</div><button class="short-banner-next" aria-label="Next recommendation" onclick="shortNextBanner()">${I('arrow')}</button><div class="short-banner-dots" aria-label="Recommendation position">${SHORT_CATALOG.banners.map((_, index) => `<button aria-label="Recommendation ${index + 1}" aria-pressed="${shortBanner === index}" onclick="shortMoveBanner(${index})"></button>`).join('')}</div></section><section class="short-new"><div class="short-section-heading"><h2>NEW-WATCH</h2><button onclick="openShortSearch(true)">View All <span aria-hidden="true">›</span></button></div><div class="short-new-track" tabindex="0" aria-label="New releases, swipe to explore">${SHORT_CATALOG.news.map(id => `<button class="short-new-card" onclick="shortOpen(${id})" aria-label="Watch ${esc(shortTitle(id).name)}">${shortCover(shortTitle(id))}</button>`).join('')}</div></section><section class="short-top"><div class="short-section-heading"><h2>TOP OF THIS WEEK</h2></div><div class="short-rank-track" tabindex="0" aria-label="Weekly ranking, swipe to explore">${SHORT_CATALOG.top.map((id, index) => {
    const d = shortTitle(id);
    return `<button class="short-rank-card" onclick="shortOpen(${id})" aria-label="Rank ${index + 1}: ${esc(d.name)}"><div class="short-rank-cover">${shortCover(d)}${index < 6 ? `<img class="short-rank-badge" src="assets/short/sort${index + 1}.png" alt="${index + 1}">` : `<b class="short-rank-number">${index + 1}</b>`}</div><div class="short-rank-info"><h3>${esc(d.name)}</h3><div class="short-rank-meta"><span><img src="assets/short/hot.png" alt="Hot">${esc(d.hots)}</span><small>${esc(d.genre)}</small></div><p>${esc(d.desc)}</p></div></button>`;
  }).join('')}</div></section>`}</div>`;
}
function shortMount() {
  const track = $('.short-banner-track');
  if (track) track.scrollLeft = shortBanner * track.clientWidth;
}
function shortTrackSnapshot() {
  return ['.short-new-track', '.short-rank-track'].map(selector => ({ selector, scroll: $(selector)?.scrollLeft || 0 }));
}
function shortRestoreTracks(tracks) {
  (tracks || []).forEach(({ selector, scroll }) => {
    const track = $(selector);
    if (track) track.scrollLeft = scroll;
  });
}
function shortMoveBanner(index) {
  const track = $('.short-banner-track');
  if (!track) return;
  shortBanner = index % SHORT_CATALOG.banners.length;
  track.scrollLeft = shortBanner * track.clientWidth;
  shortBannerChanged(track);
}
function shortNextBanner() { shortMoveBanner(shortBanner + 1); }
function shortBannerChanged(track) {
  shortBanner = Math.round(track.scrollLeft / track.clientWidth);
  document.querySelectorAll('.short-banner-dots button').forEach((button, index) => button.setAttribute('aria-pressed', String(index === shortBanner)));
}
function openShortSearch(all = false) {
  go('shortSearch');
  filter = all ? 'new' : '全部';
  render();
  if (!all) $('#short-search-input')?.focus({ preventScroll: true });
}
function shortSearchResults() {
  const ids = filter === 'new' ? SHORT_CATALOG.news : SHORT_CATALOG.titles.map(d => d.id);
  return ids.map(shortTitle).filter(d => d.name.toLowerCase().includes(query.trim().toLowerCase())).map(d => shortCard(d)).join('') || '<p class="empty">No results found</p>';
}
function shortSearch() {
  return `<div class="short-module short-search" lang="en"><header class="short-search-header"><button onclick="back()" aria-label="返回">${I('back')}</button><label>${I('search')}<input id="short-search-input" type="search" aria-label="Search shorts" placeholder="Search" value="${esc(query)}" oninput="query=this.value;updateShortSearch()"></label><button onclick="back()">Cancel</button></header><h2>${filter === 'new' ? 'NEW-WATCH' : query ? 'Search Results' : 'Popular Searches'}</h2><div class="short-catalog-grid short-search-results" aria-live="polite">${shortSearchResults()}</div></div>`;
}
function updateShortSearch() {
  $('.short-search > h2').textContent = query ? 'Search Results' : filter === 'new' ? 'NEW-WATCH' : 'Popular Searches';
  $('.short-search-results').innerHTML = shortSearchResults();
}
function shortHistory() {
  const ids = [...new Set(state.history)].filter(index => dramas[index]);
  return bar('观看历史') + `<div class="short-module short-catalog-grid">${ids.map(index => shortCard(dramas[index], index)).join('') || '<p class="empty">还没有观看记录</p>'}</div>`;
}
function shortPlayer() {
  const d = dramas[dramaId];
  const fav = state.favs.includes(dramaId);
  const liked = (state.dramaLikes || []).includes(dramaId);
  const comments = (state.dramaComments || []).filter(item => item.dramaId === dramaId);
  return `<section class="player reference-player short-player" lang="en" aria-label="${esc(d.name)} playback"><button class="reference-play-surface" onclick="togglePlay()" aria-label="播放或暂停"><span id="play-toggle">${playing ? 'Ⅱ' : I('play')}</span></button><header class="reference-player-top"><button onclick="back()" aria-label="返回">${I('back')}</button><span class="reference-top-divider"></span><button onclick="tab('dramaCatalog')" aria-label="返回首页">${I('home')}</button><h2>Episode ${episode}</h2><button class="reference-speed" onclick="cyclePlayerSpeed(this)" aria-label="播放倍速">${playerIcon('speed')}<span>${speed.toFixed(1)}x</span></button></header><aside class="reference-player-actions" aria-label="剧集操作"><button class="${fav ? 'active' : ''}" data-od-id="drama-favorite" aria-label="${fav ? '取消收藏' : '收藏短剧'}" aria-pressed="${fav}" onclick="toggleFav()">${playerIcon('bookmark')}<span>${esc(d.favorites)}</span></button><button onclick="playerComments()" aria-label="评论">${playerIcon('comment')}<span>${comments.length}</span></button><button class="${liked ? 'active' : ''}" aria-label="点赞" aria-pressed="${liked}" onclick="togglePlayerLike()">${playerIcon('like')}<span>${esc(d.likes)}</span></button><button onclick="openDramaTip()" aria-label="打赏短剧" data-od-id="drama-tip">${I('gift')}</button><button onclick="copyText(dramas[dramaId].name)" aria-label="分享剧集">${playerIcon('share')}</button></aside><p class="short-playback-notice">预览模式 · 暂无视频源</p><div class="progress reference-progress" id="play-progress" aria-hidden="true"></div><footer class="reference-player-bottom"><button class="reference-episodes" onclick="episodes()" aria-label="Episode list"><span>${playerIcon('bag')} List · Total ${d.eps} episodes</span>${playerIcon('up')}</button><button class="reference-fullscreen" onclick="togglePlayerFullscreen()" aria-label="全屏播放">${playerIcon('expand')}</button></footer></section>`;
}
function shortEpisodes() {
  shortEpisodeRange = Math.floor((episode - 1) / 30);
  shortEpisodeTab = 'list';
  modal(dramas[dramaId].name, '<div id="short-episode-content"></div>');
  $('#overlay .sheet').classList.add('short-episode-sheet');
  updateShortEpisodes();
}
function updateShortEpisodes() {
  const d = dramas[dramaId];
  $('#short-episode-content').innerHTML = `<p class="short-total">Total ${d.eps} episodes</p><nav class="short-episode-tabs"><button aria-pressed="${shortEpisodeTab === 'list'}" onclick="shortEpisodeTab='list';updateShortEpisodes()">List</button><button aria-pressed="${shortEpisodeTab === 'about'}" onclick="shortEpisodeTab='about';updateShortEpisodes()">brief introduction</button></nav>${shortEpisodeTab === 'about' ? `<p>${esc(d.desc)}</p>` : `<nav class="short-episode-ranges">${Array.from({ length: Math.ceil(d.eps / 30) }, (_, index) => `<button aria-pressed="${index === shortEpisodeRange}" onclick="shortEpisodeRange=${index};updateShortEpisodes()">${index * 30 + 1}-${Math.min(d.eps, (index + 1) * 30)}</button>`).join('')}</nav><div class="episode-grid">${Array.from({ length: Math.min(30, d.eps - shortEpisodeRange * 30) }, (_, index) => {
    const n = shortEpisodeRange * 30 + index + 1;
    const locked = n > 3 && !state.vip && !state.unlocked.includes(dramaId + '-' + n);
    return `<button class="${episode === n ? 'selected' : ''}" aria-label="Episode ${n}" onclick="chooseEpisode(${n})">${n}${locked ? '<span aria-hidden="true">⌑</span>' : ''}</button>`;
  }).join('')}</div><small>前 3 集免费 · 后续解锁为本地模拟</small>`}`;
}
