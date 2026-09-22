async function download(path, filename) {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || "Could not export the report.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadReport = (design) =>
  download(
    `/api/designs/${design.id}/report.pdf?revision=${design.revision}`,
    `${design.designName.replace(/[^a-z0-9_-]/gi, "-").slice(0, 70) || "SPN-design"}-report.pdf`,
  );

export const downloadAllReportsText = () =>
  download("/api/designs/reports.txt", "SPN-all-reports.txt");
