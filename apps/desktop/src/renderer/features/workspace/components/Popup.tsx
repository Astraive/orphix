import { SettingsPopup } from "@/features/settings/components/SettingsPopup";
import { NotesPanel } from "@/features/notes/components/NotesPanel";
import { LinkPanel } from "@/features/link/components/LinkPanel";

interface PopupProps {
  popup: string | null;
  onClose: () => void;
}

const popupStyle: React.CSSProperties = {
  position: "fixed",
  top: "3.5rem",
  right: "1rem",
  width: "var(--orphix-size-popup-width, 28rem)",
  height: "calc(100vh - 5rem)",
  zIndex: 100,
  borderRadius: "0.75rem",
  overflow: "hidden",
  border: "1px solid var(--orphix-color-base-border)",
  background: "var(--orphix-color-base-background)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export function Popup({ popup, onClose }: PopupProps) {
  if (!popup) return null;

  if (popup === "settings") {
    return <SettingsPopup onClose={onClose} />;
  }

  if (popup === "notes") {
    return (
      <div style={popupStyle} className="anim-slide-up">
        <NotesPanel />
      </div>
    );
  }

  if (popup === "link") {
    return (
      <div style={popupStyle} className="anim-slide-up">
        <LinkPanel />
      </div>
    );
  }

  return null;
}
