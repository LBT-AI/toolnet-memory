---
name: clean-domain-code
description: Mindset and style for writing code — readable, domain-first, type-driven, functional core + imperative shell, explicit error handling, minimalism (YAGNI/KISS), easy to test, easy to delete. Always use this skill when writing, editing, reviewing, or refactoring any code (TypeScript, Python, Go, Rust, etc.), designing modules/architecture, naming things, handling errors, writing tests, or when the user mentions "clean code", "maintainable", "refactor", "review code", "domain design", even when they do not specify a style.
version: 1.0.1
category: code
tags:
  - clean-code
  - domain-driven
  - refactoring
  - code-review
  - architecture
---

# Clean Domain Code

**Formula:** Functional core + Imperative shell + Domain-driven + Type-driven + Minimalism.

This is a mindset, not a mechanical checklist. When two principles conflict, choose what is **simpler for the next reader** — that person may be a junior, or yourself six months from now.

## Workflow when writing code

1. **Understand the domain first.** Name the business concepts (orders, quotations, floor plans, video translation jobs...) before thinking about classes, tables, or endpoints.
2. **Model with types.** Define the valid states; make invalid states unrepresentable.
3. **Write the pure logic in the middle** (functions that take data and return data, no I/O).
4. **Push I/O to the edges** (DB, HTTP, files, queues, time, randomness).
5. **Make it work → make it right → make it fast** — in that order. Optimize only with measurements.
6. **Self-review** with the checklist at the end of this file before delivering code.

---

## 1. Write code for readers, not machines

- Names express **intent**: `calculateShippingFee`, not `calc`, `process`, `handleData`.
- Small functions that do **one thing** and read top-down like a story.
- **Guard clauses + early returns**. Avoid redundant `else`, avoid nesting deeper than 2 levels.
- No "clever" one-liners. If the reader has to stop to decode it, split it up.
- Boring, predictable, unsurprising code is good code.

```ts
// ❌ Deeply nested, hard to follow
function getDiscount(user: User | null, cart: Cart) {
  if (user) {
    if (user.isActive) {
      if (cart.items.length > 0) {
        return user.isVip ? cart.total * 0.2 : cart.total * 0.1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// ✅ Guard clauses, straight-line flow
function getDiscount(user: User | null, cart: Cart): number {
  if (!user?.isActive) return 0;
  if (cart.items.length === 0) return 0;

  const rate = user.isVip ? VIP_DISCOUNT_RATE : STANDARD_DISCOUNT_RATE;
  return cart.total * rate;
}
```

Use named constants instead of magic numbers. Comments explain **why**, not **what** (the code already says "what").

## 2. Domain-first, not pattern-first

- Use the **domain language** everywhere: type names, functions, modules, directories. If a domain expert reads a function name and does not understand it, rename it.
- Do not let framework language leak into the business core (`Controller`, `Manager`, `Helper`, `Util`, generic `Service` are smells worth revisiting).
- Use a design pattern only when it **makes the code simpler**. Do not use Factory/Strategy/Observer just "to have architecture". If an `if` or a function solves it, use that.

```ts
// ❌ Framework language
class QuotationManager { processData(dto: QuotationDTO) {} }

// ✅ Domain language
function issueQuotation(request: QuotationRequest, priceList: PriceList): Quotation {}
```

## 3. Type-driven

Use types to catch errors at compile time, not at runtime.

- **Make invalid states unrepresentable.** Use discriminated unions instead of multiple booleans/optional fields that travel together.
- Prefer `Result` / `Option` / union types + (exhaustive) pattern matching over pervasive `null` and exceptions.
- Use **branded/newtypes** for IDs and units (`OrderId`, `Vnd`, `Meters`) to avoid mix-ups.
- Parse, don't validate: convert raw data into strict types at the boundary; the rest of the system trusts the types.

```ts
// ❌ Contradictory state can exist (paid=false but paidAt is set?)
type Order = { status: string; paidAt?: Date; cancelReason?: string };

// ✅ Each state carries exactly its own data
type Order =
  | { kind: "draft"; items: Item[] }
  | { kind: "paid"; items: Item[]; paidAt: Date }
  | { kind: "cancelled"; reason: string };

function describe(order: Order): string {
  switch (order.kind) {
    case "draft": return "Draft";
    case "paid": return `Paid at ${order.paidAt.toISOString()}`;
    case "cancelled": return `Cancelled: ${order.reason}`;
    // adding a new kind without handling it → compile error (use assertNever)
  }
}
```

Avoid `any`; avoid `as` casts just "to make it compile". If the type system is fighting you, the domain model is usually wrong.

## 4. Functional core, imperative shell

- **Core:** pure functions, immutable, no I/O → easy to test, easy to reason about.
- **Shell:** thin, only does: read input → call core → write output / side effects.
- Pass time, randomness, and IDs in as parameters; do not call `Date.now()` deep inside logic.
- Limit global and mutable state. When mutation is needed, keep it in the smallest possible scope.

