import { isDesktop } from "./desktopDocuments.js";

async function download(url, filename, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || "Could not export the report.");
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
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

export const downloadAllReportsText = () =>
  download("/api/designs/reports.txt", "SPN-all-reports.txt");
