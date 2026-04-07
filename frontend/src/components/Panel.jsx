export default function Panel({ title, actions, children }) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {actions}
        </div>
        {children}
      </section>
    );
  }