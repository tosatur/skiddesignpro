import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { createApp } from "../backend/app.js";
import { DesignStore } from "../backend/db/DesignStore.js";
import { desktopDatabasePath } from "./databasePath.js";

let window;
let server;
let store;
let databasePath;
let closing = false;

async function startDesktop() {
  const testToolsEnabled =
    process.env.SPN_ENABLE_TEST_TOOLS === "true" ||
    process.argv.includes("--test-tools");
  app.setAppUserModelId(
    testToolsEnabled ? "com.spn.skiddesigner.dev" : "com.spn.skiddesigner",
  );
  databasePath = desktopDatabasePath({
    appPath: app.getAppPath(),
    isPackaged: app.isPackaged,
    executablePath: process.execPath,
    portableDirectory: process.env.PORTABLE_EXECUTABLE_DIR,
    databaseOverride: process.env.SPN_DATABASE,
  });
  store = new DesignStore(databasePath);
  server = createApp(store, { testToolsEnabled }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;

  window = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    title: testToolsEnabled
      ? "SPN Skid Designer — Dev Mode"
      : "SPN Skid Designer",
    backgroundColor: "#fafafa",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  if (testToolsEnabled) {
    // Keep the dev label visible when the web page supplies its own title.
    window.on("page-title-updated", (event) => event.preventDefault());
  }
  const session = window.webContents.session;
  session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  session.setPermissionCheckHandler(() => false);
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        ],
      },
    });
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  session.on("will-download", (_event, item) => {
    item.setSaveDialogOptions({
      title: "Save report",
      defaultPath: join(app.getPath("downloads"), item.getFilename()),
    });
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "Open data folder",
            enabled: databasePath !== ":memory:",
            click: async () => {
              const error = await shell.openPath(dirname(databasePath));
              if (error)
                dialog.showErrorBox("Could not open data folder", error);
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
    ]),
  );
  window.once("ready-to-show", () => window.show());
  await window.loadURL(origin);
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (!server || closing) return;
  event.preventDefault();
  closing = true;
  server.close(() => {
    store?.close();
    app.quit();
  });
  server.closeAllConnections();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  app
    .whenReady()
    .then(startDesktop)
    .catch((error) => {
      dialog.showErrorBox(
        "SPN Skid Designer could not start",
        `${error.message}\n\nDatabase: ${databasePath || "not opened"}\n\nKeep the portable EXE and its data folder in a writable location, or set SPN_DATABASE to another SQLite file.`,
      );
      if (!server) store?.close();
      app.quit();
    });
}
