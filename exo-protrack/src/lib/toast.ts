import { toast } from 'sonner';

export function showSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

export function showError(message: string, description?: string) {
  toast.error(message, { description, duration: 6000 });
}

export function showWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

export function showInfo(message: string, description?: string) {
  toast.info(message, { description });
}

/**
 * Promise-based confirm dialog replacement for window.confirm()
 * Returns a Promise that resolves to true if confirmed, false if dismissed.
 */
export function showConfirm(
  message: string,
  options?: { description?: string; confirmLabel?: string; cancelLabel?: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    toast(message, {
      description: options?.description,
      duration: Infinity,
      action: {
        label: options?.confirmLabel || 'Подтвердить',
        onClick: () => resolve(true),
      },
      cancel: {
        label: options?.cancelLabel || 'Отмена',
        onClick: () => resolve(false),
      },
      onDismiss: () => resolve(false),
    });
  });
}
