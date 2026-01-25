// Workflow Engine для управления состояниями CM лота
// Определяет допустимые переходы и бизнес-правила

import type { CmLot, Request, PackLot } from '../types/database';

// Типы статусов CM лота
export type CmLotStatus = 
  | 'Open'
  | 'Closed_Collected'
  | 'In_Processing'
  | 'QC_Pending'
  | 'QC_Completed'
  | 'Approved'
  | 'Rejected'
  | 'OnHold'
  | 'Consumed';

// Типы статусов заявки
export type RequestStatus =
  | 'Draft'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

// Типы статусов PackLot
export type PackLotStatus =
  | 'Planned'
  | 'Filling'
  | 'Filled'
  | 'Lyophilizing'
  | 'Packed'
  | 'QC_Pending'
  | 'QC_Completed'
  | 'QA_Pending'
  | 'Released'
  | 'Shipped'
  | 'Rejected';

// Конфигурация переходов CM лота
export const CM_LOT_WORKFLOW: Record<CmLotStatus, CmLotStatus[]> = {
  'Open': ['Closed_Collected'],
  'Closed_Collected': ['In_Processing'],
  'In_Processing': ['QC_Pending'],
  'QC_Pending': ['QC_Completed'],
  'QC_Completed': ['Approved', 'Rejected', 'OnHold'],
  'Approved': ['Consumed'],
  'Rejected': [],
  'OnHold': ['Approved', 'Rejected'],
  'Consumed': [],
};

// Конфигурация переходов заявки
export const REQUEST_WORKFLOW: Record<RequestStatus, RequestStatus[]> = {
  'Draft': ['InProgress'],
  'InProgress': ['Completed'],
  'Completed': [],
  'Cancelled': [],
};

// Конфигурация переходов PackLot
export const PACK_LOT_WORKFLOW: Record<PackLotStatus, PackLotStatus[]> = {
  'Planned': ['Filling'],
  'Filling': ['Filled'],
  'Filled': ['Lyophilizing', 'Packed'],
  'Lyophilizing': ['Packed'],
  'Packed': ['QC_Pending'],
  'QC_Pending': ['QC_Completed'],
  'QC_Completed': ['QA_Pending'],
  'QA_Pending': ['Released', 'Rejected'],
  'Released': ['Shipped'],
  'Shipped': [],
  'Rejected': [],
};

// Метки статусов для UI
export const CM_LOT_STATUS_LABELS: Record<CmLotStatus, string> = {
  'Open': 'Открыт',
  'Closed_Collected': 'Сбор завершен',
  'In_Processing': 'В обработке',
  'QC_Pending': 'Ожидает QC',
  'QC_Completed': 'QC завершен',
  'Approved': 'QA одобрен',
  'Rejected': 'Брак',
  'OnHold': 'На удержании',
  'Consumed': 'Израсходовано',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  'Draft': 'Черновик',
  'InProgress': 'В работе',
  'Completed': 'Завершена',
  'Cancelled': 'Отменена',
};

export const PACK_LOT_STATUS_LABELS: Record<PackLotStatus, string> = {
  'Planned': 'Запланирован',
  'Filling': 'Розлив',
  'Filled': 'Розлито',
  'Lyophilizing': 'Лиофилизация',
  'Packed': 'Упаковано',
  'QC_Pending': 'Ожидает QC',
  'QC_Completed': 'QC завершен',
  'QA_Pending': 'Ожидает QA',
  'Released': 'Выпущен',
  'Shipped': 'Отгружено',
  'Rejected': 'Брак',
};

// Цвета статусов для UI
export const CM_LOT_STATUS_COLORS: Record<CmLotStatus, string> = {
  'Open': 'bg-blue-100 text-blue-800',
  'Closed_Collected': 'bg-purple-100 text-purple-800',
  'In_Processing': 'bg-amber-100 text-amber-800',
  'QC_Pending': 'bg-yellow-100 text-yellow-800',
  'QC_Completed': 'bg-green-100 text-green-800',
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-red-100 text-red-800',
  'OnHold': 'bg-orange-100 text-orange-800',
  'Consumed': 'bg-slate-100 text-slate-800',
};

// Класс Workflow Engine
export class WorkflowEngine {
  // Проверка допустимости перехода
  static canTransition(
    currentStatus: string,
    nextStatus: string,
    workflowConfig: Record<string, string[]>
  ): boolean {
    const allowedTransitions = workflowConfig[currentStatus as keyof typeof workflowConfig];
    if (!allowedTransitions) return false;
    return allowedTransitions.includes(nextStatus);
  }

