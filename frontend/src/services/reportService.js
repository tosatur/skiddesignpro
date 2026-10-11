import { isDesktop } from "./desktopDocuments.js";

async function reportResponse(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || "Could not export the report.");
  }
  return response;
}

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

async function download(url, filename, options) {
  const response = await reportResponse(url, options);
  downloadBlob(await response.blob(), filename);
}

const reportFilename = (design) =>
  `${design.designName.replace(/[^a-z0-9_-]/gi, "-").slice(0, 70) || "SPN-design"}-report.pdf`;

// Electron intercepts this download and shows a native Save dialog either way
// (see will-download in electron/main.js); only the source of the PDF bytes
// differs between the two modes.
export const downloadReport = (design) =>
  isDesktop()
    ? download("/api/design-tools/report.pdf", reportFilename(design), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(design),
      })
    : download(
        `/api/designs/${design.id}/report.pdf?revision=${design.revision}`,
        reportFilename(design),
      );

export async function downloadAllReportsText() {
  const response = await reportResponse("/api/designs/reports.txt");
  const designCount = Number(response.headers.get("X-Design-Count"));
  if (!designCount) throw new Error("No saved designs to export.");
  if (isDesktop()) {
    const outcome = await window.spn.saveReportsText(await response.text());
    return { ...outcome, designCount };
  }
  downloadBlob(await response.blob(), "SPN-all-reports.txt");
  return { status: "started", designCount };
}
