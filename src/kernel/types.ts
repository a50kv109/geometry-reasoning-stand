// src/kernel/types.ts
// Semantic contracts and minimal transport types for Deterministic Geometry Kernel

export interface Point2D {
  x: number;
  y: number;
}

export type FactValue = number | string | boolean | Point2D;

export type FactMap = Record<string, FactValue>;

export type CheckStatus = 'VALID' | 'MISSING_INPUT' | 'PRECONDITION_FAILED';

export interface CheckResult {
  status: CheckStatus;
  reason?: string;
  sandbox: FactMap;
}

export interface DerivationPath {
  id: string;
  description: string;
  requires: readonly string[];
  provides: string;
  operation: (knowledge: FactMap) => FactValue;
  precondition?: (knowledge: FactMap) => boolean;
}

export interface TraceStep {
  stepIndex: number;
  pathId: string;
  description: string;
  requires: readonly string[];
  inputsUsed: Record<string, FactValue>;
  provides: string;
  outputProduced: FactValue;
  preconditionChecked: boolean;
  preconditionPassed: boolean;
}

export interface ExecutionTrace {
  target: string;
  initialFacts: FactMap;
  candidatePathsFound: number;
  selectedPathIds: string[];
  steps: TraceStep[];
  finalValue: FactValue | null;
  status: 'SUCCESS' | 'NO_VALID_PATH' | 'PRECONDITION_FAILED' | 'MISSING_INPUT';
  message?: string;
}

export type HypothesisStatus = 'VERIFIED' | 'FALSIFIED' | 'INCONCLUSIVE' | 'UNKNOWN';

export interface Hypothesis {
  id: string;
  source: string;
  target: string;
  proposedPath: DerivationPath[];
  expectedValue?: FactValue;
}

export interface ExplorationTrace {
  hypothesisId: string;
  inputsUsed: FactMap;
  target: string;
  stepsExecuted: string[];
  status: HypothesisStatus;
  reason: string;
  computedResult?: FactValue;
}
