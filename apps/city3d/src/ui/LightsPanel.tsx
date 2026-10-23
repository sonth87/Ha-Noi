/* The lights panel (ADR-039): house lights and vehicle lights — automatic (on at night), on or off —
   how many floors light (0–100 %), and how strong the glow is. */
import { t, type Locale } from '@view/i18n';
import type { LightMode, LightSettings } from '@view/lights';

function Modes({ value, locale, onChange }: { value: LightMode; locale: Locale; onChange: (m: LightMode) => void }) {
  const modes: [LightMode, string][] = [
    ['auto', t('lights.mode.auto', undefined, locale)],
    ['on', t('lights.mode.on', undefined, locale)],
    ['off', t('lights.mode.off', undefined, locale)],
  ];
  return (
    <div className="seg">
      {modes.map(([m, l]) => <button key={m} aria-pressed={value === m} onClick={() => onChange(m)}>{l}</button>)}
    </div>
  );
}

export function LightsPanel({
  lights: L,
  locale = 'vi',
  onChange,
}: {
  lights: LightSettings;
  locale?: Locale;
  onChange: (p: Partial<LightSettings>) => void;
}) {
  return (
    <section aria-label={t('lights.title', undefined, locale)}>
      <h2>{t('lights.title', undefined, locale)}</h2>
      <div className="row"><span>{t('lights.house', undefined, locale)}</span><Modes value={L.house} locale={locale} onChange={house => onChange({ house })} /></div>
      <label className="opt">
        {t('lights.share', undefined, locale)}
        <input type="range" min={0} max={100} step={5} value={Math.round(L.share * 100)} onChange={e => onChange({ share: Number(e.target.value) / 100 })} />
        <span className="hi">{Math.round(L.share * 100)}%</span>
      </label>
      <div className="row"><span>{t('lights.vehicle', undefined, locale)}</span><Modes value={L.vehicle} locale={locale} onChange={vehicle => onChange({ vehicle })} /></div>
      <div className="row"><span>{t('lights.street', undefined, locale)}</span><Modes value={L.street} locale={locale} onChange={street => onChange({ street })} /></div>
      <label className="opt">
        {t('lights.glow', undefined, locale)}
        <input type="range" min={0} max={200} step={10} value={Math.round(L.glow * 100)} onChange={e => onChange({ glow: Number(e.target.value) / 100 })} />
        <span className="hi">{Math.round(L.glow * 100)}%</span>
      </label>
      <p className="note">{t('lights.note', undefined, locale)}</p>
    </section>
  );
}
