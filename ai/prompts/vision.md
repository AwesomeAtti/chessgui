# Prompt: Vision from an Idea

Use this when you have a rough, half-formed idea and want to shape it into a one-page vision
before any planning or code. Precedes the kick-off prompt.

---

I have an early idea I want to shape into a one-page vision, following `ai/methodology.md`
(Stage 0 — Idea validation). Do not plan implementation or write code yet.

**Idea:** 



# 

Create the modern, cross-platform **chess database and chess GUI** for players who want to **search, organize, annotate, and analyze their games**—without the complexity, clutter, or dated experience of traditional chess software.

The application provides a fast, elegant, and approachable environment for building and managing a personal chess library in a local database. Players can create games, import games from platforms such as Chess.com and Lichess, annotate positions and variations, search and filter their collection, and analyze positions and games using UCI-compatible chess engines.

**Modern means more than modern technology.** The application should provide a contemporary visual design and user experience, with an intuitive interface, thoughtful information architecture, responsive interactions, sensible defaults, and a clean, cohesive design system. It should feel natural and familiar on modern desktop platforms while remaining consistent across Windows, macOS, and Linux.

As a **chess GUI**, the application provides the interface through which players interact with chess engines and analysis tools. It is not itself a chess engine; instead, it provides a powerful and approachable environment for configuring, running, and interpreting analysis from UCI-compatible engines.

The product prioritizes **clarity, performance, simplicity, and ownership of data**. It focuses on the core needs of chess players rather than attempting to become an all-in-one online chess platform. The player's games, positions, annotations, database, and analysis remain at the center of the experience.

Over time, the application can expand with capabilities such as collection-level analysis, fair-play analysis, advanced search and filtering, deeper game-management tools, and potentially the ability to play against chess engines.

Our goal is to deliver the chess database and GUI that modern players expect: **powerful enough for serious chess study, simple enough to enjoy using, beautiful enough to feel at home on a modern desktop, and available across platforms.**

**Search your games. Understand your chess.**



First, ask me up to three clarifying questions — but only if you genuinely can't proceed
without the answers. Otherwise draft the vision directly and note any assumptions you made.

Produce a one-page **product vision**:

1. **Problem** — what's broken or missing, and for whom.
2. **Target users** — who this is for.
3. **Value proposition** — why they'd use it; what makes it worth building.
4. **MVP sketch** — the smallest thing worth shipping.
5. **Success criteria** — how we'd know it's working. Observable, not vague.
6. **Non-goals** — what this deliberately is *not*, to keep scope honest.
7. **Open questions** — what still needs deciding.

Then flag:

- Any **hard-stop Decision Gates** this idea will trigger early (platform, framework, storage,
  infrastructure, auth).
- The single biggest risk or unknown to resolve first.

Capture every related idea I raise — including future features and ones we reject — as items
in `docs/backlog.md`, so nothing lives only in this chat.

End by proposing that we save the result to `docs/product-vision.md`, saying whether the idea
is ready for the kick-off prompt, and waiting for my approval. Do not start implementation.
