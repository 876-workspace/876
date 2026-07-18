# React Best Practices — Index

**Version 1.0.0**
Vercel Engineering
January 2026

> **Note:**
> This document is mainly for agents and LLMs to follow when maintaining,
> generating, or refactoring React and Next.js codebases. Humans
> may also find it useful, but guidance here is optimized for automation
> and consistency by AI-assisted workflows.

Comprehensive performance optimization guide for React and Next.js applications. Split by category — read the file(s) relevant to the task at hand rather than the whole set.

| #   | Category                  | Impact      | File                                                             |
| --- | ------------------------- | ----------- | ---------------------------------------------------------------- |
| 1   | Eliminating Waterfalls    | CRITICAL    | [performance-waterfalls.md](performance-waterfalls.md)           |
| 2   | Bundle Size Optimization  | CRITICAL    | [performance-bundle-size.md](performance-bundle-size.md)         |
| 3   | Server-Side Performance   | HIGH        | [performance-server-side.md](performance-server-side.md)         |
| 4   | Client-Side Data Fetching | MEDIUM-HIGH | [performance-client-fetching.md](performance-client-fetching.md) |
| 5   | Re-render Optimization    | MEDIUM      | [performance-rerender.md](performance-rerender.md)               |
| 6   | Rendering Performance     | MEDIUM      | [performance-rendering.md](performance-rendering.md)             |
| 7   | JavaScript Performance    | LOW-MEDIUM  | [performance-js.md](performance-js.md)                           |
| 8   | Advanced Patterns         | LOW         | [performance-advanced.md](performance-advanced.md)               |

Start here and open only the category files relevant to the change — e.g. a data-fetching change needs waterfalls + server-side + client-fetching, not the whole set.
