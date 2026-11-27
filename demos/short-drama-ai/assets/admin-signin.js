const signinLanguages = [['zh-CN', '中文简体'], ['en', '英文'], ['zh-TW', '中文繁体'], ['th', '泰语'], ['es', '西班牙语'], ['ar', '阿拉伯语'], ['vi', '越南语']];
let signinDescriptionDraft = {}, signinDescriptionLanguage = 'zh-CN';

function initAdminSignin() {
  const previous = db.signin || {};
  if (previous.everyday == null) {
    db.signin = {
      id: 'usersign', everyday: previous.first ?? 10, is_inc: 0, inc_num: 0, until_day: 0,
      discounts: [], replenish_num: 20, replenish_limit: previous.days ?? 7, replenish_days: previous.days ?? 7
    };
  }
  const config = db.signin;
  if (config.is_discounts == null) config.is_discounts = config.discounts.length ? 1 : 0;
  if (config.is_replenish == null) config.is_replenish = 1;
  if (!config.descriptions) config.descriptions = {};
  const item = menu.flatMap(group => group[1]).find(entry => entry[0] === 'signin');
  if (item) item[2] = '签到管理';
  document.addEventListener('submit', event => {
    if (event.target.id !== 'signinSettingsForm') return;
    event.preventDefault();
    saveSigninSettings();
  });
  document.addEventListener('change', event => {
    if (!event.target.closest('#signinSettingsForm')) return;
    if (event.target.matches('[data-signin-switch]')) {
      const input = event.target;
      $(`[data-signin-group="${input.name}"]`).hidden = !input.checked;
      input.closest('.signin-toggle').querySelector('[data-switch-label]').textContent = input.checked ? '启用' : '停用';
      if (input.name === 'is_discounts' && input.checked && !document.querySelector('[data-signin-condition]')) addSigninCondition();
    }
    if (event.target.name === 'signinLanguage') {
      signinDescriptionLanguage = event.target.value;
      const description = signinDescriptionDraft[signinDescriptionLanguage] || {};
      $('[data-signin-description-title]').value = description.title || '';
      $('[data-signin-description-body]').value = description.body || '';
    }
  });
  document.addEventListener('input', event => {
    if (!event.target.matches('[data-signin-description-title],[data-signin-description-body]')) return;
    signinDescriptionDraft[signinDescriptionLanguage] = {
      title: $('[data-signin-description-title]').value,
      body: $('[data-signin-description-body]').value
    };
  });
  save();
}

function signinNumber(name, value, unit, label, min = 0) {
  return `<span class="signin-number"><input type="number" name="${name}" value="${esc(value)}" min="${min}" step="1" aria-label="${label}"><span>${unit}</span></span>`;
}

function signinSwitch(name, enabled, label) {
  return `<label class="signin-toggle"><input type="checkbox" role="switch" name="${name}" aria-label="${label}" data-signin-switch ${enabled ? 'checked' : ''}><span class="signin-switch-track" aria-hidden="true"></span><span data-switch-label>${enabled ? '启用' : '停用'}</span></label>`;
}

function signinCondition(tier, index) {
  return `<div class="signin-condition" data-signin-condition><span class="signin-condition-label"><i>*</i> 条件<span data-condition-number>${index + 1}</span></span><span>连续签到</span><span class="signin-number"><input type="number" min="1" step="1" data-condition-day value="${esc(tier.day ?? '')}" aria-label="连续签到天数"><span>天</span></span><span>赠送金币</span><span class="signin-number"><input type="number" min="1" step="1" data-condition-value value="${esc(tier.value ?? '')}" aria-label="连续签到赠送金币"><span>金币</span></span><button type="button" class="signin-remove" data-act="removeSigninCondition">删除</button></div>`;
}

