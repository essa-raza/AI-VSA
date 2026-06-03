# Implementation Roadmap

## Current Path Check

Yes, the earlier plan is the right direction.

The correct MVP path is:

1. one clean Node API
2. one shared lead model
3. one chat entrypoint
4. placeholder voice and WhatsApp hooks
5. appointment-setting logic
6. human handoff
7. dashboard visibility

What we should avoid right now:

- paying for multiple voice-agent vendors at once
- building Facebook, Instagram, and LinkedIn automation before phone, chat, and WhatsApp work
- adding expensive infrastructure before appointment rates justify it

## Cost-Controlled Provider Strategy

### Start

- OpenAI for reasoning
- Twilio for telephony and WhatsApp connectivity
- Google Calendar or Calendly for booking
- in-memory data for local MVP, then Supabase or Postgres

### Add only if needed

- Vapi or Retell if they cut build time enough to justify vendor cost
- ElevenLabs only if the default voice quality is clearly hurting trust

## Multi-Agent Pattern

Use multiple internal agents, but keep them cheap:

- Discovery agent
- Offer strategist
- Closer agent
- Compliance and handoff checker

These do not need separate expensive providers. They can be role-based layers over the same core reasoning system.

## Next Build Priorities

1. persist data in Supabase or Postgres
2. connect real OpenAI chat completions or realtime models
3. connect Twilio voice and WhatsApp
4. add booking action with real calendar APIs
5. add operator dashboard lead table and conversation view
6. add campaign and client tenancy

