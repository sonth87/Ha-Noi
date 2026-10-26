/* Settings (ADR-063): one sheet with three tabs. The map colours, see-through and language that crowded the top
   bar live here now; their keyboard shortcuts still work. */
import { useState } from 'react';
import { MAP_PALETTES, PALETTES, accentKey } from '@my-city/theme';
import type { CityView, Snapshot } from '@view/CityView';
import { LOCALES, LOCALE_LABELS, PLACE_INFO_NAMES_I18N, STREET_LABEL_NAMES_I18N, t, type Locale, type TranslationKey } from '@view/i18n';
import { PLACE_INFO_MODES, type PlaceInfoMode } from '@view/placeInfo';
import { STREET_LABEL_MODES, type StreetLabelMode } from '@view/streetLabels';
import { LightsPanel } from './LightsPanel';
import { QualityPanel } from './QualityPanel';
import { Sheet } from './Sheet';
import type { UiGlassMode, UiGlassSettings } from './liquidGlass';

type Tab = 'appearance' | 'lights' | 'quality';

export function SettingsSheet({ v, s, glass, onGlass, onClose }: {
  v: CityView; s: Snapshot; glass: UiGlassSettings; onGlass: (p: Partial<UiGlassSettings>) => void; onClose: () => void;
}) {
  const loc: Locale = s.locale;
  const [tab, setTab] = useState<Tab>('appearance');
  return (
    <Sheet title={t('drawer.title', undefined, loc)} closeLabel={t('ui.close', undefined, loc)} onClose={onClose} side="right" className="settings">
      <div className="seg-control tabs" role="tablist">
        {(['appearance', 'lights', 'quality'] as const).map(k => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(`drawer.tab.${k}` as TranslationKey, undefined, loc)}
          </button>
        ))}
      </div>

      {tab === 'appearance' && (
        <div className="panel-body">
          <section>
            <h3>{t('drawer.language', undefined, loc)}</h3>
            <div className="seg-control" role="group">
              {LOCALES.map(l => <button key={l} type="button" aria-pressed={loc === l} onClick={() => v.setLocale(l)}>{l === 'vi' ? 'Tiếng Việt' : 'English'} · {LOCALE_LABELS[l]}</button>)}
            </div>
          </section>

          <section>
            <h3>{t('drawer.mapColors', undefined, loc)}</h3>
            <div className="palette-grid" role="group">
              {MAP_PALETTES.map(([id, swatches]) => (
                <button key={id} type="button" className={`palette-card ${s.mapPalette === id ? 'active' : ''}`} aria-pressed={s.mapPalette === id} onClick={() => v.setMapPalette(id)}>
                  <span className="palette-bars" aria-hidden="true">{swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                  <span className="palette-card-label">{t(`top.palette.${id}` as TranslationKey, undefined, loc)}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>{t('drawer.accentColors', undefined, loc)}</h3>
            <div className="accent-grid" role="group">
              {PALETTES.city.map(a => {
                const key = accentKey(a), [name, , darkHi, lightAccent] = a;
                return (
                  <button key={key} type="button" className={`accent-swatch ${s.accent === key ? 'active' : ''}`} aria-pressed={s.accent === key} title={name} aria-label={name} onClick={() => v.setAccent(key)}>
                    <span className="accent-dot" style={{ background: s.night ? darkHi : lightAccent }} />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3>{t('drawer.mapDisplay', undefined, loc)}</h3>
            <label className="opt">
              <span>{t('top.streetLabels', undefined, loc)}</span>
              <select value={s.streetLabels} onChange={e => v.setStreetLabels(e.target.value as StreetLabelMode)}>
                {STREET_LABEL_MODES.map(m => <option key={m} value={m}>{STREET_LABEL_NAMES_I18N[loc][m]}</option>)}
              </select>
            </label>
            <label className="opt">
              <span>{t('top.placeInfo', undefined, loc)}</span>
              <select value={s.placeInfo} onChange={e => v.setPlaceInfo(e.target.value as PlaceInfoMode)}>
                {PLACE_INFO_MODES.map(m => <option key={m} value={m}>{PLACE_INFO_NAMES_I18N[loc][m]}</option>)}
              </select>
            </label>
            <label className="opt switch-row">
              <span>{t('top.seeThrough', undefined, loc)} <kbd>X</kbd></span>
              <input type="checkbox" className="switch-input" checked={s.seeThrough} onChange={e => v.setSeeThrough(e.target.checked)} />
            </label>
          </section>

          <section>
            <h3>{t('drawer.uiSurface', undefined, loc)}</h3>
            <div className="seg-control" role="group">
              {(['off', 'tint', 'glass'] as const).map((m: UiGlassMode) => (
                <button key={m} type="button" aria-pressed={glass.mode === m} onClick={() => onGlass({ mode: m })}>{t(`drawer.uiMode.${m}` as TranslationKey, undefined, loc)}</button>
              ))}
            </div>
            {glass.mode !== 'off' && (
              <label className="opt slider-row">
                <span>{t('drawer.uiTransparency', undefined, loc)}</span>
                <input type="range" min={10} max={90} step={5} value={glass.transparency} onChange={e => onGlass({ transparency: +e.target.value })} />
                <strong className="slider-val">{glass.transparency}%</strong>
              </label>
            )}
            {glass.mode === 'glass' && (
              <label className="opt slider-row">
                <span>{t('drawer.uiLensScale', undefined, loc)}</span>
                <input type="range" min={0} max={180} step={10} value={glass.lensScale} onChange={e => onGlass({ lensScale: +e.target.value })} />
                <strong className="slider-val">{glass.lensScale}</strong>
              </label>
            )}
          </section>
        </div>
      )}
      {tab === 'lights' && <div className="panel-body"><LightsPanel lights={s.lights} locale={loc} onChange={p => v.setLights(p)} /></div>}
      {tab === 'quality' && (
        <div className="panel-body">
          <QualityPanel quality={s.quality} locale={loc} stats={s.stats} detail={s.detail} pending={s.pending} lowered={s.lowered} onChange={q => v.setQuality(q)} />
        </div>
      )}
    </Sheet>
  );
}
