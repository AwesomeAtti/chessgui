# Prompt: Decision Gate

Use this for **hard-stop** Decision Gates — decisions that are expensive to reverse
(frameworks, databases, hosting, auth, infrastructure, platform targets, significant
architectural change).

Smaller choices are notify-and-proceed: the AI states the choice in one line, keeps working,
and records it in the handover. Don't use this prompt for those.

---

We need to make a technical decision, following the Decision Gates in `ai/methodology.md`.

**Decision:** <what needs deciding>

Provide:

1. **Industry-standard approach**
2. **Simplest alternative**
3. **Recommended approach**
4. **Tradeoffs** (pros / cons)
5. **Long-term maintenance impact**
6. **Risk level** (low / medium / high)

**Do not proceed until I approve.** Once approved, record the decision as an ADR in
`docs/adr/` with: context, options considered, decision, rationale, consequences, and status.
