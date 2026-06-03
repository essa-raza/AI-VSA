import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type {
  Booking,
  BookingRequest,
  Channel,
  Conversation,
  CreateLeadInput,
  HumanHandoff,
  HandoffRequest,
  Lead,
  Message,
  UpdateLeadInput,
  VoiceCall
} from "@ai-vsa/shared";

export type DatabaseConfig = {
  databaseUrl?: string;
};

export type Repository = {
  close(): Promise<void>;
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  createLead(input: CreateLeadInput): Promise<Lead>;
  updateLead(id: string, input: UpdateLeadInput): Promise<Lead | null>;
  findLeadByPhone(phone: string): Promise<Lead | null>;
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  ensureConversation(leadId: string, channel: Channel, conversationId?: string): Promise<Conversation>;
  addMessage(input: Omit<Message, "id" | "createdAt">): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  saveConversationSummary(conversationId: string, summary: string, handoffRequired: boolean): Promise<Conversation | null>;
  createBooking(input: BookingRequest & { calendarEventId?: string; status?: Booking["status"] }): Promise<Booking>;
  createHandoff(input: HandoffRequest): Promise<HumanHandoff>;
  createVoiceCall(input: Omit<VoiceCall, "id" | "createdAt">): Promise<VoiceCall>;
};

export async function createRepository(config: DatabaseConfig = {}): Promise<Repository> {
  if (config.databaseUrl) {
    const postgres = new PostgresRepository(config.databaseUrl);
    await postgres.init();
    return postgres;
  }

  return new MemoryRepository();
}

class MemoryRepository implements Repository {
  private readonly leads = new Map<string, Lead>();
  private readonly conversations = new Map<string, Conversation>();
  private readonly messages = new Map<string, Message[]>();
  private readonly bookings = new Map<string, Booking>();
  private readonly handoffs = new Map<string, HumanHandoff>();
  private readonly voiceCalls = new Map<string, VoiceCall>();

  async close() {}

  async listLeads() {
    return [...this.leads.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLead(id: string) {
    return this.leads.get(id) ?? null;
  }

  async createLead(input: CreateLeadInput) {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: createId("lead"),
      name: input.name?.trim() || "Unknown lead",
      email: input.email?.trim() || "",
      phone: input.phone?.trim() || "",
      company: input.company?.trim() || "",
      website: input.website?.trim() || "",
      industry: input.industry?.trim() || "general business",
      source: input.source ?? "manual",
      status: input.status ?? "new",
      serviceNeeded: input.serviceNeeded?.trim() || "",
      budget: input.budget?.trim() || "",
      timeline: input.timeline?.trim() || "",
      score: 0,
      summary: input.summary?.trim() || "",
      assignedTo: input.assignedTo?.trim() || "",
      painPoints: input.painPoints ?? [],
      goals: input.goals ?? [],
      createdAt: now,
      updatedAt: now
    };

    this.leads.set(lead.id, lead);
    return lead;
  }

  async updateLead(id: string, input: UpdateLeadInput) {
    const current = this.leads.get(id);

    if (!current) {
      return null;
    }

    const updated: Lead = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
      name: input.name?.trim() || current.name,
      email: input.email?.trim() || current.email,
      phone: input.phone?.trim() || current.phone,
      company: input.company?.trim() || current.company,
      website: input.website?.trim() || current.website,
      industry: input.industry?.trim() || current.industry,
      serviceNeeded: input.serviceNeeded?.trim() || current.serviceNeeded,
      budget: input.budget?.trim() || current.budget,
      timeline: input.timeline?.trim() || current.timeline,
      summary: input.summary?.trim() || current.summary,
      assignedTo: input.assignedTo?.trim() || current.assignedTo,
      painPoints: input.painPoints ?? current.painPoints,
      goals: input.goals ?? current.goals
    };

    this.leads.set(id, updated);
    return updated;
  }

  async findLeadByPhone(phone: string) {
    return (await this.listLeads()).find((lead) => lead.phone === phone) ?? null;
  }

