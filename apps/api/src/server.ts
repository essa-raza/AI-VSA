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
  updateLeadInputSchema
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
    res.json({
      ok: true,
      service: "ai-vsa-api",
      storage: services.config.databaseUrl ? "postgres" : "memory",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      appName: "AI-VSA",
      company: "Razex Solutions",
      primaryGoal: defaultCampaign.primaryGoal,
      providerModes: {
        storage: services.config.databaseUrl ? "postgres" : "memory",
        ai: services.config.openAiApiKey ? "openai" : "heuristic",
        whatsapp: services.config.whatsappProvider,
        calendar: services.config.calendarProvider,
        crm: services.config.crmProvider
      },
      recommendedStack: {
        telephony: "Twilio direct first, with Vapi or Retell only if it clearly improves speed-to-market.",
        realtimeModel: services.config.openAiRealtimeModel,
        crm: services.config.crmProvider === "none" ? "HubSpot or custom webhook" : services.config.crmProvider,
        scheduling: services.config.calendarProvider === "none" ? "Google Calendar or Calendly" : services.config.calendarProvider
      }
    });
  });

  app.get("/api/campaign", (_req, res) => {
    res.json(defaultCampaign);
  });

  app.post("/api/leads/preview", (req, res) => {
    const parsed = leadContextSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    }

    const lead = parsed.data;

    return res.json({
      lead,
      hypothesis: buildLeadHypothesis(lead),
      callPlan: buildCallPlan(lead, defaultCampaign),
      qualification: scoreLead(lead)
    });
  });

  app.post("/api/calls/simulate", (req, res) => {
    const parsed = simulationRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid simulation payload", details: parsed.error.flatten() });
    }

    const request = parsed.data;

    return res.json({
      systemPrompt: buildSystemPrompt(request.lead, defaultCampaign),
      reply: createSimulationReply(request, defaultCampaign)
    });
  });

  app.post("/api/realtime/session", async (req, res) => {
    const parsed = realtimeSessionRequestSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid realtime payload", details: parsed.error.flatten() });
    }

    try {
      const session = await services.ai.createRealtimeSession(parsed.data.instructions);
      return res.status(201).json(session);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Realtime session failed" });
    }
  });

  app.get("/api/dashboard", async (_req, res) => {
    const [leads, conversations] = await Promise.all([
      services.repository.listLeads(),
      services.repository.listConversations()
    ]);

    const conversationCards = await Promise.all(
      conversations.map(async (conversation) => {
        const lead = await services.repository.getLead(conversation.leadId);
        const messages = await services.repository.getConversationMessages(conversation.id);

        return {
          ...conversation,
          lead,
          lastMessage: messages.at(-1)?.content ?? "",
          messageCount: messages.length
        };
      })
    );

    return res.json({
      summary: {
        totalLeads: leads.length,
        qualifiedLeads: leads.filter((lead) => lead.status === "qualified" || lead.status === "booked").length,
        needsHuman: leads.filter((lead) => lead.status === "needs_human").length
      },
      leads,
      conversations: conversationCards
    });
  });

  app.get("/leads", async (_req, res) => {
    res.json(await services.repository.listLeads());
  });

  app.post("/leads", async (req, res) => {
    const parsed = createLeadInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    }

    const lead = await services.repository.createLead(parsed.data);
    const scored = scoreLead(lead);
    const updated = await services.repository.updateLead(lead.id, {
      score: scored.score,
      status: scored.score >= 75 ? "qualified" : lead.status
    });

    const finalLead = updated ?? lead;
    await safeCrmSync(services, finalLead);
    return res.status(201).json(finalLead);
  });

  app.get("/leads/:id", async (req, res) => {
    const lead = await services.repository.getLead(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(lead);
  });

  app.patch("/leads/:id", async (req, res) => {
    const parsed = updateLeadInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid lead update", details: parsed.error.flatten() });
    }

    const lead = await services.repository.updateLead(req.params.id, parsed.data);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await safeCrmSync(services, lead);
    res.json(lead);
  });

  app.get("/conversations", async (_req, res) => {
    const conversations = await services.repository.listConversations();
    const payload = await Promise.all(
      conversations.map(async (conversation) => ({
        ...conversation,
        lead: await services.repository.getLead(conversation.leadId)
      }))
    );

    res.json(payload);
  });

  app.get("/conversations/:id/messages", async (req, res) => {
    const conversation = await services.repository.getConversation(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const [lead, messages] = await Promise.all([
      services.repository.getLead(conversation.leadId),
      services.repository.getConversationMessages(conversation.id)
    ]);

    return res.json({
      conversation,
      lead,
      messages
    });
  });

  app.post("/chat/message", async (req, res) => {
    const parsed = chatMessageRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid chat payload", details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    let lead = payload.leadId ? await services.repository.getLead(payload.leadId) : null;

    if (!lead) {
      lead = await services.repository.createLead({
        ...payload.lead,
        source: payload.channel === "website_chat" ? "website_chat" : "manual",
        status: "new",
        painPoints: payload.lead?.painPoints ?? [],
        goals: payload.lead?.goals ?? []
      });
    }

    const conversation = await services.repository.ensureConversation(lead.id, payload.channel, payload.conversationId);
    await services.repository.addMessage({
      conversationId: conversation.id,
      sender: "lead",
      direction: "inbound",
      content: payload.message,
      rawPayload: payload
    });

    const transcript = await services.repository.getConversationMessages(conversation.id);
    const result = await services.ai.generateChatReply({
      lead,
      incomingMessage: payload.message,
      transcript,
      campaign: defaultCampaign
    });

    await services.repository.addMessage({
      conversationId: conversation.id,
      sender: "agent",
      direction: "outbound",
      content: result.reply,
      rawPayload: {
        council: result.council,
        provider: result.provider
      }
    });

    await services.repository.saveConversationSummary(conversation.id, result.summary, result.handoffRequired);

    if (result.handoffRequired) {
      lead = (await services.repository.updateLead(lead.id, { status: "needs_human" })) ?? lead;
      await services.repository.createHandoff({
        leadId: lead.id,
        conversationId: conversation.id,
        reason: result.council.complianceAgent.reason || "Lead needs a human teammate.",
        priority: "high",
        assignedTo: ""
      });
    }

    await safeCrmSync(services, lead);

    res.json({
      lead: await services.repository.getLead(lead.id),
      conversationId: conversation.id,
      messages: await services.repository.getConversationMessages(conversation.id),
      reply: result.reply,
      qualification: result.qualification,
      council: result.council,
      provider: result.provider
    });
  });

  app.get("/webhooks/whatsapp", (req, res) => {
    const challenge = services.whatsapp.verifyWebhook(
      String(req.query["hub.mode"] ?? ""),
      String(req.query["hub.verify_token"] ?? ""),
      String(req.query["hub.challenge"] ?? "")
    );

    if (challenge) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Verification failed");
  });

  app.post("/webhooks/whatsapp", async (req, res) => {
    const from = extractWhatsappSender(req.body);
    const text = extractWhatsappText(req.body);
    let lead = from ? await services.repository.findLeadByPhone(from) : null;

    if (!lead) {
      lead = await services.repository.createLead({
        phone: from || `unknown-${Date.now()}`,
        name: req.body.name ?? "WhatsApp lead",
        source: "whatsapp",
        status: "new",
        painPoints: [],
        goals: []
      });
    }

    const conversation = await services.repository.ensureConversation(lead.id, "whatsapp");
    await services.repository.addMessage({
      conversationId: conversation.id,
      sender: "lead",
      direction: "inbound",
      content: text,
      rawPayload: req.body
    });

    const transcript = await services.repository.getConversationMessages(conversation.id);
    const result = await services.ai.generateChatReply({
      lead,
      incomingMessage: text,
      transcript,
      campaign: defaultCampaign
    });

    await services.repository.addMessage({
      conversationId: conversation.id,
      sender: "agent",
      direction: "outbound",
      content: result.reply,
      rawPayload: {
        council: result.council,
        provider: result.provider
      }
    });
    await services.repository.saveConversationSummary(conversation.id, result.summary, result.handoffRequired);

    const sendResult = await services.whatsapp.sendMessage(from, result.reply);
    await safeCrmSync(services, lead);

    res.json({
      ok: true,
      conversationId: conversation.id,
      reply: result.reply,
      provider: result.provider,
      outbound: sendResult
    });
  });

  app.post("/webhooks/voice", async (req, res) => {
    const promptOverride = typeof req.query.prompt === "string" ? req.query.prompt : "";
    const leadId = typeof req.query.leadId === "string" ? req.query.leadId : "";
    const existingLead = leadId ? await services.repository.getLead(leadId) : null;
    const lead = existingLead ?? await services.repository.createLead({
      name: req.body.name ?? "Voice lead",
      phone: req.body.phone ?? req.body.From ?? "",
      company: req.body.company ?? "",
      source: "voice_call",
      status: "new",
      painPoints: [],
      goals: []
    });
    const conversation = await services.repository.ensureConversation(lead.id, "voice_call");
    const opener = promptOverride || buildCallPlan(lead, defaultCampaign).opener;

    await services.repository.createVoiceCall({
      leadId: lead.id,
      conversationId: conversation.id,
      provider: req.body.provider ?? "twilio",
      providerCallId: req.body.CallSid ?? "",
      phoneNumber: lead.phone,
      direction: req.body.direction ?? "inbound",
      status: "received",
      transcript: "",
      summary: "Voice webhook received.",
      result: "pending",
      startedAt: new Date().toISOString(),
      endedAt: ""
    });

    const twiml = services.telephony.buildVoiceResponseTwiML(
      opener,
      defaultCampaign.bookingCallToAction,
      lead.id
    );

    res.type("text/xml").send(twiml);
  });

  app.post("/api/calls/outbound", async (req, res) => {
    const parsed = outboundCallRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid outbound call payload", details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    let lead = payload.leadId ? await services.repository.getLead(payload.leadId) : null;

    if (!lead && payload.lead) {
      lead = await services.repository.createLead({
        ...payload.lead,
        source: payload.lead.source ?? "outbound_call",
        status: payload.lead.status ?? "new",
        painPoints: payload.lead.painPoints ?? [],
        goals: payload.lead.goals ?? []
      });
    }

    if (!lead && payload.to) {
      lead = await services.repository.createLead({
        phone: payload.to,
        name: "Outbound lead",
        source: "outbound_call",
        status: "new",
        painPoints: [],
        goals: []
      });
    }

    if (!lead) {
      return res.status(400).json({ error: "A lead or destination number is required" });
    }

    try {
      const result = await services.telephony.createOutboundCall({
        lead,
        promptOverride: payload.promptOverride
      });

      return res.status(201).json({
        lead,
        outboundCall: result
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Outbound call failed" });
    }
  });

  app.post("/agent/tools/create-lead", async (req, res) => {
    const parsed = createLeadInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    }

    const lead = await services.repository.createLead(parsed.data);
    await safeCrmSync(services, lead);
    res.status(201).json(lead);
  });

  app.post("/agent/tools/update-lead", async (req, res) => {
    const leadId = String(req.body.leadId ?? "");
    const parsed = updateLeadInputSchema.safeParse(req.body);

    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update payload", details: parsed.error.flatten() });
    }

    const lead = await services.repository.updateLead(leadId, parsed.data);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await safeCrmSync(services, lead);
    res.json(lead);
  });

  app.post("/agent/tools/book-meeting", async (req, res) => {
    const parsed = bookingRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid booking payload", details: parsed.error.flatten() });
    }

    const lead = await services.repository.getLead(parsed.data.leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const calendarResult = await services.calendar.bookMeeting({
      lead,
      scheduledFor: parsed.data.scheduledFor,
      timezone: parsed.data.timezone
    });

    await services.repository.updateLead(parsed.data.leadId, { status: "booked" });
    const booking = await services.repository.createBooking({
      ...parsed.data,
      meetingUrl: parsed.data.meetingUrl || calendarResult.meetingUrl,
      calendarEventId: calendarResult.calendarEventId,
      status: calendarResult.status === "booked" ? "booked" : "pending"
    });

    res.status(201).json({
      booking,
      calendar: calendarResult
    });
  });

  app.post("/agent/tools/request-human-handoff", async (req, res) => {
    const parsed = handoffRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid handoff payload", details: parsed.error.flatten() });
    }

    const lead = await services.repository.updateLead(parsed.data.leadId, { status: "needs_human" });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.status(201).json(await services.repository.createHandoff(parsed.data));
  });

  app.post("/agent/tools/send-follow-up", async (req, res) => {
    const to = String(req.body.to ?? "");
    const body = String(req.body.body ?? "");

    if (!to || !body) {
      return res.status(400).json({ error: "to and body are required" });
    }

    res.json({
      ok: true,
      outbound: await services.whatsapp.sendMessage(to, body)
    });
  });

  return app;
}

