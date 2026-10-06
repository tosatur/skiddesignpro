import { Fragment, useEffect, useRef, useState } from "react";
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
      className="quote-form design-quote-form"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
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
  const [returnFocus, setReturnFocus] = useState(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!returnFocus || editing || busy) return;
    panel.current?.querySelector(`[data-quote-line="${returnFocus}"]`)?.focus();
    setReturnFocus(null);
  }, [returnFocus, editing, busy, design]);

  const close = (lineId) => {
    setEditing(null);
    setReturnFocus(lineId);
  };

  async function saveOverrides(lineId, next, libraryPrice) {
    setBusy(true);
    setMessage("");
    try {
      await designService.update(
        design.id,
        { ...design.inputs, priceOverrides: next },
        design.revision,
      );
    } catch (error) {
      if (error.status === 409) {
        setMessage(
          "This design was changed elsewhere and has been reloaded. Check the figures, then save your quote again.",
        );
        onChanged();
      } else setMessage(error.message);
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
    close(lineId);
    setBusy(false);
    onChanged();
  }

  return (
    <section
      className="card design-table-card quote-panel"
      ref={panel}
      aria-labelledby="cost-breakdown-title"
    >
      <div className="quote-heading">
        <h2 id="cost-breakdown-title">Cost breakdown</h2>
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
      {cost.lines.length === 0 ? (
        <p className="panel-empty-state">No equipment costs for this design.</p>
      ) : (
        <div className="table-scroll design-table-scroll">
          <table className="cost-table">
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col" className="quantity">
                  Qty
                </th>
                <th scope="col" className="num">
                  Unit cost
                </th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Basis</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cost.lines.map((line) => (
                <Fragment key={line.id}>
                  <tr>
                    <td>{line.name}</td>
                    <td className="quantity">{line.quantity ?? "—"}</td>
                    <td className="num">
                      {line.unitCost == null
                        ? "-"
                        : money(line.unitCost, cost.currency)}
                    </td>
                    <td className="num cost-amount">
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
                      <div className="quote-actions">
                        {line.quantity != null && (
                          <button
                            type="button"
                            className="button subtle"
                            disabled={busy}
                            aria-label={`Enter quote for ${line.name}`}
                            data-quote-line={line.id}
                            aria-expanded={editing === line.id}
                            aria-controls={`quote-editor-${line.id}`}
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
                            aria-label={`Remove quote for ${line.name}`}
                            onClick={() => {
                              const { [line.id]: _removed, ...rest } =
                                overrides;
                              saveOverrides(line.id, rest, null);
                            }}
                          >
                            Remove quote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editing === line.id && (
                    <tr
                      className="quote-editor-row"
                      id={`quote-editor-${line.id}`}
                    >
                      <td colSpan={6}>
                        <QuoteForm
                          line={line}
                          currency={cost.currency}
                          busy={busy}
                          onCancel={() => close(line.id)}
                          onSave={({ unitCost, quoteRef, toLibrary }) =>
                            saveOverrides(
                              line.id,
                              {
                                ...overrides,
                                [line.id]: { unitCost, quoteRef },
                              },
                              toLibrary && line.priceKey
                                ? { key: line.priceKey, unitCost, quoteRef }
                                : null,
                            )
                          }
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cost.complete && cost.lines.length > 0 && (
        <dl className="cost-totals" aria-label="Cost totals">
          <div>
            <dt>Subtotal</dt>
            <dd>
              {money(
                cost.subtotal ??
                  cost.lines.reduce((sum, line) => sum + line.amount, 0),
                cost.currency,
              )}
            </dd>
          </div>
          {cost.quoted > 0 && (
            <div>
              <dt>Quoted portion</dt>
              <dd>{money(cost.quoted, cost.currency)}</dd>
            </div>
          )}
          <div>
            <dt>Estimated range</dt>
            <dd>
              {money(cost.low, cost.currency)}–{money(cost.high, cost.currency)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
