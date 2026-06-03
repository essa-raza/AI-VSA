# API Routes

## Core routes

- `GET /health`
- `GET /api/dashboard`
- `POST /leads`
- `GET /leads`
- `GET /leads/:id`
- `PATCH /leads/:id`
- `GET /conversations`
- `GET /conversations/:id/messages`
- `POST /chat/message`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `POST /webhooks/voice`
- `POST /api/calls/outbound`

## Agent tool routes

- `POST /agent/tools/create-lead`
- `POST /agent/tools/update-lead`
- `POST /agent/tools/book-meeting`
- `POST /agent/tools/request-human-handoff`
- `POST /agent/tools/send-follow-up`

## Strategy and simulation routes

- `GET /api/config`
- `GET /api/campaign`
- `POST /api/leads/preview`
- `POST /api/calls/simulate`
- `POST /api/realtime/session`

## Current storage mode

If `DATABASE_URL` is set, the app uses Postgres or Supabase and persists data.

If `DATABASE_URL` is missing, the app falls back to memory for local bootstrapping.

## Provider notes

- OpenAI chat uses the Responses API when `OPENAI_API_KEY` is configured.
- OpenAI realtime sessions can be bootstrapped through `POST /api/realtime/session`.
- WhatsApp can be sent through Twilio, Meta Cloud API, or a custom API endpoint.
- CRM sync currently supports HubSpot or a custom webhook.
- Calendar booking currently supports Google Calendar, Calendly link handoff, or a custom webhook.
