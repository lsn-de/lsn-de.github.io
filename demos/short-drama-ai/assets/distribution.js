const distributorPlans = [
  { id: 'long', name: '111', days: 4380, direct: 30, indirect: 20, price: 22 },
  { id: 'annual', name: '11', days: 365, direct: 10, indirect: 20, price: 20 }
];
const distributorRules = [
  '申请为分销商之后可进行业务推广，推广的佣金根据自己的分销商等级进行分润。',
  '升级为分销商之后，若想升级需重新全价购买。',
  '如果开通的分销商为非永久时，再次开通同级别的分销商则进行时间的累加。',
  '如果开通的分销商等级和当前不一致时，则会重置等级和时间。',
  '虚拟商品一经充值，不予退款。'
];
function distributorIcon(name) {
  const paths = {
    merchant: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    earnings: '<rect x="2" y="4" width="20" height="17" rx="2"/><path d="M2 9h20m-6 7-1 2m5-2-1 2"/>',
    invite: '<circle cx="10" cy="6" r="4"/><path d="M2 21v-2a8 8 0 0 1 13-6m0 5h7m-3-3 3 3-3 3"/>'
  };
  return paths[name] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>` : I('users');
}
function distributionHub() {
  return `<section class="distribution-hub" aria-label="分销" data-od-id="distribution-hub"><div class="distribution-hub-head"><h2>分销</h2></div><nav class="distribution-hub-links" aria-label="分销功能">${[['distribution','分销商','merchant'],['team','团队','team'],['earnings','收益','earnings'],['invite','邀请','invite']].map(([route,label,icon])=>`<button onclick="${route==='invite'?'openDistributorInvite()':`go('${route}')`}" data-od-id="distribution-entry-${route}">${distributorIcon(icon)}<span>${label}</span></button>`).join('')}</nav></section>`;
}
function distributorStats() {
  return `<div class="distributor-stats">${[['0','分销收益'],['0','直推人数'],['0','间推人数']].map(([value,label])=>`<div><b>${value}</b><span>${label}</span></div>`).join('')}</div>`;
}
function distributorRuleList() {
  return `<ol>${distributorRules.map(rule=>`<li>${rule}</li>`).join('')}</ol>`;
}
function distributorPage() {
  const membership = state.distributor;
  const active = membership && membership.validUntil > Date.now();
  return `<div class="distributor-page" data-od-id="distributor-page"><section class="distributor-hero"><header class="distributor-topbar"><button class="iconbtn" onclick="back()" aria-label="返回">${I('back')}</button><i aria-hidden="true"></i><button class="iconbtn" onclick="tab('home')" aria-label="返回首页">${I('home')}</button></header><div class="distributor-hero-copy"><p>开通分销商，获得利润分成</p><h1>邀请好友一起赚钱</h1><span>直接奖励+间接奖励</span></div><img class="distributor-art" src="assets/distribution-hero.jpg" alt="红包、金币与奖励宝箱"></section><div class="distributor-content"><section class="distributor-steps" aria-label="分销流程">${[['邀请好友','好友绑定直接获取奖励'],['升级成为分销商','追剧做任务进行升级'],['佣金奖励','获取好友奖励的额外分佣']].map(([title,desc],index)=>`<div class="distributor-step"><b>${index+1}</b><h2>${title}</h2><p>${desc}</p></div>`).join('')}</section>${active?`<div class="distributor-membership"><span>当前分销商 <b>${esc(membership.name)}</b></span><small>有效期至 ${new Date(membership.validUntil).toLocaleDateString('zh-CN')}</small></div>`:''}<section class="distributor-plans" aria-label="分销商套餐">${distributorPlans.map(plan=>`<button class="distributor-plan" onclick="selectDistributorPlan('${plan.id}')" aria-label="开通分销商 ${plan.name}，${plan.days}天，${plan.price} CNY" data-od-id="distributor-plan-${plan.id}"><div class="distributor-plan-copy"><h2>${plan.name}</h2><p>直接分润 <strong>${plan.direct}%</strong></p><p>间接分润 <strong>${plan.indirect}%</strong></p></div><span class="distributor-duration">${plan.days}天</span><span class="distributor-price"><b>${plan.price}</b> CNY</span><span class="distributor-plan-mark" aria-hidden="true">${I('play')}</span></button>`).join('')}</section>${distributorStats()}<section class="distributor-rules" aria-label="活动规则"><h2>活动规则</h2>${distributorRuleList()}</section></div></div>`;
}
function selectDistributorPlan(id) {
  const plan = distributorPlans.find(item=>item.id===id);
  if (!plan) return;
  const same = state.distributor?.id===id && state.distributor.validUntil>Date.now();
  modal('开通分销商', `<div class="distributor-confirm"><h3>分销商 ${plan.name}</h3><p>${plan.days}天 · 直接分润 ${plan.direct}% · 间接分润 ${plan.indirect}%</p><div class="row"><span>套餐金额</span><b>${plan.price} CNY</b></div><p>${same?'本次开通后，有效期将在当前有效期上累加。':'本次开通后，将按所选套餐设置等级和有效期。'}</p><p>本地原型演示，本次操作仅模拟开通，无实际扣款。</p><button class="primary wide" onclick="confirmDistributorPlan('${plan.id}')">确认模拟开通</button><button class="secondary wide" onclick="closeModal()">取消</button></div>`);
}
function confirmDistributorPlan(id) {
  const plan = distributorPlans.find(item=>item.id===id);
  if (!plan || !document.querySelector('#overlay .distributor-confirm')) return;
  const now = Date.now();
  const base = state.distributor?.id===id ? Math.max(now,state.distributor.validUntil||0) : now;
  state.distributor = {...plan, validUntil:base+plan.days*86400000};
  save();closeModal();render();toast('模拟开通成功');
}
function distributorTeam() {
  return `<div class="distributor-report distributor-team-page">${distributorReportHeader('我的团队')}<div class="distributor-report-content"><section class="distributor-team-card" aria-label="团队人数"><div class="distributor-team-total"><h3>总人数</h3><b>0</b><span aria-hidden="true">${I('users')}</span></div><div class="distributor-team-counts">${['直推人数','间推人数'].map(label=>`<div><b>0</b><span>${label}</span></div>`).join('')}</div></section><section class="distributor-records" aria-label="团队记录"><h2>记录</h2><div class="distributor-team-records" data-od-id="team-records"></div></section></div></div>`;
}
function distributorReportHeader(title) {
  return `<header class="distributor-topbar distributor-report-header"><button class="iconbtn" onclick="back()" aria-label="返回">${I('back')}</button><i aria-hidden="true"></i><button class="iconbtn" onclick="tab('home')" aria-label="返回首页">${I('home')}</button><h2>${title}</h2></header>`;
}
function distributorEarnings() {
  return `<div class="distributor-report distributor-earnings-page">${distributorReportHeader('佣金明细')}<div class="distributor-report-content"><p class="distributor-commission-notice">您的直推、间推粉丝有订单入账时，您可以获得佣金奖励！</p><section class="distributor-commission-card" aria-label="佣金统计"><div class="distributor-commission-available"><h3>可提现</h3><b>0.00</b><span class="distributor-commission-mark" aria-hidden="true">${I('play')}</span></div><div class="distributor-commission-counts">${['总收入','直接收入','间接收入'].map(label=>`<div><b>0</b><span>${label}</span></div>`).join('')}</div></section><section class="distributor-records" aria-label="佣金记录"><h2>记录</h2><div class="distributor-commission-empty" role="status"><img src="assets/distribution-empty.png" alt="" width="110" height="114"><p>没有数据哦~</p></div></section></div></div>`;
}
function openDistributorInvite() {
  clearTimeout(toastTimer);$('#toast-host').innerHTML='';
  const posterIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="2" width="18" height="20" rx="3"/><circle cx="15" cy="8" r="2"/><path d="m5 19 5-8 4 6 2-3 3 5Z"/></svg>';
  const linkIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19 11-7 7a5 5 0 0 1-7-7l8-8a3 3 0 0 1 4 4l-8 8a1 1 0 0 1-2-2l7-7"/></svg>';
  modal('邀请好友', `<div class="distributor-share-actions"><button onclick="generateDistributorPoster()" data-od-id="generate-invite-poster"><span>${posterIcon}</span><b>生成海报</b></button><button onclick="copyDistributorLink()" data-od-id="copy-invite-link"><span>${linkIcon}</span><b>复制链接</b></button></div><button class="distributor-share-cancel" onclick="closeModal()">取消</button>`);
  const dialog=document.querySelector('#overlay .sheet');
  dialog.classList.add('distributor-share-sheet');dialog.parentElement.classList.add('distributor-share-layer');
  dialog.querySelector('[data-od-id="generate-invite-poster"]').focus({preventScroll:true});
}
function distributorInviteLink() {
  const link=new URL(location.href);link.search='';link.searchParams.set('invite','HG8K26');link.hash='login';return link.href;
}
async function copyDistributorLink() {
  const link=distributorInviteLink();
  try {
    try { await navigator.clipboard.writeText(link); }
    catch {
      const input=document.createElement('textarea');input.value=link;input.style.cssText='position:fixed;opacity:0;pointer-events:none';
      (document.querySelector('#overlay .sheet')||document.body).append(input);input.focus();input.select();
      let copied=false;try { copied=document.execCommand('copy'); } finally { input.remove(); }
      if(!copied)throw Error('Clipboard unavailable');
    }
    closeModal();toast('已复制');
  } catch {
    modal('复制邀请链接', `<p>请长按下方链接进行复制</p><textarea class="distributor-copy-fallback" readonly aria-label="邀请链接">${esc(link)}</textarea><button class="primary wide" onclick="closeModal()">完成</button>`);
    document.querySelector('.distributor-copy-fallback').select();
  }
}
let distributorPosterCache=null;
async function createDistributorPoster() {
  if(distributorPosterCache)return distributorPosterCache;
  const image=new Image();
  const source=new URL('assets/distribution-invite-poster.jpg?v=20261106-static',document.baseURI).href;
  await new Promise((resolve,reject)=>{
    image.onload=resolve;
    image.onerror=()=>reject(Error('邀请海报图片加载失败'));
    image.src=source;
  });
  distributorPosterCache=source;return source;
}
async function generateDistributorPoster() {
  const source=document.querySelector('#overlay .distributor-share-sheet');if(!source)return;
  const button=source.querySelector('[data-od-id="generate-invite-poster"]');if(button.disabled)return;
  button.disabled=true;button.querySelector('b').textContent='生成中…';
  try {
    const image=await createDistributorPoster();if(!source.isConnected)return;
    modal('邀请海报', `<img class="distributor-poster-image" src="${image}" alt="红果娱乐邀请海报，含邀请码HG8K26和示意二维码"><div class="distributor-poster-controls"><button onclick="closeModal()">取消</button><button onclick="saveDistributorPoster()">长按图片保存</button></div>`);
    const dialog=document.querySelector('#overlay .sheet');dialog.classList.add('distributor-poster-sheet');dialog.parentElement.classList.add('distributor-poster-layer');
    dialog.querySelector('.distributor-poster-controls button').focus({preventScroll:true});
  } catch {
    if(source.isConnected){button.disabled=false;button.querySelector('b').textContent='生成海报';toast('海报生成失败，请重试')}
  }
}
function saveDistributorPoster() {
  const image=document.querySelector('.distributor-poster-image');if(!image)return;
  const link=document.createElement('a');link.href=image.src;link.download='红果娱乐-邀请海报.png';document.body.append(link);link.click();link.remove();
}
