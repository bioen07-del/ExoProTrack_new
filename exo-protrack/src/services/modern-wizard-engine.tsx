import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Save, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface WizardStepData {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  component: React.ComponentType<WizardStepComponentProps>;
  validation?: (data: Record<string, unknown>) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

export interface WizardStepComponentProps {
  data: Record<string, unknown>;
  updateData: (data: Record<string, unknown>) => void;
  errors: Record<string, string>;
}

export interface WizardConfig {
  steps: WizardStepData[];
  onComplete: (data: Record<string, unknown>) => Promise<void> | void;
  onSaveProgress?: (data: Record<string, unknown>) => void;
  validateOnNext?: boolean;
  showProgressBar?: boolean;
  showTimeline?: boolean;
  allowBack?: boolean;
  allowSkip?: boolean;
  autoSaveInterval?: number;
  theme?: 'modern' | 'classic';
  translations?: Record<string, string>;
}

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  data: Record<string, unknown>;
  isComplete: boolean;
  isSubmitting: boolean;
  lastSaved: Date | null;
  errors: Record<string, string>;
  visitedSteps: number[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TRANSLATIONS = {
  next: 'Далее',
  back: 'Назад',
  complete: 'Завершить',
  saving: 'Сохранение...',
  saved: 'Сохранено',
  step: 'Шаг',
  of: 'из',
  required: 'Обязательное поле',
  invalid: 'Некорректное значение',
} as const;

const ANIMATION_VARIANTS = {
  slideLeft: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  },
  slideRight: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 50, opacity: 0 },
  },
} as const;

const TRANSITION_CONFIG = {
  duration: 0.3,
  ease: 'easeOut' as const,
};

// ============================================================================
// Hook
// ============================================================================

export function useWizard(config: WizardConfig) {
  const {
    steps,
    onComplete,
    onSaveProgress,
    validateOnNext = true,
    allowBack = true,
    autoSaveInterval,
    translations = {},
  } = config;

  const translationsRef = useRef({ ...DEFAULT_TRANSLATIONS, ...translations });
  translationsRef.current = { ...DEFAULT_TRANSLATIONS, ...translations };

  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    totalSteps: steps.length,
    data: {},
    isComplete: false,
    isSubmitting: false,
    lastSaved: null,
    errors: {},
    visitedSteps: [0],
  });

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directionRef = useRef(0);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveInterval && onSaveProgress) {
      autoSaveTimerRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.data && Object.keys(prev.data).length > 0) {
            onSaveProgress(prev.data);
            return { ...prev, lastSaved: new Date() };
          }
          return prev;
        });
      }, autoSaveInterval * 1000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveInterval, onSaveProgress]);

  // Validate current step
  const validateStep = useCallback(
    (stepIndex: number): ValidationResult => {
      const step = steps[stepIndex];
      if (!step?.validation) {
        return { valid: true, errors: {} };
      }

      const currentStepData = state.data[step.id] || {};
      return step.validation(currentStepData);
    },
    [steps, state.data]
  );

  // Navigation handlers
  const navigate = useCallback(
    (direction: 'next' | 'prev' | 'to', stepIndex?: number) => {
      if (direction === 'prev' && !allowBack) return;

      setState((prev) => {
        let newStep: number;
        let newVisitedSteps: number[];

        switch (direction) {
          case 'next':
            if (validateOnNext) {
              const { valid, errors } = validateStep(prev.currentStep);
              if (!valid) {
                return { ...prev, errors };
              }
            }
            newStep = Math.min(prev.currentStep + 1, prev.totalSteps - 1);
            newVisitedSteps = prev.visitedSteps.includes(newStep)
              ? prev.visitedSteps
              : [...prev.visitedSteps, newStep];
            directionRef.current = 1;
            break;
          case 'prev':
            newStep = Math.max(prev.currentStep - 1, 0);
            directionRef.current = -1;
            newVisitedSteps = prev.visitedSteps;
            break;
          case 'to':
            if (
              stepIndex === undefined ||
              stepIndex < 0 ||
              stepIndex >= prev.totalSteps
            ) {
              return prev;
            }
            if (
              !prev.visitedSteps.includes(stepIndex) &&
              stepIndex !== prev.currentStep + 1
            ) {
              return prev;
            }
            newStep = stepIndex;
            directionRef.current = newStep > prev.currentStep ? 1 : -1;
            newVisitedSteps = prev.visitedSteps;
            break;
          default:
            return prev;
        }

        return {
          ...prev,
          errors: {},
          currentStep: newStep,
          visitedSteps: newVisitedSteps,
        };
      });
    },
    [allowBack, validateOnNext, validateStep]
  );

  // Update step data
  const updateData = useCallback((stepId: string, data: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [stepId]: {
          ...((prev.data[stepId] as Record<string, unknown>) || {}),
          ...data,
        },
      },
      errors: {
        ...prev.errors,
        ...Object.keys(data).reduce<Record<string, string>>(
          (acc, key) => ({ ...acc, [`${stepId}.${key}`]: '' }),
          {}
        ),
      },
    }));
  }, []);

  // Submit wizard
  const complete = useCallback(async () => {
    // Validate all steps
    for (let i = 0; i < steps.length; i++) {
      const { valid, errors } = validateStep(i);
      if (!valid) {
        setState((prev) => ({
          ...prev,
          errors,
          currentStep: i,
        }));
        return;
      }
    }

    setState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await onComplete(state.data);
      setState((prev) => ({
        ...prev,
        isComplete: true,
        isSubmitting: false,
      }));
    } catch (error) {
      console.error('Wizard completion error:', error);
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [steps, validateStep, onComplete, state.data]);

  // Reset wizard
  const reset = useCallback(() => {
    directionRef.current = 0;
    setState({
      currentStep: 0,
      totalSteps: steps.length,
      data: {},
      isComplete: false,
      isSubmitting: false,
      lastSaved: null,
      errors: {},
      visitedSteps: [0],
    });
  }, [steps.length]);

  // Computed values
  const progress = ((state.currentStep + 1) / state.totalSteps) * 100;
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === state.totalSteps - 1;
  const t = translationsRef.current;

  return {
    ...state,
    t,
    progress,
    isFirstStep,
    isLastStep,
    nextStep: () => navigate('next'),
    prevStep: () => navigate('prev'),
    goToStep: (step: number) => navigate('to', step),
    updateData,
    complete,
    reset,
  };
}

