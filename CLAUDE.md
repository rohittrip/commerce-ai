# Claude Code – Project Guidelines

This file defines how Claude should assist with this codebase.

---

## 1. General Principles

- Prefer **clarity over cleverness**
- Write **production-ready code**, not pseudocode
- Follow **existing project conventions** (naming, structure, patterns)
- Avoid unnecessary abstractions
- Do not introduce new libraries unless explicitly asked

---

## 2. Code Quality Standards

- Use meaningful variable, method, and class names
- Keep functions small and single-purpose
- Avoid deep nesting where possible
- Handle edge cases and nullability explicitly
- Do not duplicate logic—reuse existing utilities when appropriate

---

## 3. Language & Framework Practices

- Follow language idioms and official best practices
- Use modern, stable language features (avoid experimental APIs)
- Prefer standard libraries over custom implementations
- Respect framework lifecycles and architectural patterns

---

## 4. Error Handling & Logging

- Fail fast with clear error messages
- Never swallow exceptions silently
- Log errors with enough context for debugging
- Avoid logging sensitive data (tokens, passwords, PII)

---

## 5. Performance & Scalability

- Avoid premature optimization
- Be mindful of:
  - N+1 queries
  - Blocking calls in async flows
  - Excessive memory usage
- Prefer batch operations where applicable

---

## 6. Security Best Practices

- Never hardcode secrets or credentials
- Validate and sanitize all external inputs
- Follow least-privilege principles
- Use secure defaults for configs and APIs

---

## 7. Testing Expectations

- Write testable code
- Add or update tests when changing behavior
- Prefer deterministic tests over time-based or flaky logic
- Keep tests readable and focused

---

## 8. Documentation & Comments

- Comment **why**, not **what**
- Public methods should be self-explanatory
- Update README or docs when behavior changes
- Avoid redundant or obvious comments

---

## 9. What Claude Should NOT Do

- Do not refactor unrelated code
- Do not change public APIs unless requested
- Do not reformat entire files unnecessarily
- Do not introduce breaking changes silently

---

## 10. Output Expectations

When responding:
- Be concise and structured
- Use code blocks for code only
- Explain trade-offs when relevant
- Ask clarifying questions only if required
