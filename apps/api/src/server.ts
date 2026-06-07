import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  buildCallPlan,
  buildLeadHypothesis,
  buildSystemPrompt,
  createSimulationReply,
  scoreLead
} from "@ai-vsa/agent";
import {
  bookingRequestSchema,
  chatMessageRequestSchema,
  createLeadInputSchema,
  handoffRequestSchema,
  leadContextSchema,
  outboundCallRequestSchema,
  realtimeSessionRequestSchema,
  simulationRequestSchema,
  updateLeadInputSchema,
  type Lead,
  type Message
} from "@ai-vsa/shared";
import { defaultCampaign } from "./data/defaultCampaign.js";
import { createServices, type AppServices } from "./services/index.js";

dotenv.config();

export async function createApp() {
  const services = await createServices(process.env);
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "ai-vsa-api", storage: services.config.databaseUrl ? "postgres" : "memory", timestamp: new Date().toISOString() });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      appName: "AI-VSA",
      company: "Razex Solutions",
      primaryGoal: defaultCampaign.primaryGoal,
      providerModes: { storage: services.config.databaseUrl ? "postgres" : "memory", ai: services.config.openAiApiKey ? "openai" : "heuristic", whatsapp: services.config.whatsappProvider, calendar: services.config.calendarProvider, crm: services.config.crmProvider },
      recommendedStack: { telephony: "Twilio direct first, with Vapi or Retell only if it clearly improves speed-to-market.", realtimeModel: services.config.openAiRealtimeModel, crm: services.config.crmProvider === "none" ? "HubSpot or custom webhook" : services.config.crmProvider, scheduling: services.config.calendarProvider === "none" ? "Google Calendar or Calendly" : services.config.calendarProvider }
    });
  });

  app.get("/api/campaign", (_req, res) => res.json(defaultCampaign));

  app.get("/api/analytics", async (_req, res) => {
    const [leads, conversations, handoffs] = await Promise.all([services.repository.listLeads(), services.repository.listConversations(), services.repository.listHandoffs()]);
    const qualifiedLeads = leads.filter((lead) => ["qualified", "booked", "proposal_sent", "won"].includes(lead.status));
    const bookedLeads = leads.filter((lead) => ["booked", "proposal_sent", "won"].includes(lead.status));
    const wonLeads = leads.filter((lead) => lead.status === "won");
    const activeHandoffs = handoffs.filter((handoff) => handoff.status !== "resolved");
    res.json({
      generatedAt: new Date().toISOString(),
      totals: { leads: leads.length, conversations: conversations.length, qualified: qualifiedLeads.length, booked: bookedLeads.length, won: wonLeads.length, handoffs: handoffs.length, activeHandoffs: activeHandoffs.length, handoffRate: rate(activeHandoffs.length, leads.length), qualificationRate: rate(qualifiedLeads.length, leads.length), bookingRate: rate(bookedLeads.length, leads.length), averageLeadScore: leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0 },
      funnel: [{ stage: "Captured", count: leads.length }, { stage: "Qualified", count: qualifiedLeads.length }, { stage: "Booked", count: bookedLeads.length }, { stage: "Won", count: wonLeads.length }],
      bySource: groupBySource(leads),
      byChannel: groupByChannel(conversations),
      handoffPressure: groupHandoffs(handoffs),
      recommendations: buildAnalyticsRecommendations(leads.length, qualifiedLeads.length, bookedLeads.length, activeHandoffs.length)
    });
  });

  app.post("/api/leads/preview", (req, res) => {
    const parsed = leadContextSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    const lead = parsed.data;
    return res.json({ lead, hypothesis: buildLeadHypothesis(lead), callPlan: buildCallPlan(lead, defaultCampaign), qualification: scoreLead(lead) });
  });

  app.post("/api/calls/simulate", (req, res) => {
    const parsed = simulationRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid simulation payload", details: parsed.error.flatten() });
    const request = parsed.data;
    return res.json({ systemPrompt: buildSystemPrompt(request.lead, defaultCampaign), reply: createSimulationReply(request, defaultCampaign) });
  });

  app.post("/api/realtime/session", async (req, res) => {
    const parsed = realtimeSessionRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid realtime payload", details: parsed.error.flatten() });
    try {
      const session = await services.ai.createRealtimeSession(parsed.data.instructions);
      return res.status(201).json(session);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Realtime session failed" });
    }
  });

  app.get("/api/dashboard", async (_req, res) => {
    const [leads, conversations, handoffs] = await Promise.all([services.repository.listLeads(), services.repository.listConversations(), services.repository.listHandoffs()]);
    const conversationCards = await Promise.all(conversations.map(async (conversation) => {
      const lead = await services.repository.getLead(conversation.leadId);
      const messages = await services.repository.getConversationMessages(conversation.id);
      return { ...conversation, lead, lastMessage: messages.at(-1)?.content ?? "", messageCount: messages.length };
    }));
    return res.json({ summary: { totalLeads: leads.length, qualifiedLeads: leads.filter((lead) => lead.status === "qualified" || lead.status === "booked").length, needsHuman: leads.filter((lead) => lead.status === "needs_human").length, openHandoffs: handoffs.filter((handoff) => handoff.status !== "resolved").length }, leads, conversations: conversationCards, handoffs });
  });

  app.get("/api/handoffs", async (_req, res) => {
    const handoffs = await services.repository.listHandoffs();
    const payload = await Promise.all(handoffs.map(async (handoff) => ({ ...handoff, lead: await services.repository.getLead(handoff.leadId), conversation: await services.repository.getConversation(handoff.conversationId) })));
    res.json(payload);
  });

  app.get("/api/handoffs/:id", async (req, res) => {
    const handoff = await services.repository.getHandoff(req.params.id);
    if (!handoff) return res.status(404).json({ error: "Handoff not found" });
    const [lead, conversation, messages] = await Promise.all([services.repository.getLead(handoff.leadId), services.repository.getConversation(handoff.conversationId), services.repository.getConversationMessages(handoff.conversationId)]);
    res.json({ handoff, lead, conversation, messages });
  });

  app.patch("/api/handoffs/:id", async (req, res) => {
    const status = typeof req.body.status === "string" ? req.body.status : undefined;
    const assignedTo = typeof req.body.assignedTo === "string" ? req.body.assignedTo : undefined;
    if (status && !["open", "assigned", "resolved"].includes(status)) return res.status(400).json({ error: "Invalid handoff status" });
    const handoff = await services.repository.updateHandoff(req.params.id, { status: status as "open" | "assigned" | "resolved" | undefined, assignedTo, resolvedAt: status === "resolved" ? new Date().toISOString() : undefined });
    if (!handoff) return res.status(404).json({ error: "Handoff not found" });
    if (handoff.status === "resolved") {
      await services.repository.updateLead(handoff.leadId, { status: "contacted" });
      await services.repository.saveConversationSummary(handoff.conversationId, "Human handoff resolved.", false);
    } else if (handoff.status === "assigned") {
      await services.repository.updateLead(handoff.leadId, { assignedTo: handoff.assignedTo, status: "needs_human" });
    }
    res.json({ handoff, lead: await services.repository.getLead(handoff.leadId), conversation: await services.repository.getConversation(handoff.conversationId) });
  });

  app.get("/leads", async (_req, res) => res.json(await services.repository.listLeads()));

  app.post("/leads", async (req, res) => {
    const parsed = createLeadInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    const lead = await services.repository.createLead(parsed.data);
    const scored = scoreLead(lead);
    const updated = await services.repository.updateLead(lead.id, { score: scored.score, status: scored.score >= 75 ? "qualified" : lead.status });
    const finalLead = updated ?? lead;
    await safeCrmSync(services, finalLead);
    return res.status(201).json(finalLead);
  });

  app.get("/leads/:id", async (req, res) => {
    const lead = await services.repository.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  app.patch("/leads/:id", async (req, res) => {
    const parsed = updateLeadInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid lead update", details: parsed.error.flatten() });
    const lead = await services.repository.updateLead(req.params.id, parsed.data);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    await safeCrmSync(services, lead);
    res.json(lead);
  });

  app.get("/conversations", async (_req, res) => {
    const conversations = await services.repository.listConversations();
    const payload = await Promise.all(conversations.map(async (conversation) => ({ ...conversation, lead: await services.repository.getLead(conversation.leadId) })));
    res.json(payload);
  });

  app.get("/conversations/:id/messages", async (req, res) => {
    const conversation = await services.repository.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const [lead, messages] = await Promise.all([services.repository.getLead(conversation.leadId), services.repository.getConversationMessages(conversation.id)]);
    return res.json({ conversation, lead, messages });
  });

  app.get("/api/conversations/:id/analysis", async (req, res) => {
    const conversation = await services.repository.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const [lead, messages] = await Promise.all([services.repository.getLead(conversation.leadId), services.repository.getConversationMessages(conversation.id)]);
    res.json(buildConversationAnalysis(lead, messages));
  });

  app.get("/api/conversations/:id/workspace", async (req, res) => {
    const conversation = await services.repository.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const [lead, messages, handoffs] = await Promise.all([services.repository.getLead(conversation.leadId), services.repository.getConversationMessages(conversation.id), services.repository.listHandoffs()]);
    const analysis = buildConversationAnalysis(lead, messages);
    const activeHandoff = handoffs.find((handoff) => handoff.conversationId === conversation.id && handoff.status !== "resolved") ?? null;
    res.json({
      conversation,
      lead,
      messages,
      analysis,
      activeHandoff,
      workspace: {
        headline: lead?.company || lead?.name || "Unknown lead",
        stage: lead?.status ?? "unknown",
        owner: activeHandoff?.assignedTo || lead?.assignedTo || "unassigned",
        primaryAction: activeHandoff ? "Resolve or reassign the active handoff." : analysis.recommendedAction,
        nextActions: buildWorkspaceActions(Boolean(activeHandoff), analysis.intent, analysis.dealRiskScore),
        crmSyncRecommended: Boolean(lead),
        bookingRecommended: analysis.intent === "booking ready" || analysis.urgencyScore >= 75
      }
    });
  });

  app.post("/chat/message", async (req, res) => {
    const parsed = chatMessageRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid chat payload", details: parsed.error.flatten() });
    const payload = parsed.data;
    let lead = payload.leadId ? await services.repository.getLead(payload.leadId) : null;
    if (!lead) lead = await services.repository.createLead({ ...payload.lead, source: payload.channel === "website_chat" ? "website_chat" : "manual", status: "new", painPoints: payload.lead?.painPoints ?? [], goals: payload.lead?.goals ?? [] });
    const conversation = await services.repository.ensureConversation(lead.id, payload.channel, payload.conversationId);
    await services.repository.addMessage({ conversationId: conversation.id, sender: "lead", direction: "inbound", content: payload.message, rawPayload: payload });
    const transcript = await services.repository.getConversationMessages(conversation.id);
    const result = await services.ai.generateChatReply({ lead, incomingMessage: payload.message, transcript, campaign: defaultCampaign });
    await services.repository.addMessage({ conversationId: conversation.id, sender: "agent", direction: "outbound", content: result.reply, rawPayload: { council: result.council, provider: result.provider } });
    await services.repository.saveConversationSummary(conversation.id, result.summary, result.handoffRequired);
    if (result.handoffRequired) {
      lead = (await services.repository.updateLead(lead.id, { status: "needs_human" })) ?? lead;
      await services.repository.createHandoff({ leadId: lead.id, conversationId: conversation.id, reason: result.council.complianceAgent.reason || "Lead needs a human teammate.", priority: "high", assignedTo: "" });
    }
    await safeCrmSync(services, lead);
    res.json({ lead: await services.repository.getLead(lead.id), conversationId: conversation.id, messages: await services.repository.getConversationMessages(conversation.id), reply: result.reply, qualification: result.qualification, council: result.council, provider: result.provider });
  });

  app.get("/webhooks/whatsapp", (req, res) => {
    const challenge = services.whatsapp.verifyWebhook(String(req.query["hub.mode"] ?? ""), String(req.query["hub.verify_token"] ?? ""), String(req.query["hub.challenge"] ?? ""));
    if (challenge) return res.status(200).send(challenge);
    return res.status(403).send("Verification failed");
  });

  app.post("/webhooks/whatsapp", async (req, res) => {
    const from = extractWhatsappSender(req.body);
    const text = extractWhatsappText(req.body);
    let lead = from ? await services.repository.findLeadByPhone(from) : null;
    if (!lead) lead = await services.repository.createLead({ phone: from || `unknown-${Date.now()}`, name: req.body.name ?? "WhatsApp lead", source: "whatsapp", status: "new", painPoints: [], goals: [] });
    const conversation = await services.repository.ensureConversation(lead.id, "whatsapp");
    await services.repository.addMessage({ conversationId: conversation.id, sender: "lead", direction: "inbound", content: text, rawPayload: req.body });
    const transcript = await services.repository.getConversationMessages(conversation.id);
    const result = await services.ai.generateChatReply({ lead, incomingMessage: text, transcript, campaign: defaultCampaign });
    await services.repository.addMessage({ conversationId: conversation.id, sender: "agent", direction: "outbound", content: result.reply, rawPayload: { council: result.council, provider: result.provider } });
    await services.repository.saveConversationSummary(conversation.id, result.summary, result.handoffRequired);
    const sendResult = await services.whatsapp.sendMessage(from, result.reply);
    await safeCrmSync(services, lead);
    res.json({ ok: true, conversationId: conversation.id, reply: result.reply, provider: result.provider, outbound: sendResult });
  });

  app.post("/webhooks/voice", async (req, res) => {
    const promptOverride = typeof req.query.prompt === "string" ? req.query.prompt : "";
    const leadId = typeof req.query.leadId === "string" ? req.query.leadId : "";
    const existingLead = leadId ? await services.repository.getLead(leadId) : null;
    const lead = existingLead ?? await services.repository.createLead({ name: req.body.name ?? "Voice lead", phone: req.body.phone ?? req.body.From ?? "", company: req.body.company ?? "", source: "voice_call", status: "new", painPoints: [], goals: [] });
    const conversation = await services.repository.ensureConversation(lead.id, "voice_call");
    const opener = promptOverride || buildCallPlan(lead, defaultCampaign).opener;
    await services.repository.createVoiceCall({ leadId: lead.id, conversationId: conversation.id, provider: req.body.provider ?? "twilio", providerCallId: req.body.CallSid ?? "", phoneNumber: lead.phone, direction: req.body.direction ?? "inbound", status: "received", transcript: "", summary: "Voice webhook received.", result: "pending", startedAt: new Date().toISOString(), endedAt: "" });
    const twiml = services.telephony.buildVoiceResponseTwiML(opener, defaultCampaign.bookingCallToAction, lead.id);
    res.type("text/xml").send(twiml);
  });

  app.post("/api/calls/outbound", async (req, res) => {
    const parsed = outboundCallRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid outbound call payload", details: parsed.error.flatten() });
    const payload = parsed.data;
    let lead = payload.leadId ? await services.repository.getLead(payload.leadId) : null;
    if (!lead && payload.lead) lead = await services.repository.createLead({ ...payload.lead, source: payload.lead.source ?? "outbound_call", status: payload.lead.status ?? "new", painPoints: payload.lead.painPoints ?? [], goals: payload.lead.goals ?? [] });
    if (!lead && payload.to) lead = await services.repository.createLead({ phone: payload.to, name: "Outbound lead", source: "outbound_call", status: "new", painPoints: [], goals: [] });
    if (!lead) return res.status(400).json({ error: "A lead or destination number is required" });
    try {
      const result = await services.telephony.createOutboundCall({ lead, promptOverride: payload.promptOverride });
      return res.status(201).json({ lead, outboundCall: result });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Outbound call failed" });
    }
  });

  app.post("/agent/tools/create-lead", async (req, res) => {
    const parsed = createLeadInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    const lead = await services.repository.createLead(parsed.data);
    await safeCrmSync(services, lead);
    res.status(201).json(lead);
  });

  app.post("/agent/tools/update-lead", async (req, res) => {
    const leadId = String(req.body.leadId ?? "");
    const parsed = updateLeadInputSchema.safeParse(req.body);
    if (!leadId) return res.status(400).json({ error: "leadId is required" });
    if (!parsed.success) return res.status(400).json({ error: "Invalid update payload", details: parsed.error.flatten() });
    const lead = await services.repository.updateLead(leadId, parsed.data);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    await safeCrmSync(services, lead);
    res.json(lead);
  });

  app.post("/agent/tools/book-meeting", async (req, res) => {
    const parsed = bookingRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid booking payload", details: parsed.error.flatten() });
    const lead = await services.repository.getLead(parsed.data.leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    const calendarResult = await services.calendar.bookMeeting({ lead, scheduledFor: parsed.data.scheduledFor, timezone: parsed.data.timezone });
    await services.repository.updateLead(parsed.data.leadId, { status: "booked" });
    const booking = await services.repository.createBooking({ ...parsed.data, meetingUrl: parsed.data.meetingUrl || calendarResult.meetingUrl, calendarEventId: calendarResult.calendarEventId, status: calendarResult.status === "booked" ? "booked" : "pending" });
    res.status(201).json({ booking, calendar: calendarResult });
  });

  app.post("/agent/tools/request-human-handoff", async (req, res) => {
    const parsed = handoffRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid handoff payload", details: parsed.error.flatten() });
    const lead = await services.repository.updateLead(parsed.data.leadId, { status: "needs_human" });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.status(201).json(await services.repository.createHandoff(parsed.data));
  });

  app.post("/agent/tools/send-follow-up", async (req, res) => {
    const to = String(req.body.to ?? "");
    const body = String(req.body.body ?? "");
    if (!to || !body) return res.status(400).json({ error: "to and body are required" });
    res.json({ ok: true, outbound: await services.whatsapp.sendMessage(to, body) });
  });

  return app;
}

async function safeCrmSync(services: AppServices, lead: NonNullable<Awaited<ReturnType<AppServices["repository"]["getLead"]>>>) {
  try { await services.crm.syncLead(lead); } catch {}
}

function buildWorkspaceActions(hasHandoff: boolean, intent: string, risk: number) {
  if (hasHandoff) return ["Assign a closer", "Review transcript", "Send personal reply", "Resolve handoff"];
  if (intent === "booking ready") return ["Offer two meeting times", "Book meeting", "Sync CRM", "Send confirmation"];
  if (risk >= 70) return ["Escalate to human", "Address objections", "Share proof", "Ask for timeline"];
  return ["Ask next qualifier", "Summarize needs", "Score fit", "Push toward booking"];
}

function buildConversationAnalysis(lead: Lead | null, messages: Message[]) {
  const leadMessages = messages.filter((message) => message.sender === "lead").map((message) => message.content);
  const allLeadText = leadMessages.join(" ").toLowerCase();
  const objections = detectMatches(allLeadText, ["price", "cost", "expensive", "budget", "later", "not now", "already", "competitor", "contract", "approval"]);
  const buyingSignals = detectMatches(allLeadText, ["book", "schedule", "demo", "call", "interested", "need", "urgent", "soon", "start", "proposal", "quote"]);
  const sentiment = objections.length > buyingSignals.length ? "cautious" : buyingSignals.length > 0 ? "positive" : "neutral";
  const urgencyScore = clamp((lead?.score ?? 0) + buyingSignals.length * 10 - objections.length * 5, 0, 100);
  const dealRiskScore = clamp(100 - urgencyScore + objections.length * 8 + (messages.length < 3 ? 15 : 0), 0, 100);
  const intent = buyingSignals.includes("book") || buyingSignals.includes("schedule") || buyingSignals.includes("demo") ? "booking ready" : buyingSignals.length > 0 ? "interested" : objections.length > 0 ? "needs reassurance" : "discovery needed";
  return { lead, transcriptLength: messages.length, intent, sentiment, urgencyScore, dealRiskScore, buyingSignals, objections, recommendedAction: buildConversationNextAction(intent, dealRiskScore), closerBrief: buildCloserBrief(lead, intent, objections, buyingSignals), summary: messages.length === 0 ? "No transcript is available yet." : `Conversation has ${messages.length} messages. Lead appears ${sentiment} with ${buyingSignals.length} buying signal${buyingSignals.length === 1 ? "" : "s"} and ${objections.length} objection marker${objections.length === 1 ? "" : "s"}.` };
}

function buildConversationNextAction(intent: string, risk: number) {
  if (intent === "booking ready") return "Offer two specific meeting times and confirm the best contact channel.";
  if (risk >= 70) return "Have a human closer respond with reassurance, proof, and one clear next step.";
  if (intent === "interested") return "Ask one qualification question, then push toward booking.";
  if (intent === "needs reassurance") return "Handle the objection, share a relevant proof point, and ask for timeline.";
  return "Continue discovery and collect pain, goal, timeline, and budget signals.";
}

function buildCloserBrief(lead: Lead | null, intent: string, objections: string[], buyingSignals: string[]) {
  const name = lead?.name && lead.name !== "Unknown lead" ? lead.name : "This lead";
  const company = lead?.company ? ` from ${lead.company}` : "";
  const objectionText = objections.length ? ` Main concern markers: ${objections.join(", ")}.` : " No strong objections detected.";
  const signalText = buyingSignals.length ? ` Buying signals: ${buyingSignals.join(", ")}.` : " Buying signals are still weak.";
  return `${name}${company} is currently classified as ${intent}.${signalText}${objectionText}`;
}

function detectMatches(text: string, terms: string[]) {
  return [...new Set(terms.filter((term) => text.includes(term)))];
}

function groupBySource(leads: NonNullable<Awaited<ReturnType<AppServices["repository"]["listLeads"]>>>) {
  const groups = new Map<string, { source: string; leads: number; qualified: number; booked: number; averageScore: number; totalScore: number }>();
  for (const lead of leads) {
    const current = groups.get(lead.source) ?? { source: lead.source, leads: 0, qualified: 0, booked: 0, averageScore: 0, totalScore: 0 };
    current.leads += 1;
    current.totalScore += lead.score;
    if (["qualified", "booked", "proposal_sent", "won"].includes(lead.status)) current.qualified += 1;
    if (["booked", "proposal_sent", "won"].includes(lead.status)) current.booked += 1;
    current.averageScore = Math.round(current.totalScore / current.leads);
    groups.set(lead.source, current);
  }
  return [...groups.values()].map(({ totalScore: _totalScore, ...group }) => ({ ...group, qualificationRate: rate(group.qualified, group.leads), bookingRate: rate(group.booked, group.leads) })).sort((a, b) => b.leads - a.leads);
}

function groupByChannel(conversations: NonNullable<Awaited<ReturnType<AppServices["repository"]["listConversations"]>>>) {
  const groups = new Map<string, { channel: string; conversations: number; handoffRequired: number }>();
  for (const conversation of conversations) {
    const current = groups.get(conversation.channel) ?? { channel: conversation.channel, conversations: 0, handoffRequired: 0 };
    current.conversations += 1;
    if (conversation.handoffRequired) current.handoffRequired += 1;
    groups.set(conversation.channel, current);
  }
  return [...groups.values()].map((group) => ({ ...group, handoffRate: rate(group.handoffRequired, group.conversations) })).sort((a, b) => b.conversations - a.conversations);
}

function groupHandoffs(handoffs: NonNullable<Awaited<ReturnType<AppServices["repository"]["listHandoffs"]>>>) {
  return { open: handoffs.filter((handoff) => handoff.status === "open").length, assigned: handoffs.filter((handoff) => handoff.status === "assigned").length, resolved: handoffs.filter((handoff) => handoff.status === "resolved").length, highPriority: handoffs.filter((handoff) => handoff.priority === "high" && handoff.status !== "resolved").length };
}

function buildAnalyticsRecommendations(totalLeads: number, qualified: number, booked: number, activeHandoffs: number) {
  const recommendations: string[] = [];
  if (totalLeads === 0) recommendations.push("Seed demo leads or connect the first live channel to validate the dashboard.");
  if (totalLeads > 0 && qualified === 0) recommendations.push("Tighten qualification questions or lead scoring because no captured leads are qualifying yet.");
  if (qualified > 0 && booked === 0) recommendations.push("Prioritize booking automation because qualified leads are not turning into calendar events yet.");
  if (activeHandoffs > 0) recommendations.push("Resolve active handoffs quickly to prevent hot leads from waiting on a human closer.");
  if (recommendations.length === 0) recommendations.push("Pipeline is healthy enough for the next build step: transcript evaluation and campaign attribution.");
  return recommendations;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function extractWhatsappSender(payload: Record<string, unknown>) {
  const direct = String(payload.from ?? payload.phone ?? "");
  if (direct) return direct.replace(/^whatsapp:/, "");
  const entry = Array.isArray(payload.entry) ? payload.entry[0] as Record<string, unknown> : undefined;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] as Record<string, unknown> : undefined;
  const value = changes?.value as Record<string, unknown> | undefined;
  const contacts = Array.isArray(value?.contacts) ? value.contacts[0] as Record<string, unknown> : undefined;
  return String(contacts?.wa_id ?? "");
}

function extractWhatsappText(payload: Record<string, unknown>) {
  const direct = String(payload.message ?? payload.text ?? "");
  if (direct) return direct;
  const entry = Array.isArray(payload.entry) ? payload.entry[0] as Record<string, unknown> : undefined;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] as Record<string, unknown> : undefined;
  const value = changes?.value as Record<string, unknown> | undefined;
  const messages = Array.isArray(value?.messages) ? value.messages[0] as Record<string, unknown> | undefined : undefined;
  const text = messages?.text as Record<string, unknown> | undefined;
  return String(text?.body ?? "Hello");
}
