export function StringRows({ positions }: { positions: string[] }) {
  const apply = () => {
    const first = positions[0];
    for (const position of positions.slice(1)) {
      for (const field of ['brand', 'model', 'gauge']) {
        const from = document.querySelector<HTMLInputElement>(
          `[name="${field}-${first}"]`,
        );
        const to = document.querySelector<HTMLInputElement>(
          `[name="${field}-${position}"]`,
        );
        if (from && to) to.value = from.value;
      }
    }
  };

  return (
    <>
      {positions.map((position) => (
        <fieldset className="string-row" key={position}>
          <legend>{position} string</legend>
          <label>
            Brand
            <input name={`brand-${position}`} required />
          </label>
          <label>
            Model
            <input name={`model-${position}`} required />
          </label>
          <label>
            Tension / gauge
            <input name={`gauge-${position}`} />
          </label>
        </fieldset>
      ))}
      {positions.length > 1 && (
        <button type="button" className="quiet" onClick={apply}>
          Apply first string’s details to all selected
        </button>
      )}
    </>
  );
}
