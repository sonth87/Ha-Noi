/* The scenes listed in the sidebar, in order (Fig 1, 2, …). */
import type { ComponentType } from 'react';
import type { SceneController } from '@scenes/controller';
import { WorkshopController } from '@scenes/workshop/workshopController';
import { WorkshopPanel } from '@scenes/workshop/WorkshopPanel';
import { HelloController } from '@scenes/hello/helloController';
import { ReferenceController } from '@scenes/reference/referenceController';
import { CatalogController } from '@scenes/catalog/catalogController';
import { StreetController } from '@scenes/street/streetController';
import { CrossroadsController } from '@scenes/crossroads/crossroadsController';
import { LandmarksController } from '@scenes/landmarks/landmarksController';
import { LandmarksPanel } from '@scenes/landmarks/LandmarksPanel';

export interface SceneDef {
  id: string;
  name: string;
  /** one-line controls hint under the figure */
  hint: string;
  /** what it is and how to operate it, for screen readers (NFR-10) */
  aria: string;
  create(): SceneController;
  /** optional side panel bound to the scene's controller */
  Panel?: ComponentType<{ controller: SceneController }>;
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
    id: 'catalog',
    name: 'Catalog',
    hint: 'q e rotate · ← → pick · space lights · r random · p preset · n night',
    aria: 'Isometric catalog of Hà Nội house types, each on its own lot along a street. Q and E rotate the view; left and right arrows pick a lot; space switches the picked house\'s lights; R replaces it with a random house; P restores its preset; N switches day and night; click a floor to light it or a lot to pick it.',
    create: () => new CatalogController(),
  },
  {
    id: 'xuong',
    name: 'Xưởng nhà',
    hint: 'chỉnh ở bảng bên phải · q e rotate · space lights · n night · r random',
    aria: 'Isometric house workshop: one Hà Nội house on a lot, shaped by the controls in the side panel. Q and E rotate the view; space switches the house lights; N switches day and night; R makes a random house; click a floor to light it.',
    create: () => new WorkshopController(),
    Panel: WorkshopPanel,
  },
  {
    id: 'cong-trinh',
    name: 'Công trình',
    hint: '← → chọn · q e rotate · space mọi tầng · n night · t traffic · click a floor',
    aria: 'Isometric views of the hand-drawn structures of the Thái Hà – Tây Sơn – Chùa Bộc crossroads, one at a time: the white round Thái Bình tower, the Novotel with its elliptical glass core, the circle garden, the dense garden, and the Tây Sơn flyover with the junction. Left and right arrows pick a structure; Q and E rotate the view; space lights every floor; N switches day and night; T starts or stops the traffic on the flyover page; click a floor to light it. The side panel lists the structures and describes the one shown.',
    create: () => new LandmarksController(),
    Panel: LandmarksPanel,
  },
  {
    id: 'pho-thai-ha',
    name: 'Phố Thái Hà',
    hint: 'q e rotate · x cutaway · n night · t traffic · w wire · wheel zoom · drag pan · dbl-click reset',
    aria: 'Isometric street in Hà Nội, about 100 metres, houses on both sides, sidewalks with poles, wires, street lamps and trees, motorbikes in two lanes. Q and E rotate the view; X cuts the near row down to its ground floor; N switches day and night; T starts or stops the traffic; W sends a pulse along a wire; click a floor to light it; scroll to zoom, drag to pan, double-click to reset.',
    create: () => new StreetController(),
  },
  {
    id: 'nga-tu',
    name: 'Ngã tư',
    hint: 'q e rotate · x cutaway · n night · t traffic · w wire · click a floor · wheel zoom · drag pan · dbl-click reset',
    aria: 'Isometric model of the Thái Hà – Tây Sơn – Chùa Bộc crossroads in Hà Nội: Tây Sơn with its flyover over the junction, Thái Hà and Chùa Bộc crossing it, rows of houses on every arm, a white round office tower and a hotel with an elliptical glass tower on the two northern corners, and two gardens on the southern corners. Traffic lights with countdowns change in turn and the traffic stops at the line on red. Q and E rotate the view; X cuts the houses facing away down to their ground floor; N switches day and night; T starts or stops the traffic; W sends a pulse along a wire; click a floor to light it; scroll to zoom, drag to pan, double-click to reset.',
    create: () => new CrossroadsController(),
  },
  {
    id: 'hello',
    name: 'Hello',
    hint: 'click a floor · 1–4 · space all · n night',
    aria: 'Isometric four-storey shop-house on a plate. Click a floor or press 1 to 4 to switch its lights; space toggles the whole house; n lights it floor by floor.',
    create: () => new HelloController(),
  },
];
