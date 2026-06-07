export type TranscriptMessage = {
  id: string;
  sender: string;
  direction: string;
  content: string;
  createdAt: string;
};

export function renderTranscript(messages: TranscriptMessage[]) {
  return `
    <article class="workspace-card transcript-card">
      <span class="label">Transcript</span>
      <div class="transcript-list">
        ${messages.length === 0 ? `<p>No messages yet.</p>` : messages.map(renderTranscriptMessage).join("")}
      </div>
    </article>
  `;
}

function renderTranscriptMessage(message: TranscriptMessage) {
  return `
    <div class="message-row ${escapeHtml(message.sender)}">
      <strong>${escapeHtml(message.sender)}</strong>
      <p>${escapeHtml(message.content)}</p>
      <span>${new Date(message.createdAt).toLocaleString()}</span>
    </div>
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