  async listConversations() {
    return [...this.conversations.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async ensureConversation(leadId: string, channel: Channel, conversationId?: string) {
    if (conversationId && this.conversations.has(conversationId)) {
      return this.conversations.get(conversationId)!;
    }

    const existing = [...this.conversations.values()].find(
      (item) => item.leadId === leadId && item.channel === channel && item.status === "open"
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: createId("conv"),
      leadId,
      channel,
      status: "open",
      summary: "",
      handoffRequired: false,
      createdAt: now,
      updatedAt: now
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  async addMessage(input: Omit<Message, "id" | "createdAt">) {
    const message: Message = {
      ...input,
      id: createId("msg"),
      createdAt: new Date().toISOString()
    };

    const current = this.messages.get(input.conversationId) ?? [];
    current.push(message);
    this.messages.set(input.conversationId, current);

    const conversation = this.conversations.get(input.conversationId);
    if (conversation) {
      this.conversations.set(input.conversationId, {
        ...conversation,
        updatedAt: new Date().toISOString()
      });
    }

    return message;
  }

  async getConversationMessages(conversationId: string) {
    return this.messages.get(conversationId) ?? [];
  }

  async saveConversationSummary(conversationId: string, summary: string, handoffRequired: boolean) {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return null;
    }

    const updated: Conversation = {
      ...conversation,
      summary,
      handoffRequired,
      updatedAt: new Date().toISOString()
    };

    this.conversations.set(conversationId, updated);
    return updated;
  }

  async createBooking(input: BookingRequest & { calendarEventId?: string; status?: Booking["status"] }) {
    const now = new Date().toISOString();
    const booking: Booking = {
      id: createId("book"),
      leadId: input.leadId,
      calendarEventId: input.calendarEventId ?? "",
      meetingUrl: input.meetingUrl,
      scheduledFor: input.scheduledFor,
      timezone: input.timezone,
      status: input.status ?? "pending",
      createdAt: now,
      updatedAt: now
    };

    this.bookings.set(booking.id, booking);
    return booking;
  }

  async createHandoff(input: HandoffRequest) {
    const handoff: HumanHandoff = {
      id: createId("handoff"),
      leadId: input.leadId,
      conversationId: input.conversationId,
      reason: input.reason,
      priority: input.priority,
      status: "open",
      assignedTo: input.assignedTo,
      createdAt: new Date().toISOString(),
      resolvedAt: ""
    };

    this.handoffs.set(handoff.id, handoff);
    return handoff;
  }

  async createVoiceCall(input: Omit<VoiceCall, "id" | "createdAt">) {
    const call: VoiceCall = {
      ...input,
      id: createId("call"),
      createdAt: new Date().toISOString()
    };

    this.voiceCalls.set(call.id, call);
    return call;
  }
}

class PostgresRepository implements Repository {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
    });
  }

  async init() {
    await this.pool.query(`
      create table if not exists leads (
        id text primary key,
        name text not null,
        email text not null default '',
        phone text not null default '',
        company text not null default '',
        website text not null default '',
        industry text not null default 'general business',
        source text not null,
        status text not null,
        service_needed text not null default '',
        budget text not null default '',
        timeline text not null default '',
        score integer not null default 0,
        summary text not null default '',
        assigned_to text not null default '',
        pain_points jsonb not null default '[]'::jsonb,
        goals jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists conversations (
        id text primary key,
        lead_id text not null references leads(id) on delete cascade,
        channel text not null,
        status text not null,
        summary text not null default '',
        handoff_required boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists messages (
        id text primary key,
        conversation_id text not null references conversations(id) on delete cascade,
        sender text not null,
        direction text not null,
        content text not null,
        raw_payload jsonb,
        created_at timestamptz not null default now()
      );

      create table if not exists bookings (
        id text primary key,
        lead_id text not null references leads(id) on delete cascade,
        calendar_event_id text not null default '',
        meeting_url text not null default '',
        scheduled_for timestamptz not null,
        timezone text not null,
        status text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists human_handoffs (
        id text primary key,
        lead_id text not null references leads(id) on delete cascade,
        conversation_id text not null references conversations(id) on delete cascade,
        reason text not null,
        priority text not null,
        status text not null,
        assigned_to text not null default '',
        created_at timestamptz not null default now(),
        resolved_at timestamptz
      );

      create table if not exists voice_calls (
        id text primary key,
        lead_id text not null references leads(id) on delete cascade,
        conversation_id text not null references conversations(id) on delete cascade,
        provider text not null,
        provider_call_id text not null default '',
        phone_number text not null,
        direction text not null,
        status text not null,
        transcript text not null default '',
        summary text not null default '',
        result text not null default '',
        started_at timestamptz,
        ended_at timestamptz,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_leads_phone on leads(phone);
      create index if not exists idx_conversations_lead_id on conversations(lead_id);
      create index if not exists idx_messages_conversation_id on messages(conversation_id);
    `);
  }

  async close() {
    await this.pool.end();
  }

  async listLeads() {
    const result = await this.pool.query("select * from leads order by created_at desc");
    return result.rows.map(mapLeadRow);
  }

  async getLead(id: string) {
    const result = await this.pool.query("select * from leads where id = $1 limit 1", [id]);
    return result.rows[0] ? mapLeadRow(result.rows[0]) : null;
  }

