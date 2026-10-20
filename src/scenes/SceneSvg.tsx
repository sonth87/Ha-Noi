/* Host <svg> for a scene: writes the controller's svg string, attaches the controller,
   and delegates clicks (ADR-013). React never renders the scene's children itself. */
import { useLayoutEffect, useRef } from 'react';
import { useController } from '@hooks/useController';
import type { SceneController } from '@scenes/controller';

interface Props {
  controller: SceneController;
  figId: string;
  aria: string;
}

export function SceneSvg({ controller, figId, aria }: Props) {
  const { svg, viewBox } = useController(controller);
  const ref = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = svg;
    controller.attach(el);
    return () => controller.detach();
  }, [controller, svg]);

  return (
    <svg
      ref={ref}
      className="stage"
      data-fig={figId}
      viewBox={viewBox}
      role="img"
      aria-label={aria}
      tabIndex={0}
      onClick={e => controller.click(e.target as Element)}
    />
  );
}
