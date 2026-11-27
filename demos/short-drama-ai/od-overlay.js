// 作品集预览用的外部叠加层：左侧导航序号 + 前后台切换按钮（挂在侧边栏底部）
// 只作用于 public/demos/short-drama-ai/ 下的副本，不修改原项目
(function () {
  var isAdmin = /admin\.html$/i.test(location.pathname);
  var font =
    '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
  var buttonStyle =
    'display:flex;align-items:center;justify-content:center;gap:6px;' +
    'margin-top:14px;padding:10px 12px;border-radius:10px;background:#151517;' +
    'color:#fff;font:600 12px/1 ' + font + ';text-decoration:none;text-align:center;' +
    'box-shadow:0 6px 18px rgba(0,0,0,.18);transition:opacity .15s';
  var link = document.createElement('a');
  link.rel = 'noopener';
  link.style.cssText = buttonStyle;
  link.onmouseenter = function () { link.style.opacity = '0.86'; };
  link.onmouseleave = function () { link.style.opacity = '1'; };

  if (isAdmin) {
    // 后台：放在左侧业务导航底部
    link.href = 'index.html';
    link.textContent = '← 返回前台 App';
    link.title = '切换到前台 App 原型';
    var scope = document.querySelector('aside .scope');
    var host = scope ? scope.parentNode : document.querySelector('aside');
    if (host) {
      if (scope) scope.parentNode.insertBefore(link, scope.nextSibling);
      else host.appendChild(link);
    } else {
      link.style.position = 'fixed';
      link.style.right = '18px';
      link.style.bottom = '18px';
      link.style.zIndex = '2147483001';
      document.body.appendChild(link);
    }
    return;
  }

  // 前台：给左侧导航加序号（页面切换会重建导航，用 MutationObserver 保持）
  var style = document.createElement('style');
  style.textContent =
    '#desktop-nav button .od-num{font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'letter-spacing:.04em;color:#9a938b;min-width:18px;margin-right:2px;transition:color .15s}' +
    '#desktop-nav button.active .od-num{color:#ff5526}';
  document.head.appendChild(style);

  var nav = document.getElementById('desktop-nav');
  function numberNav() {
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('button'), function (btn, index) {
      if (btn.querySelector('.od-num')) return;
      var num = document.createElement('span');
      num.className = 'od-num';
      num.textContent = ('0' + (index + 1)).slice(-2);
      btn.insertBefore(num, btn.firstChild);
    });
  }
  if (nav) {
    numberNav();
    new MutationObserver(numberNav).observe(nav, { childList: true, subtree: true });
  }

  // 前台：把侧边栏底部原有的「运营管理后台」链接改成醒目按钮
  link.href = 'admin.html';
  link.textContent = '进入运营后台 →';
  link.title = '切换到运营后台原型';
  var nativeLink = document.querySelector('.rail .rail-foot a[href="admin.html"]');
  if (nativeLink) {
    nativeLink.textContent = '进入运营后台 →';
    nativeLink.style.cssText = buttonStyle;
    nativeLink.onmouseenter = function () { nativeLink.style.opacity = '0.86'; };
    nativeLink.onmouseleave = function () { nativeLink.style.opacity = '1'; };
  } else {
    var foot = document.querySelector('.rail .rail-foot') || document.querySelector('.rail');
    if (foot) foot.appendChild(link);
    else {
      link.style.position = 'fixed';
      link.style.right = '18px';
      link.style.bottom = '18px';
      link.style.zIndex = '2147483001';
      document.body.appendChild(link);
    }
  }
})();
