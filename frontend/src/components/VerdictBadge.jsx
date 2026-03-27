export default function VerdictBadge({ verdict }) {
  const map = {
    good: { label: 'GOOD', cls: 'bg-green-600 text-white' },
    warning: { label: 'WARNING', cls: 'bg-yellow-500 text-black' },
    bad: { label: 'BAD', cls: 'bg-red-600 text-white' },
  };
  const { label, cls } = map[verdict] || { label: verdict?.toUpperCase(), cls: 'bg-zinc-600 text-white' };
  return (
    <span className={`px-3 py-1 rounded font-bold text-sm tracking-wide ${cls}`}>{label}</span>
  );
}
