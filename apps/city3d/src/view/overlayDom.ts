/* DOM builders and updaters for the 3D viewport overlays:
   - Street label callout pins & map-aligned labels
   - Place floating cards & marker pills
   - Hover banner tooltip
   - Rich detail popup card (with corner light-bulb toggle, 3D showcase button, and extension popup actions) */
import { getLocale, t, type Locale } from './i18n';
import { safeIconSvg } from './safeIcon';
import type { PlaceEntry, PlaceInfoMode } from './placeInfo';
import type { CitySDK, PopupActionDescriptor } from './sdk';
import type { ProjectedStreetLabel, StreetEntry, StreetLabelMode } from './streetLabels';

export function createStreetLabelNode(item: ProjectedStreetLabel, mode: StreetLabelMode): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.tier = String(item.tier);

  if (mode === 'pin') {
    btn.className = 'street-pin';
    btn.style.setProperty('--stem', `${item.stemHeightPx}px`);
    btn.setAttribute('aria-label', item.info ? `${item.name} — ${item.info}` : item.name);

    const card = document.createElement('span');
    card.className = 'pin-card';
    const title = document.createElement('b');
    title.className = 'pin-title';
    title.textContent = item.shortName;
    card.appendChild(title);
    if (item.info) {
      const meta = document.createElement('span');
      meta.className = 'pin-meta';
      meta.textContent = item.info;
      card.appendChild(meta);
    }

    const stem = document.createElement('i');
    stem.className = 'pin-stem';

    const base = document.createElement('i');
    base.className = 'pin-base';
    for (const cls of ['w1', 'w2', 'w3']) {
      const wave = document.createElement('u');
      wave.className = `pin-wave ${cls}`;
      base.appendChild(wave);
    }
    const dot = document.createElement('s');
    dot.className = 'pin-dot';
    base.appendChild(dot);

    btn.append(card, stem, base);
  } else {
    btn.className = 'street-map-label';
    btn.title = item.info ? `${item.name} · ${item.info}` : item.name;
    const txt = document.createElement('span');
    txt.className = 'map-label-text';
    txt.textContent = item.name;
    btn.appendChild(txt);
    if (item.info) {
      const meta = document.createElement('em');
      meta.className = 'map-label-meta';
      meta.textContent = item.info;
      btn.appendChild(meta);
    }
  }
  return btn;
}

export function createPlaceLabelNode(entry: PlaceEntry, mode: PlaceInfoMode): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.category = entry.category;
  btn.dataset.tier = String(entry.tier);

  if (mode === 'label') {
    btn.className = 'place-label-card';
    const head = document.createElement('span');
    head.className = 'place-label-head';
    const badge = document.createElement('i');
    badge.className = 'place-label-badge';
    badge.textContent = entry.badge;
    const title = document.createElement('b');
    title.className = 'place-label-name';
    title.textContent = entry.name;
    head.append(badge, title);

    const addr = document.createElement('span');
    addr.className = 'place-label-addr';
    addr.textContent = entry.address;

    const pointer = document.createElement('s');
    pointer.className = 'place-label-stem';

    btn.append(head, addr, pointer);
  } else {
    btn.className = 'place-marker-pill';
    const dot = document.createElement('i');
    dot.className = 'place-marker-dot';
    const txt = document.createElement('span');
    txt.className = 'place-marker-text';
    txt.textContent = entry.name;
    btn.append(dot, txt);
  }
  return btn;
}

