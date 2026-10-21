import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { vehicleModel } from './vehicles';
const FILL: Record<string, string> = { body: '#e4e5e4', top: '#f4f4f3', glass: '#aebcc2', wheel: '#3a3d40', head: '#ffd27a', tail: '#ff8a3c', sign: '#ffb050', door: '#d6d8d8', win: '#9fb0b6', beam: 'none' };
// camera at (1, tan-ish, 1): view 0 of the app
const el = Math.asin(1 / Math.sqrt(3)), az = Math.PI / 4;
const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
const light = new THREE.Vector3(-0.4, 1, 0.3).normalize();
function svgOf(models: ReturnType<typeof vehicleModel>[], yaw: number, scale = 120) {
  const tris: { pts: [number, number][]; d: number; fill: string; shade: number }[] = [];
  let ox = 0;
  const rot = new THREE.Matrix4().makeRotationY(yaw);
  for (const m of models) {
    for (const [part, g] of m.parts) {
      if (FILL[part] === 'none') continue;
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i += 3) {
        const v = [0, 1, 2].map(k => new THREE.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)).applyMatrix4(rot).add(new THREE.Vector3(ox, 0, 0)));
        const n = new THREE.Vector3().crossVectors(v[1]!.clone().sub(v[0]!), v[2]!.clone().sub(v[0]!)).normalize();
        if (n.dot(dir) < -0.001 && part !== 'glass') continue;
        const c = v[0]!.clone().add(v[1]!).add(v[2]!).multiplyScalar(1 / 3);
        tris.push({ pts: v.map(q => [q.dot(right) * scale, -q.dot(up) * scale] as [number, number]), d: c.dot(dir), fill: FILL[part]!, shade: 0.72 + 0.28 * Math.max(0, n.dot(light)) });
      }
    }
    ox += 7;
  }
  tris.sort((a, b) => a.d - b.d);
  const shade = (hex: string, s: number) => { const c = new THREE.Color(hex).multiplyScalar(s); return '#' + c.getHexString(); };
  const body = tris.map(t => '<path d="M' + t.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z" fill="' + shade(t.fill, t.shade) + '" stroke="' + shade(t.fill, t.shade * 0.8) + '" stroke-width="0.4"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -330 1100 520" width="1100" height="520"><rect x="-300" y="-330" width="1100" height="520" fill="#ececeb"/>' + body + '</svg>';
}
it('preview', () => {
  const kinds = ['sedan', 'taxi', 'hatch', 'van', 'bike'] as const;
  const models = kinds.map(k => vehicleModel(k));
  writeFileSync('/private/tmp/claude-501/-Users-skyline-PROJECTS-my-city/dc441803-46ff-4b65-9619-378996ea89a4/scratchpad/veh/a.svg', svgOf(models, 0));
  writeFileSync('/private/tmp/claude-501/-Users-skyline-PROJECTS-my-city/dc441803-46ff-4b65-9619-378996ea89a4/scratchpad/veh/b.svg', svgOf(models, Math.PI));
});
