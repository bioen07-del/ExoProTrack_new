import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      {children}
      <span
        className="ml-1 cursor-help text-slate-400 hover:text-slate-600"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <HelpCircle size={14} />
      </span>
      {visible && (
        <span className="absolute z-50 bottom-full left-0 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-lg whitespace-nowrap max-w-xs">
          {text}
        </span>
      )}
    </span>
  );
}

interface FormLabelProps {
  label: string;
  tooltip?: string;
  required?: boolean;
}

export function FormLabel({ label, tooltip, required }: FormLabelProps) {
  return (
    <label className="block text-sm font-medium mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}
