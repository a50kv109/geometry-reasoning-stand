# Geometry Reasoning Stand — Architecture

## 1. System Philosophy

The **Geometry Reasoning Stand** is architected around a single, foundational principle:

> **ONE GEOMETRY**  
> **ONE MATHEMATICAL KERNEL**  
> **ONE CANONICAL KNOWLEDGE BASE**  
> **MANY CLIENTS**

Neither the graphical User Interface nor the AI Agent interface is the source of mathematical truth. Both are equal clients built on top of the same frozen, deterministic mathematical kernel.

```
       Canonical Geometry Knowledge Graph
                       │
                       ▼
            Deterministic Derivation Kernel
                       │
                       ▼
       Geometry Verification Environment (Stand)
          │                            │
          ▼                            ▼
   Interactive UI               AI Agent Interface
 (Human Student)               (Machine Reasoner)
```

---

## 2. Layered Architecture

### Layer 1: Geometry Substrate & Fact State
- **Coordinate Model**: Analytical geometry engine representing points on circle $C(O, R)$, angles, chords, and vectors.
- **Transformation Invariants**: Dual 3x3 homogeneous matrix engine verifying isometry and similarity invariants.
- **Epistemic Fact Map (`FactMap`)**: Key-value store of ground-truth known facts (`R`, `angle_A`, `coord_A`, `coord_B`, etc.).

### Layer 2: Deterministic Kernel (`src/kernel/`)
- **Knowledge Graph (`CANONICAL_GRAPH`)**: Directed multigraph of formal geometric theorems (`DP-ANG-SUM-C`, `DP-INSC-TO-CENT`, `DP-CHORD-TRIG`, `DP-THALES-CLASS`, `DP-COORD-CLASS`, `DP-PYTH-HYP`).
- **Navigator (`DeterministicNavigator`)**: Breadth-First Search graph discovery, precondition evaluator, topological sorting, and deterministic execution engine.
- **Exploration Runner (`ExplorationRunner`)**: Isolated sandbox for evaluating unverified student or agent hypotheses without contaminating canonical knowledge.

### Layer 3: Environment Contract & Stand Facade (`src/environment/`)
- **Observation Boundary**: In `AGENT` mode, conceals unqueried derivative answers while presenting the current observable configuration.
- **Verification Modes**:
  - `solve(target)`: Oracle mode computing the full canonical derivation trace.
  - `step(ruleId)`: Single-step rule validation and forward deduction.
  - `verifyResult(target, proposedValue)`: High-precision tolerance comparison against ground truth.
  - `verifyClaim(description, predicate)`: Arbitrary geometric predicate evaluator.

### Layer 4: Client Implementations
- **Web UI Client (`src/App.tsx`, `src/components/`, `src/lessons/`)**: Dynamic React SVG canvas, interactive parameter sliders, derivation trace cards.
- **Agent Client (`examples/agentQuickstart.ts`)**: Programmatic interface for reinforcement learning, chain-of-thought verification, or reasoning evaluation.

---

## 3. Epistemic Boundaries & Invariants

1. **The Kernel Is Pure**: Pure mathematical functions without side effects, I/O, or asynchronous delays.
2. **Epistemic Separation**:
   - *Known Facts*: Directly observed or validated geometric facts.
   - *Derived Facts*: Produced strictly by valid canonical derivation steps.
   - *Hypotheses*: Experimental proposals tested strictly in isolated execution contexts.
   - *Rejected Proposals*: Invalid steps or falsified claims leave canonical state 100% unaltered.
3. **Deterministic Predictability**: Given identical input facts, the kernel will always produce identical candidate paths, precondition evaluations, selected routes, and numerical outputs.
