import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import { designService } from "../services/designService.js";
import { date, money } from "../services/format.js";

function PriceEditor({ price, busy, onSave, onCancel }) {
  const [unitCost, setUnitCost] = useState(String(price.unitCost));
  const [quoteRef, setQuoteRef] = useState(price.quoteRef);
  return (
    <form
      className="quote-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ unitCost: Number(unitCost), quoteRef, status: "quoted" });
      }}
    >
      <label>
        <span>Quoted unit cost (AUD)</span>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        <span>Quote reference</span>
        <input
          type="text"
          maxLength={120}
          value={quoteRef}
          onChange={(e) => setQuoteRef(e.target.value)}
        />
      </label>
      <div className="quote-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save price"}
        </button>
      </div>
    </form>
  );
}

export default function PricesPage() {
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    designService
      .prices()
      .then(setPrices)
      .catch((e) => setError(e.message));
  }, []);

  async function change(action) {
    setBusy(true);
    setError("");
    try {
      const updated = await action();
      setPrices((list) =>
        list.map((price) => (price.key === updated.key ? updated : price)),
      );
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Price library"
        description="Unit prices used for new and regenerated designs. Record a supplier quote to replace an estimate; quoted prices are excluded from the ±20% range."
      />
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {!prices ? (
        !error && <div className="loading">Loading prices…</div>
      ) : (
        <section className="card quote-panel prices-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Estimate</th>
                  <th>Current price</th>
                  <th>Basis</th>
                  <th>Updated</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {prices.map((price) => (
                  <tr key={price.key}>
                    <td>{price.label}</td>
                    <td>{money(price.estimate, "AUD")}</td>
                    <td>{money(price.unitCost, "AUD")}</td>
                    <td>
                      <span
                        className={`status ${price.status === "quoted" ? "within" : "unknown"}`}
                      >
                        {price.status === "quoted" ? "Quote" : "Estimate"}
                      </span>
                      {price.quoteRef && (
                        <span className="muted small quote-ref">
                          {price.quoteRef}
                        </span>
                      )}
                    </td>
                    <td className="muted small">
                      {price.updatedAt ? date(price.updatedAt) : "-"}
                    </td>
                    <td className="quote-cell">
                      {editing === price.key ? (
                        <PriceEditor
                          price={price}
                          busy={busy}
                          onCancel={() => setEditing(null)}
                          onSave={(body) =>
                            change(() =>
                              designService.setPrice(price.key, body),
                            )
                          }
                        />
                      ) : (
                        <div className="quote-actions">
                          <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={() => setEditing(price.key)}
                          >
                            Enter quote
                          </button>
                          {price.status === "quoted" && (
                            <button
                              type="button"
                              className="button"
                              disabled={busy}
                              onClick={() =>
                                change(() =>
                                  designService.resetPrice(price.key),
                                )
                              }
                            >
                              Reset to estimate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