export function createStreetPlaceEntry(
  street: StreetEntry,
  world: [number, number],
  cityName: string,
  locale: Locale = getLocale(),
): PlaceEntry {
  const tierDesc =
    locale === 'en'
      ? street.tier === 1
        ? 'Major urban arterial corridor connecting districts across the city.'
        : street.tier === 2
          ? 'Main commercial, office, and residential street corridor.'
          : 'Local neighborhood street and residential access lane.'
      : street.tier === 1
        ? 'Trục giao thông huyết mạch đô thị kết nối liên khu vực.'
        : street.tier === 2
          ? 'Tuyến phố chính tập trung thương mại, dịch vụ, cơ quan và khu dân cư sầm uất.'
          : 'Tuyến phố / ngõ nội khu kết nối các tổ dân phố và khu dân cư.';
  const lenM = Math.round(street.totalLength);
  const categoryLabel =
    locale === 'en'
      ? street.tier === 1
        ? 'Primary Artery'
        : street.tier === 2
          ? 'Main Street'
          : 'Local Street'
      : street.tier === 1
        ? 'Trục đường lớn'
        : street.tier === 2
          ? 'Tuyến phố chính'
          : 'Tuyến phố nội khu';
  return {
    id: `street:${street.id}`,
    name: street.name,
    category: 'building',
    categoryLabel,
    badge: t('metric.streetBadge', undefined, locale),
    address: cityName ? `${street.name}, ${cityName}` : street.name,
    description: tierDesc,
    metrics: [
      { label: t('metric.length', undefined, locale), value: lenM >= 1000 ? `${(lenM / 1000).toFixed(2)} km` : `${lenM} m` },
      { label: t('metric.crossSection', undefined, locale), value: t('metric.streetLanesVal', { lanes: street.lanes, width: street.width }, locale) },
      {
        label: t('metric.elevation', undefined, locale),
        value: street.bridge ? t('metric.elevatedBridge', undefined, locale) : t('metric.groundRoad', undefined, locale),
      },
    ],
    world: [world[0], world[1], 4],
    ground: world,
    tier: street.tier,
    minPxPerMetre: street.minPxPerMetre,
    source: 'osm',
  };
}

export function renderHoverBannerDom(
  banner: HTMLDivElement,
  entry: PlaceEntry,
  floorTag: string,
  locale: Locale = getLocale(),
): void {
  banner.dataset.category = entry.category;
  banner.replaceChildren();

  const top = document.createElement('div');
  top.className = 'hover-banner-top';
  const badge = document.createElement('span');
  badge.className = 'hover-banner-badge';
  badge.textContent = entry.categoryLabel;
  const hint = document.createElement('span');
  hint.className = 'hover-banner-hint';
  hint.textContent = t('popup.dblClickHint', undefined, locale);
  top.append(badge, hint);

  const title = document.createElement('strong');
  title.className = 'hover-banner-title';
  title.textContent = entry.name;

  const sub = document.createElement('span');
  sub.className = 'hover-banner-sub';
  sub.textContent = `${entry.address}${floorTag}`;

  banner.append(top, title, sub);
}

export function syncPopupBulbDom(popupEl: HTMLDivElement, isLit: boolean, locale: Locale = getLocale()): void {
  const bulbBtn = popupEl.querySelector<HTMLButtonElement>('.popup-bulb');
  if (!bulbBtn) return;
  bulbBtn.classList.toggle('lit', isLit);
  bulbBtn.setAttribute('aria-pressed', String(isLit));
  bulbBtn.title = isLit ? t('popup.bulbOn', undefined, locale) : t('popup.bulbOff', undefined, locale);
}

