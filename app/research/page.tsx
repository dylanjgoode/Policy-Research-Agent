'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CountrySelector } from '@/components/dashboard/CountrySelector';
import type { SearchMode } from '@/lib/types';

type RunStatus = 'idle' | 'running' | 'completed' | 'failed';

interface RunResult {
  message: string;
  policiesFound: number;
  success: boolean;
  error?: string;
}

export default function ResearchPage() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('broad');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  const phases = [
    { id: 'signal_hunter', label: 'Signal Hunter', description: 'Scanning for policies' },
    { id: 'global_vetting', label: 'Global Vetting', description: 'Validating evidence' },
    { id: 'gap_analysis', label: 'Gap Analysis', description: 'Checking Irish context' },
    { id: 'report_generation', label: 'Report Generation', description: 'Creating briefs' },
  ];

  const canStartResearch =
    selectedCountries.length > 0 &&
    (searchMode === 'broad' || searchQuery.trim().length > 0);

  const startResearch = async () => {
    if (!canStartResearch) return;

    setStatus('running');
    setResult(null);
    setCurrentPhase('signal_hunter');

    try {
      const phaseInterval = setInterval(() => {
        setCurrentPhase((prev) => {
          const currentIndex = phases.findIndex((p) => p.id === prev);
          if (currentIndex < phases.length - 1) {
            return phases[currentIndex + 1].id;
          }
          return prev;
        });
      }, 5000);

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countries: selectedCountries,
          searchMode,
          searchQuery: searchMode !== 'broad' ? searchQuery.trim() : undefined,
        }),
      });

      clearInterval(phaseInterval);

      const data = await response.json();

      if (response.ok) {
        setStatus('completed');
        setResult({
          message: data.message,
          policiesFound: data.policiesFound,
          success: data.success,
        });
      } else {
        setStatus('failed');
        setResult({
          message: data.error || 'Research failed',
          policiesFound: 0,
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      setStatus('failed');
      setResult({
        message: 'Failed to connect to research service',
        policiesFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const resetAndGoHome = () => {
    router.push('/');
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Research Peer Economies
        </h1>
        <p className="text-[var(--text-secondary)]">
          Select countries to scan for innovation policies that could benefit Ireland
        </p>
      </header>

      {/* Search Mode & Country Selection */}
      {status === 'idle' && (
        <section className="space-y-8">
          {/* Search Mode */}
          <div className="space-y-4">
            <label className="text-sm text-[var(--text-secondary)]">
              How do you want to search?
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-[var(--border)] cursor-pointer hover:border-[var(--border-hover)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-muted)]">
                <input
                  type="radio"
                  name="searchMode"
                  value="broad"
                  checked={searchMode === 'broad'}
                  onChange={() => setSearchMode('broad')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    Broad search
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Search all policy areas (R&D, startups, talent visas, etc.)
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-[var(--border)] cursor-pointer hover:border-[var(--border-hover)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-muted)]">
                <input
                  type="radio"
                  name="searchMode"
                  value="topic"
                  checked={searchMode === 'topic'}
                  onChange={() => setSearchMode('topic')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    Specific topic
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Search for policies in a specific area
                  </p>
                  {searchMode === 'topic' && (
                    <input
                      type="text"
                      placeholder="e.g., housing affordability, AI regulation"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-[var(--border)] cursor-pointer hover:border-[var(--border-hover)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-muted)]">
                <input
                  type="radio"
                  name="searchMode"
                  value="reverse"
                  checked={searchMode === 'reverse'}
                  onChange={() => setSearchMode('reverse')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    Reverse lookup
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Has this policy been used elsewhere?
                  </p>
                  {searchMode === 'reverse' && (
                    <input
                      type="text"
                      placeholder="e.g., R&D tax credit, tech visa program"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Country Selector */}
          <CountrySelector
            selectedCountries={selectedCountries}
            onSelectionChange={setSelectedCountries}
          />

          <div className="pt-6 border-t border-[var(--border)]">
            <button
              onClick={startResearch}
              disabled={!canStartResearch}
              className="btn btn-primary w-full"
            >
              Start Research ({selectedCountries.length} {selectedCountries.length === 1 ? 'country' : 'countries'})
            </button>
            {!canStartResearch && (
              <p className="text-xs text-[var(--text-muted)] text-center mt-3">
                {selectedCountries.length === 0
                  ? 'Select at least one country to begin'
                  : 'Enter a search query for this mode'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Running State */}
      {status === 'running' && (
        <section className="py-8 space-y-8">
          <div className="text-center">
            <Loader2 size={32} className="text-[var(--text-muted)] spinner mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Research in Progress
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Analyzing {selectedCountries.join(', ')}
            </p>
          </div>

          {/* Phase Progress */}
          <div className="space-y-2">
            {phases.map((phase, index) => {
              const currentIndex = phases.findIndex((p) => p.id === currentPhase);
              const isComplete = index < currentIndex;
              const isCurrent = phase.id === currentPhase;

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
                        isComplete || isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {phase.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {phase.description}
                      </p>
                    )}
                  </div>
                  {isComplete && (
                    <span className="text-xs text-[var(--success)]">Complete</span>
                  )}
                  {isCurrent && (
                    <Loader2 size={14} className="text-[var(--accent)] spinner" />
                  )}
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
      {status === 'completed' && result && (
        <section className="py-8 text-center space-y-6">
          <div>
            <p className="text-4xl font-semibold text-[var(--text-primary)] mb-2">
              {result.policiesFound}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              policies discovered from {selectedCountries.join(', ')}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={resetAndGoHome} className="btn btn-primary">
              View Dashboard
            </button>
            <button
              onClick={() => {
                setStatus('idle');
                setResult(null);
                setSelectedCountries([]);
                setSearchMode('broad');
                setSearchQuery('');
              }}
              className="btn btn-secondary"
            >
              New Research
            </button>
          </div>
        </section>
      )}

      {/* Failed State */}
      {status === 'failed' && result && (
        <section className="py-8 text-center space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Research Failed
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">{result.message}</p>
            {result.error && (
              <p className="text-xs text-[var(--error)] mt-2">{result.error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setStatus('idle');
                setResult(null);
              }}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <button onClick={resetAndGoHome} className="btn btn-secondary">
              Go to Dashboard
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
