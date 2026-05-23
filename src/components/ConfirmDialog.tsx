import { useTranslation } from "react-i18next";

const C = {
  darkerGrey: "#292929",
  borderGrey: "#222222",
  grey: "#414141",
  metaGrey: "#a0a0a0",
  lighterGrey: "#c6c6c6",
  yellow: "#e5ca5f",
  white: "#f8f8f8",
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: C.darkerGrey,
          border: `1px solid ${C.borderGrey}`,
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: variant === "destructive" ? "#e57373" : C.yellow,
            marginBottom: "12px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: "12px",
            color: C.lighterGrey,
            lineHeight: "1.5",
            marginBottom: "20px",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: C.grey,
              border: `1px solid ${C.borderGrey}`,
              borderRadius: "4px",
              color: C.lighterGrey,
              cursor: "pointer",
            }}
          >
            {cancelLabel || t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              backgroundColor: variant === "destructive" ? "#c62828" : "#2e7d32",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
