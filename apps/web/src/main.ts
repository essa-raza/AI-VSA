import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type ConfigResponse = {
  appName: string;
  primaryGoal: string;
  recommendedStack: Record<string, string>;
  providerModes: Record<string, string>;
};

type CampaignResponse = {
  name: string;
  audience: string;
  coreOffer: string;
  primaryGoal: string;
  trustPromises: string[];
  qualifyingQuestions: string[];
  bookingCallToAction: string;
};

type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  source: string;
  status: string;
  score: number;
  summary: string;
  createdAt: string;
};

type DashboardConversation = {
  id: string;
  channel: string;
  summary: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string;
  lead: Lead | null;
};

type DashboardResponse = {
  summary: {
    totalLeads: number;
    qualifiedLeads: number;
    needsHuman: number;
  };
  leads: Lead[];
  conversations: DashboardConversation[];
};

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found");
}

root.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Razex Operator Console</p>
      <h1>Run an AI sales floor that qualifies, follows up, and books.</h1>
      <p class="lede">
        This dashboard tracks the live lead engine for voice, website chat, and WhatsApp while keeping the
        system biased toward low-cost, high-control infrastructure.
      </p>
      <div class="hero-grid">
        <article class="panel accent">
          <span class="label">North Star</span>
          <p id="goal">Loading goal...</p>
        </article>
        <article class="panel">
          <span class="label">Provider Modes</span>
          <ul id="provider-modes"></ul>
        </article>
      </div>
    </section>

    <section class="stats-grid">
      <article class="panel stat-card">
        <span class="label">Total Leads</span>
        <strong id="total-leads">0</strong>
      </article>
      <article class="panel stat-card">
        <span class="label">Qualified</span>
        <strong id="qualified-leads">0</strong>
      </article>
      <article class="panel stat-card">
        <span class="label">Needs Human</span>
        <strong id="needs-human">0</strong>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <span class="label">Campaign</span>
        <h2 id="campaign-name">Loading campaign...</h2>
        <p id="campaign-offer"></p>
      </article>
      <article class="panel">
        <span class="label">Audience</span>
        <p id="campaign-audience"></p>
      </article>
      <article class="panel">
        <span class="label">Call To Action</span>
        <p id="campaign-cta"></p>
      </article>
    </section>

    <section class="grid two-up">
      <article class="panel">
        <span class="label">Qualification Questions</span>
        <ul id="questions"></ul>
      </article>
      <article class="panel">
        <span class="label">Recommended Stack</span>
        <ul id="stack"></ul>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <span class="label">Lead Pipeline</span>
          <h2>Latest leads</h2>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Source</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody id="leads-table"></tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <span class="label">Conversation Watch</span>
          <h2>Channel activity</h2>
        </div>
      </div>
      <div id="conversation-cards" class="conversation-grid"></div>
    </section>

    <section class="panel form-panel">
      <span class="label">Lead Preview</span>
      <form id="lead-form" class="lead-form">
        <input name="name" placeholder="Lead name" value="Sarah Khan" />
        <input name="phone" placeholder="Phone" value="+15555550123" />
        <input name="company" placeholder="Company" value="Bright Dental Studio" />
        <input name="website" placeholder="Website" value="https://brightdental.example" />
        <input name="industry" placeholder="Industry" value="Dental clinic" />
        <input name="painPoints" placeholder="Pain points (comma separated)" value="missed website leads, slow replies" />
        <input name="goals" placeholder="Goals (comma separated)" value="book more consultations, faster lead response" />
        <button type="submit">Generate Preview</button>
      </form>
      <pre id="preview-output">Submit a sample lead to preview the hypothesis, call opener, and qualification score.</pre>
    </section>
  </main>
`;

void boot();

async function boot() {
  const [config, campaign, dashboard] = await Promise.all([
    fetchJson<ConfigResponse>(`${apiBaseUrl}/api/config`),
    fetchJson<CampaignResponse>(`${apiBaseUrl}/api/campaign`),
    fetchJson<DashboardResponse>(`${apiBaseUrl}/api/dashboard`)
  ]);

  setText("goal", config.primaryGoal);
  setText("campaign-name", campaign.name);
  setText("campaign-offer", campaign.coreOffer);
  setText("campaign-audience", campaign.audience);
  setText("campaign-cta", campaign.bookingCallToAction);
  setText("total-leads", String(dashboard.summary.totalLeads));
  setText("qualified-leads", String(dashboard.summary.qualifiedLeads));
  setText("needs-human", String(dashboard.summary.needsHuman));

  renderList(document.querySelector("#questions"), campaign.qualifyingQuestions);
  renderList(
    document.querySelector("#stack"),
    Object.entries(config.recommendedStack).map(([key, value]) => `${key}: ${value}`)
  );
  renderList(
    document.querySelector("#provider-modes"),
    Object.entries(config.providerModes).map(([key, value]) => `${key}: ${value}`)
  );
  renderLeads(dashboard.leads);
  renderConversations(dashboard.conversations);
  wireLeadForm();
}

function renderLeads(leads: Lead[]) {
  const table = document.querySelector<HTMLElement>("#leads-table");

  if (!table) {
    return;
  }

  if (leads.length === 0) {
    table.innerHTML = `<tr><td colspan="5">No leads yet.</td></tr>`;
    return;
  }

  table.innerHTML = leads
    .slice(0, 8)
    .map((lead) => `
      <tr>
        <td>${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.company || "—")}</td>
        <td>${escapeHtml(lead.source)}</td>
        <td><span class="status-pill">${escapeHtml(lead.status)}</span></td>
        <td>${lead.score}</td>
      </tr>
    `)
    .join("");
}

function renderConversations(conversations: DashboardConversation[]) {
  const grid = document.querySelector<HTMLElement>("#conversation-cards");

  if (!grid) {
    return;
  }

  if (conversations.length === 0) {
    grid.innerHTML = `<article class="panel compact"><p>No conversations yet.</p></article>`;
    return;
  }

  grid.innerHTML = conversations
    .slice(0, 6)
    .map((conversation) => `
      <article class="panel compact">
        <span class="label">${escapeHtml(conversation.channel)}</span>
        <h3>${escapeHtml(conversation.lead?.company || conversation.lead?.name || "Unknown lead")}</h3>
        <p>${escapeHtml(conversation.summary || conversation.lastMessage || "No summary yet.")}</p>
        <p class="micro">Messages: ${conversation.messageCount} · Updated: ${new Date(conversation.updatedAt).toLocaleString()}</p>
      </article>
    `)
    .join("");
}

function wireLeadForm() {
  const form = document.querySelector<HTMLFormElement>("#lead-form");
  const output = document.querySelector<HTMLElement>("#preview-output");

  if (!form || !output) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      company: String(formData.get("company") ?? ""),
      website: String(formData.get("website") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      painPoints: splitCsv(formData.get("painPoints")),
      goals: splitCsv(formData.get("goals"))
    };

    output.textContent = "Generating lead preview...";

    try {
      const response = await fetchJson(`${apiBaseUrl}/api/leads/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      output.textContent = JSON.stringify(response, null, 2);
    } catch (error) {
      output.textContent = `Request failed: ${String(error)}`;
    }
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function setText(id: string, value: string) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function renderList(element: Element | null, items: string[]) {
  if (!element) {
    return;
  }

  element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function splitCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
