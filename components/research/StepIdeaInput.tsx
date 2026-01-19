'use client';

import { Loader2 } from 'lucide-react';

interface StepIdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  isLoading: boolean;
  error: string | null;
}

export function StepIdeaInput({
  value,
  onChange,
  onNext,
  isLoading,
  error,
}: StepIdeaInputProps) {
  const canContinue = value.trim().length >= 10 && !isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          What policy idea do you want to research?
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Describe the policy mechanism, program, or initiative you&apos;re curious about.
          It doesn&apos;t need to be perfect - just give us a rough idea.
        </p>
      </div>

      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., R&D tax credits for small businesses, startup visa programs, regulatory sandboxes for fintech..."
          disabled={isLoading}
          rows={6}
          className="w-full p-4 text-base bg-[var(--bg-primary)] border border-[var(--border)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 resize-none"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[var(--text-muted)]">
            {value.length} characters {value.length < 10 && '(minimum 10)'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full py-3 px-4 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Analyzing your idea...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );
}
