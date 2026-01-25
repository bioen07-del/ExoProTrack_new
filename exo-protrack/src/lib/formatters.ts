import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format date to Russian locale
 */
export function formatDate(date: string | Date | null | undefined, formatStr = 'dd.MM.yyyy'): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '-';
  
  return format(parsedDate, formatStr, { locale: ru });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
}

/**
 * Format relative time (e.g., "2 часа назад")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '-';
  
  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: ru });
}

/**
 * Format date for input[type="datetime-local"]
 */
export function formatForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  
  return format(parsedDate, "yyyy-MM-dd'T'HH:mm");
}

// ============================================================================
// Number Utilities
// ============================================================================

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format volume in ml to liters
 */
export function formatVolume(volumeMl: number | null | undefined): string {
  if (volumeMl === null || volumeMl === undefined) return '-';
  
  if (volumeMl >= 1000) {
    return `${formatNumber(volumeMl / 1000, 2)} л`;
  }
  return `${formatNumber(volumeMl, 0)} мл`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format currency (Rubles)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(value);
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string | null | undefined, maxLength = 50): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format status to readable text
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return '-';
  
  const statusMap: Record<string, string> = {
    // CM Lot statuses
    'Planned': 'Запланирован',
    'In_Production': 'В производстве',
    'In_Processing': 'В обработке',
    'QC_Pending': 'Ожидает QC',
    'QC_In_Progress': 'QC в процессе',
    'QC_Completed': 'QC завершён',
    'QA_Pending': 'Ожидает QA',
    'QA_Approved': 'QA одобрен',
    'QA_Rejected': 'QA отклонён',
    'Released': 'Выпущен',
    'On_Hold': 'Приостановлен',
    'Archived': 'Архивирован',
    
    // Request statuses
    'Draft': 'Черновик',
    'Submitted': 'Отправлен',
    'In_Review': 'На рассмотрении',
    'Approved': 'Одобрен',
    'Rejected': 'Отклонён',
    'Completed': 'Завершён',
    'Cancelled': 'Отменён',
    
    // Pack Lot statuses
    'Filling': 'Розлив',
    'Filled': 'Разлито',
    'Pack_Completed': 'Упаковка завершена',
    'Shipped': 'Отгружен',
  };
  
  return statusMap[status] || capitalize(status)?.replace(/_/g, ' ') || '-';
}

/**
 * Format lot ID for display
 */
export function formatLotId(id: string | null | undefined): string {
  if (!id) return '-';
  return id;
}

/**
 * Generate lot number
 */
export function generateLotNumber(prefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  
  return `${prefix}-${year}${month}${day}-${seq}`;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate email
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Russian)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const phoneRegex = /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate required field
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validate number range
 */
export function isInRange(
  value: number | null | undefined,
  min?: number,
  max?: number
): boolean {
  if (value === null || value === undefined) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Remove undefined and null values from object
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Get nested value from object
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let value: unknown = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  
  return value as T;
}

export default {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatForInput,
  formatNumber,
  formatVolume,
  formatPercent,
  formatCurrency,
  truncate,
  capitalize,
  formatStatus,
  formatLotId,
  generateLotNumber,
  isValidEmail,
  isValidPhone,
  isRequired,
  isInRange,
  cleanObject,
  deepClone,
  isEmpty,
  getNestedValue,
};
