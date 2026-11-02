function toggleSearchHelp() {
  var el = document.getElementById('searchHelp');
  if (el.style.display === 'none') {
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}
function addToSearch(text) {
  var search = document.getElementById('search');
  if (search) {
    if (search.value==='') {
      search.value = text;
    } else {
      search.value += ' ' + text;
    }
  }
}
function clearSearch() {
  var search = document.getElementById('search');
  if (search) {
    search.value = '';
  }
}
var __previousFocus = null;
var __modalKeyHandler = null;

function trapModalKeys(modal) {
  var focusables = modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  __modalKeyHandler = function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeRerunModal(); return; }
    if (e.key !== 'Tab' || focusables.length === 0) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', __modalKeyHandler);
}

function reRunTest(id, url, label) {
  const modal = document.getElementById("rerunModal");
  const testIdInput = document.getElementById("rerunTestId");
  const rerunTestUrl = document.getElementById("rerunTestUrl");
  const rerunTestLabel = document.getElementById("rerunTestLabel");
  testIdInput.value = id;
  rerunTestUrl.value = url;
  rerunTestUrl.disabled = !url.startsWith('http');
  rerunTestLabel.value = label;
  __previousFocus = document.activeElement;
  modal.classList.add("is-active");
  modal.removeAttribute('inert');
  modal.setAttribute('aria-hidden', 'false');

  // Move focus into the dialog
  setTimeout(function () {
    var firstField = rerunTestUrl.disabled ? rerunTestLabel : rerunTestUrl;
    firstField.focus();
  }, 0);

  trapModalKeys(modal);

  document.getElementById("cancelRerun").onclick = closeRerunModal;
  document.getElementById("modalClose").onclick = closeRerunModal;
  document.getElementById("confirmRerun").onclick = function (e) {
    e.preventDefault();
    document.getElementById("rerunForm").submit();
  };
  document.getElementById("updateLabel").onclick = function (e) {
    e.preventDefault();
    document.getElementById("rerunForm").action = '/update';
    document.getElementById("rerunForm").submit();
  };
}

function closeRerunModal() {
  const modal = document.getElementById("rerunModal");
  modal.classList.remove("is-active");
  modal.setAttribute('aria-hidden', 'true');
  if (__modalKeyHandler) {
    document.removeEventListener('keydown', __modalKeyHandler);
    __modalKeyHandler = null;
  }
  if (__previousFocus && typeof __previousFocus.focus === 'function') {
    __previousFocus.focus();
  }
}

// Compare-button gating: starts disabled, requires exactly two checked
// boxes, refuses a third. Lifted out of DOMContentLoaded so the
// auto-refresh path (below) can re-run it after swapping the results
// table back in — the captured `enabled` array would otherwise point
// at stale DOM nodes after the swap.
var SELECT_FIRST = document.currentScript.dataset.selectFirst;
var SELECT_ONE_MORE = document.currentScript.dataset.selectOneMore;

function initCompare() {
  var form = document.getElementById('search-form-compare');
  var btn = document.getElementById('compareButton');
  var msg = document.getElementById('compareMessage');
  if (!form || !btn) return;
  var enabled = Array.prototype.slice.call(
    form.querySelectorAll('input[type="checkbox"][name="har"]:not([disabled])')
  );
  if (enabled.length === 0) return;
  function checkedCount() {
    return enabled.filter(function (b) { return b.checked; }).length;
  }
  function update() {
    var count = checkedCount();
    btn.setAttribute('aria-disabled', count === 2 ? 'false' : 'true');
    if (count >= 2) {
      enabled.forEach(function (b) { if (!b.checked) b.disabled = true; });
    } else {
      enabled.forEach(function (b) { b.disabled = false; });
    }
    if (msg && count !== 0) { msg.textContent = ''; }
  }
  // Property-assignment so re-running initCompare doesn't stack
  // duplicate handlers on a button that survived a DOM swap. (After
  // a swap the button is a fresh node anyway, but this keeps the
  // initial-load case safe too.)
  btn.onclick = function (e) {
    var count = checkedCount();
    if (count === 2) { form.submit(); return; }
    e.preventDefault();
    if (msg) { msg.textContent = count === 1 ? SELECT_ONE_MORE : SELECT_FIRST; }
  };
  enabled.forEach(function (b) { b.addEventListener('change', update); });
  update();
}

