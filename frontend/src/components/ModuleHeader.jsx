export default function ModuleHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-8 w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-md">
      {eyebrow && (
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{description}</p>
    </div>
  );
}
