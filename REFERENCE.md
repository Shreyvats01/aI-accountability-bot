# Architectural References

This document outlines the open-source projects and specific concepts that inspire the architecture, personalization, and adaptation of the Accountability Bot.

## Core Implemented Paradigms

### Letta (formerly MemGPT)
*   **Persona Memory**: Persistent memory block defining the AI's core instructions and behavior.
*   **Human Memory**: Persistent memory block storing facts and goals about the user.
*   **World Memory & Recall Memory**: Contextual knowledge retrieval for long-term storage.
*   **Scratchpad / Working Memory**: Short-term, volatile memory used during single execution cycles.
*   **Self-Editing**: The ability of the AI to reflect and mutate its own memory blocks over time.

### LangGraph
*   **Shared Pipeline State**: A continuous, typed state object passed between execution nodes.
*   **Checkpointing & Resumability**: Saving the state at each stage to allow recovery from failures without restarting the pipeline.
*   **Node Execution**: Breaking the pipeline into discrete, modular stages (e.g., collect, parse, memory, strategy, generate).

### Open WebUI
*   **Input Filters**: Stripping, structuring, and sanitizing raw scraper data before the main LLM processes it.
*   **Output Filters**: Validating tone, extracting sentiment, optimizing message length, and injecting proactive curiosity questions before final message delivery.

---

## Future Inspirations (For Advanced Adaptation)

### DSPy (stanfordnlp/dspy)
*   **Programmatic Prompt Optimization**: Treating prompts as tunable parameters. Using the contextual bandit's reward function to automatically optimize and compile prompts instead of manual prompt engineering.

### Eliza / ElizaOS (ai16z/eliza)
*   **Async Evaluators**: Running background evaluator agents to extract facts and goals from conversations implicitly, rather than coupling extraction with the direct reply processor.
*   **Persona Persistence**: Advanced JSON structures for maintaining strict character and tone consistency across multiple platforms.

### Zep (getzep/zep)
*   **Document Graphs**: Advanced structures for knowledge graphs to track entities and their temporal relationships automatically.
*   **Purpose-built Long-Term Memory**: Utilizing dedicated, highly-scalable memory services with automatic summarization.

### CrewAI (joaomdmoura/crewai)
*   **Multi-Agent Collaboration**: Breaking the linear state machine into specialized communicative roles (e.g., delegating tasks to a "Researcher" agent, a "Psychologist" agent, and a "Coach" agent).

### Auto-GPT
*   **Task Decomposition**: Breaking high-level abstract user goals down into granular, actionable daily sub-tasks for precise accountability tracking.
