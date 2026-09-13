import React from 'react';
import { EngineResult, VertexPoint, ActiveHighlight, GeometryTransition } from '../types';
import { formatCircleFraction } from '../engines/geometryState';
import { formatTwoLevelLength, formatTwoLevelArea } from '../utils/units';
import { Activity, RotateCcw } from 'lucide-react';

interface TriangleStateTableProps {
  vertices: VertexPoint[];
  classicalResult: EngineResult;
  matrixResult: EngineResult;
  R: number;
  scale?: number;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  transition?: GeometryTransition | null;
  onResetBaseline?: () => void;
}

export const TriangleStateTable: React.FC<TriangleStateTableProps> = ({
  vertices,
  classicalResult,
  matrixResult,
  R,
  scale = 1.0,
  activeHighlight,
  onHoverHighlight,
  transition,
  onResetBaseline,
}) => {
  const vA = vertices.find((v) => v.id === 'A')!;
  const vB = vertices.find((v) => v.id === 'B')!;
  const vC = vertices.find((v) => v.id === 'C')!;

  const lenAB = formatTwoLevelLength(classicalResult.chords.AB, scale);
  const lenBC = formatTwoLevelLength(classicalResult.chords.BC, scale);
  const lenCA = formatTwoLevelLength(classicalResult.chords.CA, scale);

  const isDiameterAB = Math.abs(matrixResult.arcs.AB - 0.5) < 0.008;
  const isDiameterBC = Math.abs(matrixResult.arcs.BC - 0.5) < 0.008;
  const isDiameterCA = Math.abs(matrixResult.arcs.CA - 0.5) < 0.008;

  const perimClassical = formatTwoLevelLength(classicalResult.perimeter, scale);
  const perimMatrix = formatTwoLevelLength(matrixResult.perimeter, scale);

  const areaClassical = formatTwoLevelArea(classicalResult.area, scale);
  const areaMatrix = formatTwoLevelArea(matrixResult.area, scale);

  const radiusFormatted = formatTwoLevelLength(R, scale);

  const rows: Array<{
    id: string;
    category: string;
    element: string;
    classicalVal: React.ReactNode;
    matrixVal: React.ReactNode;
    relationVal: string;
    highlightKey?: ActiveHighlight;
  }> = [
    {
      id: 'vertex-A',
      category: 'Вершины',
      element: 'Вершина A',
      classicalVal: <span>{Math.round(vA.angleDeg)}°</span>,
      matrixVal: <span>u = {vA.u.toFixed(2)} ({(vA.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'A ⟷ противоположная дуга BC',
      highlightKey: { type: 'vertex', id: 'A' },
    },
    {
      id: 'vertex-B',
      category: 'Вершины',
      element: 'Вершина B',
      classicalVal: <span>{Math.round(vB.angleDeg)}°</span>,
      matrixVal: <span>u = {vB.u.toFixed(2)} ({(vB.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'B ⟷ противоположная дуга CA',
      highlightKey: { type: 'vertex', id: 'B' },
    },
    {
      id: 'vertex-C',
      category: 'Вершины',
      element: 'Вершина C',
      classicalVal: <span>{Math.round(vC.angleDeg)}°</span>,
      matrixVal: <span>u = {vC.u.toFixed(2)} ({(vC.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'C ⟷ противоположная дуга AB',
      highlightKey: { type: 'vertex', id: 'C' },
    },
    {
      id: 'arc-AB',
      category: 'Дуги',
      element: 'Дуга AB',
      classicalVal: <span>{(classicalResult.arcs.AB * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.AB)}</span>,
      relationVal: 'Хорда AB, напротив ∠C',
      highlightKey: { type: 'arc', id: 'AB' },
    },
    {
      id: 'arc-BC',
      category: 'Дуги',
      element: 'Дуга BC',
      classicalVal: <span>{(classicalResult.arcs.BC * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.BC)}</span>,
      relationVal: 'Хорда BC, напротив ∠A',
      highlightKey: { type: 'arc', id: 'BC' },
    },
    {
      id: 'arc-CA',
      category: 'Дуги',
      element: 'Дуга CA',
      classicalVal: <span>{(classicalResult.arcs.CA * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.CA)}</span>,
      relationVal: 'Хорда CA, напротив ∠B',
      highlightKey: { type: 'arc', id: 'CA' },
    },
    {
      id: 'side-AB',
      category: 'Стороны (Хорды)',
      element: 'Сторона AB',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenAB.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenAB.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterAB ? `D = 2R = ${lenAB.mm}` : lenAB.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterAB ? `(2R = ${lenAB.px})` : `(${lenAB.px})`}
          </span>
        </div>
      ),
      relationVal: 'C ⟷ AB (хорда дуги AB)',
      highlightKey: { type: 'side', id: 'AB' },
    },
    {
      id: 'side-BC',
      category: 'Стороны (Хорды)',
      element: 'Сторона BC',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenBC.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenBC.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterBC ? `D = 2R = ${lenBC.mm}` : lenBC.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterBC ? `(2R = ${lenBC.px})` : `(${lenBC.px})`}
          </span>
        </div>
      ),
      relationVal: 'A ⟷ BC (хорда дуги BC)',
      highlightKey: { type: 'side', id: 'BC' },
    },
    {
      id: 'side-CA',
      category: 'Стороны (Хорды)',
      element: 'Сторона CA',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenCA.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenCA.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterCA ? `D = 2R = ${lenCA.mm}` : lenCA.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterCA ? `(2R = ${lenCA.px})` : `(${lenCA.px})`}
          </span>
        </div>
      ),
      relationVal: 'B ⟷ CA (хорда дуги CA)',
      highlightKey: { type: 'side', id: 'CA' },
    },
    {
      id: 'angle-A',
      category: 'Углы',
      element: '∠A',
      classicalVal: <span>{classicalResult.angles.A.toFixed(1)}°</span>,
      matrixVal: <span>½ дуги BC ({(matrixResult.arcs.BC * 180).toFixed(1)}°)</span>,
      relationVal: 'A ⟷ дуга BC',
      highlightKey: { type: 'vertex', id: 'A' },
    },
    {
      id: 'angle-B',
      category: 'Углы',
      element: '∠B',
      classicalVal: <span>{classicalResult.angles.B.toFixed(1)}°</span>,
      matrixVal: <span>½ дуги CA ({(matrixResult.arcs.CA * 180).toFixed(1)}°)</span>,
      relationVal: 'B ⟷ дуга CA',
      highlightKey: { type: 'vertex', id: 'B' },
    },
    {
      id: 'angle-C',
      category: 'Углы',
      element: '∠C',
      classicalVal: <span>{classicalResult.angles.C.toFixed(1)}°</span>,
      matrixVal: <span>½ дуги AB ({(matrixResult.arcs.AB * 180).toFixed(1)}°)</span>,
      relationVal: 'C ⟷ дуга AB',
      highlightKey: { type: 'vertex', id: 'C' },
    },
    {
      id: 'radius-R',
      category: 'Метрика',
      element: 'Радиус R',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{radiusFormatted.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({radiusFormatted.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">R = {radiusFormatted.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({radiusFormatted.px})</span>
        </div>
      ),
      relationVal: 'OA = OB = OC = R (общий центр)',
      highlightKey: { type: 'center' },
    },
    {
      id: 'center-O',
      category: 'Метрика',
      element: 'Центр O',
      classicalVal: (
        <span>
          {classicalResult.classification === 'acute'
            ? 'INSIDE (внутри)'
            : classicalResult.classification === 'right'
            ? 'ON SIDE (на стороне)'
            : 'OUTSIDE (снаружи)'}
        </span>
      ),
      matrixVal: (
        <span>
          {matrixResult.classification === 'acute'
            ? 'd_max < 0.5 (внутри)'
            : matrixResult.classification === 'right'
            ? 'd_max = 0.5 (диаметр)'
            : 'd_max > 0.5 (снаружи)'}
        </span>
      ),
      relationVal: 'Положение центра относительно хорд',
      highlightKey: { type: 'center' },
    },
    {
      id: 'perimeter',
      category: 'Метрика',
      element: 'Периметр',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{perimClassical.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({perimClassical.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">{perimMatrix.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({perimMatrix.px})</span>
        </div>
      ),
      relationVal: 'AB + BC + CA (сумма хорд)',
    },
    {
      id: 'area',
      category: 'Метрика',
      element: 'Площадь S',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{areaClassical.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({areaClassical.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">{areaMatrix.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({areaMatrix.px})</span>
        </div>
      ),
      relationVal: 'Площадь вписанного треугольника',
    },
  ];

  return (
    <div
      id="triangleStateTableSection"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            TRIANGLE STATE
          </span>
          <span className="text-xs text-slate-600 ml-2 font-medium">
            — Один треугольник → Два способа описания
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
            1 px = {scale} мм (учебный)
          </span>
          <span className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
            Live Sync
          </span>
        </div>
      </div>

      {/* Temporal Transition Banner (Observation of Dynamics t0 -> t1) */}
      {transition && (
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white">
                <Activity className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Динамика изменений ({transition.changedVertex ? `Перемещена вершина ${transition.changedVertex}` : 'Изменение геометрии'})
              </span>
            </div>
            {onResetBaseline && (
              <button
                onClick={onResetBaseline}
                title="Принять текущее положение треугольника за точку отсчёта t0"
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100/60 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Зафиксировать t₀</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Угла {transition.changedVertex || 'A'}</span>
              <span className={`font-mono font-bold text-xs ${
                (transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0) >= 0 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {(transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0) >= 0 ? '+' : ''}
                {(transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0).toFixed(1)}°
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">
                Δ Дуги {transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'}
              </span>
              <span className={`font-mono font-bold text-xs ${
                (transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0) >= 0 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {(transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0) >= 0 ? '+' : ''}
                {(transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0).toFixed(1)}°
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Площади S</span>
              <span className={`font-mono font-bold text-xs ${
                transition.deltas.deltaArea >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {transition.deltas.deltaArea >= 0 ? '+' : ''}
                {transition.deltas.deltaArea.toFixed(1)} мм²
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Периметра P</span>
              <span className={`font-mono font-bold text-xs ${
                transition.deltas.deltaPerimeter >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {transition.deltas.deltaPerimeter >= 0 ? '+' : ''}
                {transition.deltas.deltaPerimeter.toFixed(1)} мм
              </span>
            </div>
          </div>

          {transition.invariantStatuses && transition.invariantStatuses.length > 0 && (
            <div className="bg-white/90 p-2 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-slate-700">
                Инвариант Фалеса (∠ACB = 90°):
              </span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                  transition.invariantStatuses[0].status === 'PRESERVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : transition.invariantStatuses[0].status === 'DEGENERATE'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {transition.invariantStatuses[0].status === 'PRESERVED'
                  ? 'СОХРАНЁН (PRESERVED)'
                  : transition.invariantStatuses[0].status === 'DEGENERATE'
                  ? 'ВЫРОЖДЕН (DEGENERATE)'
                  : 'НАРУШЕН (BROKEN)'}
              </span>
            </div>
          )}

          <p className="text-[11px] text-indigo-900/80 leading-relaxed font-normal">
            <strong>Закон связи в динамике:</strong> перемещение вершины на окружности непрерывно изменяет опирающуюся на неё дугу и угол в строгой пропорции: <code className="text-indigo-950 font-bold bg-white/70 px-1 py-0.5 rounded">Δ∠ = ½ · ΔДуга</code>.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <th className="py-2.5 px-3 bg-slate-50 rounded-l-lg">ЭЛЕМЕНТ</th>
              <th className="py-2.5 px-3 bg-slate-50 text-indigo-700">CLASSICAL (Trig)</th>
              <th className="py-2.5 px-3 bg-slate-50 text-emerald-700">RELATIONAL / MATRIX</th>
              <th className="py-2.5 px-3 bg-slate-50 text-slate-600 rounded-r-lg">ОТНОШЕНИЕ В СИСТЕМЕ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => {
              const isHighlighted =
                row.highlightKey &&
                activeHighlight &&
                row.highlightKey.type === activeHighlight.type &&
                (row.highlightKey as any).id === (activeHighlight as any).id;

              return (
                <tr
                  key={row.id}
                  id={`stateTableRow-${row.id}`}
                  onMouseEnter={() => row.highlightKey && onHoverHighlight(row.highlightKey)}
                  onMouseLeave={() => onHoverHighlight(null)}
                  className={`transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-indigo-50/70 text-indigo-950 font-medium'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {row.element}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {row.classicalVal}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {row.matrixVal}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {row.relationVal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
