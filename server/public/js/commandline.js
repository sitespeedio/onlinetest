(function () {
  var list = document.getElementById('cliList');
  var search = document.getElementById('cli-search');
  var status = document.getElementById('cliResultCount');
  var textarea = document.getElementById('commandlinearea');
  if (!list || !search || !textarea) return;

  var allItems = null;
  var loadPromise = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function rowHtml(opt) {
    var aliases = opt.flags.filter(function (f) { return f !== opt.primary; });
    var tags = (opt.tags || []).map(function (t) { return '<span class="cli-tag">' + esc(t) + '</span>'; }).join('');
    return '<li>'
      + '<button type="button" class="cli-row" data-flag="' + esc(opt.primary) + '">'
      + '<code class="cli-flag">' + esc(opt.primary) + '</code>'
      + (aliases.length ? '<span class="cli-aliases">' + esc(aliases.join(', ')) + '</span>' : '')
      + '<span class="cli-desc">' + esc(opt.desc || '') + '</span>'
      + (tags ? '<span class="cli-tags">' + tags + '</span>' : '')
      + '</button>'
      + '</li>';
  }

  function render(items) {
    list.innerHTML = items.length
      ? items.map(rowHtml).join('')
      : '<li class="cli-empty">No options match.</li>';
    if (status) status.textContent = items.length + ' option' + (items.length === 1 ? '' : 's');
  }

  function filter(q) {
    if (!allItems) return;
    q = q.trim().toLowerCase();
    if (!q) { render(allItems); return; }
    render(allItems.filter(function (o) {
      if (o.primary.toLowerCase().indexOf(q) > -1) return true;
      if (o.flags.some(function (f) { return f.toLowerCase().indexOf(q) > -1; })) return true;
      if ((o.desc || '').toLowerCase().indexOf(q) > -1) return true;
      return false;
    }));
  }

  function insertFlag(flag) {
    var pos = textarea.selectionStart;
    var before = textarea.value.slice(0, pos);
    var after = textarea.value.slice(textarea.selectionEnd);
    var pad = (before.length && !/[\s]$/.test(before)) ? ' ' : '';
    var insert = pad + flag + ' ';
    textarea.value = before + insert + after;
    var caret = pos + insert.length;
    textarea.setSelectionRange(caret, caret);
    textarea.focus();
  }

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-flag]');
    if (btn) insertFlag(btn.dataset.flag);
  });

  search.addEventListener('input', function (e) { filter(e.target.value); });

  window.__loadCliHelp = function () {
    if (loadPromise) return loadPromise;
    list.innerHTML = '<li class="cli-empty">Loading options…</li>';
    loadPromise = fetch('/sitespeed-help.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { allItems = data; render(data); })
      .catch(function () {
        list.innerHTML = '<li class="cli-empty">Could not load CLI help.</li>';
      });
    return loadPromise;
  };
})();
