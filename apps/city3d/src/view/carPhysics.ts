/* The player's car, arcade style (ADR-062). Pure and tested in Node; PovController feeds it the keys and keeps it
   on the road. What made the old model hard to drive, and what this does instead:
   - Turning rate grew with speed (a bicycle model): at walking pace a 90° turn took ~3 s, at top speed it was
     twitchy. Here the car turns on a tight circle at low speed (5.5 m) and the rate is capped, then eases off a
     little as speed rises: quick at junctions, steady on a straight.
   - It steered by itself (a lane assist turned it toward the nearest road, at a junction often the wrong one).
     There is no assist: the car goes where it is pointed.
   - A curb yanked it round to the road's direction. Here it slides along the curb, losing only the part of its
     speed that went into it (see slideAlongCurb).
   - Flat acceleration to 52 km/h. Here a strong start that tapers towards 70 km/h, firm brakes, gentle coasting,
     and a handbrake that turns tighter. */

export interface CarState {
  x: number;
  y: number;
  heading: number;
  /** m/s along the heading, negative in reverse */
  speed: number;
  /** −1 (full left) … 1 (full right), eased toward the keys */
  steer: number;
}

export interface DriveInput {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}

export const CAR = {
  MAX_SPEED: 19.5,          // m/s (70 km/h)
  REVERSE_MAX: 7,
  ACCEL: 9.5,               // m/s² from standstill, tapering to 0 at MAX_SPEED
  BRAKE: 18,
  ROLL: 1.4,                // coasting
  AIR: 0.004,               // × v², coasting from top speed loses ~3 m/s a second
  HANDBRAKE: 11,
  STEER_IN: 7,              // how fast the wheel follows a key (per s, full range is 1)
  STEER_OUT: 10,            // how fast it centres when let go
  MIN_RADIUS: 5.5,          // m, at full lock and low speed
  YAW_MAX: 1.6,             // rad/s
  YAW_FADE: 0.35,           // share of YAW_MAX given up by top speed
  HANDBRAKE_YAW: 1.45,      // × the turning rate while the handbrake is on
} as const;

/** how fast the car turns (rad/s) at full lock at this speed */
export function maxYawRate(speed: number): number {
  const v = Math.abs(speed);
  const turnSpeed = CAR.YAW_MAX * CAR.MIN_RADIUS;   // where the tight circle meets the cap (~8.8 m/s)
  if (v <= turnSpeed) return v / CAR.MIN_RADIUS;
  const over = Math.min(1, (v - turnSpeed) / Math.max(1, CAR.MAX_SPEED - turnSpeed));
  return CAR.YAW_MAX * (1 - CAR.YAW_FADE * over);
}

const toward = (value: number, target: number, step: number) =>
  Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step;

/** advance the car by dt seconds; mutates it */
export function stepCar(c: CarState, input: DriveInput, dt: number): void {
  // wheel
  const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  c.steer = toward(c.steer, want, (want === 0 || Math.sign(want) !== Math.sign(c.steer) ? CAR.STEER_OUT : CAR.STEER_IN) * dt);

  // pedals: brake slows a car going forward, and backs it up once stopped; throttle does the same the other way
  const v = c.speed;
  let a = 0;
  if (input.handbrake) {
    a = -Math.sign(v) * Math.min(Math.abs(v) / dt, CAR.HANDBRAKE);
  } else if (input.throttle && !input.brake) {
    a = v < -0.05 ? CAR.BRAKE : CAR.ACCEL * Math.max(0, 1 - (v / CAR.MAX_SPEED) ** 2);
  } else if (input.brake && !input.throttle) {
    a = v > 0.05 ? -CAR.BRAKE : -CAR.ACCEL * 0.7 * Math.max(0, 1 - (v / CAR.REVERSE_MAX) ** 2);
  } else if (Math.abs(v) > 0) {
    a = -Math.sign(v) * Math.min(Math.abs(v) / dt, CAR.ROLL + CAR.AIR * v * v);
  }
  let next = v + a * dt;
  // braking through zero stops it for this step; it backs up (or drives on) from the next
  if ((v > 0 && next < 0 && !input.brake) || (v < 0 && next > 0 && !input.throttle)) next = 0;
  if (v > 0.05 && next < 0) next = 0;
  if (v < -0.05 && next > 0) next = 0;
  c.speed = Math.max(-CAR.REVERSE_MAX, Math.min(CAR.MAX_SPEED, next));

  // turning: a fixed share of the speed-dependent rate, the same way round when backing up as a real car
  const yaw = c.steer * maxYawRate(c.speed) * Math.sign(c.speed) * (input.handbrake ? CAR.HANDBRAKE_YAW : 1);
  c.heading = wrap(c.heading + yaw * dt);
  c.x += Math.cos(c.heading) * c.speed * dt;
  c.y += Math.sin(c.heading) * c.speed * dt;
}

/**
 * The car has gone past the edge of the carriageway: put it back on the edge and keep the part of its motion
 * along the curb, as a car scraping a kerb in a game does. `centre` is the nearest point of the road's centre
 * line and `halfWidth` the carriageway's half width. Returns the share of the speed lost (0 = grazed, 1 = head on).
 */
export function slideAlongCurb(c: CarState, centre: readonly [number, number], halfWidth: number): number {
  const dx = c.x - centre[0], dy = c.y - centre[1], d = Math.hypot(dx, dy);
  if (d <= halfWidth || d < 1e-6) return 0;
  const nx = dx / d, ny = dy / d;   // outward
  c.x = centre[0] + nx * halfWidth;
  c.y = centre[1] + ny * halfWidth;
  const vx = Math.cos(c.heading) * c.speed, vy = Math.sin(c.heading) * c.speed;
  const out = vx * nx + vy * ny;
  if (out <= 0) return 0;
  const tx = vx - out * nx, ty = vy - out * ny, along = Math.hypot(tx, ty);
  const lost = Math.abs(c.speed) > 1e-6 ? 1 - along / Math.abs(c.speed) : 0;
  // keep the heading (the car is not spun round), only the speed it had into the curb is gone
  c.speed = Math.sign(c.speed) * along * 0.97;
  return lost;
}

const wrap = (a: number) => {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
};
