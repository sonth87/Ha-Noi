/* light theme: the glow filters pass the drawing through unblurred, bloom draws nothing */
(function () {
  var root = document.documentElement, mq = matchMedia('(prefers-color-scheme: light)'), orig = {};
  function apply() {
    var t = root.dataset.theme, light = t === 'light' || (t !== 'dark' && mq.matches);
    ['glow', 'soft', 'bloom'].forEach(function (id) {
      var f = document.getElementById(id); if (!f) return;
      if (!(id in orig)) orig[id] = f.innerHTML;
      f.innerHTML = !light ? orig[id] : id === 'bloom' ? '<feFlood flood-opacity="0"/>' : '<feMerge><feMergeNode in="SourceGraphic"/></feMerge>';
    });
  }
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (mq.addEventListener) mq.addEventListener('change', apply);
  apply();
})();
