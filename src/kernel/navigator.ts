// src/kernel/navigator.ts
// Deterministic Navigator implementing DISCOVER, CHECK, SELECT, EXECUTE, TRACE

import { DerivationPath, FactMap, CheckResult, ExecutionTrace, TraceStep, FactValue } from './types';

export class DeterministicNavigator {
  private graph: readonly DerivationPath[];

  constructor(graph: readonly DerivationPath[]) {
    this.graph = graph;
  }

  /**
   * DISCOVER: Recursively searches for structural derivation paths leading to target.
   * Returns an array of candidate paths (each path is an ordered list of DerivationPath steps).
   */
  public discover(target: string, visited: Set<string> = new Set()): DerivationPath[][] {
    if (visited.has(target)) {
      return [];
    }
    const newVisited = new Set(visited).add(target);

    const candidates: DerivationPath[][] = [];

    for (const edge of this.graph) {
      if (edge.provides === target) {
        // Find paths for all requirements
        const reqPathsList: DerivationPath[][][] = edge.requires.map(req => {
          const subPaths = this.discover(req, newVisited);
          // An empty sub-path [[]] represents that 'req' might already be present in knowns
          return [[] as DerivationPath[], ...subPaths];
        });

        // Cartesian product of requirement paths
        const cartesian = (arrays: DerivationPath[][][]): DerivationPath[][] => {
          return arrays.reduce<DerivationPath[][]>(
            (acc, curr) => {
              const res: DerivationPath[][] = [];
              for (const a of acc) {
                for (const b of curr) {
                  res.push([...a, ...b]);
                }
              }
              return res;
            },
            [[]]
          );
        };

        const combinations = cartesian(reqPathsList);

        for (const combo of combinations) {
          // Deduplicate edges in execution order
          const flat: DerivationPath[] = [];
          for (const e of combo) {
            if (!flat.some(existing => existing.id === e.id)) {
              flat.push(e);
            }
          }
          candidates.push([...flat, edge]);
        }
      }
    }

    // Deterministic sorting by path length (shortest first), then by lexicographical path IDs
    return candidates.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      const aIds = a.map(e => e.id).join('->');
      const bIds = b.map(e => e.id).join('->');
      return aIds.localeCompare(bIds);
    });
  }

  /**
   * CHECK: Evaluates a candidate path against known facts using dynamic sandbox state.
   * Intermediate results produced by prior steps are added to the sandbox and available for subsequent preconditions/inputs.
   */
  public check(candidatePath: DerivationPath[], knowns: FactMap): CheckResult {
    const sandbox: FactMap = { ...knowns };

    for (const edge of candidatePath) {
      // 1. Check missing inputs in current sandbox
      for (const req of edge.requires) {
        if (!(req in sandbox) || sandbox[req] === undefined || sandbox[req] === null) {
          return {
            status: 'MISSING_INPUT',
            reason: `Missing required input '${req}' for step ${edge.id}`,
            sandbox,
          };
        }
      }

      // 2. Check precondition on sandbox state
      if (edge.precondition) {
        const passed = edge.precondition(sandbox);
        if (!passed) {
          return {
            status: 'PRECONDITION_FAILED',
            reason: `Precondition failed for step ${edge.id}`,
            sandbox,
          };
        }
      }

      // 3. Dynamic propagation: execute step in sandbox
      try {
        const result = edge.operation(sandbox);
        sandbox[edge.provides] = result;
      } catch (err: any) {
        return {
          status: 'PRECONDITION_FAILED',
          reason: `Operation execution error at ${edge.id}: ${err?.message || String(err)}`,
          sandbox,
        };
      }
    }

    return {
      status: 'VALID',
      sandbox,
    };
  }

  /**
   * SELECT: Deterministically chooses a single path from valid candidates.
   * Policy: shortest path (min length), then stable deterministic tie-breaker.
   */
  public select(validPaths: DerivationPath[][]): DerivationPath[] | null {
    if (validPaths.length === 0) return null;
    return validPaths[0]; // Candidates are already sorted by length and ID order
  }

  /**
   * SOLVE: Complete pipeline:
   * DISCOVER -> CHECK -> SELECT -> EXECUTE -> TRACE
   */
  public solve(knowns: FactMap, target: string): ExecutionTrace {
    // 1. DISCOVER
    const candidates = this.discover(target);

    // 2. CHECK each candidate
    const evaluatedCandidates = candidates.map(path => {
      const checkResult = this.check(path, knowns);
      return { path, checkResult };
    });

    const validCandidates = evaluatedCandidates
      .filter(item => item.checkResult.status === 'VALID')
      .map(item => item.path);

    // If no valid candidates
    if (validCandidates.length === 0) {
      // Find representative failure reason
      const firstFailure = evaluatedCandidates[0]?.checkResult;
      return {
        target,
        initialFacts: { ...knowns },
        candidatePathsFound: candidates.length,
        selectedPathIds: [],
        steps: [],
        finalValue: null,
        status: firstFailure ? (firstFailure.status as any) : 'NO_VALID_PATH',
        message: firstFailure?.reason || `No valid derivation path found for target '${target}'`,
      };
    }

    // 3. SELECT
    const selected = this.select(validCandidates)!;

    // 4. EXECUTE with step-by-step TRACE capture
    const state: FactMap = { ...knowns };
    const traceSteps: TraceStep[] = [];

    for (let i = 0; i < selected.length; i++) {
      const edge = selected[i];
      const inputsUsed: Record<string, FactValue> = {};
      for (const req of edge.requires) {
        inputsUsed[req] = state[req];
      }

      const preconditionPassed = edge.precondition ? edge.precondition(state) : true;
      const outputProduced = edge.operation(state);
      state[edge.provides] = outputProduced;

      traceSteps.push({
        stepIndex: i + 1,
        pathId: edge.id,
        description: edge.description,
        requires: edge.requires,
        inputsUsed,
        provides: edge.provides,
        outputProduced,
        preconditionChecked: !!edge.precondition,
        preconditionPassed,
      });
    }

    return {
      target,
      initialFacts: { ...knowns },
      candidatePathsFound: candidates.length,
      selectedPathIds: selected.map(e => e.id),
      steps: traceSteps,
      finalValue: state[target] ?? null,
      status: 'SUCCESS',
    };
  }
}