  async createLead(input: CreateLeadInput) {
    const id = createId("lead");
    const result = await this.pool.query(
      `insert into leads (
        id, name, email, phone, company, website, industry, source, status, service_needed, budget,
        timeline, score, summary, assigned_to, pain_points, goals
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16::jsonb, $17::jsonb
      ) returning *`,
      [
        id,
        input.name?.trim() || "Unknown lead",
        input.email?.trim() || "",
        input.phone?.trim() || "",
        input.company?.trim() || "",
        input.website?.trim() || "",
        input.industry?.trim() || "general business",
        input.source ?? "manual",
        input.status ?? "new",
        input.serviceNeeded?.trim() || "",
        input.budget?.trim() || "",
        input.timeline?.trim() || "",
        0,
        input.summary?.trim() || "",
        input.assignedTo?.trim() || "",
        JSON.stringify(input.painPoints ?? []),
        JSON.stringify(input.goals ?? [])
      ]
    );

    return mapLeadRow(result.rows[0]);
  }

  async updateLead(id: string, input: UpdateLeadInput) {
    const current = await this.getLead(id);

    if (!current) {
      return null;
    }

    const merged: Lead = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
      name: input.name?.trim() || current.name,
      email: input.email?.trim() || current.email,
      phone: input.phone?.trim() || current.phone,
      company: input.company?.trim() || current.company,
      website: input.website?.trim() || current.website,
      industry: input.industry?.trim() || current.industry,
      serviceNeeded: input.serviceNeeded?.trim() || current.serviceNeeded,
      budget: input.budget?.trim() || current.budget,
      timeline: input.timeline?.trim() || current.timeline,
      summary: input.summary?.trim() || current.summary,
      assignedTo: input.assignedTo?.trim() || current.assignedTo,
      painPoints: input.painPoints ?? current.painPoints,
      goals: input.goals ?? current.goals
    };

    const result = await this.pool.query(
      `update leads set
        name = $2,
        email = $3,
        phone = $4,
        company = $5,
        website = $6,
        industry = $7,
        status = $8,
        service_needed = $9,
        budget = $10,
        timeline = $11,
        score = $12,
        summary = $13,
        assigned_to = $14,
        pain_points = $15::jsonb,
        goals = $16::jsonb,
        updated_at = $17
      where id = $1
      returning *`,
      [
        id,
        merged.name,
        merged.email,
        merged.phone,
        merged.company,
        merged.website,
        merged.industry,
        merged.status,
        merged.serviceNeeded,
        merged.budget,
        merged.timeline,
        merged.score,
        merged.summary,
        merged.assignedTo,
        JSON.stringify(merged.painPoints),
        JSON.stringify(merged.goals),
        merged.updatedAt
      ]
    );

