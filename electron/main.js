import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../backend/app.js";
import { DesignStore } from "../backend/db/DesignStore.js";
import { atomicWriteFile } from "../backend/util/atomicWrite.js";
import { desktopDatabasePath } from "./databasePath.js";
import { listRecent, removeRecent, touchRecent } from "./recentFiles.js";

const DESIGN_FILE_FILTERS = [{ name: "SPN Design", extensions: ["spnd"] }];

let window;
let server;
let store;
let databasePath;
let recentFilesPath;
let closing = false;

function recentEntry(path, design) {
  return {
    path,
    designName: design.designName,
    clientName: design.clientName,
    updatedAt: design.updatedAt,
  };
}

function openDesignAtPath(path) {
  let design;
  try {
    design = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    removeRecent(recentFilesPath, path);
    const reason =
      error.code === "ENOENT"
        ? "it may have been moved, renamed, or deleted"
        : "the file may be damaged or not a valid design file";
    throw new Error(`Could not open "${basename(path)}" — ${reason}.`);
  }
  touchRecent(recentFilesPath, recentEntry(path, design));
  return { path, design };
}

function saveDesignAtPath(path, design) {
  atomicWriteFile(path, JSON.stringify(design));
  touchRecent(recentFilesPath, recentEntry(path, design));
  return { path };
}

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
  recentFilesPath = join(app.getPath("userData"), "recent-designs.json");
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
      preload: fileURLToPath(new URL("./preload.cjs", import.meta.url)),
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

  const defaultDesignDir =
    databasePath !== ":memory:" ? databasePath : app.getPath("documents");

  ipcMain.handle("design:open", async () => {
    const result = await dialog.showOpenDialog(window, {
      title: "Open design",
      defaultPath: defaultDesignDir,
      filters: DESIGN_FILE_FILTERS,
      properties: ["openFile"],
    });
    return result.canceled ? null : openDesignAtPath(result.filePaths[0]);
  });
  ipcMain.handle("design:open-path", (_event, path) => openDesignAtPath(path));
  ipcMain.handle("design:save", (_event, design, path) =>
    saveDesignAtPath(path, design),
  );
  ipcMain.handle("design:save-as", async (_event, design, suggestedName) => {
    const safeName = (suggestedName || "SPN-design").replace(
      /[\\/:*?"<>|]/g,
      "-",
    );
    const result = await dialog.showSaveDialog(window, {
      title: "Save design as",
      defaultPath: join(defaultDesignDir, `${safeName}.spnd`),
      filters: DESIGN_FILE_FILTERS,
    });
    return result.canceled
      ? null
      : saveDesignAtPath(result.filePath, design);
  });
  ipcMain.handle("recent:list", () => listRecent(recentFilesPath));
  ipcMain.handle("recent:remove", (_event, path) => {
    removeRecent(recentFilesPath, path);
    return listRecent(recentFilesPath);
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "Open default save folder",
            enabled: databasePath !== ":memory:",
            click: async () => {
              const error = await shell.openPath(databasePath);
              if (error)
                dialog.showErrorBox(
                  "Could not open default save folder",
                  error,
                );
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
        `${error.message}\n\nData folder: ${databasePath || "not opened"}\n\nKeep the portable EXE and its data folder in a writable location, or set SPN_DATABASE to another folder.`,
      );
      if (!server) store?.close();
      app.quit();
    });
}
