import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// Типы для Wizard
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  validate?: (data: Record<string, any>) => { valid: boolean; errors: string[] };
  isOptional?: boolean;
}

export interface WizardData {
  [stepId: string]: Record<string, any>;
}

interface WizardState {
  currentStep: number;
  totalSteps: number;
  data: WizardData;
  isComplete: boolean;
  isDirty: boolean;
  startedAt: Date;
}

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'UPDATE_DATA'; stepId: string; data: Record<string, any> }
  | { type: 'RESET' }
  | { type: 'COMPLETE' }
  | { type: 'SET_ALL_DATA'; data: WizardData };

interface WizardContextType extends WizardState {
  steps: WizardStep[];
  currentStepData: Record<string, any>;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  goToStep: (step: number) => void;
  goNext: () => void;
  goBack: () => void;
  updateData: (data: Record<string, any>) => void;
  reset: () => void;
  complete: () => void;
  getAllData: () => WizardData;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

// Reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.max(0, Math.min(action.step, state.totalSteps - 1)),
        isDirty: true,
      };
    case 'NEXT':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
        isDirty: true,
      };
    case 'BACK':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
        isDirty: true,
      };
    case 'UPDATE_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          [action.stepId]: {
            ...state.data[action.stepId],
            ...action.data,
          },
        },
        isDirty: true,
      };
    case 'SET_ALL_DATA':
      return {
        ...state,
        data: action.data,
        isDirty: true,
      };
    case 'RESET':
      return {
        currentStep: 0,
        totalSteps: state.totalSteps,
        data: {},
        isComplete: false,
        isDirty: false,
        startedAt: new Date(),
      };
    case 'COMPLETE':
      return {
        ...state,
        isComplete: true,
        isDirty: false,
      };
    default:
      return state;
  }
}

interface WizardProviderProps {
  steps: WizardStep[];
  initialData?: WizardData;
  onComplete?: (data: WizardData) => void;
  children: ReactNode;
}

export function WizardProvider({ 
  steps, 
  initialData = {},
  onComplete,
  children 
}: WizardProviderProps) {
  const totalSteps = steps.length;
  
  const [state, dispatch] = useReducer(wizardReducer, {
    currentStep: 0,
    totalSteps,
    data: initialData,
    isComplete: false,
    isDirty: false,
    startedAt: new Date(),
  });

  const currentStepData = state.data[steps[state.currentStep]?.id] || {};

  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === totalSteps - 1;
  const canGoBack = !isFirstStep;
  const canGoNext = !isLastStep;

  // Валидация текущего шага перед переходом
  const validateCurrentStep = useCallback(() => {
    const step = steps[state.currentStep];
    if (!step?.validate) return { valid: true };
    return step.validate(state.data[step.id] || {});
  }, [steps, state.currentStep, state.data]);

  // Переход к шагу
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      dispatch({ type: 'SET_STEP', step });
    }
  }, [totalSteps]);

  // Переход к следующему шагу с валидацией
  const goNext = useCallback(() => {
    if (isLastStep) {
      dispatch({ type: 'COMPLETE' });
      onComplete?.(state.data);
      return;
    }

    // Валидация текущего шага
    const validation = validateCurrentStep();
    if (!validation.valid) {
      return { valid: false, errors: validation.errors };
    }

    dispatch({ type: 'NEXT' });
    return { valid: true };
  }, [isLastStep, state.data, validateCurrentStep, onComplete]);

  // Переход к предыдущему шагу
  const goBack = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  // Обновление данных текущего шага
  const updateData = useCallback((data: Record<string, any>) => {
    const stepId = steps[state.currentStep]?.id;
    if (stepId) {
      dispatch({ type: 'UPDATE_DATA', stepId, data });
    }
  }, [steps, state.currentStep]);

  // Сброс визарда
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Получение всех данных
  const getAllData = useCallback(() => {
    return state.data;
  }, [state.data]);

  return (
    <WizardContext.Provider
      value={{
        ...state,
        steps,
        currentStepData,
        isFirstStep,
        isLastStep,
        canGoBack,
        canGoNext,
        goToStep,
        goNext,
        goBack,
        updateData,
        reset,
        getAllData,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

// Вспомогательный хук для создания визарда
export function useWizardStep<Data = Record<string, any>>() {
  const { 
    currentStepData, 
    updateData, 
    steps, 
    currentStep 
  } = useWizard();

  const step = steps[currentStep];
  
  return {
    data: currentStepData as Data,
    step,
    updateData: (data: Partial<Data>) => updateData(data as Record<string, any>),
    stepIndex: currentStep,
    totalSteps: steps.length,
  };
}
