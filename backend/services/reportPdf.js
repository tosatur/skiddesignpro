import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { buildReport } from "./report.js";

export function generateReportPDF(design) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,
      info: {
        Title: `${design.designName} — Preliminary skid design`,
        Author: "SPN Consulting",
        Subject:
          "Preliminary pH correction skid design; not certified for construction",
      },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      doc.registerFont(
        "Body",
        fileURLToPath(
          new URL("../fonts/LiberationSans-Regular.ttf", import.meta.url),
        ),
      );
      doc.registerFont(
        "Bold",
        fileURLToPath(
          new URL("../fonts/LiberationSans-Bold.ttf", import.meta.url),
        ),
      );
      const report = buildReport(design),
        left = 45,
        usable = doc.page.width - 90,
        bottom = doc.page.height - 58;
      let y = 52;
      const newPage = () => {
        doc.addPage();
        y = 58;
      };
      const ensure = (height) => {
        if (y + height > bottom) newPage();
      };
      const paragraphHeight = (text) => {
        doc.font("Body").fontSize(9).fillColor("#505b6b");
        return doc.heightOfString(text, { width: usable, lineGap: 3 });
      };
      const paragraph = (text) => {
        const height = paragraphHeight(text);
        ensure(height + 8);
        doc.text(text, left, y, { width: usable, lineGap: 3 });
        y += height + 8;
      };
      doc
        .font("Bold")
        .fontSize(10)
        .fillColor("#606e82")
        .text("SPN CONSULTING", left, y);
      y += 26;
      doc.fontSize(25).fillColor("#212a37");
      const titleHeight = doc.heightOfString(report.title, { width: usable });
      doc.text(report.title, left, y, { width: usable });
      y += titleHeight + 8;
      doc
        .font("Body")
        .fontSize(11)
        .fillColor("#6d7785")
        .text(report.subtitle, left, y);
      y += 20;
      doc.fontSize(9);
      const clientText = `${report.client} · Revision ${report.revision}`;
      const clientHeight = doc.heightOfString(clientText, { width: usable });
      doc.text(clientText, left, y, { width: usable });
      y += clientHeight + 14;
      doc
        .moveTo(left, y)
        .lineTo(left + usable, y)
        .lineWidth(1.3)
        .strokeColor("#37465b")
        .stroke();
      y += 18;

      const columnWidths = (table) =>
        (
          table.weights || table.columns.map(() => 1 / table.columns.length)
        ).map((w) => w * usable);
      const cellHeight = (row, colWidths, bold = false) => {
        doc.font(bold ? "Bold" : "Body").fontSize(bold ? 8 : 8.1);
        return (
          Math.max(
            ...row.map((cell, j) =>
              doc.heightOfString(String(cell), {
                width: colWidths[j] - 16,
                lineGap: 2,
              }),
            ),
          ) + 8
        );
      };
      function drawTable(table) {
        const colWidths = columnWidths(table);
        const drawRow = (row, header, rowIndex = 0) => {
          const height = cellHeight(row, colWidths, header);
          let x = left;
          if (header || rowIndex % 2 === 1)
            doc
              .rect(left, y, usable, height)
              .fill(header ? "#eef1f5" : "#fafbfc");
          row.forEach((cell, j) => {
            doc
              .font(header ? "Bold" : "Body")
              .fontSize(header ? 8 : 8.1)
              .fillColor(header ? "#4f5d72" : "#354256");
            doc.text(String(cell), x + 8, y + 4, {
              width: colWidths[j] - 16,
              lineGap: 2,
            });
            x += colWidths[j];
          });
          doc
            .moveTo(left, y + height)
            .lineTo(left + usable, y + height)
            .strokeColor("#e4e8ee")
            .lineWidth(0.5)
            .stroke();
          y += height;
        };
        const headerHeight = cellHeight(table.columns, colWidths, true);
        ensure(
          headerHeight +
            (table.rows.length ? cellHeight(table.rows[0], colWidths) : 0),
        );
        drawRow(table.columns, true);
        table.rows.forEach((row, index) => {
          const height = cellHeight(row, colWidths);
          if (y + height > bottom) {
            newPage();
            drawRow(table.columns, true);
          }
          drawRow(row, false, index);
        });
        y += 8;
      }

      report.sections.forEach((section, index) => {
        const heading = `${String(index + 1).padStart(2, "0")}   ${section.title}`;
        doc.font("Bold").fontSize(14);
        const headingHeight = doc.heightOfString(heading, { width: usable });
        const drawing = design.generated.layout.drawing;
        let contentHeight = (section.paragraphs ?? []).reduce(
          (height, text) => height + paragraphHeight(text) + 8,
          0,
        );
        for (const table of section.layout
          ? section.tables
          : (section.tables ?? []).slice(0, 1)) {
          const widths = columnWidths(table);
          contentHeight +=
            cellHeight(table.columns, widths, true) +
            (section.layout ? table.rows : table.rows.slice(0, 2)).reduce(
              (height, row) => height + cellHeight(row, widths),
              0,
            ) +
            8;
        }
        if (section.layout)
          contentHeight +=
            (drawing.height * usable) / drawing.width +
            45 +
            (section.notes ?? []).reduce(
              (height, text) => height + paragraphHeight(text) + 8,
              0,
            );
        // Keep the footprint dimensions and drawing together; let other tables
        // flow with repeated headers, reserving at least two rows after a title.
        ensure(headingHeight + 8 + contentHeight);
        doc
          .font("Bold")
          .fontSize(14)
          .fillColor("#243347")
          .text(heading, left, y, { width: usable });
        y += headingHeight + 8;
        section.paragraphs?.forEach(paragraph);
        if (section.callout) {
          ensure(30);
          const outside = section.callout.tone === "outside";
          doc.rect(left, y, usable, 24).fill(outside ? "#fff1ee" : "#eef1f5");
          doc
            .font("Bold")
            .fontSize(10)
            .fillColor(outside ? "#963d31" : "#243347")
            .text(section.callout.text, left + 8, y + 6, {
              width: usable - 16,
            });
          y += 30;
        }
        section.tables?.forEach(drawTable);
        if (section.layout) {
          const scale = usable / drawing.width;
          ensure(drawing.height * scale + 15);
          drawLayout(doc, drawing, left, y, scale);
          y += drawing.height * scale + 15;
        }
        section.notes?.forEach(paragraph);
        y += 6;
      });
      const pages = doc.bufferedPageRange();
      for (let page = 0; page < pages.count; page++) {
        doc.switchToPage(page);
        doc.font("Body").fontSize(7).fillColor("#7a8696");
        // Footer text sits outside the content margin. Temporarily permit it
        // there so PDFKit does not flow it onto a new, almost-empty page.
        const previousBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        if (page > 0)
          doc.text("SPN / PRELIMINARY SKID DESIGN", left, 27, {
            lineBreak: false,
          });
        const footerY = doc.page.height - 30;
        doc.text("SPN Consulting", left, footerY, { lineBreak: false });
        doc.text(`${page + 1} / ${pages.count}`, left, footerY, {
          width: usable,
          align: "right",
          lineBreak: false,
        });
        doc.page.margins.bottom = previousBottomMargin;
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}

function drawLayout(doc, drawing, x, y, scale) {
  doc.save().translate(x, y).scale(scale);
  for (const s of drawing.shapes) {
    doc.save();
    if (s.kind === "text") {
      doc.font("Body").fontSize(s.fontSize).fillColor(s.fill);
      const width = doc.widthOfString(s.text) + 2;
      const offset =
        s.anchor === "start" ? 0 : s.anchor === "end" ? width : width / 2;
      doc.text(s.text, s.x - offset, s.y - s.fontSize * 0.6, {
        width,
        lineBreak: false,
      });
    } else {
      doc.lineWidth(s.strokeWidth || 1).strokeColor(s.stroke || "#ffffff");
      if (s.strokeDasharray) {
        const [length, space] = s.strokeDasharray.split(" ").map(Number);
        doc.dash(length, { space });
      }
      if (s.kind === "rect")
        doc.roundedRect(s.x, s.y, s.width, s.height, s.radius || 0);
      if (s.kind === "circle") doc.circle(s.x, s.y, s.radius);
      if (s.kind === "line") doc.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2);
      if (s.fill && s.fill !== "none") doc.fillAndStroke(s.fill, s.stroke);
      else doc.stroke();
    }
    doc.restore();
  }
  doc.restore();
}
