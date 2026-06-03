import { createApp } from "./server.js";

const port = Number(process.env.PORT ?? 4000);
const app = await createApp();

app.listen(port, () => {
  console.log(`AI-VSA API listening on http://localhost:${port}`);
});
