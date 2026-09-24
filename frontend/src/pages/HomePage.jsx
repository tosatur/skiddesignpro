import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SavedDesignTable from "../components/SavedDesignTable.jsx";
import RecentDesignsTable from "../components/RecentDesignsTable.jsx";
import { designService } from "../services/designService.js";
import { isDesktop, rememberDocument } from "../services/desktopDocuments.js";
import TestTools from "../components/TestTools.jsx";

export default function HomePage() {
  const desktop = isDesktop();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [testToolsEnabled, setTestToolsEnabled] = useState(false);
  const [openError, setOpenError] = useState("");

  useEffect(() => {
    let active = true;
    const list = desktop ? window.spn.recentDesigns() : designService.list();
    Promise.all([list, designService.config()])
      .then(([d, config]) => {
        if (active) {
          setDesigns(d);
          setError("");
          setTestToolsEnabled(config.testToolsEnabled);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [attempt, desktop]);

  const filtered = designs?.filter((d) =>
    `${d.designName} ${d.clientName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function openFile(file) {
    setOpenError("");
    try {
      const { path, design } = await window.spn.openRecentDesign(file.path);
      rememberDocument(path, design);
      navigate(`/designs/${design.id}`);
    } catch (e) {
      setOpenError(e.message);
      setAttempt((value) => value + 1);
    }
  }

  async function openDialog() {
    setOpenError("");
    try {
      const opened = await window.spn.openDesign();
      if (!opened) return;
      rememberDocument(opened.path, opened.design);
      navigate(`/designs/${opened.design.id}`);
    } catch (e) {
      setOpenError(e.message);
    }
  }

  async function removeFile(file) {
    await window.spn.removeRecentDesign(file.path);
    setAttempt((value) => value + 1);
  }

  return (
    <>
      <div className="page-heading">
        <h1>Your designs</h1>
      </div>
      <div className="card designs-card">
        <div className="design-tools">
          <Link className="button primary" to="/designs/new">
            Create New Design
          </Link>
          {desktop && (
            <button type="button" className="button" onClick={openDialog}>
              Open…
            </button>
          )}
          {testToolsEnabled && (
            <TestTools
              hasDesigns={Boolean(designs?.length)}
              onImported={() => {
                setSearch("");
                setAttempt((value) => value + 1);
              }}
              onDeleted={() => {
                setDesigns([]);
                setSearch("");
                setError("");
                setAttempt((value) => value + 1);
              }}
            />
          )}
        </div>
        {openError && (
          <div className="notice error" role="alert">
            {openError}
          </div>
        )}
        <section className="previous-designs">
          <div className="section-heading">
            <h2>
              {desktop ? "Recent files" : "Previous designs"}{" "}
              <span className="count">{designs?.length ?? "—"}</span>
            </h2>
            {!desktop && (
              <input
                className="search"
                type="search"
                aria-label="Search saved designs"
                placeholder="Search designs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
          </div>
          {error ? (
            <div className="notice error" role="alert">
              {error}{" "}
              <button
                className="text-button"
                onClick={() => setAttempt(attempt + 1)}
              >
                Try again
              </button>
            </div>
          ) : !designs ? (
            <p role="status">Loading…</p>
          ) : designs.length === 0 ? (
            <div className="empty-state">
              <h3>{desktop ? "No recent files." : "No saved designs yet."}</h3>
              <p>
                {desktop
                  ? "Create or open a design to get started."
                  : "Create a new design to get started. Your saved designs will appear here."}
              </p>
            </div>
          ) : desktop ? (
            <RecentDesignsTable
              files={designs}
              onOpen={openFile}
              onRemove={removeFile}
            />
          ) : filtered.length ? (
            <SavedDesignTable designs={filtered} />
          ) : (
            <div className="empty-state">
              <p>No designs match “{search}”.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
