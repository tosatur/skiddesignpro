import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { DesignStore } from "./db/DesignStore.js";
import { PriceLibrary } from "./db/PriceLibrary.js";

const dataDir =
  process.env.SPN_DATABASE ||
  fileURLToPath(new URL("./db/data", import.meta.url));
const store = new DesignStore(dataDir);
const prices = new PriceLibrary(dataDir);
const port = Number(process.env.PORT || 3001);
const server = createApp(store, { prices }).listen(port, "127.0.0.1", () =>
  console.log(`SPN designer: http://127.0.0.1:${server.address().port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
