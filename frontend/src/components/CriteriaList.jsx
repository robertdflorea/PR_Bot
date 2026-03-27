export default function CriteriaList({ results }) {
  if (!results || results.length === 0) return null;
  return (
    <ul className="space-y-2 mt-3">
      {results.map((r) => (
        <li key={r.key} className="flex items-start gap-2 text-sm">
          <span className={`mt-0.5 text-lg leading-none ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
            {r.passed ? '✓' : '✗'}
          </span>
          <span>
            <span className="font-medium text-zinc-200">{r.label}</span>
            <span className="text-zinc-400"> — {r.message}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
