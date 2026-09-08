// src/kernel/tests/runKernelTests.ts
// Autonomous Test Suite for Deterministic Geometry Kernel
// Runs all 8 mandatory tests from the Integration Contract Gate

import { DeterministicNavigator } from '../navigator';
import { CANONICAL_GRAPH, DP_ANG_SUM_C, DP_PYTH_HYP, DP_CHORD_TRIG, DP_INSC_TO_CENT } from '../canonicalPaths';
import { ExplorationRunner } from '../exploration/runner';
import { FactMap, Hypothesis, DerivationPath } from '../types';

export interface TestResultReport {
  testId: string;
  testName: string;
  input: FactMap;
  target: string;
  candidatePaths: string[][];
  preconditionResults: { path: string[]; status: string; reason?: string }[];
  selectedPath: string[];
  executionResult: any;
  expected: any;
  observed: any;
  pass: boolean;
  notes?: string;
}

export function runAllKernelTests(): TestResultReport[] {
  const reports: TestResultReport[] = [];
  const nav = new DeterministicNavigator(CANONICAL_GRAPH);
  const runner = new ExplorationRunner();

  // =========================================================================
  // TEST 1 — Angle Sum
  // Known: angle_A = 30, angle_B = 60
  // Target: angle_C
  // Expected: 90
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, angle_B: 60 };
    const target = 'angle_C';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 90;
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(observed) - expected) < 1e-5;

    reports.push({
      testId: 'TEST 1',
      testName: 'Angle Sum (DP-ANG-SUM-C)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 2 — Inscribed -> Central
  // Known: angle_A = 30, R = 5
  // Target: central_angle_BC
  // Expected: 60 degrees
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, R: 5 };
    const target = 'central_angle_BC';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 60;
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(observed) - expected) < 1e-5;

    reports.push({
      testId: 'TEST 2',
      testName: 'Inscribed to Central Angle (DP-INSC-TO-CENT)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 3 — Chord
  // Known: angle_A = 30, R = 5
  // Target: chord_BC
  // Expected: 2 * 5 * sin(30°) = 5.0
  // Multi-step route: angle_A -> central_angle_BC -> chord_BC
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, R: 5 };
    const target = 'chord_BC';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 5.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-4;

    reports.push({
      testId: 'TEST 3',
      testName: 'Chord via Inscribed and Central (Multi-step)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Demonstrates multi-step derivation: angle_A -> central_angle_BC -> chord_BC',
    });
  }

  // =========================================================================
  // TEST 4 — Thales
  // Known: coord_A = { x: 0, y: -5 }, coord_C = { x: 0, y: 5 }, R = 5 (dist AC = 10 = 2R)
  // Target: triangle_class
  // Expected: "right"
  // =========================================================================
  {
    const input: FactMap = {
      coord_A: { x: 0, y: -5 },
      coord_C: { x: 0, y: 5 },
      R: 5,
    };
    const target = 'triangle_class';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 'right';
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && observed === expected && trace.selectedPathIds.includes('DP-THALES-CLASS');

    reports.push({
      testId: 'TEST 4',
      testName: 'Thales Right Triangle (DP-THALES-CLASS)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 5 — Competing Paths (M10-B Acute)
  // Known: coord_A = { x: 0, y: 5 }, coord_B = { x: 4.33, y: -2.5 }, coord_C = { x: -4.33, y: -2.5 }, R = 5
  // (Equilateral acute triangle, dist AC = Math.hypot(-4.33, -7.5) ≈ 8.66 != 10 = 2R)
  // Target: triangle_class
  // Expected: Thales path rejected (PRECONDITION_FAILED), Coordinate path selected, result = "acute"
  // =========================================================================
  {
    const input: FactMap = {
      coord_A: { x: 0, y: 5 },
      coord_B: { x: 4.330127, y: -2.5 },
      coord_C: { x: -4.330127, y: -2.5 },
      R: 5,
    };
    const target = 'triangle_class';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 'acute';
    const observed = trace.finalValue;
    
    // Validate competing paths behavior:
    const thalesPre = preResults.find(r => r.path.includes('DP-THALES-CLASS'));
    const coordPre = preResults.find(r => r.path.includes('DP-COORD-CLASS'));

    const pass = 
      thalesPre?.status === 'PRECONDITION_FAILED' &&
      coordPre?.status === 'VALID' &&
      trace.selectedPathIds.includes('DP-COORD-CLASS') &&
      observed === expected;

    reports.push({
      testId: 'TEST 5',
      testName: 'Competing Paths Resolution (Thales rejected, Coord selected)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'Thales rejected & Coord selected = acute',
      observed: `Thales: ${thalesPre?.status}, Selected: ${trace.selectedPathIds.join(',')}, Result: ${observed}`,
      pass,
      notes: 'Proves branch isolation: failing precondition does not contaminate competing coordinate path.',
    });
  }

  // =========================================================================
  // TEST 6 — Dynamic Value Propagation
  // Known: angle_A = 30, angle_B = 60, leg_a = 3, leg_b = 4
  // Target: hypotenuse_c
  // Precondition of DP-PYTH-HYP requires angle_C == 90.
  // angle_C is NOT in initial input; it must be derived by DP-ANG-SUM-C and propagated in sandbox.
  // Expected: angle_C computed dynamically as 90 -> DP-PYTH-HYP precondition passes -> hypotenuse_c = 5.0
  // =========================================================================
  {
    const input: FactMap = {
      angle_A: 30,
      angle_B: 60,
      leg_a: 3,
      leg_b: 4,
    };
    const target = 'hypotenuse_c';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 5.0;
    const observed = Number(trace.finalValue);

    const hasAngSum = trace.selectedPathIds.includes('DP-ANG-SUM-C');
    const hasPyth = trace.selectedPathIds.includes('DP-PYTH-HYP');
    const pass = trace.status === 'SUCCESS' && hasAngSum && hasPyth && Math.abs(observed - expected) < 1e-4;

    reports.push({
      testId: 'TEST 6',
      testName: 'Dynamic Value Propagation (angle_C dynamically unlocks Pythagoras)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'angle_C derived as 90°, unlocking hypotenuse_c = 5.0',
      observed: `Selected: ${trace.selectedPathIds.join(' -> ')}, Result: ${observed}`,
      pass,
      notes: 'Step 1 (DP-ANG-SUM-C) produced angle_C=90, allowing Step 2 (DP-PYTH-HYP) precondition to pass.',
    });
  }

  // =========================================================================
  // TEST 7 — Exploration Isolation
  // Test that an exploratory hypothesis executed by ExplorationRunner:
  // 1) Successfully yields VERIFIED in its experimental context
  // 2) Canonical Navigator does NOT automatically acquire the new target or path
  // =========================================================================
  {
    // Define an experimental hypothesis: area = 0.5 * leg_a * leg_b
    const customAreaPath: DerivationPath = {
      id: 'HYP-RIGHT-TRI-AREA',
      description: 'Гипотеза: площадь прямоугольного треугольника S = 0.5 * a * b',
      requires: ['leg_a', 'leg_b', 'angle_C'],
      provides: 'hypothetical_area',
      precondition: (k: FactMap) => Math.abs(Number(k['angle_C']) - 90) < 1e-4,
      operation: (k: FactMap) => 0.5 * Number(k['leg_a']) * Number(k['leg_b']),
    };

    const hypothesis: Hypothesis = {
      id: 'H-EXP-001',
      source: 'student_experiment',
      target: 'hypothetical_area',
      proposedPath: [customAreaPath],
      expectedValue: 6.0,
    };

    const input: FactMap = {
      leg_a: 3,
      leg_b: 4,
      angle_C: 90,
    };

    // 1. Run in exploration space
    const expTrace = runner.testHypothesis(hypothesis, input);

    // 2. Query canonical navigator for the same target
    const canonicalTrace = nav.solve(input, 'hypothetical_area');

    const pass =
      expTrace.status === 'VERIFIED' &&
      expTrace.computedResult === 6.0 &&
      canonicalTrace.status !== 'SUCCESS' &&
      canonicalTrace.finalValue === null &&
      CANONICAL_GRAPH.length === 6;

    reports.push({
      testId: 'TEST 7',
      testName: 'Exploration Isolation (No canonical promotion)',
      input,
      target: 'hypothetical_area',
      candidatePaths: [hypothesis.proposedPath.map(e => e.id)],
      preconditionResults: [{ path: ['HYP-RIGHT-TRI-AREA'], status: expTrace.status, reason: expTrace.reason }],
      selectedPath: expTrace.stepsExecuted,
      executionResult: expTrace.computedResult,
      expected: 'Exploration: VERIFIED (6.0), Canonical: FAIL (no route), Graph length: 6',
      observed: `Exploration: ${expTrace.status} (${expTrace.computedResult}), Canonical status: ${canonicalTrace.status}, Canonical graph size: ${CANONICAL_GRAPH.length}`,
      pass,
      notes: 'Guarantees epistemic boundary: experimental success never mutates canonical knowledge graph.',
    });
  }

  // =========================================================================
  // TEST 8 — Trace Verification
  // Check that every executed derivation exposes full structured trace:
  // - inputs
  // - selected path
  // - steps with intermediate values
  // - precondition checks
  // - final result and status
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, angle_B: 60, leg_a: 3, leg_b: 4 };
    const trace = nav.solve(input, 'hypotenuse_c');

    const hasInputs = Object.keys(trace.initialFacts).length === 4;
    const hasSelected = trace.selectedPathIds.length === 2;
    const hasSteps = trace.steps.length === 2;
    const step1Valid = trace.steps[0].pathId === 'DP-ANG-SUM-C' && trace.steps[0].outputProduced === 90;
    const step2Valid = trace.steps[1].pathId === 'DP-PYTH-HYP' && trace.steps[1].preconditionPassed === true && trace.steps[1].outputProduced === 5;
    const hasSuccess = trace.status === 'SUCCESS';

    const pass = hasInputs && hasSelected && hasSteps && step1Valid && step2Valid && hasSuccess;

    reports.push({
      testId: 'TEST 8',
      testName: 'Trace Structure & Epistemic Completeness',
      input,
      target: 'hypotenuse_c',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: trace.steps.map(s => ({
        path: [s.pathId],
        status: s.preconditionPassed ? 'PASS' : 'FAIL',
        reason: s.description,
      })),
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'Full trace with 2 steps, explicit inputs, intermediate values, and precondition confirmation',
      observed: `Steps: ${trace.steps.length}, Step 1 output: ${trace.steps[0]?.outputProduced}, Step 2 output: ${trace.steps[1]?.outputProduced}, Status: ${trace.status}`,
      pass,
      notes: 'Trace structure meets requirements for educational transparency without UI leakage.',
    });
  }

  return reports;
}
