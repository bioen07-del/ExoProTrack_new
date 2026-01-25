import { useTheme } from '../../providers/ThemeProvider';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Выбрать тему"
        >
          {/* Иконка для текущей темы */}
          {theme === 'system' ? (
            <Monitor size={20} />
          ) : resolvedTheme === 'dark' ? (
            <Moon size={20} />
          ) : (
            <Sun size={20} />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-48 p-1 bg-popover text-popover-foreground border rounded-lg shadow-lg animate-scale-in"
      >
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Sun size={16} />
          <span>Светлая</span>
          {theme === 'light' && <Check size={16} className="ml-auto text-primary" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Moon size={16} />
          <span>Тёмная</span>
          {theme === 'dark' && <Check size={16} className="ml-auto text-primary" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Monitor size={16} />
          <span>Системная</span>
          {theme === 'system' && <Check size={16} className="ml-auto text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Версия для использования вне dropdown
export function ThemeToggleSimple() {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={`Текущая тема: ${resolvedTheme === 'dark' ? 'тёмная' : 'светлая'}. Нажмите для переключения.`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={20} className="text-amber-400" />
      ) : (
        <Moon size={20} className="text-slate-600" />
      )}
    </button>
  );
}
