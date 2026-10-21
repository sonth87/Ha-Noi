/* Tiny SVG string helpers shared by render/. */
export const f = (n: number) => n.toFixed(2);
export const g = (t: string, inner: string) => `<g transform="${t}">${inner}</g>`;
/** keep only characters that are safe inside an SVG id */
export const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_');
