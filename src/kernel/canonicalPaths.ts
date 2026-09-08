// src/kernel/canonicalPaths.ts
// Exactly 6 Canonical DerivationPaths audited for semantic consistency

import { DerivationPath, FactMap, Point2D } from './types';

// Helper for distance calculation
function distance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

// 1. DP-ANG-SUM-C
// Requires: angle_A, angle_B
// Provides: angle_C
// Precondition: None
// Operation: 180 - A - B
export const DP_ANG_SUM_C: DerivationPath = {
  id: 'DP-ANG-SUM-C',
  description: 'Сумма углов треугольника: angle_C = 180° - angle_A - angle_B',
  requires: ['angle_A', 'angle_B'],
  provides: 'angle_C',
  operation: (k: FactMap) => {
    const a = Number(k['angle_A']);
    const b = Number(k['angle_B']);
    return 180 - a - b;
  },
};

// 2. DP-PYTH-HYP
// Requires: leg_a, leg_b, angle_C
// Provides: hypotenuse_c
// Precondition: angle_C == 90 (abs_tol 1e-4)
// Operation: hypot(leg_a, leg_b)
export const DP_PYTH_HYP: DerivationPath = {
  id: 'DP-PYTH-HYP',
  description: 'Теорема Пифагора: c = √(a² + b²) при угле C = 90°',
  requires: ['leg_a', 'leg_b', 'angle_C'],
  provides: 'hypotenuse_c',
  precondition: (k: FactMap) => {
    const angleC = Number(k['angle_C']);
    return Math.abs(angleC - 90) < 1e-4;
  },
  operation: (k: FactMap) => {
    const a = Number(k['leg_a']);
    const b = Number(k['leg_b']);
    return Math.hypot(a, b);
  },
};

// 3. DP-INSC-TO-CENT
// Requires: angle_A
// Provides: central_angle_BC
// Precondition: None
// Operation: 2 * angle_A
// Semantic relation: angle_A is inscribed angle subtending arc BC; central angle of arc BC is 2 * angle_A.
export const DP_INSC_TO_CENT: DerivationPath = {
  id: 'DP-INSC-TO-CENT',
  description: 'Теорема о вписанном угле: центральный угол дуги BC = 2 * вписанный угол A',
  requires: ['angle_A'],
  provides: 'central_angle_BC',
  operation: (k: FactMap) => {
    const angleA = Number(k['angle_A']);
    return 2 * angleA;
  },
};

// 4. DP-CHORD-TRIG
// Requires: R, central_angle_BC
// Provides: chord_BC
// Precondition: None
// Operation: 2 * R * sin(central_angle_BC / 2 * π / 180)
// Semantic relation: Chord BC subtends central angle of arc BC.
export const DP_CHORD_TRIG: DerivationPath = {
  id: 'DP-CHORD-TRIG',
  description: 'Длина хорды BC через радиус и центральный угол: 2R * sin(central_BC / 2)',
  requires: ['R', 'central_angle_BC'],
  provides: 'chord_BC',
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const centralDeg = Number(k['central_angle_BC']);
    const halfAngleRad = (centralDeg / 2) * (Math.PI / 180);
    return 2 * r * Math.sin(halfAngleRad);
  },
};

// 5. DP-THALES-CLASS
// Requires: coord_A, coord_C, R
// Provides: triangle_class = "right"
// Precondition: dist(A, C) == 2R (abs_tol 1e-4) -> AC is diameter, so inscribed angle B = 90°
// Operation: return "right"
export const DP_THALES_CLASS: DerivationPath = {
  id: 'DP-THALES-CLASS',
  description: 'Теорема Фалеса: если хорда AC является диаметром (AC = 2R), треугольник прямоугольный',
  requires: ['coord_A', 'coord_C', 'R'],
  provides: 'triangle_class',
  precondition: (k: FactMap) => {
    const pA = k['coord_A'] as Point2D;
    const pC = k['coord_C'] as Point2D;
    const r = Number(k['R']);
    if (!pA || !pC || !r) return false;
    const distAC = distance(pA, pC);
    return Math.abs(distAC - 2 * r) < 1e-4;
  },
  operation: () => 'right',
};

// 6. DP-COORD-CLASS
// Requires: coord_A, coord_B, coord_C
// Provides: triangle_class
// Precondition: None (Fallback coordinate classifier based on side squares)
// Operation: classify by squared side lengths
export const DP_COORD_CLASS: DerivationPath = {
  id: 'DP-COORD-CLASS',
  description: 'Классификация по координатам: через квадраты длин сторон a² + b² vs c²',
  requires: ['coord_A', 'coord_B', 'coord_C'],
  provides: 'triangle_class',
  operation: (k: FactMap) => {
    const pA = k['coord_A'] as Point2D;
    const pB = k['coord_B'] as Point2D;
    const pC = k['coord_C'] as Point2D;
    
    // Side lengths:
    // a = BC, b = AC, c = AB
    const a2 = Math.pow(pB.x - pC.x, 2) + Math.pow(pB.y - pC.y, 2);
    const b2 = Math.pow(pA.x - pC.x, 2) + Math.pow(pA.y - pC.y, 2);
    const c2 = Math.pow(pA.x - pB.x, 2) + Math.pow(pA.y - pB.y, 2);

    const sides = [a2, b2, c2].sort((x, y) => x - y);
    const sumSmaller = sides[0] + sides[1];
    const largest = sides[2];

    const diff = sumSmaller - largest;
    if (Math.abs(diff) < 1e-4) {
      return 'right';
    } else if (diff > 0) {
      return 'acute';
    } else {
      return 'obtuse';
    }
  },
};

// Canonical baseline array of exactly 6 paths
export const CANONICAL_GRAPH: readonly DerivationPath[] = [
  DP_ANG_SUM_C,
  DP_PYTH_HYP,
  DP_INSC_TO_CENT,
  DP_CHORD_TRIG,
  DP_THALES_CLASS,
  DP_COORD_CLASS,
] as const;
