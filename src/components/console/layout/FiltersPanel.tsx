import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Filters } from "@/domain/console";

export interface FilterOption {
  value: string;
  count: number;
}

interface FiltersPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** Values present in the current dataset, most common first. */
  affiliationOptions?: FilterOption[];
  classificationOptions?: FilterOption[];
}

export function FiltersPanel({
  filters,
  onChange,
  affiliationOptions = [],
  classificationOptions = [],
}: FiltersPanelProps) {
  // Keep any active selection visible even if it vanished from the dataset.
  const withSelected = (options: FilterOption[], selected: string[]): FilterOption[] => {
    const known = new Set(options.map((o) => o.value));
    return [...options, ...selected.filter((s) => !known.has(s)).map((value) => ({ value, count: 0 }))];
  };
  const affiliations = withSelected(affiliationOptions, filters.affiliations);
  const classifications = withSelected(classificationOptions, filters.classifications);

  const toggleAffiliation = (value: string) => {
    const next = filters.affiliations.includes(value)
      ? filters.affiliations.filter((v) => v !== value)
      : [...filters.affiliations, value];
    onChange({ ...filters, affiliations: next });
  };

  const toggleClassification = (value: string) => {
    const next = filters.classifications.includes(value)
      ? filters.classifications.filter((v) => v !== value)
      : [...filters.classifications, value];
    onChange({ ...filters, classifications: next });
  };

  return (
    <div className="w-56 flex flex-col gap-4 p-4 bg-console-panel border-r border-console-border overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-console-text">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-console-dim hover:text-console-text"
          onClick={() =>
            onChange({
              search: "",
              riskRange: [0, 100],
              affiliations: [],
              classifications: [],
            })
          }
        >
          <X className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-console-dim">Risk score</Label>
        <Slider
          value={filters.riskRange}
          min={0}
          max={100}
          step={1}
          onValueChange={(value) =>
            onChange({ ...filters, riskRange: value as [number, number] })
          }
          className="py-2"
        />
        <div className="flex justify-between text-[10px] font-mono text-console-muted">
          <span>{filters.riskRange[0]}</span>
          <span>{filters.riskRange[1]}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-console-dim">Affiliation</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {affiliations.length === 0 && (
            <p className="text-[10px] font-mono text-console-dim">No values in view</p>
          )}
          {affiliations.map((aff) => (
            <div key={aff.value} className="flex items-center gap-2">
              <Checkbox
                id={`aff-${aff.value}`}
                checked={filters.affiliations.includes(aff.value)}
                onCheckedChange={() => toggleAffiliation(aff.value)}
              />
              <Label
                htmlFor={`aff-${aff.value}`}
                className="flex-1 flex items-center justify-between gap-2 text-xs text-console-text cursor-pointer"
              >
                <span className="truncate">{aff.value}</span>
                <span className="text-[10px] font-mono text-console-dim">{aff.count}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-console-dim">Classification</Label>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {classifications.length === 0 && (
            <p className="text-[10px] font-mono text-console-dim">No values in view</p>
          )}
          {classifications.map((cls) => (
            <div key={cls.value} className="flex items-center gap-2">
              <Checkbox
                id={`cls-${cls.value}`}
                checked={filters.classifications.includes(cls.value)}
                onCheckedChange={() => toggleClassification(cls.value)}
              />
              <Label
                htmlFor={`cls-${cls.value}`}
                className="flex-1 flex items-center justify-between gap-2 text-xs text-console-text cursor-pointer"
              >
                <span className="truncate">{cls.value}</span>
                <span className="text-[10px] font-mono text-console-dim">{cls.count}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
