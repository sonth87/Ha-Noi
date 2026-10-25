import { useEffect, useId, useState } from 'react';
import { getLocale } from '@view/i18n';

export interface LoadingProgress {
  step: 1 | 2 | 3 | 4 | 5;
  percent: number;
  label: string;
  detail?: string;
  counts?: {
    buildings: number;
    streets: number;
    stations: number;
  };
  error?: string | null;
}

interface StrokeSpec {
  d: string;
  start: number;
  end: number;
  width?: number;
}

/** 2D characteristic architectural lines of Khuê Văn Các (ordered from base at 0% to roof finial at 100%) */
const KHUE_VAN_CAC_STROKES: readonly StrokeSpec[] = [
  // 1. Nền đá tam cấp & 4 trụ gạch tầng dưới (0% -> 28%)
  { d: 'M 32 179 H 208', start: 1, end: 8, width: 1.8 },
  { d: 'M 42 174 H 198 M 42 174 V 179 M 198 174 V 179', start: 4, end: 12, width: 1.5 },
  // 4 trụ gạch vuông (trái ngoài, trái trong, phải trong, phải ngoài)
  { d: 'M 52 174 V 118 M 64 174 V 118', start: 8, end: 22, width: 1.7 },
  { d: 'M 90 174 V 118 M 102 174 V 118', start: 9, end: 23, width: 1.7 },
  { d: 'M 138 174 V 118 M 150 174 V 118', start: 9, end: 23, width: 1.7 },
  { d: 'M 176 174 V 118 M 188 174 V 118', start: 8, end: 22, width: 1.7 },
  // Đường chỉ gạch ngang & vòm kẻ bẩy giữa các trụ gạch
  { d: 'M 52 132 H 64 M 90 132 H 102 M 138 132 H 150 M 176 132 H 188', start: 16, end: 25, width: 1.2 },
  { d: 'M 64 128 Q 77 120 90 128 M 102 128 Q 120 118 138 128 M 150 128 Q 163 120 176 128', start: 18, end: 28, width: 1.3 },
  { d: 'M 46 118 H 194', start: 22, end: 30, width: 1.7 },

  // 2. Sàn gỗ tầng lầu & Hàng lan can con tiện (26% -> 46%)
  { d: 'M 40 113 H 200 M 40 113 V 118 M 200 113 V 118', start: 26, end: 35, width: 1.6 },
  { d: 'M 46 99 H 194 M 46 109 H 194', start: 31, end: 41, width: 1.4 },
  {
    d: 'M 46 113 V 96 M 88 113 V 96 M 152 113 V 96 M 194 113 V 96 M 60 109 V 99 M 74 109 V 99 M 104 109 V 99 M 120 109 V 99 M 136 109 V 99 M 166 109 V 99 M 180 109 V 99',
    start: 35,
    end: 46,
    width: 1.2,
  },

  // 3. Thân lầu Khuê Văn & Cửa sổ tròn Sao Khuê 8 tia (42% -> 72%)
  { d: 'M 54 99 V 66 M 88 99 V 66 M 152 99 V 66 M 186 99 V 66', start: 42, end: 54, width: 1.6 },
  { d: 'M 50 66 H 190', start: 48, end: 57, width: 1.6 },
  // Khung ô cửa hai gian bên
  { d: 'M 61 92 V 73 H 81 V 92 M 159 92 V 73 H 179 V 92', start: 50, end: 60, width: 1.2 },
  // Vòng tròn đôi Sao Khuê ở chính giữa (cx=120, cy=82.5, r=13.5 & r=10.5)
  { d: 'M 120 69 A 13.5 13.5 0 1 1 119.99 69', start: 52, end: 65, width: 1.7 },
  { d: 'M 120 72 A 10.5 10.5 0 1 1 119.99 72', start: 55, end: 67, width: 1.2 },
  // 8 tia Sao Khuê tỏa ra 4 hướng chính và 4 góc chéo
  {
    d: 'M 120 69 V 66 M 120 96 V 99 M 106.5 82.5 H 88 M 133.5 82.5 H 152 M 110.5 73 L 96 66 M 129.5 73 L 144 66 M 110.5 92 L 96 99 M 129.5 92 L 144 99',
    start: 60,
    end: 72,
    width: 1.35,
  },

  // 4. Mái chồng diêm 2 tầng 8 mái đao cong & Đỉnh bầu rượu (68% -> 100%)
  // Tầng mái dưới + hai đầu đao cong vút
  { d: 'M 14 57 Q 28 67 52 66 H 188 Q 212 67 226 57', start: 68, end: 80, width: 1.8 },
  { d: 'M 14 57 Q 34 55 56 46 H 184 Q 206 55 226 57', start: 72, end: 83, width: 1.5 },
  // Cổ diêm giữa hai tầng mái
  { d: 'M 62 46 V 39 H 178 V 46 M 92 46 V 39 M 120 46 V 39 M 148 46 V 39', start: 78, end: 87, width: 1.3 },
  // Tầng mái trên + hai đầu đao cong vút
  { d: 'M 28 31 Q 42 40 62 39 H 178 Q 198 40 212 31', start: 82, end: 92, width: 1.8 },
  { d: 'M 28 31 Q 52 29 74 18 H 166 Q 188 29 212 31', start: 86, end: 95, width: 1.5 },
  // Bờ nóc, kìm nóc & đỉnh bầu rượu văn hiến trên đỉnh mái (90% -> 100%)
  { d: 'M 70 13 Q 72 18 76 18 H 164 Q 168 18 170 13', start: 90, end: 97, width: 1.6 },
  { d: 'M 120 18 V 7 M 116 14 Q 120 9 124 14 Q 120 18 116 14', start: 94, end: 100, width: 1.5 },
];

