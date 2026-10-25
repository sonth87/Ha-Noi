/* The quality panel (ADR-032, ADR-036, ADR-037, ADR-056): four levels, or any option by hand ("custom"):
   building detail, street life (traffic, poles and wires, trees), view distance, stepping down by
   itself, and the render options. */
import type { Snapshot } from '@view/CityView';
import { LEVEL_NAMES_I18N, t, type Locale } from '@view/i18n';
import { LEVELS, quality, withOption, type Quality, type QualityLevel, type QualityOptions, type TreeLook } from '@view/quality';

export function QualityPanel({
  quality: q,
  locale = 'vi',
  stats,
  detail,
  pending,
  lowered,
  onChange,
}: {
  quality: Quality;
  locale?: Locale;
  stats: Snapshot['stats'];
  detail: Snapshot['detail'];
  pending: number;
  lowered: string | null;
  onChange: (q: Quality) => void;
}) {
  const levelNames = LEVEL_NAMES_I18N[locale];
  const details = [
    t('quality.detail.0', undefined, locale),
    t('quality.detail.1', undefined, locale),
    t('quality.detail.2', undefined, locale),
    t('quality.detail.3', undefined, locale),
  ];
  const trees: [TreeLook, string][] = [
    ['off', t('quality.trees.off', undefined, locale)],
    ['simple', t('quality.trees.simple', undefined, locale)],
    ['full', t('quality.trees.full', undefined, locale)],
  ];
  const distance: [number, string][] = [
    [150, '150 m'],
    [250, '250 m'],
    [450, '450 m'],
    [800, '800 m'],
    [1500, '1500 m'],
    [0, t('quality.viewDistance.all', undefined, locale)],
  ];
  const toggles: [keyof QualityOptions, string][] = [
    ['autoDetail', t('quality.autoDetail', undefined, locale)],
    ['wires', t('quality.wires', undefined, locale)],
    ['autoQuality', t('quality.autoQuality', undefined, locale)],
    ['windows', t('quality.windows', undefined, locale)],
    ['silhouette', t('quality.silhouette', undefined, locale)],
    ['creases', t('quality.creases', undefined, locale)],
    ['details', t('quality.details', undefined, locale)],
    ['bloom', t('quality.bloom', undefined, locale)],
    ['msaa', t('quality.msaa', undefined, locale)],
  ];

  return (
    <section aria-label={t('quality.title', undefined, locale)}>
      <h2>{t('quality.title', undefined, locale)} · <span className="hi">{levelNames[q.level]}</span></h2>
      <div className="levels">
        {(Object.keys(LEVELS) as QualityLevel[]).map(l => (
          <button key={l} type="button" aria-pressed={q.level === l} onClick={() => onChange(quality(l))}>{levelNames[l]}</button>
        ))}
      </div>
      <label className="opt">
        <span>{t('quality.houseDetail', undefined, locale)}</span>
        <select value={q.houseDetail} onChange={e => onChange(withOption(q, { houseDetail: Number(e.target.value) as QualityOptions['houseDetail'] }))}>
          {details.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </label>
      <label className="opt">
        <span>{t('quality.traffic', undefined, locale)}</span>
        <input type="range" min={0} max={100} step={10} value={Math.round(q.traffic * 100)} onChange={e => onChange(withOption(q, { traffic: Number(e.target.value) / 100 }))} />
        <span className="hi">{Math.round(q.traffic * 100)}%</span>
      </label>
      <label className="opt">
        <span>{t('quality.trees', undefined, locale)}</span>
        <select value={q.trees} onChange={e => onChange(withOption(q, { trees: e.target.value as TreeLook }))}>
          {trees.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="opt">
        <span>{t('quality.viewDistance', undefined, locale)}</span>
        <select value={q.viewDistance} onChange={e => onChange(withOption(q, { viewDistance: Number(e.target.value) }))}>
          {distance.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="opt">
        <span>{t('quality.pixelRatio', undefined, locale)}</span>
        <select value={q.pixelRatio} onChange={e => onChange(withOption(q, { pixelRatio: Number(e.target.value) }))}>
          {[1, 1.5, 2, 3].map(r => <option key={r} value={r}>×{r}</option>)}
        </select>
      </label>
      <div className="toggle-list">
        {toggles.map(([k, label]) => (
          <label key={k} className="opt toggle-row">
            <span>{label}</span>
            <input type="checkbox" className="switch-input" checked={q[k] as boolean} onChange={e => onChange(withOption(q, { [k]: e.target.checked }))} />
          </label>
        ))}
      </div>
      <p className="note">
        {t('quality.drawing', undefined, locale)} <span className="hi">{details[detail]}</span>
        {pending > 0 ? t('quality.pending', { count: pending }, locale) : ''}
      </p>
      {lowered && (
        <p className="note warn">
          {t('quality.lowered', { level: levelNames[lowered as QualityLevel] ?? lowered }, locale)}
        </p>
      )}
      <p className="stats">
        {t(
          'quality.stats',
          {
            triangles: stats.triangles.toLocaleString(locale),
            windows: stats.windows.toLocaleString(locale),
            lines: stats.lines.toLocaleString(locale),
          },
          locale,
        )}
      </p>
    </section>
  );
}

