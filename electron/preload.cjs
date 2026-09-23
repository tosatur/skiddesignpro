const { contextBridge, ipcRenderer } = require("electron");

// A minimal, specific bridge into the main process's file dialogs — the
// renderer stays sandboxed and never gets direct filesystem or Node access.
contextBridge.exposeInMainWorld("spn", {
  openDesign: () => ipcRenderer.invoke("design:open"),
  openRecentDesign: (path) => ipcRenderer.invoke("design:open-path", path),
  saveDesign: (design, path) => ipcRenderer.invoke("design:save", design, path),
  saveDesignAs: (design, suggestedName) =>
    ipcRenderer.invoke("design:save-as", design, suggestedName),
  recentDesigns: () => ipcRenderer.invoke("recent:list"),
  removeRecentDesign: (path) => ipcRenderer.invoke("recent:remove", path),
});
