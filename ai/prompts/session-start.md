# Prompt: Session Start

Use this at the start of each working session.

---

Resume this project.

**Project root:** `<absolute path to this project — fill in when you copy the kit>` — all paths
below are relative to it. Use the filesystem connector to read the files there.

Read, in order, stopping once you have enough context:

1. `docs/handover.md`
2. `docs/backlog.md`
3. `AGENTS.md`

Pull in `ai/methodology.md`, `docs/architecture.md`, or `docs/tech-stack.md` only if the
current work requires them.

Then:
1. Summarize current state.
2. Identify active work and open decisions.
3. Identify risks.
4. Identify quick wins.
5. Recommend the next best task.

Check for any hard-stop Decision Gates before proceeding. Do not start implementation until
this review is complete and I've confirmed the next step.
