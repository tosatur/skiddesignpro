import { Link, useParams } from "react-router-dom";
import { useDesign } from "../services/useDesign.js";
import PageHeading, { LoadState } from "../components/PageHeading.jsx";
import DesignSummaryPanel from "../components/DesignSummaryPanel.jsx";
import EquipmentPanel from "../components/EquipmentPanel.jsx";
import DosingPanel from "../components/DosingPanel.jsx";
import TradeWastePanel from "../components/TradeWastePanel.jsx";
import CostPanel from "../components/CostPanel.jsx";

export default function DesignPage() {
  const { id } = useParams();
  const { design, error } = useDesign(id);
  if (!design)
    return (
      <>
        <LoadState error={error} />
        {error && (
          <Link className="button" to={`/designs/${id}/edit`}>
            Settings
          </Link>
        )}
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow={`Revision ${design.revision}`}
        title={design.designName}
        description={design.clientName}
      >
        <Link className="button" to={`/designs/${id}/layout`}>
          View Layout
        </Link>
        <Link className="button" to={`/designs/${id}/edit`}>
          Settings
        </Link>
        <Link className="button primary" to={`/designs/${id}/report`}>
          View Report
        </Link>
      </PageHeading>
      <DesignSummaryPanel design={design} />
      <div className="details-grid">
        <div className="panel-stack">
          <EquipmentPanel equipment={design.display.equipment} />
          <TradeWastePanel
            results={design.generated.compliance}
            reportTo={`/designs/${id}/report`}
          />
        </div>
        <div className="panel-stack">
          <DosingPanel dosing={design.display.dosing} />
          <CostPanel
            cost={design.generated.cost}
            layout={design.generated.layout}
            spaceCheck={design.display.spaceCheck}
          />
        </div>
      </div>
    </>
  );
}
