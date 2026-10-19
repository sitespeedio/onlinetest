function openTab(evt, tabName) {
  var i, x, tablinks;
  x = document.getElementsByClassName("content-tab");
  for (i = 0; i < x.length; i++) {
      x[i].style.display = "none";
      x[i].setAttribute('hidden', '');
  }
  tablinks = document.getElementsByClassName("tab");
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" is-active", "");
      tablinks[i].setAttribute('aria-selected', 'false');
      tablinks[i].setAttribute('tabindex', '-1');
  }
  var panel = document.getElementById(tabName);
  panel.style.display = "block";
  panel.removeAttribute('hidden');
  if (evt && evt.currentTarget) {
    evt.currentTarget.className += " is-active";
    evt.currentTarget.setAttribute('aria-selected', 'true');
    evt.currentTarget.setAttribute('tabindex', '0');
  }
  if (tabName === 'scripting' && typeof window.__loadAceEditor === 'function') {
    window.__loadAceEditor();
  }
  if (tabName === 'commandline' && typeof window.__loadCliHelp === 'function') {
    window.__loadCliHelp();
  }
  // The URL field is required for the URL flow but irrelevant on the Scripting tab,
  // where the script provides its own measure.start(url). Toggle `required` so the
  // browser doesn't block submission when the user is testing a script.
  var urlField = document.getElementById('url');
  if (urlField) {
    if (tabName === 'scripting') urlField.removeAttribute('required');
    else urlField.setAttribute('required', '');
  }
}
// Roving tabindex + arrow-key nav for the tablist
document.addEventListener('DOMContentLoaded', function () {
  var list = document.querySelector('[role="tablist"]');
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  tabs.forEach(function (tab, idx) {
    tab.addEventListener('click', function (e) {
      openTab(e, tab.dataset.openTab);
    });
    tab.addEventListener('keydown', function (e) {
      var key = e.key, target = null;
      if (key === 'ArrowRight' || key === 'ArrowDown') target = tabs[(idx + 1) % tabs.length];
      else if (key === 'ArrowLeft' || key === 'ArrowUp') target = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (key === 'Home') target = tabs[0];
      else if (key === 'End') target = tabs[tabs.length - 1];
      if (target) {
        e.preventDefault();
        target.focus();
        target.click();
      }
    });
  });
});