async function safeCrmSync(services: AppServices, lead: NonNullable<Awaited<ReturnType<AppServices["repository"]["getLead"]>>>) {
  try {
    await services.crm.syncLead(lead);
  } catch {}
}

function extractWhatsappSender(payload: Record<string, unknown>) {
  const direct = String(payload.from ?? payload.phone ?? "");
  if (direct) {
    return direct.replace(/^whatsapp:/, "");
  }

  const entry = Array.isArray(payload.entry) ? payload.entry[0] as Record<string, unknown> : undefined;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] as Record<string, unknown> : undefined;
  const value = changes?.value as Record<string, unknown> | undefined;
  const contacts = Array.isArray(value?.contacts) ? value.contacts[0] as Record<string, unknown> : undefined;
  return String(contacts?.wa_id ?? "");
}

function extractWhatsappText(payload: Record<string, unknown>) {
  const direct = String(payload.message ?? payload.text ?? "");
  if (direct) {
    return direct;
  }

  const entry = Array.isArray(payload.entry) ? payload.entry[0] as Record<string, unknown> : undefined;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] as Record<string, unknown> : undefined;
  const value = changes?.value as Record<string, unknown> | undefined;
  const messages = Array.isArray(value?.messages) ? value.messages[0] as Record<string, unknown> : undefined;
  const text = messages?.text as Record<string, unknown> | undefined;
  return String(text?.body ?? "Hello");
}
