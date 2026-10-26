import { describe, expect, it } from 'vitest';
import { CAR, maxYawRate, slideAlongCurb, stepCar, type CarState, type DriveInput } from './carPhysics';

const keys = (k: Partial<DriveInput> = {}): DriveInput => ({ throttle: false, brake: false, left: false, right: false, handbrake: false, ...k });
const car = (speed = 0): CarState => ({ x: 0, y: 0, heading: 0, speed, steer: 0 });
const run = (c: CarState, k: DriveInput, seconds: number, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) stepCar(c, k, dt); };

describe('arcade car (ADR-062)', () => {
  it('turns tight at low speed and steadily at high speed (the old model did the opposite)', () => {
    expect(3 / maxYawRate(3)).toBeCloseTo(CAR.MIN_RADIUS, 5);           // a 5.5 m circle at walking pace
    expect(maxYawRate(CAR.MAX_SPEED)).toBeLessThan(maxYawRate(9));        // calmer at top speed than at junction speed
    expect(maxYawRate(CAR.MAX_SPEED)).toBeGreaterThan(0.9);
    // a 90° turn at 4 m/s, full lock: well under 3 s
    const c = car(4);
    let t = 0;
    while (c.heading < Math.PI / 2 && t < 5) { stepCar(c, keys({ right: true, throttle: true }), 1 / 60); c.speed = Math.min(c.speed, 4); t += 1 / 60; }
    expect(t).toBeLessThan(2.3);
  });

  it('pulls away strongly, tops out near 70 km/h, brakes hard, coasts gently', () => {
    const c = car();
    run(c, keys({ throttle: true }), 2.5);
    expect(c.speed * 3.6).toBeGreaterThan(50);
    run(c, keys({ throttle: true }), 10);
    expect(c.speed * 3.6).toBeGreaterThan(65);
    expect(c.speed).toBeLessThanOrEqual(CAR.MAX_SPEED);
    const fast = c.speed;
    run(c, keys(), 1);
    expect(c.speed).toBeLessThan(fast);
    expect(c.speed).toBeGreaterThan(fast - 4);
    run(c, keys({ brake: true }), 1.2);
    expect(c.speed).toBeLessThanOrEqual(0.5);
  });

  it('stops on the brake, then backs up while it is held; the wheel centres when let go', () => {
    const c = car(5);
    run(c, keys({ brake: true }), 0.5);
    expect(c.speed).toBeLessThanOrEqual(0);
    run(c, keys({ brake: true }), 2);
    expect(c.speed).toBeLessThan(-2);
    expect(c.speed).toBeGreaterThanOrEqual(-CAR.REVERSE_MAX);
    run(c, keys({ left: true }), 0.3);
    expect(c.steer).toBeLessThan(-0.9);
    run(c, keys(), 0.15);
    expect(c.steer).toBe(0);
  });

  it('drives straight on with no keys: nothing steers it', () => {
    const c = car(10);
    run(c, keys({ throttle: true }), 3);
    expect(c.heading).toBe(0);
    expect(c.y).toBe(0);
  });

  it('slides along a curb, keeping the speed it had along it', () => {
    // driving along +x at 20° into a curb on the +y side of a road centred on y = 0, half width 3
    const c: CarState = { x: 0, y: 3.4, heading: (20 * Math.PI) / 180, speed: 15, steer: 0 };
    const lost = slideAlongCurb(c, [0, 0], 3);
    expect(c.y).toBeCloseTo(3, 5);
    expect(lost).toBeLessThan(0.1);
    expect(c.speed).toBeGreaterThan(13);
    expect(c.heading).toBeCloseTo((20 * Math.PI) / 180, 9);
    // head on it stops
    const h: CarState = { x: 0, y: 3.4, heading: Math.PI / 2, speed: 10, steer: 0 };
    expect(slideAlongCurb(h, [0, 0], 3)).toBeGreaterThan(0.95);
    expect(Math.abs(h.speed)).toBeLessThan(0.5);
    // inside the road nothing happens
    const ok: CarState = { x: 0, y: 1, heading: 0, speed: 10, steer: 0 };
    expect(slideAlongCurb(ok, [0, 0], 3)).toBe(0);
    expect(ok.speed).toBe(10);
  });
});
