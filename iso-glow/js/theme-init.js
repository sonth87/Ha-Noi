/* demo theme: dark unless the visitor picked light */(function () { var t; try { t = localStorage.getItem('iso-glow-demo-theme'); } catch (e) {}
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark'; })();
