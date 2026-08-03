export default function StatCard({ label, value, detail }) {
  return (
    <article className="group rounded-[24px] bg-white border border-neutral-100 p-8 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_18px_60px_-20px_rgba(15,23,42,0.1)]">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-success-600">{label}</p>
      <p className="mt-4 text-5xl font-extrabold text-neutral-900">{value}</p>
      <p className="mt-3 text-sm text-neutral-500">{detail}</p>
    </article>
  );
}
