# Contributing to AI-VSA

Thanks for contributing to AI-VSA.

This project is being developed as a commercial-grade AI sales platform, so changes should prioritize:

- clarity
- maintainability
- low operational cost
- safe provider abstractions
- strong lead and conversation integrity

## Principles

- Keep provider-specific logic inside adapter or service layers.
- Do not hard-code secrets, tokens, or phone numbers.
- Prefer extending shared schemas before adding route-specific shapes.
- Keep business logic reusable across voice, chat, and WhatsApp.
- Preserve human handoff and compliance safeguards.

## Recommended Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run:

```bash
npm run build
npm run typecheck
```

4. If you touched backend behavior, verify the affected routes locally.
5. Open a pull request with a clear summary of:
   - what changed
   - why it changed
   - any provider or env requirements

## Directory Expectations

| Path | Responsibility |
| --- | --- |
| `apps/api` | Routes, orchestration, provider integration |
| `apps/web` | Dashboard and operator experience |
| `packages/agent` | Qualification logic, prompts, internal agent council |
| `packages/database` | Repository and persistence model |
| `packages/shared` | Shared schemas and types |
| `docs` | Product and technical documentation |

## Pull Request Guidelines

- Keep PRs reasonably scoped.
- Document new environment variables in `.env.example`.
- Document new routes in `docs/api-routes.md`.
- Document schema changes in `docs/supabase-schema.sql` when relevant.
- Avoid mixing unrelated refactors with provider integration work.

## Good First Contributions

- improve dashboard visibility
- add provider-specific error handling
- add tests
- improve CRM mapping
- improve booking workflows
- refine lead scoring and handoff logic

## Security Notes

- Never commit real credentials.
- Do not log secrets or access tokens.
- Be careful with call recordings, transcripts, and personal data.
- Treat CRM and messaging payloads as sensitive customer data.

## Questions

If a change affects product direction, pricing, compliance, or licensing, align on that before implementing it.

