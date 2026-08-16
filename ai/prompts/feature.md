# Prompt: Feature Planning

Use this when a feature is **Large** — it spans sessions, or introduces a new dependency,
pattern, or platform surface.

For Trivial and Small work, don't use this prompt. Just describe what you want; the AI sizes
it and either builds it directly (Trivial) or writes a one-paragraph plan first (Small). See
"Feature sizing" in `ai/methodology.md`.

---

Help me design and implement this feature, following `ai/methodology.md`.

**Feature:** <describe the feature>

First, tell me what size tier you think this is (Trivial / Small / Large) and why. If it isn't
Large, skip the rest of this prompt and take the lighter path instead — don't over-plan it.

If it is Large, produce:

1. **Backlog entry** — add it to `docs/backlog.md` with an ID, type, priority, and status.
2. **MVP version** — the smallest demonstrable slice.
3. **Production version** — what "done properly" looks like later.
4. **Risks** and **dependencies**.
5. **Recommendation** — the simplest viable approach, with the main tradeoffs and how this is
   usually done in real systems.
6. **Implementation plan** — step-by-step, broken into small milestones, each one demonstrable.

Rules: prefer visible progress; placeholder UI is acceptable; break large features into small
milestones. If any step triggers a hard-stop Decision Gate, stop and use the decision prompt
instead.
