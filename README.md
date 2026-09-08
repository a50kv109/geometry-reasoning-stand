# Geometry Reasoning Stand

> **Deterministic geometry learning and reasoning verification stand for humans and AI agents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Kernel Tests](https://img.shields.io/badge/Kernel_Tests-8%2F8_Pass-emerald)](src/kernel/tests/)
[![Environment Tests](https://img.shields.io/badge/Environment_Tests-18%2F18_Pass-emerald)](src/environment/tests/)

The **Geometry Reasoning Stand** is a verification environment and learning workbench grounded in a frozen, deterministic mathematical kernel. It provides both an interactive visual laboratory for human students and a strict, machine-readable verification protocol for AI reasoning agents.

```
                  Canonical Knowledge Graph
                              │
                              ▼
                 Deterministic Truth Kernel
                              │
                              ▼
            Geometry Verification Environment (Stand)
               │                             │
               ▼                             ▼
        Interactive UI               AI Agent Protocol
      (Visual Workbench)          (Verification / Feedback)
```

---

## Core Philosophy: "The agent may be wrong. The stand must not be."

Large language models and exploratory reasoning agents are prone to calculation errors, invalid proof leaps, and geometric hallucinations. The Geometry Reasoning Stand serves as an **uncompromising, deterministic oracle**:
- It evaluates intermediate derivation steps against formal preconditions.
- It verifies numerical proposals against analytical ground truth.
- It tests qualitative geometric claims through invariant coordinate checks.
- It isolates rejected proposals and unverified hypotheses from the canonical knowledge base.

---

## Features

### For Human Students
- **Dynamic Interactive Workbench**: Manipulate vertices on a circle, adjust parameters, and observe theorem behavior in real time.
- **Visual Proof Traces**: Follow step-by-step mathematical deductions (e.g., Inscribed Angle Theorem $\to$ Central Angle $\to$ Chord Length).
- **Invariant Verifier**: Observe how 3x3 affine matrix transformations preserve isometry and geometric invariants.

### For AI Reasoning Agents
- **Observation Boundary**: `AGENT` mode hides derived target answers, providing only observable initial configuration.
- **Step-by-Step Validation (`step`)**: Propose deductive rules and receive structured feedback (`VALID`, `MISSING_INPUT`, `PRECONDITION_FAILED`).
- **Numerical Verification (`verifyResult`)**: Check calculations against ground truth within specified tolerances.
- **Claim Verification (`verifyClaim`)**: Assert qualitative predicates and receive deterministic validation with counter-evidence if falsified.
- **Canonical Solver (`solve`)**: Access oracle mode for reference derivations.

---

## Implemented Geometry Knowledge Graph

The stand currently supports formal derivation rules over circles, triangles, and angles:
- **`DP-ANG-SUM-C`**: Triangle angle sum $\angle C = 180^\circ - \angle A - \angle B$.
- **`DP-INSC-TO-CENT`**: Inscribed angle to central angle $\angle BOC = 2 \cdot \angle BAC$.
- **`DP-CHORD-TRIG`**: Chord length from central angle $c = 2R \sin(\alpha / 2)$.
- **`DP-THALES-CLASS`**: Thales' Theorem for right triangles subtended by a diameter.
- **`DP-COORD-CLASS`**: Coordinate-based dot-product triangle classification.
- **`DP-PYTH-HYP`**: Pythagorean Theorem $c = \sqrt{a^2 + b^2}$ with dynamic right-angle precondition checking.

---

## Quickstart

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
```

### Running the Visual UI
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the visual geometry workbench.

### Running the AI Agent Verification Demo
```bash
npx tsx examples/agentQuickstart.ts
```

### Running the Test Suites
```bash
# Run all tests (Kernel + Integration + Environment)
npm run test:all

# Run deterministic kernel tests (8 tests)
npm run test:kernel

# Run environment verification stand tests (18 tests)
npm run test:env
```

---

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)**: System design, layers, and the "One Geometry, Many Clients" principle.
- **[Environment Contract](docs/ENVIRONMENT_CONTRACT.md)**: Formal API specification for the verification stand.
- **[Agent Protocol](docs/AGENT_PROTOCOL.md)**: Machine-readable message formats and evaluation workflows.
- **[Training Scenarios](docs/TRAINING_SCENARIOS.md)**: 10 benchmark scenarios (T01–T10) for reasoning evaluation.
- **[Agent Instructions](AGENTS.md)**: Engineering guidelines for AI agents working on this codebase.
- **[Release Checklist](docs/GITHUB_RELEASE_CHECKLIST.md)**: Repository hygiene and verification checklist.

---

## Current Scope & Limitations

1. **Geometry Scope**: The current canonical graph focuses on circumscribed triangles, inscribed angles, chords, and right-triangle relations on a single circle.
2. **Deterministic Kernel**: The truth engine is 100% deterministic code. No probabilistic LLM operates inside the mathematical kernel.
3. **Research Substrate**: The repository provides the formal verification stand; it does not include pre-trained weights or autonomous agent loops.

---

## License

This project is licensed under the [MIT License](LICENSE).
