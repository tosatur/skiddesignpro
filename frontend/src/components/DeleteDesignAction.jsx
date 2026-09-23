import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { designService } from "../services/designService.js";
import { isDesktop } from "../services/desktopDocuments.js";

export default function DeleteDesignAction({ design }) {
  const dialog = useRef(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const desktop = isDesktop();
  const label = desktop ? "Remove from Recent" : "Delete Design";

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
        {label}
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
        <h2 id="delete-design-title">
          {desktop ? "Remove" : "Delete"} “{design.designName}”?
        </h2>
        <p id="delete-design-note">
          {desktop
            ? "This removes it from Recent files here. The file itself is not deleted."
            : "This action cannot be undone."}
        </p>
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
            {busy ? (desktop ? "Removing…" : "Deleting…") : label}
          </button>
        </div>
      </dialog>
    </>
  );
}
