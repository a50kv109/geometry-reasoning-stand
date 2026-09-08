import {
  GeometrySource,
  GeometrySnapshot,
  GeometryTransition,
  GeometryDelta,
  GeometryTrace,
  VertexId,
} from '../types';
import { computeGeometryBase } from './geometryState';

/**
 * Creates an immutable GeometrySnapshot strictly from source parameters,
 * ensuring zero dependence on whether Classical or Matrix engine is active.
 */
export function createGeometrySnapshot(
  source: GeometrySource,
  timestamp: number = Date.now()
): GeometrySnapshot {
  const base = computeGeometryBase(source.pointsU, source.R);

  const arcAB = base.arcs.AB.fraction;
  const arcBC = base.arcs.BC.fraction;
  const arcCA = base.arcs.CA.fraction;

  // Inscribed Angle Theorem (opposite arc)
  const angleA = arcBC * 180;
  const angleB = arcCA * 180;
  const angleC = arcAB * 180;

  // Exact chord lengths via circle relationship: 2R * sin(arc * pi)
  const chordAB = 2 * source.R * Math.sin(arcAB * Math.PI);
  const chordBC = 2 * source.R * Math.sin(arcBC * Math.PI);
  const chordCA = 2 * source.R * Math.sin(arcCA * Math.PI);

  const perimeter = chordAB + chordBC + chordCA;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - chordAB) * (s - chordBC) * (s - chordCA)));

  const maxArc = Math.max(arcAB, arcBC, arcCA);
  let classification: 'acute' | 'right' | 'obtuse' = 'acute';
  if (Math.abs(maxArc - 0.5) < 0.008) {
    classification = 'right';
  } else if (maxArc > 0.5) {
    classification = 'obtuse';
  }

  return {
    timestamp,
    source: {
      pointsU: { ...source.pointsU },
      R: source.R,
      scale: source.scale,
    },
    arcs: { AB: arcAB, BC: arcBC, CA: arcCA },
    angles: { A: angleA, B: angleB, C: angleC },
    chords: { AB: chordAB, BC: chordBC, CA: chordCA },
    area,
    perimeter,
    classification,
  };
}

/**
 * Computes state transition between two snapshots.
 * Returns null if geometry did not change.
 */
export function computeTransition(
  prev: GeometrySnapshot,
  curr: GeometrySnapshot
): GeometryTransition | null {
  const eps = 1e-6;
  const dA = Math.abs(prev.source.pointsU.A - curr.source.pointsU.A);
  const dB = Math.abs(prev.source.pointsU.B - curr.source.pointsU.B);
  const dC = Math.abs(prev.source.pointsU.C - curr.source.pointsU.C);
  const dR = Math.abs(prev.source.R - curr.source.R);

  if (dA < eps && dB < eps && dC < eps && dR < eps) {
    return null;
  }

  let changedVertex: VertexId | null = null;
  if (dA >= dB && dA >= dC && dA >= eps) changedVertex = 'A';
  else if (dB >= dA && dB >= dC && dB >= eps) changedVertex = 'B';
  else if (dC >= dA && dC >= dB && dC >= eps) changedVertex = 'C';

  const deltas: GeometryDelta = {
    deltaArcs: {
      AB: (curr.arcs.AB - prev.arcs.AB) * 360,
      BC: (curr.arcs.BC - prev.arcs.BC) * 360,
      CA: (curr.arcs.CA - prev.arcs.CA) * 360,
    },
    deltaAngles: {
      A: curr.angles.A - prev.angles.A,
      B: curr.angles.B - prev.angles.B,
      C: curr.angles.C - prev.angles.C,
    },
    deltaChords: {
      AB: (curr.chords.AB - prev.chords.AB) * curr.source.scale,
      BC: (curr.chords.BC - prev.chords.BC) * curr.source.scale,
      CA: (curr.chords.CA - prev.chords.CA) * curr.source.scale,
    },
    deltaArea: (curr.area - prev.area) * (curr.source.scale * curr.source.scale),
    deltaPerimeter: (curr.perimeter - prev.perimeter) * curr.source.scale,
  };

  return {
    from: prev,
    to: curr,
    changedVertex,
    deltas,
  };
}

/**
 * Builds an explanatory Trace for why an inscribed angle has its specific value.
 */