export function renderPopupCardDom(params: {
  popupEl: HTMLDivElement;
  entry: PlaceEntry;
  floor?: string;
  isLit: boolean;
  locale: Locale;
  sdk: CitySDK;
  customActions: readonly PopupActionDescriptor[];
  onToggleLamps: () => void;
  onClose: () => void;
  onOpenShowcase: (showcaseId: string) => void;
}): void {
  const { popupEl, entry, floor, isLit, locale, sdk, customActions, onToggleLamps, onClose, onOpenShowcase } = params;
  popupEl.dataset.category = entry.category;
  popupEl.replaceChildren();
  // a grip at the top of the card when it is docked as a bottom sheet on a phone (ADR-063)
  const grip = document.createElement('span');
  grip.className = 'popup-grip';
  grip.setAttribute('aria-hidden', 'true');
  popupEl.appendChild(grip);

  const header = document.createElement('div');
  header.className = 'popup-header';
  const badgeWrap = document.createElement('div');
  badgeWrap.className = 'popup-badges';
  const badge = document.createElement('span');
  badge.className = 'popup-badge';
  badge.textContent = entry.categoryLabel;
  badgeWrap.appendChild(badge);
  if (floor) {
    const fNum = Number(floor.split('#')[1]) + 1;
    if (Number.isFinite(fNum)) {
      const fBadge = document.createElement('span');
      fBadge.className = 'popup-floor-badge';
      fBadge.textContent = t('popup.floor', { floor: fNum }, locale);
      badgeWrap.appendChild(fBadge);
    }
  }

  const headRight = document.createElement('div');
  headRight.className = 'popup-head-actions';

  if (entry.buildingId || entry.category === 'station') {
    const bulbBtn = document.createElement('button');
    bulbBtn.type = 'button';
    bulbBtn.className = 'popup-bulb';
    bulbBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6" fill="none"/><path d="M10 22h4" fill="none"/></svg>';
    bulbBtn.addEventListener('click', onToggleLamps);
    headRight.appendChild(bulbBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'popup-close';
  closeBtn.title = t('popup.close', undefined, locale);
  closeBtn.setAttribute('aria-label', t('popup.close', undefined, locale));
  closeBtn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  closeBtn.addEventListener('click', onClose);
  headRight.appendChild(closeBtn);
  header.append(badgeWrap, headRight);

  const title = document.createElement('h3');
  title.className = 'popup-title';
  title.textContent = entry.name;

  const addr = document.createElement('div');
  addr.className = 'popup-addr';
  addr.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span></span>';
  addr.querySelector('span')!.textContent = entry.address;

  const desc = document.createElement('p');
  desc.className = 'popup-desc';
  desc.textContent = entry.description;

  const grid = document.createElement('div');
  grid.className = 'popup-metrics';
  for (const m of entry.metrics) {
    const cell = document.createElement('div');
    cell.className = 'popup-metric';
    const lbl = document.createElement('span');
    lbl.textContent = m.label;
    const val = document.createElement('strong');
    val.textContent = m.value;
    cell.append(lbl, val);
    grid.appendChild(cell);
  }

  popupEl.append(header, title, addr, desc, grid);

  const visibleCustomActions = customActions.filter(a => !a.shouldShow || a.shouldShow(entry));
  if (entry.showcaseId || visibleCustomActions.length > 0) {
    const actions = document.createElement('div');
    actions.className = 'popup-actions';

    if (entry.showcaseId) {
      const scId = entry.showcaseId;
      const scBtn = document.createElement('button');
      scBtn.type = 'button';
      scBtn.className = 'popup-btn primary';
      scBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span></span>`;
      scBtn.querySelector('span')!.textContent = t('popup.viewShowcase', undefined, locale);
      scBtn.addEventListener('click', () => onOpenShowcase(scId));
      actions.appendChild(scBtn);
    }

    for (const act of visibleCustomActions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popup-btn';
      btn.dataset.actionId = act.id;
      const labelText = typeof act.label === 'function' ? act.label(entry, locale) : act.label;
      const icon = act.iconHtml ? safeIconSvg(act.iconHtml) : '';
      if (icon) {
        btn.innerHTML = `${icon}<span></span>`;
        btn.querySelector('span')!.textContent = labelText;
      } else {
        btn.textContent = labelText;
      }
      btn.addEventListener('click', () => act.onClick(entry, sdk));
      actions.appendChild(btn);
    }

    popupEl.appendChild(actions);
  }

  syncPopupBulbDom(popupEl, isLit, locale);
  popupEl.style.display = '';
}
