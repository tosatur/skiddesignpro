import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SavedDesignTable from "../components/SavedDesignTable.jsx";
import { designService } from "../services/designService.js";
import TestTools from "../components/TestTools.jsx";

export default function HomePage() {
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [testToolsEnabled, setTestToolsEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([designService.list(), designService.config()])
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
  }, [attempt]);
  const filtered = designs?.filter((d) =>
    `${d.designName} ${d.clientName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="home-intro">
        <h1>Your designs.</h1>
        <p className="lede">
          Create, manage and review your saved pH correction skid designs.
        </p>
      </section>
      <div className="card designs-card">
        <div className="design-tools">
          <Link className="button primary" to="/designs/new">
            Create New Design
          </Link>
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
        <section className="previous-designs">
          <div className="section-heading">
            <h2>
              Previous Designs{" "}
              <span className="count">{designs?.length ?? "—"}</span>
            </h2>
            <input
              className="search"
              type="search"
              aria-label="Search saved designs"
              placeholder="Search designs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
            <p role="status">Loading your designs…</p>
          ) : designs.length === 0 ? (
            <div className="empty-state">
              <h3>No saved designs yet.</h3>
              <p>
                Create a new design to get started. Your saved designs will
                appear here.
              </p>
            </div>
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
