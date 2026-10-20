/* One scene in the figure frame: caption, stage, hint, readout. Owns the controller for the
   scene's lifetime (mount with key={def.id} so switching scenes creates a fresh one). */
import { useEffect, useState } from 'react';
import { useController } from '@hooks/useController';
import { useKeys } from '@hooks/useKeys';
import { SceneSvg } from '@scenes/SceneSvg';
import type { SceneDef } from '@scenes/registry';

interface Props {
  def: SceneDef;
  index: number;
  onPage(delta: number): void;
}

export function SceneView({ def, index, onPage }: Props) {
  const [controller] = useState(() => def.create());
  const { readout, power } = useController(controller);

  useKeys(e => {
    if (controller.key(e)) return true;
    if (e.key === 'PageDown') { onPage(1); return true; }
    if (e.key === 'PageUp') { onPage(-1); return true; }
    return false;
  });

  // ?demo runs the scene's scripted sequence on arrival
  useEffect(() => {
    if (!/demo/.test(location.search)) return;
    const t = setTimeout(() => controller.demo(), 120);
    return () => clearTimeout(t);
  }, [controller]);

  useEffect(() => { document.title = `Fig ${index + 1} · ${def.name} · My City`; }, [index, def.name]);

  return (
    <figure className="figure">
      <div className="cap"><span className="hi">Fig {index + 1}</span><span>{def.name}</span></div>
      <div className={power ? 'stage-holder glow' : 'stage-holder'}>
        <SceneSvg controller={controller} figId={def.id} aria={def.aria} />
      </div>
      <div className="cap"><span>{def.hint}</span><span className="hi" aria-live="polite">{readout}</span></div>
    </figure>
  );
}
