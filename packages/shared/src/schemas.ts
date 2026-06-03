import { z } from "zod";

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "booked",
  "proposal_sent",
  "won",
  "lost",
  "needs_human"
]);

export const leadSourceSchema = z.enum([
  "website_chat",
  "whatsapp",
  "voice_call",
  "form",
  "manual",
  "referral",
  "outbound_call"
]);

export const channelSchema = z.enum([
  "website_chat",
  "whatsapp",
  "voice_call",
  "email",
  "manual"
]);

export const leadContextSchema = z.object({
  name: z.string().default("there"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().default(""),
  company: z.string().default("your business"),
  website: z.string().default(""),
  industry: z.string().default("general business"),
  painPoints: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([])
});

export const leadSchema = leadContextSchema.extend({
  id: z.string(),
  source: leadSourceSchema,
  status: leadStatusSchema,
  serviceNeeded: z.string().default(""),
  budget: z.string().default(""),
  timeline: z.string().default(""),
  score: z.number().int().min(0).max(100).default(0),
  summary: z.string().default(""),
  assignedTo: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createLeadInputSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    company: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    source: leadSourceSchema.default("manual"),
    status: leadStatusSchema.default("new"),
    serviceNeeded: z.string().optional(),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    summary: z.string().optional(),
    assignedTo: z.string().optional(),
    painPoints: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([])
  })
  .refine(
    (value) =>
      Boolean(value.name?.trim() || value.email?.trim() || value.phone?.trim()),
    { message: "At least one lead identifier is required." }
  );

export const updateLeadInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  status: leadStatusSchema.optional(),
  serviceNeeded: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  summary: z.string().optional(),
  assignedTo: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional()
});

export const campaignSchema = z.object({
  name: z.string(),
  audience: z.string(),
  coreOffer: z.string(),
  primaryGoal: z.string(),
  trustPromises: z.array(z.string()),
  qualifyingQuestions: z.array(z.string()),
  objectionPlaybook: z.record(z.string(), z.string()),
  bookingCallToAction: z.string()
});

export const conversationSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  channel: channelSchema,
  status: z.enum(["open", "closed"]),
  summary: z.string().default(""),
  handoffRequired: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  sender: z.enum(["agent", "lead", "system", "human"]),
  direction: z.enum(["inbound", "outbound"]),
  content: z.string(),
  rawPayload: z.unknown().optional(),
  createdAt: z.string()
});

export const voiceCallSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  conversationId: z.string(),
  provider: z.string(),
  providerCallId: z.string().default(""),
  phoneNumber: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  status: z.string(),
  transcript: z.string().default(""),
  summary: z.string().default(""),
  result: z.string().default(""),
  startedAt: z.string().default(""),
  endedAt: z.string().default(""),
  createdAt: z.string()
});

export const bookingSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  calendarEventId: z.string().default(""),
  meetingUrl: z.string().default(""),
  scheduledFor: z.string(),
  timezone: z.string(),
  status: z.enum(["pending", "booked", "cancelled"]).default("pending"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const humanHandoffSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  conversationId: z.string(),
  reason: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "assigned", "resolved"]).default("open"),
  assignedTo: z.string().default(""),
  createdAt: z.string(),
  resolvedAt: z.string().default("")
});

export const chatMessageRequestSchema = z.object({
  channel: channelSchema.default("website_chat"),
  message: z.string().min(1),
  leadId: z.string().optional(),
  lead: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      company: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      source: leadSourceSchema.optional(),
      status: leadStatusSchema.optional(),
      serviceNeeded: z.string().optional(),
      budget: z.string().optional(),
      timeline: z.string().optional(),
      summary: z.string().optional(),
      assignedTo: z.string().optional(),
      painPoints: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional()
    })
    .optional(),
  conversationId: z.string().optional()
});

export const simulationTurnSchema = z.object({
  speaker: z.enum(["agent", "lead"]),
  message: z.string().min(1)
});

export const simulationRequestSchema = z.object({
  lead: leadContextSchema,
  transcript: z.array(simulationTurnSchema).default([]),
  leadSignal: z.enum(["cold", "neutral", "warm"]).default("neutral")
});

export const bookingRequestSchema = z.object({
  leadId: z.string(),
  scheduledFor: z.string(),
  timezone: z.string().default("UTC"),
  meetingUrl: z.string().default("")
});

export const handoffRequestSchema = z.object({
  leadId: z.string(),
  conversationId: z.string(),
  reason: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignedTo: z.string().default("")
});

export const outboundCallRequestSchema = z.object({
  leadId: z.string().optional(),
  to: z.string().optional(),
  from: z.string().optional(),
  lead: createLeadInputSchema.optional(),
  promptOverride: z.string().optional()
});

export const realtimeSessionRequestSchema = z.object({
  voice: z.string().default("alloy"),
  instructions: z.string().optional()
});

export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type LeadSource = z.infer<typeof leadSourceSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type LeadContext = z.infer<typeof leadContextSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type VoiceCall = z.infer<typeof voiceCallSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type HumanHandoff = z.infer<typeof humanHandoffSchema>;
export type ChatMessageRequest = z.infer<typeof chatMessageRequestSchema>;
export type SimulationTurn = z.infer<typeof simulationTurnSchema>;
export type SimulationRequest = z.infer<typeof simulationRequestSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;
export type OutboundCallRequest = z.infer<typeof outboundCallRequestSchema>;
export type RealtimeSessionRequest = z.infer<typeof realtimeSessionRequestSchema>;