// ============================================================================
// Components
// ============================================================================

interface ProgressBarProps {
  progress: number;
  steps: WizardStepData[];
  currentStep: number;
  visitedSteps: number[];
  onStepClick?: (index: number) => void;
  showLabels?: boolean;
}

export function WizardProgressBar({
  progress,
  steps,
  currentStep,
  visitedSteps,
  onStepClick,
  showLabels = true,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Progress line */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isVisited = visitedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isClickable = isVisited && onStepClick;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable?.(index)}
              disabled={!isClickable}
              className={`group flex flex-col items-center ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              aria-label={`Шаг ${index + 1}: ${step.title}${isCurrent ? ' (текущий)' : ''}`}
            >
              {/* Step circle */}
              <motion.div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2
                  ${
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isVisited
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground'
                  }`}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                transition={{ type: 'spring', bounce: 0.4 }}
              >
                {isVisited && !isCurrent && <Check className="w-4 h-4" />}
                {isCurrent && (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
                {!isVisited && !isCurrent && (
                  <span className="text-xs">{index + 1}</span>
                )}

                {/* Pulse animation for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>

              {/* Step label */}
              {showLabels && (
                <span
                  className={`mt-2 text-xs text-center max-w-20 transition-colors ${
                    isCurrent
                      ? 'text-primary font-medium'
                      : isVisited
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ErrorSummaryProps {
  errors: Record<string, string>;
}

const ErrorSummary = ({ errors }: ErrorSummaryProps) => {
  const errorEntries = useMemo(
    () => Object.entries(errors).filter(([, error]) => error),
    [errors]
  );

  if (errorEntries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
    >
      <div className="flex items-center gap-2 text-destructive mb-2">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Исправьте ошибки:</span>
      </div>
      <ul className="list-disc list-inside text-sm text-destructive/80">
        {errorEntries.map(([, error]) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </motion.div>
  );
};

interface WizardLayoutProps {
  config: WizardConfig;
  state: ReturnType<typeof useWizard>;
  className?: string;
}

export function WizardLayout({ config, state, className }: WizardLayoutProps) {
  const { steps, theme = 'modern' } = config;
  const {
    currentStep,
    progress,
    t,
    isFirstStep,
    isLastStep,
    isSubmitting,
    visitedSteps,
    nextStep,
    prevStep,
    complete,
    errors,
    data,
  } = state;

  const CurrentStepComponent = steps[currentStep].component;

  if (theme === 'modern') {
    return (
      <div className={`w-full max-w-4xl mx-auto ${className || ''}`}>
        {/* Header with progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              {steps[currentStep].description && (
                <p className="text-muted-foreground mt-1">
                  {steps[currentStep].description}
                </p>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {t.step} {currentStep + 1} {t.of} {steps.length}
            </div>
          </div>

          <WizardProgressBar
            progress={progress}
            steps={steps}
            currentStep={currentStep}
            visitedSteps={visitedSteps}
          />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            variants={ANIMATION_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION_CONFIG}
            className="bg-card rounded-xl border p-6 shadow-sm mb-6"
          >
            <CurrentStepComponent
              data={(data[steps[currentStep].id] as Record<string, unknown>) || {}}
              updateData={(stepData: Record<string, unknown>) =>
                state.updateData(steps[currentStep].id, stepData)
              }
              errors={errors}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="btn-outline btn-md"
                disabled={isSubmitting}
                aria-label={t.back}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t.back}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            {state.lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3" />
                {t.saved} {state.lastSaved.toLocaleTimeString()}
              </span>
            )}

            {isLastStep ? (
              <button
                onClick={complete}
                className="btn-primary btn-md"
                disabled={isSubmitting}
                aria-label={t.complete}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-loading" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t.complete}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="btn-primary btn-md"
                disabled={isSubmitting}
                aria-label={t.next}
              >
                {t.next}
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>

        <ErrorSummary errors={errors} />
      </div>
    );
  }

  // Classic theme (simplified)
  return (
    <div className={`w-full ${className || ''}`}>
      <CurrentStepComponent
        data={(data[steps[currentStep].id] as Record<string, unknown>) || {}}
        updateData={(stepData: Record<string, unknown>) =>
          state.updateData(steps[currentStep].id, stepData)
        }
        errors={errors}
      />

      <div className="flex justify-between mt-6">
        <button
          onClick={prevStep}
          disabled={isFirstStep || isSubmitting}
          className="btn-secondary btn-md"
          aria-label={t.back}
        >
          {t.back}
        </button>
        <button
          onClick={isLastStep ? complete : nextStep}
          className="btn-primary btn-md"
          disabled={isSubmitting}
          aria-label={isLastStep ? t.complete : t.next}
        >
          {isLastStep ? t.complete : t.next}
        </button>
      </div>
    </div>
  );
}

// Mobile-optimized wizard (full screen)
export function MobileWizardLayout(props: WizardLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full">
        <WizardLayout {...props} />
      </div>
    </div>
  );
}

export default WizardLayout;
