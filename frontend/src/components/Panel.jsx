export default function Panel({ title, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:shadow-md ${className}`}>
      {title && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
        </div>
      )}
      {children}
    </section>
  );
}
