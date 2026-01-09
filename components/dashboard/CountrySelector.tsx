'use client';

import { Check } from 'lucide-react';
import { PEER_COUNTRIES } from '@/lib/types';

interface CountrySelectorProps {
  selectedCountries: string[];
  onSelectionChange: (countries: string[]) => void;
  disabled?: boolean;
}

const countryInfo: Record<string, { flag: string; region: string }> = {
  Singapore: { flag: 'SG', region: 'Asia-Pacific' },
  Denmark: { flag: 'DK', region: 'Nordic' },
  Israel: { flag: 'IL', region: 'Middle East' },
  Estonia: { flag: 'EE', region: 'Baltic' },
  Finland: { flag: 'FI', region: 'Nordic' },
  Netherlands: { flag: 'NL', region: 'Western Europe' },
  'New Zealand': { flag: 'NZ', region: 'Asia-Pacific' },
  'South Korea': { flag: 'KR', region: 'Asia-Pacific' },
};

export function CountrySelector({
  selectedCountries,
  onSelectionChange,
  disabled = false,
}: CountrySelectorProps) {
  const toggleCountry = (country: string) => {
    if (disabled) return;

    if (selectedCountries.includes(country)) {
      onSelectionChange(selectedCountries.filter((c) => c !== country));
    } else {
      onSelectionChange([...selectedCountries, country]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onSelectionChange([...PEER_COUNTRIES]);
  };

  const clearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--text-secondary)]">
          Select countries to research
        </label>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Select all
          </button>
          <span className="text-[var(--border)]">|</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PEER_COUNTRIES.map((country) => {
          const info = countryInfo[country];
          const isSelected = selectedCountries.includes(country);

          return (
            <button
              key={country}
              type="button"
              onClick={() => toggleCountry(country)}
              disabled={disabled}
              className={`
                flex items-center gap-2 p-3 border text-left transition-colors
                ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{info?.flag}</span>
                  <span className="text-sm text-[var(--text-primary)] truncate">{country}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{info?.region}</span>
              </div>
              {isSelected && (
                <Check size={14} className="text-[var(--accent)] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {selectedCountries.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {selectedCountries.length} {selectedCountries.length === 1 ? 'country' : 'countries'} selected
        </p>
      )}
    </div>
  );
}
