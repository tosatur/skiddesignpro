import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { designService } from "../services/designService.js";

export default function DeleteDesignAction({ design }) {
  const dialog = useRef(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await designService.delete(design.id);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button danger"
        onClick={() => {
          setError("");
          dialog.current.showModal();
        }}
      >
        Delete Design
      </button>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="delete-design-title"
        aria-describedby="delete-design-note"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="delete-design-title">Delete “{design.designName}”?</h2>
        <p id="delete-design-note">This action cannot be undone.</p>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={() => dialog.current.close()}
            disabled={busy}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
            onClick={remove}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete Design"}
          </button>
        </div>
      </dialog>
    </>
  );
}