```ts
// Core: pure, no mocks needed for tests
function decideRefund(order: Order, now: Date): Result<Refund, RefundError> { /* ... */ }

// Shell: I/O lives here
async function refundHandler(orderId: OrderId) {
  const order = await orderRepo.find(orderId);       // I/O
  const decision = decideRefund(order, clock.now()); // pure logic
  if (!decision.ok) return respondError(decision.error);
  await paymentGateway.refund(decision.value);       // I/O
  await orderRepo.save(applyRefund(order, decision.value));
}
```

## 5. Composition over inheritance

- Compose behavior from small functions and objects; **no deep inheritance** (at most 1 level, usually 0).
- Small interfaces, shaped by **consumer** needs (consumer-defined).
- Simple dependency injection: pass dependencies via parameters/constructors; no container until you actually need one.
- Modules follow clear **business boundaries** with one-way dependencies: shell → core, never the reverse.

## 6. Explicit error handling

- **Fail fast at the boundary:** validate/parse input as soon as it enters the system.
- **Never swallow errors.** No empty `catch {}`, no `catch` that only logs and carries on as if nothing happened.
- Expected business failures → return them via `Result` with a specific error type. Unexpected/programmer errors → throw and let the boundary handle them.
- Error messages carry enough context to debug (what broke, with which data) without leaking sensitive information.
- Errors are part of the design: think about the error paths up front, do not bolt them on later.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type ParseFloorPlanError =
  | { kind: "empty-input" }
  | { kind: "invalid-dimensions"; width: number; depth: number };
```

## 7. Tests as a safety net

- Pure core → fast **unit tests**, no mocks. Shell → **integration tests** with real dependencies or simple fakes.
- Use **property-based tests** where invariants exist (parse ↔ serialize, totals never negative, idempotency).
- Test names describe behavior: `refunds nothing when order is already cancelled`.
- Each test: Arrange – Act – Assert, one main idea. No order dependence, no dependence on real time/network/uncontrolled randomness → **no flaky tests**.
- Tests are quality code too: clear intent, no giant copy-paste. With tests, refactoring is fearless.
- Fixing a bug → write a failing test reproducing it first.

## 8. YAGNI, KISS, just-enough DRY

- No premature abstraction. No extra layers, generics, configs, or plugin systems without a **real, current** need.
- **Rule of three:** tolerate duplication the second time; abstract only the third time — once you can see what is genuinely shared.
- Duplication is cheaper than the wrong abstraction. Two snippets that look alike but change for different reasons should **not** be merged.
- Add the smallest feature that satisfies the requirement; do not build "for the future".

## 9. Measure before optimizing

- Write the readable version first. Optimize only when **data** (profiles, benchmarks, production metrics) points at a bottleneck.
- When optimizing: record before/after measurements and explain why in a comment or ADR.
- Prefer improving algorithms/data structures/reducing I/O before micro-optimizations.

## 10. Easy-to-delete code

- Clear module boundaries, few cross-dependencies, no layer-skipping imports.
- Replacing one module should not require rebuilding the whole system. Related features live together.
- Ask yourself: "If this feature is dropped, can I delete it by deleting one directory?"
- Delete dead code, old feature flags, and unused abstractions. Good code is easy to delete, not immortal.

## 11. Optimize for the team, not yourself

- A junior can read and understand it. Reviews are fast because diffs are small with a single purpose.
- The future maintainer will not curse you: clear names, predictable structure, little magic.
- Record **architecture decisions** with short ADRs (context → decision → consequences → rejected alternatives). Comments explain **why**, not **what**.
- Follow the project's existing conventions over personal taste.

---

## Applying this to an existing codebase

- **Respect the current codebase.** Do not rewrite the whole system in this style. Apply it to new code and code you are touching; refactor in small steps protected by tests.
- **Boy Scout rule:** leave the file slightly cleaner than you found it, but do not expand the PR scope.
- **Adapt to the language:** examples above use TypeScript. In Python use `dataclass(frozen=True)`, `Literal`, `match`; in Go use explicit error returns and small interfaces; in Rust use `enum` + `Result`. Same spirit, different syntax per language.
- **If the user asks for speed/prototype:** still keep clear names and straight-line flow; deliberately skip strict types/tests, and say so explicitly as a draft.

## When responding

- Show code first, explain briefly after. State the **reason** for non-obvious design decisions (why a union type, why split core/shell).
- If a request leads toward over-engineering, propose the simpler option and say why.
- If you spot a domain gap (vague concept, undefined state), ask or state your assumptions explicitly instead of guessing.

## Self-review checklist before delivering code

- [ ] Does it read top-down and make sense immediately? Anywhere I need to "decode"?
- [ ] Do names use the domain language? Any vague `Manager/Helper/Util/data/temp`?
- [ ] Any redundant `else` or nesting deeper than 2 levels?
- [ ] Can invalid states still be represented? Any rampant `any`, `as`, `null`?
- [ ] Is pure logic separated from I/O? Any unnecessary global/mutable state?
- [ ] Are errors handled explicitly, never swallowed?
- [ ] Any abstraction, layer, config, or generic that is **not yet needed**?
- [ ] Are there tests for the main behavior and error paths? Are the tests stable?
- [ ] Any optimization without measurements?
- [ ] Is this module easy to delete/replace? Can a junior understand it?
