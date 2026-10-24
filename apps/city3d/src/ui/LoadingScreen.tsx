import { useEffect, useState } from 'react';
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

const STEPS_VI = [
  { id: 1, title: 'Tải dữ liệu bản đồ OpenStreetMap Hà Nội' },
  { id: 2, title: 'Giải mã công trình, sông hồ & 6 khu vực nội đô' },
  { id: 3, title: 'Dựng mạng lưới đường phố, cầu vượt & tuyến Metro' },
  { id: 4, title: 'Khởi tạo di tích, biểu tượng & danh mục địa danh' },
  { id: 5, title: 'Đồng bộ ánh sáng & dựng khung cảnh 3D' },
] as const;

const STEPS_EN = [
  { id: 1, title: 'Loading Hanoi OpenStreetMap extract' },
  { id: 2, title: 'Decoding buildings, lakes & 6 urban districts' },
  { id: 3, title: 'Building road network, flyovers & Metro viaduct' },
  { id: 4, title: 'Initializing heritage monuments & place catalog' },
  { id: 5, title: 'Synchronizing lights & mounting 3D scene' },
] as const;

const TIPS_VI = [
  'Mẹo: Kéo thả biểu tượng người (Pegman) vào đường ray hoặc nhà ga Metro để trải nghiệm góc nhìn buồng lái tàu điện.',
  'Mẹo: Kéo thả biểu tượng người (Pegman) xuống mặt đường bất kỳ để vào chế độ lái xe ô tô dạo phố Hà Nội.',
  'Mẹo: Nhấp đúp vào bất kỳ tòa nhà, di tích, hồ nước hoặc cột ghim tên đường để mở thẻ thông tin chi tiết.',
  'Mẹo: Nhấn phím N (hoặc biểu tượng Mặt trăng) để chuyển sang cảnh đêm Hà Nội và click từng tầng nhà để bật/tắt đèn.',
  'Mẹo: Thu nhỏ bản đồ để xem ranh giới địa chính các khu vực nội đô và toàn cảnh Thủ đô Hà Nội.',
];

const TIPS_EN = [
  'Tip: Drag and drop the Pegman figure onto any Metro track or station to ride in the train cab.',
  'Tip: Drag and drop Pegman onto any street to drive a car through Hanoi in 3D.',
  'Tip: Double-click any building, heritage site, lake, or street pin to inspect detailed architectural info.',
  'Tip: Press N (or the Moon icon) for night mode and click individual building floors to toggle their lights.',
  'Tip: Zoom out to view administrative ward boundaries and the full Hanoi metropolitan overview.',
];

export function LoadingScreen({
  progress,
  onRetry,
}: {
  progress: LoadingProgress;
  onRetry?: () => void;
}) {
  const locale = getLocale();
  const isEn = locale === 'en';
  const steps = isEn ? STEPS_EN : STEPS_VI;
  const tips = isEn ? TIPS_EN : TIPS_VI;
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [tips.length]);

  const pct = Math.max(4, Math.min(100, Math.round(progress.percent)));

  return (
    <div className="game-loader" role="status" aria-live="polite">
      <div className="game-loader-grid" aria-hidden="true" />
      <div className="game-loader-card">
        <div className="game-loader-header">
          <div className="game-loader-emblem" aria-hidden="true">
            <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" className="loader-ring-spin" />
              <path
                d="M10 34H38M13 34V24H35V34M9 24L24 14L39 24M16 18L24 11L32 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="28.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="game-loader-titles">
            <div className="game-loader-badge">
              <span className="dot" />
              <span>HÀ NỘI · 3D ARCHITECTURAL MAP</span>
            </div>
            <h1>{isEn ? 'Initializing 3D Urban Space' : 'Khởi tạo Không gian Đô thị 3D'}</h1>
            <p className="game-loader-sub">
              {isEn
                ? 'Đống Đa · Ba Đình · Hoàn Kiếm · Tây Hồ · Hai Bà Trưng · Thanh Xuân'
                : 'Đống Đa · Ba Đình · Hoàn Kiếm · Tây Hồ · Hai Bà Trưng · Thanh Xuân'}
            </p>
          </div>
        </div>

        <div className="game-loader-progress-head">
          <span className="game-loader-stage-label">{progress.label}</span>
          <span className="game-loader-pct">{pct}%</span>
        </div>

        <div className="game-loader-bar-track" aria-hidden="true">
          <div className="game-loader-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        {progress.detail && (
          <div className="game-loader-detail">{progress.detail}</div>
        )}

        <div className="game-loader-steps" aria-hidden="true">
          {steps.map(st => {
            const state = st.id < progress.step ? 'done' : st.id === progress.step ? 'active' : 'pending';
            return (
              <div key={st.id} className={`game-loader-step is-${state}`}>
                <span className="game-loader-step-icon">
                  {state === 'done' ? '✓' : state === 'active' ? '●' : '○'}
                </span>
                <span className="game-loader-step-text">
                  {st.id}/5 · {st.title}
                </span>
              </div>
            );
          })}
        </div>

        {progress.counts && (
          <div className="game-loader-telemetry">
            <div className="game-loader-stat">
              <strong>{progress.counts.buildings.toLocaleString(locale)}</strong>
              <span>{isEn ? 'Buildings' : 'Công trình'}</span>
            </div>
            <div className="game-loader-stat">
              <strong>{progress.counts.streets.toLocaleString(locale)}</strong>
              <span>{isEn ? 'Street segments' : 'Tuyến đường'}</span>
            </div>
            <div className="game-loader-stat">
              <strong>{progress.counts.stations.toLocaleString(locale)}</strong>
              <span>{isEn ? 'Stations' : 'Nhà ga'}</span>
            </div>
            <div className="game-loader-stat">
              <strong>6</strong>
              <span>{isEn ? 'Core Areas' : 'Khu vực'}</span>
            </div>
          </div>
        )}

        {progress.error ? (
          <div className="game-loader-error">
            <p>{progress.error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="game-loader-retry">
                {isEn ? 'Retry loading' : 'Thử tải lại'}
              </button>
            )}
          </div>
        ) : (
          <div className="game-loader-tip">
            <span>{tips[tipIndex]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
