/* The scenes listed in the sidebar, in order (Fig 1, 2, …). */
import type { SceneController } from '@scenes/controller';
import { HelloController } from '@scenes/hello/helloController';
import { ReferenceController } from '@scenes/reference/referenceController';

export interface SceneDef {
  id: string;
  name: string;
  /** one-line controls hint under the figure */
  hint: string;
  /** what it is and how to operate it, for screen readers (NFR-10) */
  aria: string;
  create(): SceneController;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: 'nha-mau',
    name: 'Nhà mẫu',
    hint: 'click a floor · 1–5 · space house · n night · w wire',
    aria: 'Isometric Hà Nội tube house between two neighbours, with a café on the ground floor, a balcony, an iron cage, a roof terrace, a water tank, a sidewalk, a street lamp and power lines. Click a floor or press 1 to 5 to switch its lights; space toggles the main house; n switches day and night; w sends a pulse along a wire.',
    create: () => new ReferenceController(),
  },
  {
    id: 'hello',
    name: 'Hello',
    hint: 'click a floor · 1–4 · space all · n night',
    aria: 'Isometric four-storey shop-house on a plate. Click a floor or press 1 to 4 to switch its lights; space toggles the whole house; n lights it floor by floor.',
    create: () => new HelloController(),
  },
];
