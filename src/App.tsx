import React, { useState, useMemo } from 'react';
import { ActiveHighlight, FrozenSnapshot, ScaleMode } from './types';
import { ClassicalEngine } from './engines/classicalEngine';
import { MatrixEngine } from './engines/matrixEngine';
import { computeGeometryBase } from './engines/geometryState';
import { createGeometrySnapshot, computeTransition } from './engines/temporalObserver';
import { CanvasStage } from './components/CanvasStage';
import { RelationMap } from './components/RelationMap';
import { TriangleStateTable } from './components/TriangleStateTable';
import { ArcChordTable } from './components/ArcChordTable';
import { TopologicalClassCard } from './components/TopologicalClassCard';
import { FreezeCard } from './components/FreezeCard';
import { EngineBenchmarkPanel } from './components/EngineBenchmarkPanel';
import { LearningGuide } from './components/LearningGuide';
import { InteractiveTextbook } from './components/InteractiveTextbook';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CircleDot, Sparkles, RefreshCw, Activity, GraduationCap } from 'lucide-react';

export default function App() {
  // Geometric State (positions on normalized circle [0, 1))
  const [pointsU, setPointsU] = useState<{ A: number; B: number; C: number }>({
    A: 0.12,
    B: 0.45,
    C: 0.78,
  });

  // Rotation around center O (in degrees [0, 360))
  const [rotationDeg, setRotationDeg] = useState<number>(0);

  // Protractor and Arcs Scale Mode: 'degrees' | 'radians' | 'fractions'
  const [scaleMode, setScaleMode] = useState<ScaleMode>('degrees');

  // Educational scale factor (default: 1 px = 1 mm)
  const [scale, setScale] = useState<number>(1.0);

  // Right Panel Active Tab: 'stats' (СТАТИСТИКА / ЛАБОРАТОРИЯ) | 'learning' (ОБУЧЕНИЕ)
  const [rightPanelTab, setRightPanelTab] = useState<'stats' | 'learning'>('stats');

  const R = 100; // Standard radius
  const [currentEngine, setCurrentEngine] = useState<'classical' | 'matrix'>('classical');
  const [verifyEnabled, setVerifyEnabled] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenSnapshot, setFrozenSnapshot] = useState<FrozenSnapshot | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight>(null);
  const [mode, setMode] = useState<'explore' | 'learn'>('explore');

  // Compute geometry & engine results
  const classicalEngine = useMemo(() => new ClassicalEngine(), []);
  const matrixEngine = useMemo(() => new MatrixEngine(), []);

  const classicalResult = useMemo(
    () => classicalEngine.compute(pointsU, R),
    [classicalEngine, pointsU, R]
  );

  const matrixResult = useMemo(
    () => matrixEngine.compute(pointsU, R),
    [matrixEngine, pointsU, R]
  );

  const activeResult = currentEngine === 'classical' ? classicalResult : matrixResult;
  const geoBase = useMemo(() => computeGeometryBase(pointsU, R), [pointsU, R]);

  // Baseline snapshot for temporal observation (t0 -> t1)
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    createGeometrySnapshot({ pointsU, R, scale })
  );

  // Current snapshot derived purely from geometry parameters (Rule 3: Snapshot !== EngineResult)
  const currentSnapshot = useMemo(
    () => createGeometrySnapshot({ pointsU, R, scale }),
    [pointsU, R, scale]
  );

  // Dynamic transition & deltas
  const transition = useMemo(
    () => computeTransition(baselineSnapshot, currentSnapshot),
    [baselineSnapshot, currentSnapshot]
  );

  // Handlers
  const handleSelectPreset = (type: 'acute' | 'right' | 'obtuse') => {
    let newPts = { A: 0.08, B: 0.42, C: 0.75 };
    if (type === 'acute') {
      newPts = { A: 0.08, B: 0.42, C: 0.75 };
    } else if (type === 'right') {
      newPts = { A: 0.0, B: 0.5, C: 0.25 };
    } else if (type === 'obtuse') {
      newPts = { A: 0.04, B: 0.18, C: 0.76 };
    }
    setPointsU(newPts);
    setBaselineSnapshot(createGeometrySnapshot({ pointsU: newPts, R, scale }));
  };

  const handleReset = () => {
    const defaultPts = { A: 0.08, B: 0.42, C: 0.75 };
    setPointsU(defaultPts);
    setRotationDeg(0);
    setBaselineSnapshot(createGeometrySnapshot({ pointsU: defaultPts, R, scale }));
  };

  const handleToggleFreeze = () => {
    if (isFrozen) {
      setIsFrozen(false);
    } else {
      setFrozenSnapshot({
        timestamp: Date.now(),
        points: { ...pointsU },
        R,
        classicalResult: { ...classicalResult },
        matrixResult: { ...matrixResult },
      });
      setIsFrozen(true);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAFC] text-slate-800 select-none font-sans">
      {/* Top Header (Fixed bar, does not scroll) */}
      <header className="flex-none w-full border-b border-slate-200 bg-white px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-100">
            <CircleDot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm leading-tight text-slate-900">
                Circle Triangle Playground
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                50/50 WORKBENCH
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Геометрический циферблат : Реляционная геометрия на окружности
            </p>
          </div>
        </div>

        {/* Presets and Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick Presets */}
          <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 px-1 font-medium">Пресеты:</span>
            <button
              id="topPresetAcute"
              onClick={() => handleSelectPreset('acute')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'acute'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Острый
            </button>
            <button
              id="topPresetRight"
              onClick={() => handleSelectPreset('right')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'right'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Прямой (Фалес)
            </button>
            <button
              id="topPresetObtuse"
              onClick={() => handleSelectPreset('obtuse')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'obtuse'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Тупой
            </button>
          </div>

          <button
            id="resetPointsBtn"
            onClick={handleReset}
            title="Сбросить точки и угол поворота"
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Сброс
          </button>

          <button
            id="topModeBtn"
            onClick={() => {
              if (rightPanelTab === 'stats') {
                setRightPanelTab('learning');
                setMode('learn');
              } else {
                setRightPanelTab('stats');
                setMode('explore');
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition ${
              rightPanelTab === 'learning' || mode === 'learn'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            {rightPanelTab === 'learning' ? 'Лаборатория (Статистика)' : 'Обучение (Учебник)'}
          </button>
        </div>
      </header>

      {/* Main 50/50 Screen Split:
          Left: GEOMETRY (Fixed in place, overflow-hidden, 100% visible)
          Right: ANALYSIS (Scrollable, own independent scrollbar)
      */}
      <main className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        
        {/* ========================================================
            ЛЕВАЯ ПАНЕЛЬ — GEOMETRY (50% ширины на desktop)
            ВСЕГДА ОСТАЁТСЯ ПОЛНОСТЬЮ ВИДИМОЙ, НЕ СКРОЛЛИТСЯ
            ======================================================== */}
        <section
          id="geometryLeftPanel"
          aria-label="Geometry Workbench"
          className="h-full overflow-hidden flex flex-col p-3 md:p-4 bg-white/70 border-r border-slate-200 justify-between"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                GEOMETRY
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Интерактивный циферблат
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Тяните вершины A, B, C или вращайте диск ↻
            </div>
          </div>

          {/* Interactive Geometry Stage (Maximizing Available Screen Space) */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <CanvasStage
              pointsU={pointsU}
              onChangePoints={setPointsU}
              rotationDeg={rotationDeg}
              onChangeRotation={setRotationDeg}
              scaleMode={scaleMode}
              onChangeScaleMode={setScaleMode}
              activeHighlight={activeHighlight}
              onHoverHighlight={setActiveHighlight}
              engineResult={activeResult}
              R={R}
              scale={scale}
              onChangeScale={setScale}
            />
          </div>
        </section>

        {/* ========================================================
            ПРАВАЯ ПАНЕЛЬ — ANALYSIS (50% ширины на desktop)
            ИМЕЕТ СОБСТВЕННЫЙ СКРОЛЛ (overflow-y: auto)
            ======================================================== */}
        <section
          id="analysisRightPanel"
          aria-label="Analysis & Calculations"
          className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-5 bg-[#F8FAFC]"
        >
          {/* Top Mode Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/70 shadow-2xs">
              <button
                id="rightTabStatsBtn"
                onClick={() => {
                  setRightPanelTab('stats');
                  setMode('explore');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  rightPanelTab === 'stats'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>СТАТИСТИКА / ЛАБОРАТОРИЯ</span>
              </button>
              <button
                id="rightTabLearningBtn"
                onClick={() => {
                  setRightPanelTab('learning');
                  setMode('learn');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  rightPanelTab === 'learning'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>ОБУЧЕНИЕ</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                1 px = {scale} мм (учебный)
              </span>
              <div className="text-[11px] font-mono text-slate-400">
                ↕ Прокрутка
              </div>
            </div>
          </div>

          {rightPanelTab === 'stats' ? (
            <ErrorBoundary fallbackTitle="Ошибка отображения лаборатории">
              {/* 1. TRIANGLE STATE */}
              <TriangleStateTable
                vertices={geoBase.vertices}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                R={R}
                scale={scale}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                transition={transition}
                onResetBaseline={() => setBaselineSnapshot(currentSnapshot)}
              />

              {/* 2. RELATION MAP */}
              <RelationMap
                engineResult={activeResult}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                scale={scale}
              />

              {/* 3. ARC / CHORD TABLE */}
              <ArcChordTable
                engineResult={activeResult}
                scaleMode={scaleMode}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                R={R}
                scale={scale}
              />

              {/* 4. TOPOLOGICAL CLASS */}
              <TopologicalClassCard
                engineResult={activeResult}
              />

              {/* 5. CLASSICAL / MATRIX, OPERATION COUNT, VERIFY, EXPERIMENT / BENCHMARK */}
              <EngineBenchmarkPanel
                currentEngine={currentEngine}
                onSelectEngine={setCurrentEngine}
                activeResult={activeResult}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                verifyEnabled={verifyEnabled}
                onToggleVerify={() => setVerifyEnabled(!verifyEnabled)}
                pointsU={pointsU}
                R={R}
              />

              {/* 6. LEARN MODE */}
              <LearningGuide
                currentClass={activeResult.classification}
                onSelectPreset={handleSelectPreset}
                mode={mode}
                onSetMode={(m) => {
                  setMode(m);
                  if (m === 'learn') setRightPanelTab('learning');
                }}
              />

              {/* 7. FREEZE TRIANGLE */}
              <FreezeCard
                frozenSnapshot={frozenSnapshot}
                onToggleFreeze={handleToggleFreeze}
                isFrozen={isFrozen}
                scale={scale}
              />

              {/* Educational Philosophy Footer */}
              <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 mt-2">
                Система понятий: <strong className="text-slate-600">ОКРУЖНОСТЬ ➔ ТОЧКИ ➔ ХОРДЫ ➔ ДУГИ ➔ РАДИУСЫ ➔ УГЛЫ ➔ СВЯЗИ ➔ ВЫЧИСЛЕНИЯ</strong>
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary fallbackTitle="Ошибка отображения интерактивного учебника">
              <InteractiveTextbook
                vertices={geoBase.vertices}
                engineResult={activeResult}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                R={R}
                scale={scale}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                onSelectPreset={handleSelectPreset}
                frozenSnapshot={frozenSnapshot}
                isFrozen={isFrozen}
                pointsU={pointsU}
                onChangePoints={setPointsU}
                scaleMode={scaleMode}
                onChangeScaleMode={setScaleMode}
              />
            </ErrorBoundary>
          )}
        </section>

      </main>
    </div>
  );
}
