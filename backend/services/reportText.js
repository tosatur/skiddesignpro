// Serialize the same content used by the PDF and report preview. No calculations
// or saved results are introduced by this plain-text export.
export function buildReportText(report) {
  const clean = (value) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const lines = [
    `Design: ${clean(report.title)}`,
    `Client: ${clean(report.client)}`,
    `Revision: ${report.revision}`,
  ];
  report.sections.forEach((section, index) => {
    lines.push("", `${String(index + 1).padStart(2, "0")} ${section.title}`);
    lines.push(...(section.paragraphs ?? []).filter(Boolean).map(clean));
    if (section.callout) lines.push(section.callout.text);
    for (const table of section.tables ?? []) {
      if (!table.rows.length) continue;
      lines.push(table.columns.map(clean).join("\t"));
      lines.push(
        ...table.rows
          .filter((row) => row.some((cell) => cell != null && cell !== ""))
          .map((row) => row.map(clean).join("\t")),
      );
    }
    lines.push(...(section.notes ?? []).filter(Boolean).map(clean));
  });
  return lines.join("\n") + "\n";
}
