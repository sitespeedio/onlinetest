document.addEventListener('click', function (e) {
  var button = e.target.closest('[data-empty-queue]');
  if (button) confirmAndSubmit(button.getAttribute('data-empty-queue'));
});

function confirmAndSubmit(queue) {
  if (confirm(`Are you sure you want to empty the queue: ${queue}?`)) {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/admin/';

    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'queueName';
    input.value = queue;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
  }
}

// Auto-refresh: poll the admin page and swap <main> innerHTML.
// Pauses when the tab isn't visible (Page Visibility API) so we
// don't keep hammering the server in background tabs. The "Updated
// …s ago" indicator ticks every second between fetches.
//
// Visual feedback layered on top:
//   * data-rollup numbers are animated from their pre-swap value
//     to their post-swap value so the eye picks up "+1 pending"
//     instead of the number just teleporting.
//   * The refresh indicator pulses on each fetch start.
//   * body[data-stage="initial"] gates the bar-chart entrance so
//     it plays once on first paint, not on every refresh.
(function () {
  var REFRESH_INTERVAL_MS = 15000;
  var ROLLUP_MS = 420;
  var lastUpdatedAt = Date.now();
  var refreshing = false;

  function setIndicator(text) {
    var el = document.getElementById('refresh-indicator');
    if (el) el.textContent = text;
  }

  function tickIndicator() {
    var seconds = Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000));
    // Pad single digits with a non-breaking space so the rendered
    // string is the same column-count every tick — otherwise the
    // 9→10 and 14→0 transitions visibly shift the text inside the
    // indicator. The "Updating…" mid-fetch state is gone for the
    // same reason; the color pulse on the indicator already
    // signals "fetch in flight", and switching the text to a
    // different-length string just made the wobble worse.
    var secStr = seconds < 10 ? '\u00A0' + seconds : String(seconds);
    setIndicator('Updated ' + secStr + 's ago');
  }

  function captureRollups() {
    var map = {};
    var nodes = document.querySelectorAll('[data-rollup]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-rollup');
      var n = parseInt(nodes[i].textContent, 10);
      map[key] = isNaN(n) ? 0 : n;
    }
    return map;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animateNumber(el, from, to) {
    if (prefersReducedMotion()) {
      el.textContent = to;
      return;
    }
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / ROLLUP_MS);
      // easeOutCubic — quick start, gentle landing.
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function applyRollups(prevMap) {
    var nodes = document.querySelectorAll('[data-rollup]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-rollup');
      var to = parseInt(el.textContent, 10);
      if (isNaN(to)) continue;
      var from = prevMap[key];
      if (from === undefined || from === to) continue;
      animateNumber(el, from, to);
    }
  }

  function pulseIndicator() {
    var el = document.getElementById('refresh-indicator');
    if (!el) return;
    el.classList.remove('is-refreshing');
    // Force a reflow so the animation restarts even if the class
    // was just toggled off and on within the same tick.
    void el.offsetWidth;
    el.classList.add('is-refreshing');
  }

  async function refresh() {
    if (document.hidden || refreshing) return;
    refreshing = true;
    pulseIndicator();
    tickIndicator();
    try {
      var res = await fetch('/admin/', {
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });
      if (!res.ok) return;
      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.querySelector('main#main');
      var current = document.querySelector('main#main');
      if (fresh && current) {
        // Preserve focus on the active element if it lives inside
        // <main> and has a stable identifier (id), so retry/empty
        // buttons don't "jump out" mid-tab.
        var active = document.activeElement;
        var activeId = active && active.id ? active.id : null;
        var prevRollups = captureRollups();
        current.innerHTML = fresh.innerHTML;
        applyRollups(prevRollups);
        if (activeId) {
          var restored = document.getElementById(activeId);
          if (restored && typeof restored.focus === 'function') {
            restored.focus();
          }
        }
      }
      lastUpdatedAt = Date.now();
    } catch (_e) {
      // Network blip — leave the page as-is and try again next tick.
    } finally {
      refreshing = false;
      tickIndicator();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    tickIndicator();
    setInterval(tickIndicator, 1000);
    setInterval(refresh, REFRESH_INTERVAL_MS);
    // Let the staggered bar-chart entrance finish, then drop the
    // gate so subsequent refreshes don't replay it.
    setTimeout(function () {
      document.body.removeAttribute('data-stage');
    }, 1200);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });
})();
