import { useState } from "react";
import { designService } from "../services/designService.js";
import { money } from "../services/format.js";

const basisLabels = {
  quoted: "Quote",
  library: "Library quote",
  estimate: "Estimate",
};

function QuoteForm({ line, currency, busy, onSave, onCancel }) {
  const [unitCost, setUnitCost] = useState(String(line.unitCost ?? ""));
  const [quoteRef, setQuoteRef] = useState(line.quoteRef ?? "");
  const [toLibrary, setToLibrary] = useState(false);
  return (
    <form
      className="quote-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ unitCost: Number(unitCost), quoteRef, toLibrary });
      }}
    >
      <label>
        <span>Unit cost ({currency})</span>
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
      {line.priceKey && (
        <label className="quote-library">
          <input
            type="checkbox"
            checked={toLibrary}
            onChange={(e) => setToLibrary(e.target.checked)}
          />
          <span>Also save to price library for future designs</span>
        </label>
      )}
      <div className="quote-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save quote"}
        </button>
      </div>
    </form>
  );
}

export default function QuotePanel({ design, onChanged }) {
  const { cost } = design.generated;
  const overrides = design.inputs.priceOverrides ?? {};
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveOverrides(next, libraryPrice) {
    setBusy(true);
    setMessage("");
    try {
      await designService.update(
        design.id,
        { ...design.inputs, priceOverrides: next },
        design.revision,
      );
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    if (libraryPrice)
      try {
        await designService.setPrice(libraryPrice.key, {
          unitCost: libraryPrice.unitCost,
          quoteRef: libraryPrice.quoteRef,
          status: "quoted",
        });
      } catch (error) {
        setMessage(
          `Quote saved to this design, but not to the price library: ${error.message}`,
        );
      }
    setEditing(null);
    setBusy(false);
    onChanged();
  }

  return (
    <section className="card quote-panel">
      <div className="quote-heading">
        <h2>Cost breakdown</h2>
        {cost.complete && cost.quotedShare != null && (
          <span className="muted small">
            {Math.round(cost.quotedShare * 100)}% quoted · ±
            {Math.round(cost.uncertainty * 100)}% on estimates
          </span>
        )}
      </div>
      {message && (
        <div className="notice error" role="alert">
          {message}
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Qty</th>
              <th className="num">Unit cost</th>
              <th className="num">Amount</th>
              <th>Basis</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cost.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.name}</td>
                <td>{line.quantity ?? "-"}</td>
                <td className="num">
                  {line.unitCost == null
                    ? "-"
                    : money(line.unitCost, cost.currency)}
                </td>
                <td className="num">
                  {line.amount == null
                    ? "-"
                    : money(line.amount, cost.currency)}
                </td>
                <td>
                  <span
                    className={`status ${line.basis && line.basis !== "estimate" ? "within" : "unknown"}`}
                  >
                    {basisLabels[line.basis] ?? "Estimate"}
                  </span>
                  {line.quoteRef && (
                    <span className="muted small quote-ref">
                      {line.quoteRef}
                    </span>
                  )}
                </td>
                <td className="quote-cell">
                  {editing === line.id ? (
                    <QuoteForm
                      line={line}
                      currency={cost.currency}
                      busy={busy}
                      onCancel={() => setEditing(null)}
                      onSave={({ unitCost, quoteRef, toLibrary }) =>
                        saveOverrides(
                          { ...overrides, [line.id]: { unitCost, quoteRef } },
                          toLibrary && line.priceKey
                            ? { key: line.priceKey, unitCost, quoteRef }
                            : null,
                        )
                      }
                    />
                  ) : (
                    <div className="quote-actions">
                      {line.quantity != null && (
                        <button
                          type="button"
                          className="button subtle"
                          disabled={busy}
                          onClick={() => setEditing(line.id)}
                        >
                          Enter quote
                        </button>
                      )}
                      {overrides[line.id] && (
                        <button
                          type="button"
                          className="button subtle"
                          disabled={busy}
                          onClick={() => {
                            const { [line.id]: _removed, ...rest } = overrides;
                            saveOverrides(rest, null);
                          }}
                        >
                          Remove quote
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {cost.complete && (
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>
                  Subtotal
                </th>
                <td className="num">{money(cost.subtotal, cost.currency)}</td>
                <td colSpan={2} />
              </tr>
              {cost.quoted > 0 && (
                <tr>
                  <th scope="row" colSpan={3}>
                    Quoted portion
                  </th>
                  <td className="num">{money(cost.quoted, cost.currency)}</td>
                  <td colSpan={2} />
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={3}>
                  Estimated range
                </th>
                <td className="num nowrap">
                  {money(cost.low, cost.currency)}–
                  {money(cost.high, cost.currency)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
