'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  WizardProgress,
  StepIdeaInput,
  StepReflection,
  StepScopeSelection,
  RunList,
  ActivityReportLoader,
} from '@/components/research';
import type { PolicyInterpretation, Run } from '@/lib/types';

type WizardStep = 'idea' | 'reflection' | 'scope' | 'running' | 'completed' | 'failed';

interface RunResult {
  message: string;
  policiesFound: number;
  success: boolean;
  error?: string;
  runId?: string;
}

interface WizardState {
  step: WizardStep;
  ideaInput: string;
  interpretation: PolicyInterpretation | null;
  selectedCountries: string[];
  includeIreland: boolean;
  isLoading: boolean;
  error: string | null;
  runResult: RunResult | null;
  currentPhase: string;
}

type WizardAction =
  | { type: 'SET_IDEA'; payload: string }
  | { type: 'SET_INTERPRETATION'; payload: PolicyInterpretation }
  | { type: 'UPDATE_INTERPRETATION'; payload: PolicyInterpretation }
  | { type: 'SET_COUNTRIES'; payload: string[] }
  | { type: 'SET_IRELAND'; payload: boolean }
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_RESULT'; payload: RunResult }
  | { type: 'SET_PHASE'; payload: string }
  | { type: 'RESET' };

const initialState: WizardState = {
  step: 'idea',
  ideaInput: '',
  interpretation: null,
  selectedCountries: [],
  includeIreland: true,
  isLoading: false,
  error: null,
  runResult: null,
  currentPhase: '',
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_IDEA':
      return { ...state, ideaInput: action.payload };
    case 'SET_INTERPRETATION':
      return { ...state, interpretation: action.payload, step: 'reflection', isLoading: false };
    case 'UPDATE_INTERPRETATION':
      return { ...state, interpretation: action.payload };
    case 'SET_COUNTRIES':
      return { ...state, selectedCountries: action.payload };
    case 'SET_IRELAND':
      return { ...state, includeIreland: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_RESULT':
      return { ...state, runResult: action.payload };
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const phases = [
  { id: 'signal_hunter', label: 'Signal Hunter', description: 'Scanning for policies' },
  { id: 'global_vetting', label: 'Global Vetting', description: 'Validating evidence' },
  { id: 'gap_analysis', label: 'Gap Analysis', description: 'Checking Irish context' },
  { id: 'report_generation', label: 'Report Generation', description: 'Creating briefs' },
];

const stepLabels = ['Describe your idea', 'Review interpretation', 'Select countries'];

export default function ResearchPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const getCurrentStepNumber = (): number => {
    switch (state.step) {
      case 'idea':
        return 1;
      case 'reflection':
        return 2;
      case 'scope':
        return 3;
      default:
        return 3;
    }
  };

  const handleInterpret = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/research/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText: state.ideaInput.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.interpretation) {
        dispatch({ type: 'SET_INTERPRETATION', payload: data.interpretation });
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.error || 'Failed to interpret idea' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to connect',
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleStartResearch = async () => {
    if (!state.interpretation) return;

    dispatch({ type: 'SET_STEP', payload: 'running' });
    dispatch({ type: 'SET_PHASE', payload: 'signal_hunter' });

    // Build countries array
    const countries = [
      ...(state.includeIreland ? ['Ireland'] : []),
      ...state.selectedCountries,
    ];

    try {
      const phaseInterval = setInterval(() => {
        dispatch({
          type: 'SET_PHASE',
          payload: (() => {
            const currentIndex = phases.findIndex((p) => p.id === state.currentPhase);
            if (currentIndex < phases.length - 1) {
              return phases[currentIndex + 1].id;
            }
            return state.currentPhase;
          })(),
        });
      }, 5000);

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countries,
          policyInterpretation: state.interpretation,
        }),
      });

      clearInterval(phaseInterval);

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'SET_STEP', payload: 'completed' });
        dispatch({
          type: 'SET_RESULT',
          payload: {
            message: data.message,
            policiesFound: data.policiesFound,
            success: data.success,
            runId: data.run?.id,
          },
        });
      } else {
        dispatch({ type: 'SET_STEP', payload: 'failed' });
        dispatch({
          type: 'SET_RESULT',
          payload: {
            message: data.error || 'Research failed',
            policiesFound: 0,
            success: false,
            error: data.error,
            runId: data.run?.id,
          },
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_STEP', payload: 'failed' });
      dispatch({
        type: 'SET_RESULT',
        payload: {
          message: 'Failed to connect to research service',
          policiesFound: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  };

  const getCountryLabel = (): string => {
    const countries = [
      ...(state.includeIreland ? ['Ireland'] : []),
      ...state.selectedCountries,
    ];
    return countries.join(', ');
  };

  const handleClone = (run: Run) => {
    if (run.interpretation) {
      dispatch({ type: 'SET_INTERPRETATION', payload: run.interpretation });
      dispatch({ type: 'SET_COUNTRIES', payload: [] });
      dispatch({ type: 'SET_IRELAND', payload: true });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Research Policy Ideas
        </h1>
        <p className="text-[var(--text-secondary)]">
          Find where your policy idea has been implemented and how successful it was
        </p>
      </header>

      {/* Wizard Steps */}
      {['idea', 'reflection', 'scope'].includes(state.step) && (
        <>
          <WizardProgress
            currentStep={getCurrentStepNumber()}
            totalSteps={3}
            stepLabels={stepLabels}
          />

          {state.step === 'idea' && (
            <StepIdeaInput
              value={state.ideaInput}
              onChange={(value) => dispatch({ type: 'SET_IDEA', payload: value })}
              onNext={handleInterpret}
              isLoading={state.isLoading}
              error={state.error}
            />
          )}

          {state.step === 'reflection' && state.interpretation && (
            <StepReflection
              interpretation={state.interpretation}
              onEdit={(interp) => dispatch({ type: 'UPDATE_INTERPRETATION', payload: interp })}
              onConfirm={() => dispatch({ type: 'SET_STEP', payload: 'scope' })}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 'idea' })}
            />
          )}

          {state.step === 'scope' && (
            <StepScopeSelection
              selectedCountries={state.selectedCountries}
              onSelectionChange={(countries) =>
                dispatch({ type: 'SET_COUNTRIES', payload: countries })
              }
              includeIreland={state.includeIreland}
              onIrelandChange={(include) =>
                dispatch({ type: 'SET_IRELAND', payload: include })
              }
              onSubmit={handleStartResearch}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 'reflection' })}
              isSubmitting={state.isLoading}
            />
          )}
        </>
      )}

      {/* Running State */}
      {state.step === 'running' && (
        <section className="py-8 space-y-8">
          <div className="text-center">
            <Loader2 size={32} className="text-[var(--text-muted)] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Research in Progress
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Searching for &quot;{state.interpretation?.policyName}&quot; in {getCountryLabel()}
            </p>
          </div>

          {/* Phase Progress */}
          <div className="space-y-2">
            {phases.map((phase, index) => {
              const currentIndex = phases.findIndex((p) => p.id === state.currentPhase);
              const isComplete = index < currentIndex;
              const isCurrent = phase.id === state.currentPhase;

              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-3 p-3 border-l-2 ${
                    isCurrent
                      ? 'border-l-[var(--accent)] bg-[var(--bg-surface)]'
                      : isComplete
                      ? 'border-l-[var(--success)]'
                      : 'border-l-[var(--border)]'
                  }`}
                >
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isComplete || isCurrent
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {phase.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[var(--text-secondary)]">{phase.description}</p>
                    )}
                  </div>
                  {isComplete && <span className="text-xs text-[var(--success)]">Complete</span>}
                  {isCurrent && <Loader2 size={14} className="text-[var(--accent)] animate-spin" />}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[var(--text-muted)] text-center">
            This may take a few minutes depending on the number of countries selected
          </p>
        </section>
      )}

      {/* Completed State */}
      {state.step === 'completed' && state.runResult && (
        <section className="py-8 space-y-6">
          {/* Activity Report - always shown */}
          <ActivityReportLoader
            runId={state.runResult.runId}
            policiesFound={state.runResult.policiesFound}
            onClone={() => {
              // Reset to scope step with current interpretation
              if (state.interpretation) {
                dispatch({ type: 'SET_COUNTRIES', payload: [] });
                dispatch({ type: 'SET_IRELAND', payload: true });
                dispatch({ type: 'SET_STEP', payload: 'scope' });
              }
            }}
          />

          {/* Navigation buttons */}
          <div className="border-t border-[var(--border)] pt-6">
            {state.runResult.policiesFound > 0 ? (
              <div className="flex gap-3 justify-center">
                <button onClick={() => router.push('/')} className="btn btn-primary">
                  View {state.runResult.policiesFound} Policies
                </button>
                <button onClick={() => dispatch({ type: 'RESET' })} className="btn btn-secondary">
                  New Research
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button onClick={() => dispatch({ type: 'RESET' })} className="btn btn-secondary">
                  New Research
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Failed State */}
      {state.step === 'failed' && state.runResult && (
        <section className="py-8 space-y-6">
          {/* Show activity report if runId is available */}
          {state.runResult.runId ? (
            <ActivityReportLoader
              runId={state.runResult.runId}
              policiesFound={0}
              onClone={() => {
                if (state.interpretation) {
                  dispatch({ type: 'SET_COUNTRIES', payload: [] });
                  dispatch({ type: 'SET_IRELAND', payload: true });
                  dispatch({ type: 'SET_STEP', payload: 'scope' });
                }
              }}
            />
          ) : (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Research Failed
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{state.runResult.message}</p>
              {state.runResult.error && (
                <p className="text-xs text-[var(--error)] mt-2">{state.runResult.error}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center border-t border-[var(--border)] pt-6">
            <button
              onClick={() => dispatch({ type: 'SET_STEP', payload: 'scope' })}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <button onClick={() => router.push('/')} className="btn btn-secondary">
              Go to Dashboard
            </button>
          </div>
        </section>
      )}

      {/* Run List - shown when in wizard steps */}
      {['idea', 'reflection', 'scope'].includes(state.step) && (
        <section className="border-t border-[var(--border)] pt-8">
          <RunList onClone={handleClone} />
        </section>
      )}
    </div>
  );
}
