// ============================================================================
// Application Constants
// ============================================================================

export const APP_NAME = 'EXO ProTrack';
export const APP_VERSION = '3.5.0';
export const APP_DESCRIPTION = 'Система мониторинга производства и прослеживаемости для фармацевтического производства';

// ============================================================================
// Role Constants
// ============================================================================

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  PRODUCTION: 'Production',
  QC: 'QC',
  QA: 'QA',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  Admin: 'Администратор',
  Manager: 'Менеджер',
  Production: 'Производство',
  QC: 'Контроль качества',
  QA: 'Обеспечение качества',
};

// ============================================================================
// Status Constants
// ============================================================================

export const CM_LOT_STATUSES = {
  PLANNED: 'Planned',
  IN_PRODUCTION: 'In_Production',
  IN_PROCESSING: 'In_Processing',
  QC_PENDING: 'QC_Pending',
  QC_IN_PROGRESS: 'QC_In_Progress',
  QC_COMPLETED: 'QC_Completed',
  QA_PENDING: 'QA_Pending',
  QA_APPROVED: 'QA_Approved',
  QA_REJECTED: 'QA_Rejected',
  RELEASED: 'Released',
  ON_HOLD: 'On_Hold',
  ARCHIVED: 'Archived',
} as const;

export const REQUEST_STATUSES = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In_Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const PACK_LOT_STATUSES = {
  PLANNED: 'Planned',
  FILLING: 'Filling',
  FILLED: 'Filled',
  PACK_COMPLETED: 'Pack_Completed',
  QC_PENDING: 'QC_Pending',
  QA_PENDING: 'QA_Pending',
  RELEASED: 'Released',
  SHIPPED: 'Shipped',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  // CM Lot
  Planned: 'Запланирован',
  In_Production: 'В производстве',
  In_Processing: 'В обработке',
  QC_Pending: 'Ожидает QC',
  QC_In_Progress: 'QC в процессе',
  QC_Completed: 'QC завершён',
  QA_Pending: 'Ожидает QA',
  QA_Approved: 'QA одобрен',
  QA_Rejected: 'QA отклонён',
  Released: 'Выпущен',
  On_Hold: 'Приостановлен',
  Archived: 'Архивирован',
  // Request
  Draft: 'Черновик',
  Submitted: 'Отправлен',
  In_Review: 'На рассмотрении',
  Approved: 'Одобрен',
  Rejected: 'Отклонён',
  Completed: 'Завершён',
  Cancelled: 'Отменён',
  // Pack Lot
  Filling: 'Розлив',
  Filled: 'Разлито',
  Pack_Completed: 'Упаковка завершена',
  Shipped: 'Отгружен',
};

export const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-gray-100 text-gray-800',
  Draft: 'bg-gray-100 text-gray-800',
  Submitted: 'bg-blue-100 text-blue-800',
  In_Production: 'bg-yellow-100 text-yellow-800',
  In_Processing: 'bg-yellow-100 text-yellow-800',
  Filling: 'bg-yellow-100 text-yellow-800',
  Filled: 'bg-green-100 text-green-800',
  QC_Pending: 'bg-orange-100 text-orange-800',
  QC_In_Progress: 'bg-blue-100 text-blue-800',
  QC_Completed: 'bg-green-100 text-green-800',
  QA_Pending: 'bg-orange-100 text-orange-800',
  QA_Approved: 'bg-green-100 text-green-800',
  QA_Rejected: 'bg-red-100 text-red-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Released: 'bg-emerald-100 text-emerald-800',
  Shipped: 'bg-purple-100 text-purple-800',
  On_Hold: 'bg-yellow-100 text-yellow-800',
  Archived: 'bg-gray-100 text-gray-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
  In_Review: 'bg-blue-100 text-blue-800',
  Pack_Completed: 'bg-green-100 text-green-800',
};

// ============================================================================
// Entity Types
// ============================================================================

export const ENTITY_TYPES = {
  REQUEST: 'request',
  CM_LOT: 'cm_lot',
  PACK_LOT: 'pack_lot',
  CULTURE: 'culture',
  PRODUCT: 'product',
} as const;

// ============================================================================
// Notification Types
// ============================================================================

export const NOTIFICATION_TYPES = {
  REQUEST_CREATED: 'request_created',
  REQUEST_STATUS_CHANGED: 'request_status_changed',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  CM_LOT_QC_PENDING: 'cm_lot_qc_pending',
  CM_LOT_QC_READY: 'cm_lot_qc_ready',
  CM_LOT_QA_DECISION: 'cm_lot_qa_decision',
  PACK_LOT_READY_FOR_FILLING: 'pack_lot_ready_for_filling',
  PACK_LOT_FILLED: 'pack_lot_filled',
  QC_RESULT_READY: 'qc_result_ready',
  APPROVAL_REQUIRED: 'approval_required',
  EXPIRY_WARNING: 'expiry_warning',
  SYSTEM: 'system',
} as const;

export const NOTIFICATION_PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

// ============================================================================
// Pagination Constants
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const TABLE_LIMITS = [10, 20, 50, 100] as const;

// ============================================================================
// Date Constants
// ============================================================================

export const DATE_FORMATS = {
  DISPLAY: 'dd.MM.yyyy',
  DISPLAY_WITH_TIME: 'dd.MM.yyyy HH:mm',
  INPUT: "yyyy-MM-dd'T'HH:mm",
  API: "yyyy-MM-dd'T'HH:mm:ss'Z'",
};

export const RELATIVE_TIME_THRESHOLDS = {
  SAME_DAY: 24 * 60 * 60 * 1000, // 1 day
  SAME_WEEK: 7 * 24 * 60 * 60 * 1000, // 1 week
};

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  THEME: 'exo-protrack-theme',
  USER: 'exo-protrack-user',
  SIDEBAR_OPEN: 'exo-protrack-sidebar-open',
  LAST_VIEWED_LOT: 'exo-protrack-last-viewed-lot',
  PREFERENCES: 'exo-protrack-preferences',
};

// ============================================================================
// API Endpoints (relative to Supabase)
// ============================================================================

export const API_ROUTES = {
  AUTH: '/auth/v1',
  REST: '/rest/v1',
  REALTIME: '/realtime/v1',
};

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  PUSH_NOTIFICATIONS: true,
  OFFLINE_MODE: true,
  ANALYTICS: false,
  DEBUG_MODE: import.meta.env.DEV,
};

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_VOLUME_ML: 1,
  MAX_VOLUME_ML: 100000,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10000,
};

export default {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  ROLES,
  ROLE_LABELS,
  CM_LOT_STATUSES,
  REQUEST_STATUSES,
  PACK_LOT_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  ENTITY_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  PAGINATION,
  TABLE_LIMITS,
  DATE_FORMATS,
  RELATIVE_TIME_THRESHOLDS,
  STORAGE_KEYS,
  API_ROUTES,
  FEATURES,
  VALIDATION_RULES,
};
