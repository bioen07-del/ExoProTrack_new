import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '../../providers/ThemeProvider';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'border border-border bg-card text-card-foreground shadow-lg',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          success: 'border-green-500/30',
          error: 'border-destructive/30',
          warning: 'border-yellow-500/30',
          info: 'border-blue-500/30',
        },
      }}
      richColors
      closeButton
    />
  );
}