function adminSignin() {
  const config = db.signin, editable = can('marketing.edit');
  signinDescriptionDraft = JSON.parse(JSON.stringify(config.descriptions || {}));
  const description = signinDescriptionDraft[signinDescriptionLanguage] || {};
  return header('签到管理', '') + `<section class="panel signin-settings"><form id="signinSettingsForm" novalidate><fieldset class="signin-fields" ${editable ? '' : 'disabled'}>
    <div class="signin-rule-row"><div class="signin-rule-label"><i>*</i> 日签奖励</div><div class="signin-rule-content signin-inline"><span>每日签到固定金币</span>${signinNumber('everyday', config.everyday, '金币', '每日签到固定金币')}</div></div>
    <div class="signin-rule-row"><div class="signin-rule-label">递增签到</div><div class="signin-rule-content">${signinSwitch('is_inc', config.is_inc, '递增签到')}<div class="signin-inline signin-subrow" data-signin-group="is_inc" ${config.is_inc ? '' : 'hidden'}><span>次日起递增奖励</span>${signinNumber('inc_num', config.inc_num, '金币', '次日起递增奖励', 1)}<span>－</span>${signinNumber('until_day', config.until_day, '天', '递增天数上限', 1)}<span>后不再递增</span></div></div></div>
    <div class="signin-rule-row"><div class="signin-rule-label">连续签到</div><div class="signin-rule-content">${signinSwitch('is_discounts', config.is_discounts, '连续签到')}<div data-signin-group="is_discounts" ${config.is_discounts ? '' : 'hidden'}><div data-signin-conditions>${config.discounts.map(signinCondition).join('')}</div><button type="button" class="signin-add" data-act="addSigninCondition">＋ 添加连续签到天数</button></div></div></div>
    <div class="signin-rule-row"><div class="signin-rule-label">补签设置</div><div class="signin-rule-content">${signinSwitch('is_replenish', config.is_replenish, '补签设置')}<div data-signin-group="is_replenish" ${config.is_replenish ? '' : 'hidden'}><div class="signin-inline signin-subrow"><span>用户在</span>${signinNumber('replenish_limit', config.replenish_limit, '天', '允许补签过去多少天', 1)}<span>内可补签</span>${signinNumber('replenish_days', config.replenish_days, '天', '可补签天数上限', 1)}</div><div class="signin-inline signin-subrow"><span>每次补签消耗金币</span>${signinNumber('replenish_num', config.replenish_num, '金币', '每次补签消耗金币')}</div></div></div></div>
    <div class="signin-rule-row"><div class="signin-rule-label">签到说明</div><div class="signin-rule-content"><div class="signin-language-choices">${signinLanguages.map(([code, name]) => `<label><input type="radio" name="signinLanguage" value="${code}" ${code === signinDescriptionLanguage ? 'checked' : ''}>${name}</label>`).join('')}</div><div class="signin-description-choice"><input type="text" data-signin-description-title value="${esc(description.title || '')}" placeholder="填写签到说明标题" aria-label="签到说明标题"><button type="button" data-act="toggleSigninDescription" aria-expanded="false">编辑签到说明</button></div><div class="signin-description-editor" data-signin-description-editor hidden><textarea rows="4" data-signin-description-body aria-label="签到说明正文" placeholder="填写当前语言的签到说明">${esc(description.body || '')}</textarea></div></div></div>
    </fieldset><div class="error" id="signinSettingsError" role="status"></div>${editable ? '<div class="signin-submit-row"><button type="submit" class="signin-confirm">确定</button></div>' : ''}</form></section>`;
}

function addSigninCondition() {
  if (!requirePerm('marketing.edit')) return;
  const container = $('[data-signin-conditions]');
  const index = container.children.length;
  container.insertAdjacentHTML('beforeend', signinCondition({}, index));
  container.lastElementChild.querySelector('input').focus();
}

function saveSigninSettings() {
  if (!requirePerm('marketing.edit')) return;
  const form = $('#signinSettingsForm');
  if (!form) return;
  try {
    const integer = (name, minimum = 0) => {
      const input = form.elements[name], value = Number(input.value);
      if (!input.value.trim() || !Number.isSafeInteger(value) || value < minimum) throw Error(input.getAttribute('aria-label') + '须填写' + (minimum ? '正整数' : '非负整数'));
      return value;
    };
    const enabled = name => form.elements[name].checked ? 1 : 0;
    const data = { everyday: integer('everyday'), is_inc: enabled('is_inc'), is_discounts: enabled('is_discounts'), is_replenish: enabled('is_replenish'), descriptions: JSON.parse(JSON.stringify(signinDescriptionDraft)) };
    if (data.is_inc) { data.inc_num = integer('inc_num', 1); data.until_day = integer('until_day', 1); }
    if (data.is_replenish) { data.replenish_limit = integer('replenish_limit', 1); data.replenish_days = integer('replenish_days', 1); data.replenish_num = integer('replenish_num'); }
    if (data.is_discounts) {
      data.discounts = [...form.querySelectorAll('[data-signin-condition]')].map(row => {
        const dayInput = row.querySelector('[data-condition-day]'), valueInput = row.querySelector('[data-condition-value]');
        const day = Number(dayInput.value), value = Number(valueInput.value);
        if (!dayInput.value.trim() || !valueInput.value.trim() || !Number.isSafeInteger(day) || day < 1 || !Number.isSafeInteger(value) || value < 1) throw Error('每个连续签到条件须填写有效天数和赠送金币');
        return { day, value };
      });
      if (!data.discounts.length) throw Error('请至少添加一个连续签到条件');
      if (new Set(data.discounts.map(tier => tier.day)).size !== data.discounts.length) throw Error('连续签到条件的天数不能重复');
      data.discounts.sort((a, b) => a.day - b.day);
    }
    update('签到设置', db.signin, data);
    save(); render(); toast('签到设置已保存');
  } catch (error) { $('#signinSettingsError').textContent = error.message; }
}

function adminSigninAction(actionName) {
  if (!['addSigninCondition', 'removeSigninCondition', 'toggleSigninDescription', 'saveSigninSettings'].includes(actionName)) return false;
  if (!requirePerm('marketing.edit')) return true;
  if (actionName === 'addSigninCondition') addSigninCondition();
  if (actionName === 'saveSigninSettings') saveSigninSettings();
  if (actionName === 'removeSigninCondition') {
    // The clicked row is captured by the page's delegated click handler below.
    return true;
  }
  if (actionName === 'toggleSigninDescription') {
    const editor = $('[data-signin-description-editor]');
    editor.hidden = !editor.hidden;
    $('[data-act="toggleSigninDescription"]').setAttribute('aria-expanded', String(!editor.hidden));
    if (!editor.hidden) $('[data-signin-description-body]').focus();
  }
  return true;
}

document.addEventListener('click', event => {
  const button = event.target.closest('#signinSettingsForm [data-act="removeSigninCondition"]');
  if (!button || !can('marketing.edit')) return;
  button.closest('[data-signin-condition]').remove();
  document.querySelectorAll('[data-signin-condition]').forEach((row, index) => row.querySelector('[data-condition-number]').textContent = index + 1);
});
