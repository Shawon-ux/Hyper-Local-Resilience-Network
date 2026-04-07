export default function Toast({ message }) {
    if (!message) return null;
  
    return (
      <div className="fixed bottom-5 right-5 z-[2000]">
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl">
          {message}
        </div>
      </div>
    );
  }