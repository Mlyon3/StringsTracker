import {
  matchingSuggestions,
  type StringDraft,
  type StringProductSuggestion,
} from '../features/strings/stringEntry';

interface StringRowsProps {
  positions: string[];
  drafts: Record<string, StringDraft>;
  suggestions: StringProductSuggestion[];
  onChange: (position: string, field: keyof StringDraft, value: string) => void;
  onCopyFirst: () => void;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function StringRows({
  positions,
  drafts,
  suggestions,
  onChange,
  onCopyFirst,
}: StringRowsProps) {
  const brands = unique(suggestions.map((suggestion) => suggestion.brand));

  return (
    <>
      <datalist id="string-brand-suggestions">
        {brands.map((brand) => (
          <option value={brand} key={brand} />
        ))}
      </datalist>
      {positions.map((position) => {
        const draft = drafts[position];
        const brandMatches = matchingSuggestions(suggestions, draft.brand);
        const modelMatches = matchingSuggestions(
          suggestions,
          draft.brand,
          draft.model,
        );
        const modelListId = `string-model-suggestions-${position}`;
        const gaugeListId = `string-gauge-suggestions-${position}`;
        return (
          <fieldset className="string-row" key={position}>
            <legend>{position} string</legend>
            <label>
              Brand
              <input
                name={`brand-${position}`}
                list="string-brand-suggestions"
                value={draft.brand}
                onChange={(event) =>
                  onChange(position, 'brand', event.target.value)
                }
                autoComplete="off"
                required
              />
            </label>
            <label>
              Model
              <input
                name={`model-${position}`}
                list={modelListId}
                value={draft.model}
                onChange={(event) =>
                  onChange(position, 'model', event.target.value)
                }
                autoComplete="off"
                required
              />
              <datalist id={modelListId}>
                {unique(brandMatches.map((suggestion) => suggestion.model)).map(
                  (model) => (
                    <option value={model} key={model} />
                  ),
                )}
              </datalist>
            </label>
            <label>
              Tension / gauge
              <input
                name={`gauge-${position}`}
                list={gaugeListId}
                value={draft.tensionOrGauge}
                onChange={(event) =>
                  onChange(position, 'tensionOrGauge', event.target.value)
                }
                autoComplete="off"
              />
              <datalist id={gaugeListId}>
                {unique(
                  modelMatches.map((suggestion) => suggestion.tensionOrGauge),
                ).map((gauge) => (
                  <option value={gauge} key={gauge} />
                ))}
              </datalist>
            </label>
          </fieldset>
        );
      })}
      {positions.length > 1 && (
        <button type="button" className="quiet" onClick={onCopyFirst}>
          Apply first string’s details to all selected
        </button>
      )}
    </>
  );
}
