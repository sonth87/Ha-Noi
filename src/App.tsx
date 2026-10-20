/* Root: theme, glow filters, shell, and the active scene (chosen by #hash, like the iso-glow gallery). */
import { useEffect, useState } from 'react';
import { GlowDefs } from '@iso/GlowDefs';
import { ThemeProvider } from '@iso/ThemeProvider';
import { SCENES } from '@scenes/registry';
import { SceneView } from '@scenes/SceneView';
import { Shell } from '@ui/Shell';
import { Sidebar } from '@ui/Sidebar';

const indexFromHash = () => Math.max(0, SCENES.findIndex(s => s.id === location.hash.slice(1)));

export function App() {
  const [index, setIndex] = useState(indexFromHash);
  const def = SCENES[index] ?? SCENES[0]!;

  const go = (i: number) => {
    const next = (i + SCENES.length) % SCENES.length;
    setIndex(next);
    history.replaceState(null, '', `${location.pathname}${location.search}#${SCENES[next]!.id}`);
    // hand keyboard focus to the figure so space/enter go to it, not the button
    requestAnimationFrame(() => document.querySelector<SVGSVGElement>('.stage')?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const onHash = () => setIndex(indexFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <ThemeProvider palette="city">
      <GlowDefs />
      <Shell onPrev={() => go(index - 1)} onNext={() => go(index + 1)}
        sidebar={<Sidebar items={SCENES} current={index} onSelect={go} />}>
        <SceneView key={def.id} def={def} index={index} onPage={d => go(index + d)} />
      </Shell>
    </ThemeProvider>
  );
}
