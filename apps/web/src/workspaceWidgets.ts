export type WorkspaceMetric = {
  label: string;
  value: string | number;
  helper?: string;
};

export function renderMetricCard(metric: WorkspaceMetric) {
  return `
    <article class="workspace-card metric-workspace-card">
      <span class="label">${escapeHtml(metric.label)}</span>
      <strong class="score-big">${escapeHtml(String(metric.value))}</strong>
      ${metric.helper ? `<p>${escapeHtml(metric.helper)}</p>` : ""}
    </article>
  `;
}

export function renderTagList(title: string, items: string[], fallback: string) {
  return `
    <article class="workspace-card">
      <span class="label">${escapeHtml(title)}</span>
      ${items.length ? `<div class="tag-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : `<p>${escapeHtml(fallback)}</p>`}
    </article>
  `;
}

export function renderPrimaryWorkspaceCard(title: string, body: string, actionsHtml: string) {
  return `
    <article class="workspace-card hero-workspace">
      <span class="label">Primary Action</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${actionsHtml}
    </article>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
