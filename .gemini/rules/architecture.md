---
description: Instructions for Gemini/Antigravity regarding architectural implementations.
---

# Architectural Implementation Guidelines

1. **Consult REFERENCE.md**: If you are asked to implement or refactor any architectural-level feature (such as memory systems, pipeline state, contextual bandits, input/output filters, or agent collaboration), you MUST first read `REFERENCE.md`.
2. **Deep Research**: Before writing code for these features, you must take the proper context of how the corresponding open-source project (e.g., Letta, LangGraph, DSPy, Eliza, etc.) actually implements the concept architecturally. 
3. **Alignment**: Align your implementation with the established paradigms of those reference projects to ensure robustness, scalability, and best practices. Do not invent a naive solution if a well-established pattern exists in the referenced project.
