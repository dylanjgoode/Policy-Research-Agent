'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Square, Copy, Check, X, Clock } from 'lucide-react';
import type { Run } from '@/lib/types';

interface RunListProps {
  onClone?: (run: Run) => void;
}

const statusColors: Record<string, string> = {
  running: 'text-[var(--accent)]',
  completed: 'text-[var(--success)]',
  failed: 'text-[var(--error)]',
  cancelled: 'text-[var(--text-muted)]',
  pending: 'text-[var(--text-muted)]',
};

const statusIcons: Record<string, React.ReactNode> = {
  running: <Loader2 size={14} className="animate-spin" />,
  completed: <Check size={14} />,
  failed: <X size={14} />,
  cancelled: <Square size={14} />,
  pending: <Clock size={14} />,
};

export function RunList({ onClone }: RunListProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch('/api/research');
      if (response.ok) {
        const data = await response.json();
        setRuns(data.recentRuns || []);
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handleStop = async (runId: string) => {
    setCancelling(runId);
    try {
      const response = await fetch(`/api/research/${runId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchRuns();
      }
    } catch (error) {
      console.error('Failed to cancel run:', error);
    } finally {
      setCancelling(null);
    }
  };

  const handleClone = (run: Run) => {
    if (onClone && run.interpretation) {
      onClone(run);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Loader2 size={20} className="animate-spin mx-auto text-[var(--text-muted)]" />
      </div>
    );
  }

  if (runs.length === 0) {
    return null;
  }

  const activeRuns = runs.filter((r) => r.status === 'running');
  const recentRuns = runs.filter((r) => r.status !== 'running').slice(0, 5);

  return (
    <div className="space-y-6">
      {activeRuns.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
            Active Runs
          </h3>
          <div className="space-y-2">
            {activeRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 border border-[var(--border)] bg-[var(--bg-surface)]"
              >
                <div className="flex items-center gap-3">
                  <span className={statusColors[run.status]}>
                    {statusIcons[run.status]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {run.searchQuery || 'Research'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {run.countries?.join(', ') || 'All countries'} &middot; {run.phase}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleStop(run.id)}
                  disabled={cancelling === run.id}
                  className="px-3 py-1.5 text-xs text-[var(--error)] border border-[var(--error)] hover:bg-[var(--error)] hover:text-white disabled:opacity-50"
                >
                  {cancelling === run.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    'Stop'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRuns.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
            Recent Runs
          </h3>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 border border-[var(--border)] bg-[var(--bg-secondary)]"
              >
                <div className="flex items-center gap-3">
                  <span className={statusColors[run.status]}>
                    {statusIcons[run.status]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {run.searchQuery || 'Research'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {run.countries?.join(', ') || 'All countries'}
                      {run.policiesFound > 0 && ` \u00b7 ${run.policiesFound} policies`}
                    </p>
                  </div>
                </div>
                {run.status === 'completed' && run.interpretation && (
                  <button
                    onClick={() => handleClone(run)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  >
                    <Copy size={12} />
                    Clone
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
