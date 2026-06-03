# Architecture

## Objective

Build an AI outbound caller that feels human, presents automation offers clearly, qualifies interest, and books appointments for the human sales team.

## Recommended Stack

### Keep costs low without going cheap

- Telephony: Twilio
- AI voice and reasoning: OpenAI realtime stack
- Backend: Node.js + TypeScript + Express
- Dashboard: Vite + TypeScript
- Validation: Zod
- CRM first target: HubSpot
- Scheduling first target: Calendly or Google Calendar

## System Flow

1. Leads enter from CSV, manual input, scraped data, or CRM export
2. The system builds a value hypothesis from the website and business profile
3. The agent generates a personalized opener and objection strategy
4. Telephony places the call
5. The AI agent talks, listens, and adapts
6. Qualification state is updated after each turn
7. If interest is strong, the system asks for a meeting
8. Outcome data is saved for the team

## Design Principles

- Sell outcomes, not AI jargon
- Push every call toward one CTA
- Protect trust with calm, human-like language
- Escalate to humans when confidence is low
- Keep costs visible at every layer
- Build first for one workflow, not every channel at once

## Data Model

### Lead

- name
- phone
- company
- website
- industry
- pain points
- goals

### Call outcome

- status
- qualification score
- objections heard
- appointment requested
- appointment booked
- notes

### Campaign

- offer
- audience
- call goal
- opening script
- objection playbook
- booking CTA

## Implementation Order

1. Simulation and qualification engine
2. Outbound telephony trigger
3. Realtime voice loop
4. CRM sync
5. Booking automation
6. Evaluation and analytics

## Production Notes

- Use Twilio pricing APIs for destination-aware call costing
- Record explicit consent logic before recording calls
- Be careful with local laws around automated calling and disclosure
- Build human handoff from day one

