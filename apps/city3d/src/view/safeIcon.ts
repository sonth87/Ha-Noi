/* Extension popup actions may bring their own icon as an HTML string (`iconHtml`). Anything an
   extension hands over is untrusted, so only plain inline SVG shapes get through; an icon with
   any other tag, an event handler, a link or a style attribute is dropped whole (no label-only
   fallback is lost, the button just shows its text). Pure string check, no DOM needed. */

const TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const ATTR = /^[a-z][a-z0-9:-]*$/i;

export function safeIconSvg(html: string): string {
  const s = html.trim();
  if (!s.startsWith('<svg') || s.length > 4000) return '';
  const tag = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>/gy;
  let pos = 0;
  let depth = 0;
  let m: RegExpExecArray | null;
  while (pos < s.length) {
    // text between tags is not expected in an icon
    if (s[pos] !== '<') return '';
    tag.lastIndex = pos;
    m = tag.exec(s);
    if (!m) return '';
    const closing = s[pos + 1] === '/';
    const name = m[1]!.toLowerCase(), attrs = m[2] ?? '', selfClosing = m[3] === '/';
    if (!TAGS.has(name)) return '';
    if (closing) {
      depth--;
      if (depth < 0 || attrs.trim()) return '';
    } else {
      const attrRe = /([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
      let a: RegExpExecArray | null;
      let consumed = '';
      while ((a = attrRe.exec(attrs))) {
        const key = a[1]!.toLowerCase(), val = (a[2] ?? a[3] ?? '').toLowerCase();
        if (!ATTR.test(key) || key.startsWith('on') || key === 'style' || key.includes('href') || /javascript:|data:|<|>/.test(val)) return '';
        consumed += a[0];
      }
      if (attrs.replace(/\s+/g, '') !== consumed.replace(/\s+/g, '')) return '';
      if (!selfClosing) depth++;
    }
    pos = tag.lastIndex;
  }
  return depth === 0 ? s : '';
}
