import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useWizard } from './WizardContext';
import { useDeviceType } from '../../providers/ThemeProvider';
import { cn } from '../../lib/utils';

interface WizardLayoutProps {
  onComplete?: (data: any) => void;
  onCancel?: () => void;
  showProgress?: boolean;
}

export function WizardLayout({ 
  onComplete, 
  onCancel,
  showProgress = true 
}: WizardLayoutProps) {
  const { 
    steps, 
    currentStep, 
    currentStepData,
    goNext, 
    goBack, 
    goToStep,
    isFirstStep, 
    isLastStep,
    isComplete,
    getAllData,
    validateCurrentStep
  } = useWizard();
  
  const device = useDeviceType();
  const step = steps[currentStep];

  // Обработчик кнопки Далее
  const handleNext = () => {
    if (isLastStep) {
      onComplete?.(getAllData());
    } else {
      const result = goNext();
      if (result && 'valid' in result && !result.valid) {
        // Валидация не прошла, ошибки уже обработаны
        return;
      }
    }
  };

  // На мобильных - полноэкранный режим
  if (device === 'mobile') {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex-none border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 -ml-2 rounded-lg hover:bg-accent"
                >
                  <X size={24} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold">{step?.title}</h2>
                {step?.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
            
            {/* Progress indicator */}
            {showProgress && (
              <div className="flex items-center gap-1">
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => i <= currentStep && goToStep(i)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i < currentStep ? 'bg-primary' :
                      i === currentStep ? 'bg-primary' :
                      'bg-muted'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step && <step.component data={currentStepData} />}
        </div>

        {/* Footer */}
        <div className="flex-none border-t p-4">
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={goBack}
                className="flex-1 btn btn-secondary py-3"
              >
                <ChevronLeft size={20} className="mr-2" />
                Назад
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                'flex-1 btn btn-primary py-3',
                isFirstStep && 'col-span-2'
              )}
            >
              {isLastStep ? 'Завершить' : 'Далее'}
              {!isLastStep && <ChevronRight size={20} className="ml-2" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // На десктопе/планшете - обычный layout
  return (
    <div className="wizard-layout">
      {/* Progress Bar */}
      {showProgress && (
        <WizardProgressBar 
          steps={steps}
          currentStep={currentStep}
          onStepClick={goToStep}
        />
      )}

      {/* Content Area */}
      <div className="wizard-content">
        {/* Header */}
        <div className="wizard-header mb-6">
          <h2 className="text-2xl font-bold">{step?.title}</h2>
          {step?.description && (
            <p className="text-muted-foreground mt-1">{step.description}</p>
          )}
        </div>

        {/* Step Component */}
        <div className="wizard-step mb-8">
          {step && <step.component data={currentStepData} />}
        </div>

        {/* Navigation */}
        <div className="wizard-footer flex justify-between border-t pt-6">
          <button
            onClick={goBack}
            disabled={isFirstStep}
            className="btn btn-outline"
          >
            <ChevronLeft size={16} className="mr-2" />
            Назад
          </button>

          <button
            onClick={handleNext}
            className="btn btn-primary"
          >
            {isLastStep ? (
              <>
                Завершить
                <Check size={16} className="ml-2" />
              </>
            ) : (
              <>
                Далее
                <ChevronRight size={16} className="ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
interface WizardProgressBarProps {
  steps: { id: string; title: string }[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardProgressBar({ steps, currentStep, onStepClick }: WizardProgressBarProps) {
  const device = useDeviceType();
  const isMobile = device === 'mobile';

  if (isMobile) {
    return (
      <div className="wizard-progress-mobile flex items-center justify-center gap-1 py-3">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => index <= currentStep && onStepClick(index)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              index < currentStep ? 'bg-primary text-primary-foreground' :
              index === currentStep ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="wizard-progress mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <button
              onClick={() => index <= currentStep && onStepClick(index)}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors',
                index < currentStep ? 'bg-primary text-primary-foreground' :
                index === currentStep ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' :
                'bg-muted text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <Check size={20} />
              ) : (
                index + 1
              )}
            </button>

            {/* Step Label */}
            <span className={cn(
              'ml-3 font-medium',
              index === currentStep ? 'text-foreground' :
              index < currentStep ? 'text-foreground' :
              'text-muted-foreground'
            )}>
              {step.title}
            </span>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 mx-4',
                index < currentStep ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export WizardProvider as default
export default WizardLayout;
