import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDesign } from "../services/useDesign.js";
import PageHeading, { LoadState } from "../components/PageHeading.jsx";
import ReportPreview from "../components/ReportPreview.jsx";
import { downloadReport } from "../services/reportService.js";

export default function ReportPage() {
  const { id } = useParams();
  const { design, error } = useDesign(id);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  async function exportPDF() {
    setExporting(true);
    setExportError("");
    try {
      await downloadReport(design);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  }
  if (!design) return <LoadState error={error} />;
  return (
    <>
      <PageHeading
        backTo={`/designs/${id}`}
        backLabel="Back to Design"
        eyebrow={design.designName}
        title="Design report"
      >
        <button
          className="button primary"
          onClick={exportPDF}
          disabled={exporting}
        >
          {exporting ? "Generating PDF…" : "Export PDF"}
        </button>
      </PageHeading>
      {exportError && (
        <div role="alert" className="notice error">
          {exportError}
        </div>
      )}
      <ReportPreview design={design} />
    </>
  );
}
