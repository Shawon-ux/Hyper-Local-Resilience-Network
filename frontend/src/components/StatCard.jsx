export default function StatCard({ label, value, hint }) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">{label}</p>
        <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
        {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }