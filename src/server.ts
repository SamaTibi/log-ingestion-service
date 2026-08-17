import "dotenv/config";

import { app, retentionTimer } from "./app.js";

const port = Number(process.env.PORT) || 8080;

try {
  await app.listen({
    port,
    host: "0.0.0.0",
  });
} catch (error) {
  clearInterval(retentionTimer);

  app.log.error(error);

  process.exit(1);
}