export function LoadingScreen({
  progress,
  onRetry,
}: {
  progress: LoadingProgress;
  onRetry?: () => void;
}) {
  const clipId = useId();
  const isEn = getLocale() === 'en';
  const targetPct = Math.max(0, Math.min(100, progress.percent));
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      setDisplayPct(prev => {
        if (Math.abs(targetPct - prev) < 0.25) return targetPct;
        const delta = Math.max(0.6, (targetPct - prev) * 0.18);
        return Math.min(targetPct, prev + delta);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targetPct]);

  const pct = Math.max(0, Math.min(100, displayPct));
  // Radial fill expands from the center of the Sao Khuê circular window (cx = 120, cy = 82.5) outward (max radius = 136)
  const clipRadius = (pct / 100) * 136;

  return (
    <div className="kvc-loader" role="status" aria-live="polite" aria-label={isEn ? 'Loading 3D map' : 'Đang tải bản đồ 3D'}>
      <div className="kvc-loader-stage">
        <div className="kvc-loader-artwork" aria-hidden="true">
          <svg
            className="kvc-loader-svg"
            viewBox="0 0 240 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id={clipId}>
                <circle cx="120" cy="82.5" r={clipRadius} />
              </clipPath>
            </defs>
            {/* Always-visible light grey silhouette of Khuê Văn Các */}
            <g className="kvc-loader-base">
              {KHUE_VAN_CAC_STROKES.map((s, idx) => (
                <path
                  key={`base-${idx}`}
                  d={s.d}
                  stroke="currentColor"
                  strokeWidth={s.width ?? 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
            {/* Color fill layer expanding radially from the inside (Sao Khuê center) outward */}
            <g className="kvc-loader-fill" clipPath={`url(#${clipId})`}>
              {KHUE_VAN_CAC_STROKES.map((s, idx) => (
                <path
                  key={`fill-${idx}`}
                  d={s.d}
                  stroke="currentColor"
                  strokeWidth={s.width ?? 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="kvc-loader-line-track" aria-hidden="true">
          <div className="kvc-loader-line-fill" style={{ width: `${pct}%` }} />
        </div>

        {progress.error && (
          <div className="kvc-loader-error">
            <p>{progress.error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="game-loader-retry">
                {isEn ? 'Retry' : 'Thử lại'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

