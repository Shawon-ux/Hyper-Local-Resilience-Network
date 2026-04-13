const styles = {
    Safe: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Unsafe: 'bg-rose-100 text-rose-700 border-rose-200',
    Verified: 'bg-blue-100 text-blue-700 border-blue-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Inactive: 'bg-slate-100 text-slate-700 border-slate-200'
  };
  
  export default function StatusBadge({ value }) {
    const style = styles[value] || 'bg-slate-100 text-slate-700 border-slate-200';
  
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
        {value}
      </span>
    );
  }