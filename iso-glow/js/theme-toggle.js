/* light / dark: one choice for the whole demo, applied to every live figure without reloading */
(() => {
  const root = document.documentElement, btn = document.querySelector('.dh-theme');
  if (!btn || root.classList.contains('embed')) return;
  const label = () => btn.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to dark' : 'Switch to light');
  label();
  btn.addEventListener('click', () => {
    const t = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = t; label();
    try { localStorage.setItem('iso-glow-demo-theme', t); } catch (e) {}
    document.querySelectorAll('iframe').forEach(f => {
      try {
        const d = f.contentDocument; if (!d || !d.documentElement) return;
        const own = d.getElementById('theme');
        if (own && d.querySelector('canvas')) { if ((d.documentElement.dataset.theme || 'dark') !== t) own.click(); }
        else d.documentElement.dataset.theme = t;
      } catch (e) {}
    });
  });
})();