  // Получение следующего статуса
  static getNextStatus(
    currentStatus: string,
    workflowConfig: Record<string, string[]>
  ): string | null {
    const allowed = workflowConfig[currentStatus as keyof typeof workflowConfig];
    return allowed?.[0] || null;
  }

  // Валидация перехода с бизнес-правилами
  static validateTransition(
    currentStatus: CmLotStatus,
    nextStatus: CmLotStatus,
    context: {
      collectionsCount?: number;
      processingStepsCount?: number;
      qcResultsCount?: number;
      qcTestsRequired?: string[];
      hasQaDecision?: boolean;
      packLotsCount?: number;
    }
  ): { valid: boolean; error?: string } {
    // Проверка базового перехода
    if (!this.canTransition(currentStatus, nextStatus, CM_LOT_WORKFLOW)) {
      return { valid: false, error: 'Недопустимый переход статуса' };
    }

    // Правила для Open -> Closed_Collected
    if (currentStatus === 'Open' && nextStatus === 'Closed_Collected') {
      if (!context.collectionsCount || context.collectionsCount === 0) {
        return { valid: false, error: 'Нельзя закрыть сбор без событий сбора' };
      }
    }

    // Правила для Closed_Collected -> In_Processing
    if (currentStatus === 'Closed_Collected' && nextStatus === 'In_Processing') {
      if (!context.processingStepsCount || context.processingStepsCount === 0) {
        return { valid: false, error: 'Нельзя начать обработку без шагов процессинга' };
      }
    }

    // Правила для In_Processing -> QC_Pending
    if (currentStatus === 'In_Processing' && nextStatus === 'QC_Pending') {
      if (context.processingStepsCount === 0) {
        return { valid: false, error: 'Нельзя передать на QC без завершения обработки' };
      }
    }

    // Правила для QC_Pending -> QC_Completed
    if (currentStatus === 'QC_Pending' && nextStatus === 'QC_Completed') {
      if (context.qcTestsRequired && context.qcTestsRequired.length > 0) {
        const completedTests = context.qcResultsCount || 0;
        if (completedTests < context.qcTestsRequired.length) {
          return { valid: false, error: 'Нельзя завершить QC без всех результатов тестов' };
        }
      }
    }

    // Правила для QC_Completed -> Approved
    if (currentStatus === 'QC_Completed' && nextStatus === 'Approved') {
      if (!context.hasQaDecision) {
        return { valid: false, error: 'Требуется решение QA' };
      }
    }

    return { valid: true };
  }

  // Получение UI информации о статусе
  static getStatusInfo(status: CmLotStatus) {
    return {
      label: CM_LOT_STATUS_LABELS[status],
      color: CM_LOT_STATUS_COLORS[status],
    };
  }

  // Определение этапа производства
  static getProductionStage(status: CmLotStatus): number {
    const stages: CmLotStatus[] = [
      'Open',
      'Closed_Collected',
      'In_Processing',
      'QC_Pending',
      'QC_Completed',
      'Approved',
    ];
    return stages.indexOf(status);
  }

  // Проверка завершения
  static isCompleted(status: CmLotStatus): boolean {
    return ['Approved', 'Rejected', 'Consumed'].includes(status);
  }

  // Проверка терминального статуса
  static isTerminal(status: CmLotStatus): boolean {
    return ['Rejected', 'Consumed'].includes(status);
  }
}

// Hook для использования workflow engine
export function useWorkflowEngine() {
  return {
    canTransition: WorkflowEngine.canTransition,
    getNextStatus: WorkflowEngine.getNextStatus,
    validateTransition: WorkflowEngine.validateTransition,
    getStatusInfo: WorkflowEngine.getStatusInfo,
    getProductionStage: WorkflowEngine.getProductionStage,
    isCompleted: WorkflowEngine.isCompleted,
    isTerminal: WorkflowEngine.isTerminal,
  };
}

// Workflow для PackLot
export class PackLotWorkflowEngine {
  static canTransition(current: PackLotStatus, next: PackLotStatus): boolean {
    return this.canTransition(current, next, PACK_LOT_WORKFLOW);
  }

  static validateTransition(
    current: PackLotStatus,
    next: PackLotStatus,
    context: {
      qcRequired?: boolean;
      hasLyophilization?: boolean;
    }
  ): { valid: boolean; error?: string } {
    // Проверка базового перехода
    if (!this.canTransition(current, next, PACK_LOT_WORKFLOW)) {
      return { valid: false, error: 'Недопустимый переход статуса' };
    }

    // Правила для лиофилизации
    if (current === 'Filled' && next === 'Packed') {
      if (context.hasLyophilization) {
        return { valid: false, error: 'Требуется лиофилизация' };
      }
    }

    return { valid: true };
  }
}
