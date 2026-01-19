'use client';

import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { PEER_COUNTRIES } from '@/lib/types';
import { CountrySelector } from '@/components/dashboard/CountrySelector';

interface StepScopeSelectionProps {
  selectedCountries: string[];
  onSelectionChange: (countries: string[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  includeIreland: boolean;
  onIrelandChange: (include: boolean) => void;
}

export function StepScopeSelection({
  selectedCountries,
  onSelectionChange,
  onSubmit,
  onBack,
  isSubmitting,
  includeIreland,
  onIrelandChange,
}: StepScopeSelectionProps) {
  const canSubmit = (selectedCountries.length > 0 || includeIreland) && !isSubmitting;
  const totalSelected = selectedCountries.length + (includeIreland ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Where should we search?
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Select which countries to search for implementations of this policy.
        </p>
      </div>

      {/* Ireland option - prominently displayed */}
      <div className="border border-[var(--border)] p-4">
        <button
          type="button"
          onClick={() => onIrelandChange(!includeIreland)}
          disabled={isSubmitting}
          className="w-full flex items-center gap-3 text-left"
        >
          <div
            className={`w-5 h-5 border flex items-center justify-center ${
              includeIreland
                ? 'bg-[var(--accent)] border-[var(--accent)]'
                : 'border-[var(--border)]'
            }`}
          >
            {includeIreland && <Check size={14} className="text-white" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">IE</span>
              <span className="font-medium text-[var(--text-primary)]">Ireland</span>
              <span className="text-xs px-2 py-0.5 bg-[var(--accent-muted)] text-[var(--accent)]">
                Recommended
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              Search Irish government sources for existing implementations
            </span>
          </div>
        </button>
      </div>

      <div className="border-t border-[var(--border)] pt-6">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Also search peer economies:
        </p>
        <CountrySelector
          selectedCountries={selectedCountries}
          onSelectionChange={onSelectionChange}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 py-3 px-4 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Starting research...
            </>
          ) : (
            <>
              Start Research
              {totalSelected > 0 && (
                <span className="text-sm opacity-75">
                  ({totalSelected} {totalSelected === 1 ? 'country' : 'countries'})
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
