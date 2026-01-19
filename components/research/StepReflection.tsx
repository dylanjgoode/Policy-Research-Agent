'use client';

import { ChevronLeft, Pencil, Check, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { PolicyInterpretation, PolicyLevers } from '@/lib/types';

const CATEGORIES = [
  'R&D Incentives',
  'Talent Visa',
  'Startup Support',
  'Innovation Fund',
  'Tax Incentive',
  'Digital Policy',
  'Housing Policy',
  'Healthcare Policy',
  'Education Policy',
  'Regulatory Sandbox',
  'Other',
];

interface StepReflectionProps {
  interpretation: PolicyInterpretation;
  onEdit: (interpretation: PolicyInterpretation) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function StepReflection({
  interpretation,
  onEdit,
  onConfirm,
  onBack,
}: StepReflectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(interpretation.policyName);
  const [editedAliases, setEditedAliases] = useState<string[]>(interpretation.alsoKnownAs || []);
  const [editedCategory, setEditedCategory] = useState(interpretation.category);
  const [editedSummary, setEditedSummary] = useState(interpretation.summary);
  const [editedLevers, setEditedLevers] = useState<PolicyLevers>(
    interpretation.levers || {
      targetGroup: '',
      mechanism: '',
      sector: null,
      intendedOutcome: '',
    }
  );
  const [newAlias, setNewAlias] = useState('');

  const handleSaveEdit = () => {
    onEdit({
      ...interpretation,
      policyName: editedName,
      alsoKnownAs: editedAliases,
      category: editedCategory,
      summary: editedSummary,
      levers: editedLevers,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(interpretation.policyName);
    setEditedAliases(interpretation.alsoKnownAs || []);
    setEditedCategory(interpretation.category);
    setEditedSummary(interpretation.summary);
    setEditedLevers(
      interpretation.levers || {
        targetGroup: '',
        mechanism: '',
        sector: null,
        intendedOutcome: '',
      }
    );
    setIsEditing(false);
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !editedAliases.includes(newAlias.trim())) {
      setEditedAliases([...editedAliases, newAlias.trim()]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setEditedAliases(editedAliases.filter((a) => a !== alias));
  };

  const handleLeverChange = (key: keyof PolicyLevers, value: string) => {
    setEditedLevers({
      ...editedLevers,
      [key]: key === 'sector' && value === '' ? null : value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Here&apos;s what we understood
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Review the interpretation and policy levers. Edit if anything looks wrong.
        </p>
      </div>

      <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">AI Interpretation</span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {isEditing ? (
            <>
              {/* Policy Name */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Aliases */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Also Known As
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editedAliases.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      {alias}
                      <button
                        onClick={() => handleRemoveAlias(alias)}
                        className="text-[var(--text-muted)] hover:text-[var(--error)]"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlias())}
                    placeholder="Add synonym..."
                    className="flex-1 p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={handleAddAlias}
                    className="px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Category
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Levers */}
              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <label className="block text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                  Policy Levers
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">
                      Target Group
                    </label>
                    <input
                      type="text"
                      value={editedLevers.targetGroup}
                      onChange={(e) => handleLeverChange('targetGroup', e.target.value)}
                      placeholder="Who benefits?"
                      className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">
                      Mechanism
                    </label>
                    <input
                      type="text"
                      value={editedLevers.mechanism}
                      onChange={(e) => handleLeverChange('mechanism', e.target.value)}
                      placeholder="How it works"
                      className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">
                      Sector
                    </label>
                    <input
                      type="text"
                      value={editedLevers.sector || ''}
                      onChange={(e) => handleLeverChange('sector', e.target.value)}
                      placeholder="Any (leave empty)"
                      className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">
                      Intended Outcome
                    </label>
                    <input
                      type="text"
                      value={editedLevers.intendedOutcome}
                      onChange={(e) => handleLeverChange('intendedOutcome', e.target.value)}
                      placeholder="What change it creates"
                      className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Summary
                </label>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--accent)] text-white"
                >
                  <Check size={14} />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Policy Name */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Policy Name
                </label>
                <p className="text-base font-medium text-[var(--text-primary)]">
                  {interpretation.policyName}
                </p>
              </div>

              {/* Aliases */}
              {interpretation.alsoKnownAs && interpretation.alsoKnownAs.length > 0 && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">
                    Also Known As
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {interpretation.alsoKnownAs.map((alias) => (
                      <span
                        key={alias}
                        className="inline-block px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Category
                </label>
                <span className="inline-block px-2 py-1 text-xs bg-[var(--accent-muted)] text-[var(--accent)]">
                  {interpretation.category}
                </span>
              </div>

              {/* Levers */}
              {interpretation.levers && (
                <div className="border-t border-[var(--border)] pt-4 mt-4">
                  <label className="block text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                    Policy Levers
                  </label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Target Group</span>
                      <p className="text-[var(--text-primary)]">
                        {interpretation.levers.targetGroup || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Mechanism</span>
                      <p className="text-[var(--text-primary)]">
                        {interpretation.levers.mechanism || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Sector</span>
                      <p className="text-[var(--text-primary)]">
                        {interpretation.levers.sector || 'Any'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Intended Outcome</span>
                      <p className="text-[var(--text-primary)]">
                        {interpretation.levers.intendedOutcome || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Summary
                </label>
                <p className="text-sm text-[var(--text-secondary)]">
                  {interpretation.summary}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)]">
          <p className="text-xs text-[var(--text-muted)]">
            Your original input: &quot;{interpretation.originalInput}&quot;
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isEditing}
          className="flex-1 py-3 px-4 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
