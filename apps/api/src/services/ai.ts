import {
  buildSystemPrompt,
  generateChatReply,
  scoreLead
} from "@ai-vsa/agent";
import type { Campaign, LeadContext, Message } from "@ai-vsa/shared";
import type { AppConfig } from "./config.js";

type GenerateChatInput = {
  lead: LeadContext;
  incomingMessage: string;
  transcript: Message[];
  campaign: Campaign;
};

export type AiChatResult = ReturnType<typeof generateChatReply> & {
  provider: "openai" | "heuristic";
};

export function createAiService(config: AppConfig) {
  return {
    async generateChatReply(input: GenerateChatInput): Promise<AiChatResult> {
      if (!config.openAiApiKey) {
        return {
          ...generateChatReply(input.lead, input.incomingMessage, input.campaign),
          provider: "heuristic"
        };
      }

      try {
        const systemPrompt = buildSystemPrompt(input.lead, input.campaign);
        const history = input.transcript
          .map((entry) => `${entry.sender}: ${entry.content}`)
          .join("\n");
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.openAiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.openAiModel,
            input: [
              {
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: systemPrompt
                  }
                ]
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: [
                      history ? `Conversation so far:\n${history}` : "",
                      `Latest lead message: ${input.incomingMessage}`,
                      "Respond in 1-3 short sentences, human-sounding, and push gently toward qualification or booking."
                    ].filter(Boolean).join("\n\n")
                  }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI HTTP ${response.status}`);
        }

        const payload = await response.json() as {
          output_text?: string;
          output?: Array<{ content?: Array<{ text?: string }> }>;
        };
        const text =
          payload.output_text?.trim() ||
          payload.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join(" ").trim();

        if (!text) {
          throw new Error("OpenAI returned an empty reply");
        }

        const heuristic = generateChatReply(input.lead, input.incomingMessage, input.campaign);

        return {
          ...heuristic,
          reply: text,
          provider: "openai"
        };
      } catch {
        return {
          ...generateChatReply(input.lead, input.incomingMessage, input.campaign),
          provider: "heuristic"
        };
      }
    },

    async createRealtimeSession(instructions?: string) {
      if (!config.openAiApiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.openAiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.openAiRealtimeModel,
          voice: config.openAiVoice,
          instructions: instructions ?? "You are a calm, human-like AI sales assistant for Razex Solutions."
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI realtime session failed with HTTP ${response.status}`);
      }

      return response.json();
    },

    summarizeLead(lead: LeadContext) {
      return scoreLead(lead);
    }
  };
}

