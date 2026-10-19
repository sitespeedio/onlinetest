// Tiny on-demand loader for the Ace editor (~600 KB of JS).
// Triggered only when the user opens the Scripting tab.
window.__loadAceEditor = (function () {
  var loaded = false, loading = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return function () {
    if (loaded) return Promise.resolve();
    if (loading) return loading;
    loading = loadScript('/js/ace-1.33.1/ace.js')
      .then(function () {
        ace.config.set('basePath', '/js/ace-1.33.1/');
        return Promise.all([
          loadScript('/js/ace-1.33.1/theme/theme-github.js'),
          loadScript('/js/ace-1.33.1/ext-language_tools.js'),
          loadScript('/js/ace-1.33.1/mode-javascript.js')
        ]);
      })
      .then(function () {
        loaded = true;
        if (typeof window.__initAceEditor === 'function') window.__initAceEditor();
      });
    return loading;
  };
})();
