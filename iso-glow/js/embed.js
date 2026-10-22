/* iso-glow embed mode */(function () {
  var r = document.documentElement;
  if (!new URLSearchParams(location.search).has('embed')) return;
  r.classList.add('embed');
  var q = new URLSearchParams(location.search), t = q.get('theme');
  if (t === 'light' || t === 'dark') r.dataset.theme = t;
  if (q.has('full')) r.classList.add('full');
  addEventListener('keydown', function (e) { if (e.key === 'PageUp' || e.key === 'PageDown') e.stopImmediatePropagation(); }, true);
})();