// Auto-refresh of the search results region. Off by default; user
// opts in via the toggle in the search button row. State is held in
// localStorage so a power user only has to set it once. The poll
// skips while the user has any checkbox ticked — replacing the
// results table would silently uncheck them and break the Compare
// flow.
var SEARCH_REFRESH_INTERVAL_MS = 60000;
var SEARCH_REFRESH_STORAGE_KEY = 'onlinetest.search.autorefresh';

function searchAutoRefreshEnabled() {
  try {
    return localStorage.getItem(SEARCH_REFRESH_STORAGE_KEY) === '1';
  } catch (_e) { return false; }
}
function setSearchAutoRefresh(enabled) {
  try {
    if (enabled) localStorage.setItem(SEARCH_REFRESH_STORAGE_KEY, '1');
    else localStorage.removeItem(SEARCH_REFRESH_STORAGE_KEY);
  } catch (_e) { /* private mode etc — silently ignore */ }
}

function initSearchAutoRefresh() {
  var toggle = document.getElementById('search-autorefresh-toggle');
  var status = document.getElementById('search-autorefresh-status');
  var region = document.getElementById('search-results-region');
  if (!toggle || !status || !region) return;

  var lastUpdatedAt = Date.now();
  var refreshing = false;
  var intervalId = null;

  function hasSelectionInRegion() {
    return region.querySelectorAll(
      'input[type="checkbox"][name="har"]:checked'
    ).length > 0;
  }

  function renderStatus() {
    if (!toggle.checked) { status.textContent = 'Off'; return; }
    if (refreshing) { status.textContent = 'Updating…'; return; }
    if (hasSelectionInRegion()) {
      status.textContent = 'Paused — clear selection to resume';
      return;
    }
    var secs = Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000));
    status.textContent = 'On — updated ' + secs + 's ago';
  }

  async function refresh() {
    if (!toggle.checked || refreshing || document.hidden) return;
    if (hasSelectionInRegion()) { renderStatus(); return; }
    refreshing = true;
    renderStatus();
    try {
      var res = await fetch(window.location.href, {
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });
      if (!res.ok) return;
      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.getElementById('search-results-region');
      if (fresh) {
        region.innerHTML = fresh.innerHTML;
        // The compare-button gating closes over the checkboxes that
        // existed at init time; after a DOM swap those are gone, so
        // re-bind against the new ones.
        initCompare();
      }
      lastUpdatedAt = Date.now();
    } catch (_e) {
      // Network blip — leave the page as-is, try next tick.
    } finally {
      refreshing = false;
      renderStatus();
    }
  }

  function applyToggleState() {
    if (toggle.checked) {
      if (!intervalId) intervalId = setInterval(refresh, SEARCH_REFRESH_INTERVAL_MS);
    } else if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    renderStatus();
  }

  toggle.checked = searchAutoRefreshEnabled();
  toggle.addEventListener('change', function () {
    setSearchAutoRefresh(toggle.checked);
    applyToggleState();
  });
  // Update the "Updated Ns ago" label once a second between fetches.
  setInterval(renderStatus, 1000);
  // Recompute status when a checkbox toggles — flips between
  // "Paused…" and "On — updated …".
  document.addEventListener('change', function (e) {
    if (
      e.target &&
      e.target.matches &&
      e.target.matches('input[type="checkbox"][name="har"]')
    ) {
      renderStatus();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });
  applyToggleState();
}

document.addEventListener('DOMContentLoaded', function () {
  // Wire up the row-level action links via data attributes so user-
  // supplied values (label, url, slug, id) never get string-concatenated
  // into inline onclick= JS.
  document.addEventListener('click', function (e) {
    var addEl = e.target.closest('[data-add]');
    if (addEl) { addToSearch(addEl.getAttribute('data-add')); return; }
    var actionEl = e.target.closest('[data-search-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-search-action');
      if (action === 'toggle-help') toggleSearchHelp();
      else if (action === 'clear') clearSearch();
      else if (action === 'close-rerun') closeRerunModal();
      return;
    }
    var pageEl = e.target.closest('[data-page]');
    if (pageEl) {
      document.getElementById('page').value = pageEl.getAttribute('data-page');
      document.getElementById('search-form').submit();
      return;
    }
    var rerunEl = e.target.closest('[data-rerun-id]');
    if (rerunEl) {
      reRunTest(
        rerunEl.getAttribute('data-rerun-id'),
        rerunEl.getAttribute('data-rerun-url') || '',
        rerunEl.getAttribute('data-rerun-label') || ''
      );
    }
  });

  initCompare();
  initSearchAutoRefresh();
});
