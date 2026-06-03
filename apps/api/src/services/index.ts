import { createRepository } from "@ai-vsa/database";
import { createAiService } from "./ai.js";
import { createCalendarService } from "./calendar.js";
import { loadConfig } from "./config.js";
import { createCrmService } from "./crm.js";
import { createTelephonyService } from "./telephony.js";
import { createWhatsAppService } from "./whatsapp.js";

export async function createServices(env: NodeJS.ProcessEnv) {
  const config = loadConfig(env);
  const repository = await createRepository({
    databaseUrl: config.databaseUrl
  });

  return {
    config,
    repository,
    ai: createAiService(config),
    telephony: createTelephonyService(config),
    whatsapp: createWhatsAppService(config),
    calendar: createCalendarService(config),
    crm: createCrmService(config)
  };
}

export type AppServices = Awaited<ReturnType<typeof createServices>>;
