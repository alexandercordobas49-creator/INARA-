export default function Panel({ title, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-8 ${className}`}>
      {title && (
        <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 sm:mb-6 sm:px-5 sm:py-4">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
        </div>
      )}
      {children}
    </section>
  );
}