    return result.rows[0] ? mapLeadRow(result.rows[0]) : null;
  }

  async findLeadByPhone(phone: string) {
    const result = await this.pool.query(
      "select * from leads where phone = $1 order by created_at desc limit 1",
      [phone]
    );
    return result.rows[0] ? mapLeadRow(result.rows[0]) : null;
  }

  async listConversations() {
    const result = await this.pool.query("select * from conversations order by updated_at desc");
    return result.rows.map(mapConversationRow);
  }

  async getConversation(id: string) {
    const result = await this.pool.query("select * from conversations where id = $1 limit 1", [id]);
    return result.rows[0] ? mapConversationRow(result.rows[0]) : null;
  }

  async ensureConversation(leadId: string, channel: Channel, conversationId?: string) {
    if (conversationId) {
      const existingById = await this.getConversation(conversationId);
      if (existingById) {
        return existingById;
      }
    }

    const existing = await this.pool.query(
      "select * from conversations where lead_id = $1 and channel = $2 and status = 'open' order by created_at desc limit 1",
      [leadId, channel]
    );

    if (existing.rows[0]) {
      return mapConversationRow(existing.rows[0]);
    }

    const result = await this.pool.query(
      `insert into conversations (id, lead_id, channel, status, summary, handoff_required)
       values ($1, $2, $3, 'open', '', false)
       returning *`,
      [createId("conv"), leadId, channel]
    );

    return mapConversationRow(result.rows[0]);
  }

  async addMessage(input: Omit<Message, "id" | "createdAt">) {
    const result = await this.pool.query(
      `insert into messages (id, conversation_id, sender, direction, content, raw_payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning *`,
      [
        createId("msg"),
        input.conversationId,
        input.sender,
        input.direction,
        input.content,
        JSON.stringify(input.rawPayload ?? null)
      ]
    );

    await this.pool.query(
      "update conversations set updated_at = now() where id = $1",
      [input.conversationId]
    );

    return mapMessageRow(result.rows[0]);
  }

  async getConversationMessages(conversationId: string) {
    const result = await this.pool.query(
      "select * from messages where conversation_id = $1 order by created_at asc",
      [conversationId]
    );
    return result.rows.map(mapMessageRow);
  }

  async saveConversationSummary(conversationId: string, summary: string, handoffRequired: boolean) {
    const result = await this.pool.query(
      `update conversations
       set summary = $2, handoff_required = $3, updated_at = now()
       where id = $1
       returning *`,
      [conversationId, summary, handoffRequired]
    );

    return result.rows[0] ? mapConversationRow(result.rows[0]) : null;
  }

  async createBooking(input: BookingRequest & { calendarEventId?: string; status?: Booking["status"] }) {
    const result = await this.pool.query(
      `insert into bookings (id, lead_id, calendar_event_id, meeting_url, scheduled_for, timezone, status)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        createId("book"),
        input.leadId,
        input.calendarEventId ?? "",
        input.meetingUrl,
        input.scheduledFor,
        input.timezone,
        input.status ?? "pending"
      ]
    );

    return mapBookingRow(result.rows[0]);
  }

  async createHandoff(input: HandoffRequest) {
    const result = await this.pool.query(
      `insert into human_handoffs (id, lead_id, conversation_id, reason, priority, status, assigned_to)
       values ($1, $2, $3, $4, $5, 'open', $6)
       returning *`,
      [createId("handoff"), input.leadId, input.conversationId, input.reason, input.priority, input.assignedTo]
    );

    return mapHandoffRow(result.rows[0]);
  }

  async createVoiceCall(input: Omit<VoiceCall, "id" | "createdAt">) {
    const result = await this.pool.query(
      `insert into voice_calls (
        id, lead_id, conversation_id, provider, provider_call_id, phone_number, direction, status,
        transcript, summary, result, started_at, ended_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13
      ) returning *`,
      [
        createId("call"),
        input.leadId,
        input.conversationId,
        input.provider,
        input.providerCallId,
        input.phoneNumber,
        input.direction,
        input.status,
        input.transcript,
        input.summary,
        input.result,
        input.startedAt || null,
        input.endedAt || null
      ]
    );

    return mapVoiceCallRow(result.rows[0]);
  }
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function mapLeadRow(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    company: String(row.company ?? ""),
    website: String(row.website ?? ""),
    industry: String(row.industry ?? "general business"),
    source: row.source as Lead["source"],
    status: row.status as Lead["status"],
    serviceNeeded: String(row.service_needed ?? ""),
    budget: String(row.budget ?? ""),
    timeline: String(row.timeline ?? ""),
    score: Number(row.score ?? 0),
    summary: String(row.summary ?? ""),
    assignedTo: String(row.assigned_to ?? ""),
    painPoints: Array.isArray(row.pain_points) ? (row.pain_points as string[]) : [],
    goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapConversationRow(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    channel: row.channel as Conversation["channel"],
    status: row.status as Conversation["status"],
    summary: String(row.summary ?? ""),
    handoffRequired: Boolean(row.handoff_required),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapMessageRow(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    sender: row.sender as Message["sender"],
    direction: row.direction as Message["direction"],
    content: String(row.content),
    rawPayload: row.raw_payload as Message["rawPayload"],
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function mapBookingRow(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    calendarEventId: String(row.calendar_event_id ?? ""),
    meetingUrl: String(row.meeting_url ?? ""),
    scheduledFor: new Date(String(row.scheduled_for)).toISOString(),
    timezone: String(row.timezone),
    status: row.status as Booking["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapHandoffRow(row: Record<string, unknown>): HumanHandoff {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    conversationId: String(row.conversation_id),
    reason: String(row.reason),
    priority: row.priority as HumanHandoff["priority"],
    status: row.status as HumanHandoff["status"],
    assignedTo: String(row.assigned_to ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : ""
  };
}

function mapVoiceCallRow(row: Record<string, unknown>): VoiceCall {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    conversationId: String(row.conversation_id),
    provider: String(row.provider),
    providerCallId: String(row.provider_call_id ?? ""),
    phoneNumber: String(row.phone_number),
    direction: row.direction as VoiceCall["direction"],
    status: String(row.status),
    transcript: String(row.transcript ?? ""),
    summary: String(row.summary ?? ""),
    result: String(row.result ?? ""),
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : "",
    endedAt: row.ended_at ? new Date(String(row.ended_at)).toISOString() : "",
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
