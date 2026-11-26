import { AlertDialog } from "@base-ui/react/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] transition-opacity" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pg-border-strong bg-pg-surface p-5 shadow-2xl">
          <AlertDialog.Title className="text-sm font-semibold text-pg-fg">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-xs leading-relaxed text-pg-fg-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 flex items-center justify-end gap-2">
            <AlertDialog.Close className="cursor-pointer rounded-lg border border-pg-border bg-pg-panel px-3 py-1.5 text-xs font-medium text-pg-fg transition-colors hover:bg-pg-hover">
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className={
                destructive
                  ? "cursor-pointer rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
                  : "cursor-pointer rounded-lg bg-pg-primary px-3 py-1.5 text-xs font-semibold text-pg-primary-fg transition-opacity hover:opacity-90"
              }
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
