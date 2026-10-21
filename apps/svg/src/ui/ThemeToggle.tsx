/* Cycles the theme: system → dark → light. */
import { useTheme, type ThemeMode } from '@iso/theme';

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'dark', dark: 'light', light: 'system' };
const LABEL: Record<ThemeMode, string> = { system: 'Auto', dark: 'Tối', light: 'Sáng' };

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <button type="button" className="pill" onClick={() => setMode(NEXT[mode])}
      aria-label={`Theme: ${LABEL[mode]}. Bấm để đổi.`} title="Đổi theme">
      ◐ {LABEL[mode]}
    </button>
  );
}
