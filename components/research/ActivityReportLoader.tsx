'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ActivityReport } from './ActivityReport';
import type { Run, ActivitySummary, ActivityEvent } from '@/lib/types';

interface ActivityReportLoaderProps {
  runId: string | undefined;
  policiesFound?: number;
  onClone?: () => void;
}

export function ActivityReportLoader({ runId, policiesFound, onClone }: ActivityReportLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setLoading(false);
      return;
    }

    async function fetchActivity() {
      try {
        const res = await fetch(`/api/research/${runId}/activity?detailed=true`);
        if (!res.ok) {
          throw new Error(`Failed to fetch activity: ${res.statusText}`);
        }
        const data = await res.json();
        setRun(data.run);
        setSummary(data.summary);
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activity report');
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [runId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)] mt-2">Loading activity report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p className="text-[var(--error)]">{error}</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p>Activity report not available</p>
      </div>
    );
  }

  return (
    <ActivityReport
      run={run}
      summary={summary}
      activities={activities}
      policiesFound={policiesFound}
      onClone={onClone}
    />
  );
}
