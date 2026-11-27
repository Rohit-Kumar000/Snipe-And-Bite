import Modal from "../common/Modal";

// A confirmation popup for destructive actions such as delete.
export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy = false, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
          {busy ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
