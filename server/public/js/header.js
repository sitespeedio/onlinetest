document.addEventListener('DOMContentLoaded', () => {
  // Mark the current nav link with aria-current="page"
  const here = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.navbar-menu .navbar-start a.navbar-item').forEach((a) => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === here) a.setAttribute('aria-current', 'page');
  });

  const navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
  navbarBurgers.forEach( el => {
    el.addEventListener('click', () => {

      const target = el.dataset.target;
      const targetE = document.getElementById(target);

      el.classList.toggle('is-active');
      targetE.classList.toggle('is-active');

    });
  });

  // Keyboard shortcuts:
  //  /         — focus primary input (URL or search)
  //  ⌘/Ctrl+↵  — submit current form
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !inField) {
      const target = document.getElementById('url') || document.getElementById('search');
      if (target) { e.preventDefault(); target.focus(); }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const form = document.getElementById('analyze-form') || document.getElementById('search-form');
      if (form) { e.preventDefault(); form.submit(); }
    }
  });
});
