import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VertexId, ActiveHighlight, EngineResult, ScaleMode } from '../types';
import { computeGeometryBase, normalizeU, formatArcFraction } from '../engines/geometryState';
import { RotateCw, RotateCcw, Compass, CheckCircle2 } from 'lucide-react';

interface CanvasStageProps {
  pointsU: { A: number; B: number; C: number };
  onChangePoints: (newPoints: { A: number; B: number; C: number }) => void;
  rotationDeg: number;
  onChangeRotation: (newDeg: number) => void;
  scaleMode: ScaleMode;
  onChangeScaleMode: (mode: ScaleMode) => void;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  engineResult: EngineResult;
  R: number;
  scale?: number;
  onChangeScale?: (newScale: number) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  pointsU,
  onChangePoints,
  rotationDeg,
  onChangeRotation,
  scaleMode,
  onChangeScaleMode,
  activeHighlight,
  onHoverHighlight,
  engineResult,
  R: propR,
  scale = 1.0,
  onChangeScale,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingMode, setDraggingMode] = useState<'vertex' | 'rotate' | null>(null);
  const [activeVertex, setActiveVertex] = useState<VertexId | null>(null);
  const [rotateStartAngle, setRotateStartAngle] = useState<number>(0);
  const [initialRotationOnDrag, setInitialRotationOnDrag] = useState<number>(0);
  const [showRadii, setShowRadii] = useState(true);
  const [showArcLabels, setShowArcLabels] = useState(true);
  const [showProtractor, setShowProtractor] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 480, height: 480 });

  // Update canvas size dynamically to maximize available space in the left panel
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Available space considering controls
        const availableWidth = Math.max(280, width);
        const availableHeight = Math.max(280, height);
        const size = Math.min(availableWidth, availableHeight);
        setDimensions({ width: size, height: size });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  // Make circle as large as possible while keeping room for protractor & rotation ring
  const renderRadius = Math.max(100, Math.min(dimensions.width, dimensions.height) * 0.35);
  const protractorRadius = renderRadius + 18;
  const rotationRingRadius = renderRadius + 34;

  const rotationRad = (rotationDeg * Math.PI) / 180;

  // Geometry calculation for drawing
  const geo = computeGeometryBase(pointsU, renderRadius);

  const arcAB = geo.arcs.AB;
  const arcFractionAB = arcAB ? arcAB.fraction : 0;
  const arcRadAB = arcFractionAB * 2 * Math.PI;
  const arcDegAB = arcAB ? arcAB.deg : 0;
  const isNearOneRadian = Math.abs(arcRadAB - 1.0) < 0.045;
  const isRadianRatioActive = activeHighlight?.type === 'ratio' && activeHighlight.kind === 'radian';
  const isPiRatioActive = activeHighlight?.type === 'ratio' && activeHighlight.kind === 'pi';

  // Screen coordinates with system rotation around O
  const getScreenPos = useCallback(
    (u: number) => {
      const angle = u * 2 * Math.PI + rotationRad;
      return {
        x: centerX + renderRadius * Math.cos(angle),
        y: centerY + renderRadius * Math.sin(angle),
        angle,
      };
    },
    [centerX, centerY, renderRadius, rotationRad]
  );

  const posA = getScreenPos(pointsU.A);
  const posB = getScreenPos(pointsU.B);
  const posC = getScreenPos(pointsU.C);

  // Position of rotation knob on the outer ring
  const knobAngle = rotationRad - Math.PI / 2; // Default top
  const knobPos = {
    x: centerX + rotationRingRadius * Math.cos(knobAngle),
    y: centerY + rotationRingRadius * Math.sin(knobAngle),
  };

  // Main Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // 0. Outer Rotation Guide Track (subtle dashed ring)
    ctx.beginPath();
    ctx.arc(centerX, centerY, rotationRingRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = draggingMode === 'rotate' ? 'rgba(99, 102, 241, 0.4)' : '#F1F5F9';
    ctx.lineWidth = draggingMode === 'rotate' ? 2 : 1.5;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Protractor Scale / Dial along the circumference
    if (showProtractor) {
      // Protractor circular track
      ctx.beginPath();
      ctx.arc(centerX, centerY, protractorRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#E2E8F0'; // slate-200
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tick marks every 10° or 15°
      const tickStepDeg = 10;
      for (let deg = 0; deg < 360; deg += tickStepDeg) {
        const isMajor30 = deg % 30 === 0;
        const isMajor90 = deg % 90 === 0;
        const tickAngle = (deg * Math.PI) / 180 + rotationRad;

        const innerR = isMajor90
          ? renderRadius + 8
          : isMajor30
          ? renderRadius + 11
          : renderRadius + 14;
        const outerR = protractorRadius + (isMajor90 ? 4 : isMajor30 ? 2 : 0);

        const x1 = centerX + innerR * Math.cos(tickAngle);
        const y1 = centerY + innerR * Math.sin(tickAngle);
        const x2 = centerX + outerR * Math.cos(tickAngle);
        const y2 = centerY + outerR * Math.sin(tickAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isMajor90 ? '#475569' : isMajor30 ? '#94A3B8' : '#CBD5E1';
        ctx.lineWidth = isMajor90 ? 1.5 : 1;
        ctx.stroke();

        // Major tick labels (e.g. 0°, 30°, 60°, 90°, 180°, etc. or fractions / radians)
        if (isMajor30) {
          const isFractions = scaleMode === 'fractions';
          const isRadians = scaleMode === 'radians';
          const labelR = outerR + (isFractions ? 12 : isRadians ? 12 : 11);
          const lx = centerX + labelR * Math.cos(tickAngle);
          const ly = centerY + labelR * Math.sin(tickAngle);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (isFractions) {
            // FRACTIONS: ~2x enlarged, bold, rich violet/purple
            ctx.fillStyle = isMajor90 ? '#5b21b6' : '#6d28d9'; // saturated dark violet
            ctx.font = isMajor90
              ? 'bold 18px Inter, sans-serif'
              : 'bold 16px Inter, sans-serif';

            if (deg === 0) ctx.fillText('0', lx, ly);
            else if (deg === 30) ctx.fillText('¹/₁₂', lx, ly);
            else if (deg === 60) ctx.fillText('¹/₆', lx, ly);
            else if (deg === 90) ctx.fillText('¹/₄', lx, ly);
            else if (deg === 120) ctx.fillText('¹/₃', lx, ly);
            else if (deg === 150) ctx.fillText('⁵/₁₂', lx, ly);
            else if (deg === 180) ctx.fillText('¹/₂', lx, ly);
            else if (deg === 210) ctx.fillText('⁷/₁₂', lx, ly);
            else if (deg === 240) ctx.fillText('²/₃', lx, ly);
            else if (deg === 270) ctx.fillText('³/₄', lx, ly);
            else if (deg === 300) ctx.fillText('⁵/₆', lx, ly);
            else if (deg === 330) ctx.fillText('¹¹/₁₂', lx, ly);
            else ctx.fillText(`${deg}°`, lx, ly);
          } else if (isRadians) {
            // RADIANS: prominent bold, deep emerald teal
            ctx.fillStyle = isMajor90 ? '#065f46' : '#047857';
            ctx.font = isMajor90
              ? 'bold 16px Inter, sans-serif'
              : 'bold 14px Inter, sans-serif';

            if (deg === 0) ctx.fillText('0', lx, ly);
            else if (deg === 30) ctx.fillText('π/6', lx, ly);
            else if (deg === 60) ctx.fillText('π/3', lx, ly);
            else if (deg === 90) ctx.fillText('π/2', lx, ly);
            else if (deg === 120) ctx.fillText('2π/3', lx, ly);
            else if (deg === 150) ctx.fillText('5π/6', lx, ly);
            else if (deg === 180) ctx.fillText('π', lx, ly);
            else if (deg === 210) ctx.fillText('7π/6', lx, ly);
            else if (deg === 240) ctx.fillText('4π/3', lx, ly);
            else if (deg === 270) ctx.fillText('3π/2', lx, ly);
            else if (deg === 300) ctx.fillText('5π/3', lx, ly);
            else if (deg === 330) ctx.fillText('11π/6', lx, ly);
            else ctx.fillText(`${deg}°`, lx, ly);
          } else {
            // DEGREES: ~1.5x enlarged, bold, prominent dark orange
            ctx.fillStyle = isMajor90 ? '#9a3412' : '#c2410c'; // prominent dark orange
            ctx.font = isMajor90
              ? 'bold 15px Inter, sans-serif'
              : 'bold 13px Inter, sans-serif';

            ctx.fillText(`${deg}°`, lx, ly);
          }
        }
      }
    }

    // 2. Draw Circumference Background (Dashed circle #CBD5E1)
    ctx.beginPath();
    ctx.arc(centerX, centerY, renderRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#CBD5E1'; // slate-300
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Arc Highlights on the Circle (Arcs AB, BC, CA)
    const drawArcSegment = (
      startU: number,
      endU: number,
      color: string,
      isHighlighted: boolean
    ) => {
      ctx.beginPath();
      let a1 = startU * 2 * Math.PI + rotationRad;
      let a2 = endU * 2 * Math.PI + rotationRad;
      ctx.arc(centerX, centerY, renderRadius, a1, a2, false);
      ctx.strokeStyle = isHighlighted ? '#4F46E5' : color;
      ctx.lineWidth = isHighlighted ? 6 : 4;
      ctx.stroke();
    };

    // Determine arc segments based on sorted cyclic order
    const sorted = geo.sorted;
    for (let i = 0; i < 3; i++) {
      const v1 = sorted[i];
      const v2 = sorted[(i + 1) % 3];
      const pair = [v1.id, v2.id].sort().join('') as 'AB' | 'BC' | 'AC';
      const key = pair === 'AC' ? 'CA' : pair;
      const arcInfo = geo.arcs[key];

      const isArcActive =
        (activeHighlight?.type === 'arc' && activeHighlight.id === key) ||
        (activeHighlight?.type === 'side' && activeHighlight.id === key) ||
        (activeHighlight?.type === 'vertex' && activeHighlight.id === arcInfo.oppositeVertexId);

      drawArcSegment(v1.u, v2.u, arcInfo.color, isArcActive);
    }

    // 4. Draw Radii OA, OB, OC if enabled (#94A3B8 dash 2 2)
    if (showRadii) {
      const drawRadius = (targetPos: { x: number; y: number }) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.strokeStyle = '#94A3B8'; // slate-400
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
      };
      drawRadius(posA);
      drawRadius(posB);
      drawRadius(posC);
    }

    // Special Ratio & 1-Radian Highlights
    if (isPiRatioActive) {
      // 1. Highlight Circumference C in glowing indigo
      ctx.beginPath();
      ctx.arc(centerX, centerY, renderRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 6;
      ctx.stroke();

      // 2. Highlight Diameter D through center O in red
      ctx.beginPath();
      ctx.moveTo(centerX - renderRadius, centerY);
      ctx.lineTo(centerX + renderRadius, centerY);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Diameter endpoints
      ctx.beginPath();
      ctx.arc(centerX - renderRadius, centerY, 5, 0, 2 * Math.PI);
      ctx.arc(centerX + renderRadius, centerY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#e11d48';
      ctx.fill();
    }

    if (isRadianRatioActive || isNearOneRadian) {
      // Highlight Radii OA and OB in bold emerald
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(posA.x, posA.y);
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(posB.x, posB.y);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Highlight Arc AB in bold emerald
      ctx.beginPath();
      let a1 = pointsU.A * 2 * Math.PI + rotationRad;
      let a2 = pointsU.B * 2 * Math.PI + rotationRad;
      if (a2 < a1) a2 += 2 * Math.PI;
      ctx.arc(centerX, centerY, renderRadius, a1, a2, false);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 7;
      ctx.stroke();
    }

    // 5. Draw Triangle Body (Chords AB, BC, CA)
    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.lineTo(posC.x, posC.y);
    ctx.closePath();

    // Fill style depends on classification
    if (engineResult.classification === 'right') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // emerald tint
    } else if (engineResult.classification === 'obtuse') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'; // amber tint
    } else {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.07)'; // indigo tint
    }
    ctx.fill();

    // Draw individual chord borders (#334155 stroke-width 3 linecap round)
    const drawSide = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      sideKey: 'AB' | 'BC' | 'CA',
      oppVertex: VertexId
    ) => {
      const isSideActive =
        (activeHighlight?.type === 'side' && activeHighlight.id === sideKey) ||
        (activeHighlight?.type === 'arc' && activeHighlight.id === sideKey) ||
        (activeHighlight?.type === 'vertex' && activeHighlight.id === oppVertex);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineCap = 'round';
      ctx.strokeStyle = isSideActive ? '#4F46E5' : '#334155';
      ctx.lineWidth = isSideActive ? 4 : 3;
      ctx.stroke();
    };

    drawSide(posA, posB, 'AB', 'C');
    drawSide(posB, posC, 'BC', 'A');
    drawSide(posC, posA, 'CA', 'B');

    // 6. Right Angle Square Marker (if Right Triangle)
    if (engineResult.classification === 'right' && engineResult.isRightAngleVertex) {
      const rightVertexPos =
        engineResult.isRightAngleVertex === 'A'
          ? posA
          : engineResult.isRightAngleVertex === 'B'
          ? posB
          : posC;
      const other1 =
        engineResult.isRightAngleVertex === 'A'
          ? posB
          : engineResult.isRightAngleVertex === 'B'
          ? posA
          : posA;
      const other2 =
        engineResult.isRightAngleVertex === 'A'
          ? posC
          : engineResult.isRightAngleVertex === 'B'
          ? posC
          : posB;

      const v1x = other1.x - rightVertexPos.x;
      const v1y = other1.y - rightVertexPos.y;
      const len1 = Math.hypot(v1x, v1y) || 1;
      const u1x = (v1x / len1) * 16;
      const u1y = (v1y / len1) * 16;

      const v2x = other2.x - rightVertexPos.x;
      const v2y = other2.y - rightVertexPos.y;
      const len2 = Math.hypot(v2x, v2y) || 1;
      const u2x = (v2x / len2) * 16;
      const u2y = (v2y / len2) * 16;

      ctx.beginPath();
      ctx.moveTo(rightVertexPos.x + u1x, rightVertexPos.y + u1y);
      ctx.lineTo(rightVertexPos.x + u1x + u2x, rightVertexPos.y + u1y + u2y);
      ctx.lineTo(rightVertexPos.x + u2x, rightVertexPos.y + u2y);
      ctx.strokeStyle = '#10B981'; // emerald-500
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#10B981';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(
        '90°',
        rightVertexPos.x + (u1x + u2x) * 1.3 - 8,
        rightVertexPos.y + (u1y + u2y) * 1.3 + 4
      );
    }

    // 7. Draw Center Point O
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    const centerColor =
      engineResult.classification === 'right'
        ? '#10B981'
        : engineResult.classification === 'obtuse'
        ? '#F59E0B'
        : '#EF4444';
    ctx.fillStyle = centerColor;
    ctx.fill();

    ctx.fillStyle = centerColor;
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('O', centerX + 8, centerY - 8);

    // 8. Draw Draggable Vertices (A, B, C)
    const verticesList = [
      { id: 'A' as VertexId, pos: posA },
      { id: 'B' as VertexId, pos: posB },
      { id: 'C' as VertexId, pos: posC },
    ];

    verticesList.forEach(({ id, pos }) => {
      const isVertexActive =
        (activeHighlight?.type === 'vertex' && activeHighlight.id === id) ||
        (draggingMode === 'vertex' && activeVertex === id);

      if (isVertexActive) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isVertexActive ? '#4F46E5' : '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      const nx = pos.x - centerX;
      const ny = pos.y - centerY;
      const dist = Math.hypot(nx, ny) || 1;
      const labelX = pos.x + (nx / dist) * 22;
      const labelY = pos.y + (ny / dist) * 22;

      ctx.fillStyle = isVertexActive ? '#4F46E5' : '#1E293B';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(id, labelX, labelY);
    });

    // 9. Draw Outer Rotation Handle (Compass Knob at rotationRingRadius)
    ctx.beginPath();
    ctx.arc(knobPos.x, knobPos.y, 11, 0, 2 * Math.PI);
    ctx.fillStyle = draggingMode === 'rotate' ? '#4F46E5' : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Knob rotation arrow symbol ↻ inside
    ctx.fillStyle = draggingMode === 'rotate' ? '#FFFFFF' : '#4F46E5';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', knobPos.x, knobPos.y);
  }, [
    dimensions,
    centerX,
    centerY,
    renderRadius,
    protractorRadius,
    rotationRingRadius,
    rotationRad,
    pointsU,
    posA,
    posB,
    posC,
    knobPos.x,
    knobPos.y,
    showRadii,
    showProtractor,
    scaleMode,
    activeHighlight,
    draggingMode,
    activeVertex,
    engineResult,
    geo,
  ]);

  // Pointer Interaction Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 1. Check if clicking on the Outer Rotation Knob or Rotation Ring
    const distToKnob = Math.hypot(knobPos.x - x, knobPos.y - y);
    const distToCenter = Math.hypot(x - centerX, y - centerY);

    if (distToKnob < 24 || (distToCenter >= protractorRadius + 10 && distToCenter <= rotationRingRadius + 22)) {
      setDraggingMode('rotate');
      const startAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      setRotateStartAngle(startAngle);
      setInitialRotationOnDrag(rotationDeg);
      return;
    }

    // 2. Check Vertices A, B, C
    const vList: { id: VertexId; pos: { x: number; y: number } }[] = [
      { id: 'A', pos: posA },
      { id: 'B', pos: posB },
      { id: 'C', pos: posC },
    ];

    let closest: VertexId | null = null;
    let minDist = Infinity;
    vList.forEach(({ id, pos }) => {
      const d = Math.hypot(pos.x - x, pos.y - y);
      if (d < 35 && d < minDist) {
        minDist = d;
        closest = id;
      }
    });

    if (closest) {
      setDraggingMode('vertex');
      setActiveVertex(closest);
      onHoverHighlight({ type: 'vertex', id: closest });
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - centerX;
    const dy = y - centerY;

    if (draggingMode === 'rotate') {
      // Rotating entire configuration around center O
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      let deltaAngle = currentAngle - rotateStartAngle;
      let newRotation = (initialRotationOnDrag + deltaAngle) % 360;
      if (newRotation < 0) newRotation += 360;
      onChangeRotation(Math.round(newRotation));
      return;
    }

    if (draggingMode === 'vertex' && activeVertex) {
      // Moving individual vertex along circumference
      let screenAngle = Math.atan2(dy, dx);
      // Subtract rotation angle so intrinsic pointsU is invariant under rotation!
      let angleWithoutRotation = screenAngle - rotationRad;
      if (angleWithoutRotation < 0) angleWithoutRotation += 2 * Math.PI;
      const newU = normalizeU(angleWithoutRotation / (2 * Math.PI));

      onChangePoints({
        ...pointsU,
        [activeVertex]: newU,
      });
      return;
    }

    // Hover detection
    if (Math.hypot(dx, dy) < 16) {
      onHoverHighlight({ type: 'center' });
      return;
    }

    const vList: { id: VertexId; pos: { x: number; y: number } }[] = [
      { id: 'A', pos: posA },
      { id: 'B', pos: posB },
      { id: 'C', pos: posC },
    ];
    for (const { id, pos } of vList) {
      if (Math.hypot(pos.x - x, pos.y - y) < 24) {
        onHoverHighlight({ type: 'vertex', id });
        return;
      }
    }
  };

  const handlePointerUp = () => {
    setDraggingMode(null);
    setActiveVertex(null);
  };

  return (
    <div
      ref={containerRef}
      id="canvasContainer"
      className="relative flex flex-col items-center justify-between w-full h-full select-none"
    >
      {/* Top Toolbar: Legend, Protractor & Arc Toggles */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Radius & Diameter in dual units (mm primary, px secondary) */}
          <div className="flex items-center gap-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="font-semibold text-slate-900">
              R = {(propR * scale).toFixed(1)} мм{' '}
              <span className="font-mono text-[10px] text-slate-400 font-normal">({Math.round(propR)} px)</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-900">
              D = {(2 * propR * scale).toFixed(1)} мм{' '}
              <span className="font-mono text-[10px] text-slate-400 font-normal">({Math.round(2 * propR)} px)</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 font-mono">
              D = 2R
            </span>
          </div>

          {/* Educational Scale Badge */}
          <div
            id="educationalScaleBadge"
            title="Условный масштаб модели: 1 экранный пиксель соответствует 1 условному миллиметру"
            className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs"
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">МАСШТАБ:</span>
            <span className="font-bold text-indigo-700 font-mono text-xs">
              1 px = {scale} мм
            </span>
            <span className="text-[10px] text-slate-500 font-medium">(учебный)</span>

            {/* Optional Scale Selector (1:0.5, 1:1, 1:2) */}
            {onChangeScale && (
              <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-1.5">
                {[0.5, 1, 2].map((sVal) => (
                  <button
                    key={sVal}
                    onClick={() => onChangeScale(sVal)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      scale === sVal
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {sVal}×
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {/* Scale Mode Selector: DEGREES vs RADIANS vs FRACTIONS */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              id="scaleModeDegreesBtn"
              onClick={() => onChangeScaleMode('degrees')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                scaleMode === 'degrees'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ГРАДУСЫ (°)
            </button>
            <button
              id="scaleModeRadiansBtn"
              onClick={() => onChangeScaleMode('radians')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                scaleMode === 'radians'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              РАДИАНЫ (рад)
            </button>
            <button
              id="scaleModeFractionsBtn"
              onClick={() => onChangeScaleMode('fractions')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                scaleMode === 'fractions'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ДОЛИ КРУГА
            </button>
          </div>

          <button
            id="toggleProtractorBtn"
            onClick={() => setShowProtractor(!showProtractor)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
              showProtractor
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Шкала {showProtractor ? 'ON' : 'OFF'}
          </button>

          <button
            id="toggleRadiiBtn"
            onClick={() => setShowRadii(!showRadii)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
              showRadii
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Радиусы {showRadii ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Canvas Visual Stage (fills maximum vertical space) */}
      <div className="relative flex-1 min-h-[320px] w-full rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex items-center justify-center p-1">
        <canvas
          id="interactiveCanvas"
          ref={canvasRef}
          style={{ width: dimensions.width, height: dimensions.height }}
          className="touch-none cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => {
            handlePointerUp();
            onHoverHighlight(null);
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handlePointerUp}
        />

        {/* Visual Badge for 1 RADIAN */}
        {(isNearOneRadian || isRadianRatioActive) && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center animate-bounce">
            <div className="bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl shadow-lg border-2 border-emerald-300 text-xs flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span>1 РАДИАН! ДЛИНА ВЫБРАННОЙ ДУГИ = РАДИУС</span>
              <span className="bg-emerald-800/80 px-2 py-0.5 rounded text-[11px] font-mono">
                s = R = {(propR * scale).toFixed(1)} мм
              </span>
            </div>
            <span className="text-[10px] text-emerald-950 font-bold bg-emerald-100/95 px-3 py-0.5 rounded-full mt-1 border border-emerald-300 shadow-xs">
              Угол θ = {arcDegAB.toFixed(1)}° ≈ {arcRadAB.toFixed(2)} рад • Отношение s / R = {arcRadAB.toFixed(2)}
            </span>
          </div>
        )}

        {/* Visual Badge for PI RATIO */}
        {isPiRatioActive && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
            <div className="bg-indigo-600 text-white font-black px-4 py-1.5 rounded-xl shadow-lg border-2 border-indigo-300 text-xs flex items-center gap-2">
              <span className="text-base">⭕</span>
              <span>ОТНОШЕНИЕ π = C / D ≈ 3.14159</span>
            </div>
            <span className="text-[10px] text-indigo-950 font-bold bg-indigo-100/95 px-3 py-0.5 rounded-full mt-1 border border-indigo-300 shadow-xs">
              Длина всей окружности C ≈ {(2 * Math.PI * propR * scale).toFixed(1)} мм в ~3.14 раза больше диаметра D = {(2 * propR * scale).toFixed(1)} мм
            </span>
          </div>
        )}

        {/* Center Position Notification Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <div
            id="centerStatusBadge"
            className={`text-xs px-2.5 py-1 rounded-lg backdrop-blur-md border font-semibold transition-all shadow-xs ${
              engineResult.classification === 'right'
                ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200'
                : engineResult.classification === 'obtuse'
                ? 'bg-amber-50/95 text-amber-800 border-amber-200'
                : 'bg-indigo-50/95 text-indigo-800 border-indigo-200'
            }`}
          >
            {engineResult.classification === 'right' && '📐 Центр O лежит на стороне (диаметр = 2R)'}
            {engineResult.classification === 'acute' && '🔵 Центр O строго внутри треугольника'}
            {engineResult.classification === 'obtuse' && '🟠 Центр O находится снаружи'}
          </div>
        </div>

        {/* Top-Right Hint: Rotate Disc */}
        <div className="absolute top-3 right-3 pointer-events-none hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs font-medium">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Тяните маркер ↻ по внешнему кругу</span>
        </div>

        {/* Floating Arc Pills (Labels along circumference) */}
        {showArcLabels && (
          <div className="absolute inset-0 pointer-events-none">
            {Object.entries(geo.arcs).map(([key, arc]) => {
              const vStart = geo.vertices.find((v) => v.id === arc.startId)!;
              const vEnd = geo.vertices.find((v) => v.id === arc.endId)!;

              let angleStart = vStart.u * 2 * Math.PI + rotationRad;
              let angleEnd = vEnd.u * 2 * Math.PI + rotationRad;
              if (angleEnd < angleStart) angleEnd += 2 * Math.PI;
              const midAngle = (angleStart + angleEnd) / 2;

              const labelR = renderRadius * 0.96;
              const pillX = centerX + labelR * Math.cos(midAngle);
              const pillY = centerY + labelR * Math.sin(midAngle);

              const isHighlighted =
                (activeHighlight?.type === 'arc' && activeHighlight.id === key) ||
                (activeHighlight?.type === 'side' && activeHighlight.id === key) ||
                (activeHighlight?.type === 'vertex' && activeHighlight.id === arc.oppositeVertexId);

              const colorClasses =
                key === 'CA'
                  ? 'border-blue-200 text-blue-700 bg-white/95'
                  : key === 'AB'
                  ? 'border-emerald-200 text-emerald-700 bg-white/95'
                  : 'border-amber-200 text-amber-700 bg-white/95';

              const arcFractionData = formatArcFraction(arc.fraction);
              const displayText =
                scaleMode === 'radians'
                  ? `${(arc.fraction * 2 * Math.PI).toFixed(2)} рад (${Math.round(arc.deg)}°)`
                  : scaleMode === 'fractions'
                  ? `${arcFractionData.fractionStr} круга (${Math.round(arc.deg)}°)`
                  : `${Math.round(arc.deg)}° (${arcFractionData.fractionStr})`;

              return (
                <div
                  key={key}
                  style={{
                    left: `${pillX}px`,
                    top: `${pillY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute pointer-events-auto cursor-pointer text-[10px] px-2.5 py-1 rounded-md font-bold border transition-transform shadow-xs ${colorClasses} ${
                    isHighlighted
                      ? 'scale-110 ring-2 ring-indigo-500/80 shadow-md z-10'
                      : 'hover:scale-105'
                  }`}
                  onMouseEnter={() =>
                    onHoverHighlight({ type: 'arc', id: key as 'AB' | 'BC' | 'CA' })
                  }
                  onMouseLeave={() => onHoverHighlight(null)}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: arc.color }}
                  ></span>
                  {arc.label}: {displayText}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rotation Control Toolbar & Pedagogical Invariance Notice */}
      <div className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Rotation Degrees & Quick Steps */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              Вращение:
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              {rotationDeg}°
            </span>

            <button
              id="rotateCcwBtn"
              onClick={() => onChangeRotation((rotationDeg - 15 + 360) % 360)}
              title="Повернуть против часовой стрелки на 15°"
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 text-xs flex items-center gap-1 font-medium transition"
            >
              <RotateCcw className="w-3 h-3" /> -15°
            </button>
            <button
              id="rotateCwBtn"
              onClick={() => onChangeRotation((rotationDeg + 15) % 360)}
              title="Повернуть по часовой стрелке на 15°"
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 text-xs flex items-center gap-1 font-medium transition"
            >
              <RotateCw className="w-3 h-3" /> +15°
            </button>
            {rotationDeg !== 0 && (
              <button
                id="resetRotationBtn"
                onClick={() => onChangeRotation(0)}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 text-xs font-semibold transition"
              >
                Сброс (0°)
              </button>
            )}
          </div>

          {/* Slider for smooth rotation */}
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <input
              id="rotationSlider"
              type="range"
              min="0"
              max="359"
              value={rotationDeg}
              onChange={(e) => onChangeRotation(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Pedagogical Principle Banner: ROTATE ≠ MOVE VERTICES */}
        <div className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>ROTATION:</strong> Форма: <span className="text-emerald-700 font-semibold">без изменений</span> • Углы: <span className="text-emerald-700 font-semibold">без изменений</span> • Дуги: <span className="text-emerald-700 font-semibold">без изменений</span> • Ориентация: <span className="text-indigo-700 font-semibold">{rotationDeg}°</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Поверните диск для удобного доступа к вершинам</span>
        </div>
      </div>
    </div>
  );
};
