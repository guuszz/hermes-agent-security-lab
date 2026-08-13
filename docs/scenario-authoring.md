# Scenario Authoring Contract

Scenario execution begins in M2. This document fixes the intended contract early so architecture
and review can converge before implementation.

Every scenario will declare:

- stable identifier and description;
- mapped risk category;
- local synthetic fixtures;
- allowed and denied tools;
- allowed filesystem roots;
- call, token, cost, and timeout budgets;
- deterministic expected evidence;
- pass/fail conditions;
- idempotent cleanup.

The schema will reject unknown fields by default. A scenario cannot expand permissions at runtime,
and model output cannot change its success criteria.
