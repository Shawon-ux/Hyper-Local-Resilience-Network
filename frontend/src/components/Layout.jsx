export default function Layout({ title, subtitle, right, children }) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Hyper Local Resilience Network
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-2 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
            </div>
            {right}
          </div>
        </header>
  
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }