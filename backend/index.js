import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { DesignStore } from "./db/DesignStore.js";

const store = new DesignStore(
  process.env.SPN_DATABASE ||
    fileURLToPath(new URL("./db/data/designs.sqlite", import.meta.url)),
);
const port = Number(process.env.PORT || 3001);
const server = createApp(store).listen(port, "127.0.0.1", () =>
  console.log(`SPN designer: http://127.0.0.1:${server.address().port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
