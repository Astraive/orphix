import { SettingsPopup } from "../panels/settings/SettingsPopup";

interface PopupProps {
  popup: string | null;
  onClose: () => void;
}

export function Popup({ popup, onClose }: PopupProps) {
  if (!popup) return null;

  if (popup === "settings") {
    return <SettingsPopup onClose={onClose} />;
  }

  // Notes popup (placeholder)
  if (popup === "notes") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative w-[520px] max-h-[70vh] rounded-2xl overflow-hidden"
          style={{
            background: "rgba(5, 13, 16, 0.95)",
            border: "1px solid var(--ox-border)",
            backdropFilter: "blur(32px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5">
            <p className="text-xs text-ox-muted">Workspace notes.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
