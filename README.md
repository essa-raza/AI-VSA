# AI-VSA

AI-VSA is an outbound AI sales agent platform for selling automation services:

- chatbot installs for websites
- website automation and lead capture
- email reply automation
- AI voice calling
- WhatsApp and messaging automation
- website creation or improvement offers

The real goal is not to close the full deal on the first call. The goal is to sound human, build trust, qualify interest, and book an appointment with the real team.

## What We Are Building

We are building a low-cost, high-quality outbound sales machine that:

1. takes lead names, numbers, websites, and business context
2. researches what automation value we can offer
3. calls the lead with a human-like AI agent
4. explains the value in plain business language
5. handles basic objections
6. pushes hard toward one outcome: a booked appointment
7. stores call notes, interest level, objections, and next steps

## Product Strategy

### Primary Offer

The AI agent should pitch automation outcomes, not technical buzzwords:

- "We can help your website answer visitors instantly."
- "We can automate repetitive customer messages."
- "We can help your team reply faster and capture more orders."
- "We can add AI voice and chat systems that save time and increase conversion."

### Core Sales Motion

The first production use case should be:

**Outbound cold or warm calling to book meetings for website and business automation services**

This is the narrowest path with the highest learning value.

### Real Success Metric

The system wins when it books qualified appointments for your human closers.

The key metrics are:

- contact rate
- live conversation rate
- trust/engagement rate
- qualified interest rate
- booked appointment rate
- show-up rate
- cost per booked appointment

## Cost Strategy

We want the cheapest stack that still sounds premium and behaves reliably.

Recommended approach:

- use Twilio directly for telephony control
- use OpenAI directly for speech and reasoning
- avoid stacking too many agent vendors early
- keep the first dashboard simple
- delay CRM complexity until the core appointment engine works

Why this path:

- lower vendor markup
- more control over call flow
- easier tuning of prompts and qualification logic
- cleaner ownership of data and evaluation

As of June 4, 2026, OpenAI's official pricing page lists `gpt-realtime-whisper` at `$0.017/minute` and `gpt-realtime-translate` at `$0.034/minute`, while Twilio's official US Programmable Voice pricing page shows outbound local calls from `$0.014/minute` in the United States, with exact telephony pricing varying by destination country and number type.

Sources:

- [OpenAI API pricing](https://openai.com/api/pricing/)
- [Twilio voice pricing](https://www.twilio.com/voice/pricing/us)

## Starter Architecture

- `apps/api`
  - outbound campaign logic
  - lead intake
  - call simulation
  - qualification scoring
  - webhook entrypoints for telephony
- `apps/web`
  - operator dashboard
  - offer positioning
  - call and qualification visibility
- `packages/agent`
  - call scripts
  - objection handling
  - appointment-setting prompts
  - qualification logic
- `packages/shared`
  - shared schemas
  - shared types

## What Is Already In This Repo

This repo now includes:

- a working TypeScript monorepo
- an API app with sales-agent endpoints
- a repository layer that supports Postgres or Supabase via `DATABASE_URL`
- a memory fallback for local bootstrapping when no database is configured
- real OpenAI chat integration with heuristic fallback
- OpenAI realtime session bootstrap endpoint
- Twilio outbound call wiring and voice webhook support
- WhatsApp adapters for Twilio, Meta Cloud API, or a custom API
- calendar adapters for Google Calendar, Calendly link handoff, or a custom webhook
- CRM adapters for HubSpot or a custom webhook
- a lightweight dashboard with lead and conversation visibility
- shared lead and campaign schemas
- AI sales script, qualification helpers, and a multi-agent council layer
- `.env.example`
- `.venv` bootstrap support with `requirements.txt`
- architecture and execution docs

## Start Plan

### Stage 1: Build the outbound engine

1. import or enter lead data
2. enrich the lead with website notes and offer angles
3. generate a personalized call opener
4. run the AI call flow
5. capture objections and interest level
6. push for the appointment

### Stage 2: Add real calling

1. connect Twilio outbound calling
2. expose a public webhook URL
3. return TwiML or media-stream instructions
4. connect OpenAI realtime speech flow
5. store transcripts and outcomes

### Stage 3: Add business actions

1. send qualified leads to HubSpot
2. create booking links or direct calendar slots
3. trigger follow-up email or WhatsApp sequences

### Stage 4: Make it elite

1. A/B test scripts
2. score calls automatically
3. tune trust-building language
4. segment offers by business type
5. build a team dashboard for operators and closers

## Local Development

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
npm install
```

3. Create the local Python environment for sidecar utilities:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup_venv.ps1
```

4. Start the API:

```bash
npm run dev:api
```

5. Start the dashboard:

```bash
npm run dev:web
```

6. Open the dashboard at `http://localhost:5173`

## Provider Modes

The backend is environment-driven:

- Storage:
  - `DATABASE_URL` set: Postgres or Supabase
  - `DATABASE_URL` missing: memory fallback
- AI:
  - `OPENAI_API_KEY` set: real OpenAI responses and realtime session bootstrap
  - `OPENAI_API_KEY` missing: heuristic fallback
- WhatsApp:
  - `WHATSAPP_PROVIDER=twilio`
  - `WHATSAPP_PROVIDER=meta`
  - `WHATSAPP_PROVIDER=custom`
- Calendar:
  - `CALENDAR_PROVIDER=google`
  - `CALENDAR_PROVIDER=calendly`
  - `CALENDAR_PROVIDER=custom`
  - `CALENDAR_PROVIDER=none`
- CRM:
  - `CRM_PROVIDER=hubspot`
  - `CRM_PROVIDER=custom`
  - `CRM_PROVIDER=none`

## Important Files

- [apps/api/src/index.ts](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/apps/api/src/index.ts:1)
- [packages/agent/src/index.ts](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/packages/agent/src/index.ts:1)
- [packages/shared/src/schemas.ts](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/packages/shared/src/schemas.ts:1)
- [docs/architecture.md](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/docs/architecture.md:1)
- [docs/api-routes.md](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/docs/api-routes.md:1)
- [docs/implementation-roadmap.md](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/docs/implementation-roadmap.md:1)
- [docs/sales-playbook.md](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/docs/sales-playbook.md:1)
- [docs/supabase-schema.sql](C:/Users/essar/OneDrive/Documents/VOICE%20AGENT%20FOR%20SALES/docs/supabase-schema.sql:1)

## What I Recommend Next

The highest-value next move is to connect real credentials and move from mocked provider behavior into live operations:

1. Supabase project and `DATABASE_URL`
2. OpenAI API key
3. Twilio voice number and WhatsApp channel
4. Google Calendar or Calendly
5. HubSpot or your own CRM webhook

That is the shortest path from this codebase to real appointment generation.
