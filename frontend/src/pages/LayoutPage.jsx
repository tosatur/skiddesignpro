import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDesign } from "../services/useDesign.js";
import { designService } from "../services/designService.js";
import PageHeading, { LoadState } from "../components/PageHeading.jsx";
import Layout2D from "../components/Layout2D.jsx";
import { footprint, number } from "../services/format.js";
import { tallestItem } from "../services/skidHeights.js";
import SpaceStatus from "../components/SpaceStatus.jsx";

const Layout3D = lazy(() => import("../components/Layout3D.jsx"));

function HeightNote({ layout, config }) {
  const tallest = tallestItem(layout, config.heights);
  if (!tallest) return null;
  const exceeds = tallest.height > config.containerHeight;
  return (
    <div
      className={`space-status ${exceeds ? "outside" : "within"}`}
      role="status"
    >
      <strong>
        Tallest item: {tallest.name}, {number(tallest.height, 2)} m including
        frame
      </strong>
      <p>
        {exceeds
          ? `Exceeds the ${number(config.containerHeight, 2)} m internal height of a 20 ft container.`
          : `Within the ${number(config.containerHeight, 2)} m internal height of a 20 ft container.`}{" "}
        Heights are planning allowances, not vendor dimensions.
      </p>
    </div>
  );
}

export default function LayoutPage() {
  const { id } = useParams();
  const { design, error } = useDesign(id);
  const [view, setView] = useState("2d");
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  useEffect(() => {
    if (view !== "3d" || config) return;
    designService
      .config()
      .then(setConfig)
      .catch((e) => setConfigError(e.message));
  }, [view, config]);
  if (!design) return <LoadState error={error} />;
  const layout = design.generated.layout;
  return (
    <>
      <PageHeading
        backTo={"/designs/" + id}
        backLabel="Back to Design"
        eyebrow={design.designName}
        title="Skid layout"
      >
        <div className="view-toggle" role="group" aria-label="Layout view">
          <button
            type="button"
            className={`button${view === "2d" ? " primary" : ""}`}
            aria-pressed={view === "2d"}
            onClick={() => setView("2d")}
          >
            2D top view
          </button>
          <button
            type="button"
            className={`button${view === "3d" ? " primary" : ""}`}
            aria-pressed={view === "3d"}
            onClick={() => setView("3d")}
          >
            3D view
          </button>
        </div>
      </PageHeading>
      <section className="card drawing-card">
        <div className="drawing-toolbar">
          <span>
            {view === "2d"
              ? "Top View · Preliminary layout"
              : "3D View · Schematic, drag to rotate"}
          </span>
          <span className="muted small">
            Available footprint (L × W):{" "}
            {footprint(design.display.spaceCheck.maximum)}
          </span>
        </div>
        <SpaceStatus check={design.display.spaceCheck} />
        {view === "2d" ? (
          <Layout2D drawing={layout.drawing} />
        ) : configError ? (
          <div className="notice error" role="alert">
            {configError}
          </div>
        ) : !config ? (
          <div className="loading">Loading 3D view…</div>
        ) : (
          <>
            {layout.dimensions && (
              <HeightNote layout={layout} config={config} />
            )}
            <Suspense
              fallback={<div className="loading">Loading 3D view…</div>}
            >
              <Layout3D
                layout={layout}
                equipment={design.display.equipment}
                heights={config.heights}
              />
            </Suspense>
          </>
        )}
      </section>
    </>
  );
}