export function buildAngleTrace(
  vertexId: VertexId,
  snapshot: GeometrySnapshot
): GeometryTrace {
  const oppMap: Record<VertexId, { arcKey: 'BC' | 'CA' | 'AB'; arcVertices: string }> = {
    A: { arcKey: 'BC', arcVertices: 'B и C' },
    B: { arcKey: 'CA', arcVertices: 'C и A' },
    C: { arcKey: 'AB', arcVertices: 'A и B' },
  };

  const { arcKey, arcVertices } = oppMap[vertexId];
  const arcFraction = snapshot.arcs[arcKey];
  const centralDeg = arcFraction * 360;
  const inscribedDeg = snapshot.angles[vertexId];

  return {
    target: `Угол ${vertexId}`,
    finalValue: `${inscribedDeg.toFixed(1)}°`,
    steps: [
      {
        stepNumber: 1,
        from: `Вершины ${arcVertices}`,
        relation: 'ограничивают дугу',
        operation: 'круговой интервал',
        to: `Дуга ${arcKey}`,
        value: `${(arcFraction * 100).toFixed(1)}% круга`,
        explanation: `Точки ${arcVertices} на окружности задают дугу ${arcKey}, противоположную вершине ${vertexId}.`,
      },
      {
        stepNumber: 2,
        from: `Дуга ${arcKey}`,
        relation: 'центральный угол',
        operation: 'доля × 360°',
        to: `Центральный угол`,
        value: `${centralDeg.toFixed(1)}°`,
        explanation: `Центральный угол, опирающийся на дугу ${arcKey}, равен ${centralDeg.toFixed(1)}°.`,
      },
      {
        stepNumber: 3,
        from: `Центральный угол (${centralDeg.toFixed(1)}°)`,
        relation: 'теорема о вписанном угле',
        operation: 'деление на 2',
        to: `Угол ${vertexId}`,
        value: `${inscribedDeg.toFixed(1)}°`,
        explanation: `Вписанный угол равен половине центрального угла: ${centralDeg.toFixed(1)}° / 2 = ${inscribedDeg.toFixed(1)}°.`,
      },
    ],
  };
}

/**
 * Builds an explanatory Trace for Radian measure.
 */
export function buildRadianTrace(
  arcKey: 'AB' | 'BC' | 'CA',
  snapshot: GeometrySnapshot
): GeometryTrace {
  const fraction = snapshot.arcs[arcKey];
  const R_mm = snapshot.source.R * snapshot.source.scale;
  const s_mm = fraction * 2 * Math.PI * R_mm;
  const radians = s_mm / R_mm;
  const isOneRadian = Math.abs(radians - 1.0) < 0.05;

  return {
    target: `Радианная мера дуги ${arcKey}`,
    finalValue: `${radians.toFixed(2)} рад (${(fraction * 360).toFixed(1)}°)`,
    steps: [
      {
        stepNumber: 1,
        from: `Окружность радиуса R`,
        relation: 'длина радиуса',
        operation: 'измерение',
        to: 'R',
        value: `${R_mm.toFixed(1)} мм`,
        explanation: 'Радиус служит базовым эталоном для измерения дуги.',
      },
      {
        stepNumber: 2,
        from: `Выбранная дуга ${arcKey}`,
        relation: 'доля от 2πR',
        operation: `доля × 2π × ${R_mm.toFixed(1)}`,
        to: 'Длина дуги s',
        value: `${s_mm.toFixed(1)} мм`,
        explanation: `Длина выбранной дуги по окружности составляет ${s_mm.toFixed(1)} мм.`,
      },
      {
        stepNumber: 3,
        from: 'Длина дуги s и радиус R',
        relation: 'определение радиана θ = s / R',
        operation: `${s_mm.toFixed(1)} / ${R_mm.toFixed(1)}`,
        to: 'Радиан',
        value: `${radians.toFixed(2)} рад`,
        explanation: isOneRadian
          ? `Длина дуги s (${s_mm.toFixed(1)} мм) в точности равна радиусу R (${R_mm.toFixed(1)} мм) — это ровно 1 радиан!`
          : `Отношение дуги к радиусу показывает, сколько радиусов укладывается в дуге: ${radians.toFixed(2)} рад.`,
      },
    ],
  };
}
