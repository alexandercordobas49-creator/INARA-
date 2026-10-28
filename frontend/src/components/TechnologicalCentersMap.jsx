import React, { useEffect, useMemo, useState } from 'react';

const DEPARTMENTS = [
  'Boaco','Carazo','Chinandega','Chontales','Estelí','Granada','Jinotega','León',
  'Madriz','Managua','Masaya','Matagalpa','Nueva Segovia','RACCN','RACCS',
  'Río San Juan','Rivas'
];

export default function TechnologicalCentersMap() {
  const [centers, setCenters] = useState([]);
  const [department, setDepartment] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadCenters() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/technological-centers', { signal: controller.signal });
        if (!response.ok) throw new Error('No fue posible consultar el directorio.');
        const payload = await response.json();
        setCenters(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        if (err.name !== 'AbortError') setError('El directorio no está disponible por el momento.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadCenters();
    return () => controller.abort();
  }, []);

  const departmentOptions = useMemo(() => {
    const values = new Set([...DEPARTMENTS, ...centers.map((center) => center.department).filter(Boolean)]);
    return [...values].sort((a, b) => a.localeCompare(b, 'es'));
  }, [centers]);

  const municipalityOptions = useMemo(() => [...new Set(
    centers.filter((center) => !department || center.department === department)
      .map((center) => center.municipality).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'es')), [centers, department]);

  const filteredCenters = useMemo(() => centers.filter((center) => {
    const matchesDepartment = !department || center.department === department;
    const matchesMunicipality = !municipality || center.municipality === municipality;
    const query = search.trim().toLocaleLowerCase('es');
    const matchesSearch = !query || [center.name, center.department, center.municipality, center.address]
      .filter(Boolean).some((value) => value.toLocaleLowerCase('es').includes(query));
    return matchesDepartment && matchesMunicipality && matchesSearch;
  }), [centers, department, municipality, search]);

  const selectedCenter = filteredCenters.find((center) => center.id === selectedId) || filteredCenters[0] || null;
  const hasCoordinates = selectedCenter && Number.isFinite(Number(selectedCenter.latitude))
    && Number.isFinite(Number(selectedCenter.longitude))
    && selectedCenter.latitude !== null && selectedCenter.longitude !== null;

  return (
    <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="technological-centers-title">
      <div className="platform-map-card p-6 md:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Directorio nacional</p>
          <h2 id="technological-centers-title" className="text-3xl font-black text-slate-950">Centros tecnológicos de Nicaragua</h2>
          <p className="text-slate-600">Explora centros por departamento y municipio. Las ubicaciones y la oferta académica se mostrarán únicamente cuando estén verificadas.</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Departamento
            <select className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" value={department} onChange={(event) => { setDepartment(event.target.value); setMunicipality(''); setSelectedId(''); }}>
              <option value="">Todos los departamentos</option>
              {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Municipio
            <select className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" value={municipality} onChange={(event) => setMunicipality(event.target.value)} disabled={!municipalityOptions.length}>
              <option value="">Todos los municipios</option>
              {municipalityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Buscar centro
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, municipio o dirección…" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
        </label>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">{loading ? 'Consultando directorio…' : `${filteredCenters.length} centro(s) encontrado(s)`}</span>
          {(department || municipality || search) && <button type="button" onClick={() => { setDepartment(''); setMunicipality(''); setSearch(''); setSelectedId(''); }} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">Limpiar filtros</button>}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
        {!loading && !error && filteredCenters.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6">
            <p className="font-bold text-slate-900">El directorio está listo para recibir los datos oficiales.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Todavía no hay centros cargados en la base de datos. No mostramos marcadores ficticios ni estadísticas inventadas.</p>
          </div>
        )}

        <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-1">
          {filteredCenters.map((center) => (
            <button type="button" key={center.id} onClick={() => setSelectedId(center.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedCenter?.id === center.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
              <span className="flex items-start gap-3">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">🏫</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-950">{center.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{center.municipality}, {center.department}</span>
                  {center.address && <span className="mt-1 block text-sm text-slate-500">{center.address}</span>}
                </span>
                <span className="text-emerald-700" aria-hidden="true">›</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="space-y-6">
        <div className="platform-card overflow-hidden p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Ubicación seleccionada</p>
          {selectedCenter ? (
            <>
              <h3 className="mt-3 text-2xl font-black text-slate-950">{selectedCenter.name}</h3>
              <p className="mt-2 text-slate-600">{selectedCenter.municipality}, {selectedCenter.department}</p>
              {selectedCenter.address && <p className="mt-3 text-sm text-slate-600">{selectedCenter.address}</p>}
              {Array.isArray(selectedCenter.programs) && selectedCenter.programs.length > 0 && (
                <div className="mt-5">
                  <h4 className="font-bold text-slate-900">Oferta publicada</h4>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                    {selectedCenter.programs.map((program, index) => <li key={index}>{typeof program === 'string' ? program : program.name || program.title || 'Programa'}</li>)}
                  </ul>
                </div>
              )}
              {hasCoordinates ? (
                <>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <iframe title={`Mapa de ${selectedCenter.name}`} className="h-64 w-full border-0" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedCenter.longitude)-0.015}%2C${Number(selectedCenter.latitude)-0.01}%2C${Number(selectedCenter.longitude)+0.015}%2C${Number(selectedCenter.latitude)+0.01}&layer=mapnik&marker=${selectedCenter.latitude}%2C${selectedCenter.longitude}`} />
                  </div>
                  <a className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700" href={`https://www.openstreetmap.org/?mlat=${selectedCenter.latitude}&mlon=${selectedCenter.longitude}#map=16/${selectedCenter.latitude}/${selectedCenter.longitude}`} target="_blank" rel="noreferrer">Cómo llegar ↗</a>
                </>
              ) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">La ubicación en el mapa aparecerá cuando se verifiquen las coordenadas oficiales.</p>}
              {selectedCenter.website && <a className="mt-3 block break-all text-sm font-semibold text-emerald-700 underline" href={selectedCenter.website} target="_blank" rel="noreferrer">Sitio oficial del centro ↗</a>}
              {selectedCenter.data_source_url && <p className="mt-4 text-xs text-slate-500">Fuente: <a className="underline" href={selectedCenter.data_source_url} target="_blank" rel="noreferrer">consultar registro</a>{selectedCenter.verified_at ? ` · Verificado: ${selectedCenter.verified_at}` : ' · Fecha de verificación pendiente'}</p>}
            </>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <div className="text-3xl">📍</div>
              <p className="mt-3 font-bold text-slate-900">Ficha del centro</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Al cargar los registros verificados, aquí aparecerán la ubicación, los datos de contacto y la oferta formativa disponible.</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-900">Datos responsables</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900/80">INARA no atribuye carreras, teléfonos ni coordenadas sin una fuente comprobable. El catálogo puede ampliarse por lotes y conservar la fecha de verificación.</p>
        </div>
      </aside>
    </section>
  );
}
