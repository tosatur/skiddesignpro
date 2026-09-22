import { useParams } from "react-router-dom";
import { useDesign } from "../services/useDesign.js";
import PageHeading, { LoadState } from "../components/PageHeading.jsx";
import Layout2D from "../components/Layout2D.jsx";
import { footprint } from "../services/format.js";
import SpaceStatus from "../components/SpaceStatus.jsx";

export default function LayoutPage() {
  const { id } = useParams();
  const { design, error } = useDesign(id);
  if (!design) return <LoadState error={error} />;
  return (
    <>
      <PageHeading
        backTo={"/designs/" + id}
        backLabel="Back to Design"
        eyebrow={design.designName}
        title="2D skid layout"
      />
      <section className="card drawing-card">
        <div className="drawing-toolbar">
          <span>Top View · Preliminary layout</span>
          <span className="muted small">
            Available footprint (L × W):{" "}
            {footprint(design.display.spaceCheck.maximum)}
          </span>
        </div>
        <SpaceStatus check={design.display.spaceCheck} />
        <Layout2D drawing={design.generated.layout.drawing} />
      </section>
    </>
  );
}
