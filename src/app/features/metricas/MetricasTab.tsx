import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Building2, DollarSign, FileSpreadsheet, GraduationCap, TrendingUp, Users, Clock, Award } from "lucide-react";
import { CustomSelect, StatCard } from "../../components/controls";
import {
  CICLO_MESES,
  MESES,
  MESES_SHORT,
  MODALIDADES,
  PREPARATORIAS,
  TURNOS,
  exportReporteProductividadTituloXlsx,
  fmtCurrency,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getPeriodoAnioForCiclo,
} from "../../domain";
import type { Alumno, Catalogos } from "../../domain";

export function MetricasTab({ alumnos, catalogos }: { alumnos: Alumno[]; catalogos?: Catalogos }) {
  const currentCycleEndYear = getCicloEscolarAnioFin();
  const [selectedCicloAnioFin, setSelectedCicloAnioFin] = useState(currentCycleEndYear);
  const [selectedMes, setSelectedMes] = useState(0); // 0 = todo el ciclo
  const [exportingReport, setExportingReport] = useState(false);

  const selectedCycleLabel = getCicloEscolarLabel(selectedCicloAnioFin);

  const availableCycles = useMemo(() => {
    const ciclos = new Set(alumnos.map(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio)));
    ciclos.add(currentCycleEndYear);
    ciclos.add(selectedCicloAnioFin);
    return Array.from(ciclos).sort((a, b) => a - b);
  }, [alumnos, currentCycleEndYear, selectedCicloAnioFin]);

  const cicloAlumnos = useMemo(
    () => alumnos.filter(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) === selectedCicloAnioFin),
    [alumnos, selectedCicloAnioFin]
  );

  const displayedAlumnos = useMemo(
    () => (selectedMes > 0 ? cicloAlumnos.filter(a => a.mes === selectedMes) : cicloAlumnos),
    [cicloAlumnos, selectedMes]
  );

  const totalCertificados = displayedAlumnos.length;
  const ingresoTotal = displayedAlumnos.reduce((s, a) => s + (a.pago || 0), 0);

  const digitales = displayedAlumnos.filter(a => a.tipoCertificado === "Digital").length;
  const fisicos = displayedAlumnos.filter(a => a.tipoCertificado === "Físico").length;
  const pctDigital = totalCertificados > 0 ? ((digitales / totalCertificados) * 100).toFixed(0) : "0";

  // Monthly stats for chart
  const monthlyData = useMemo(() => {
    return CICLO_MESES.map(mes => {
      const mesData = cicloAlumnos.filter(a => a.mes === mes);
      return {
        mes,
        mesNombre: MESES_SHORT[mes - 1],
        mesLargo: MESES[mes - 1],
        total: mesData.length,
        ingreso: mesData.reduce((s, a) => s + (a.pago || 0), 0),
        digitales: mesData.filter(a => a.tipoCertificado === "Digital").length,
        fisicos: mesData.filter(a => a.tipoCertificado === "Físico").length,
      };
    });
  }, [cicloAlumnos]);

  // Ranking by Preparatoria
  const byPrepa = useMemo(() => {
    const grouped = new Map<string, { clave: string; nombre: string; total: number; ingreso: number }>();
    for (const a of displayedAlumnos) {
      const cur = grouped.get(a.preparatoriaClave) ?? {
        clave: a.preparatoriaClave,
        nombre: a.preparatoriaNombre,
        total: 0,
        ingreso: 0,
      };
      cur.total += 1;
      cur.ingreso += a.pago || 0;
      grouped.set(a.preparatoriaClave, cur);
    }
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total || b.ingreso - a.ingreso);
  }, [displayedAlumnos]);

  // Distribution by Modalidad
  const byModalidad = useMemo(() => {
    return MODALIDADES.map(m => {
      const filtered = displayedAlumnos.filter(a => a.modalidad === m);
      return {
        modalidad: m,
        total: filtered.length,
        ingreso: filtered.reduce((s, a) => s + (a.pago || 0), 0),
      };
    }).filter(m => m.total > 0);
  }, [displayedAlumnos]);

  // Distribution by Turno
  const byTurno = useMemo(() => {
    return TURNOS.map(t => {
      const filtered = displayedAlumnos.filter(a => a.turno === t);
      return {
        turno: t,
        total: filtered.length,
        ingreso: filtered.reduce((s, a) => s + (a.pago || 0), 0),
      };
    }).filter(t => t.total > 0);
  }, [displayedAlumnos]);

  const handleExportProductividad = async () => {
    setExportingReport(true);
    try {
      await exportReporteProductividadTituloXlsx(alumnos, catalogos || { preparatorias: PREPARATORIAS, tramites: [] }, selectedCicloAnioFin);
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Métricas de Certificados
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nivel Medio Superior — Sector Sur ({selectedCycleLabel})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCicloAnioFin}
            onChange={e => setSelectedCicloAnioFin(Number(e.target.value))}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 shadow-sm"
          >
            {availableCycles.map(c => (
              <option key={c} value={c}>
                Ciclo Escolar {getCicloEscolarLabel(c)}
              </option>
            ))}
          </select>

          <select
            value={selectedMes}
            onChange={e => setSelectedMes(Number(e.target.value))}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 shadow-sm"
          >
            <option value={0}>Todo el Ciclo</option>
            {CICLO_MESES.map(m => (
              <option key={m} value={m}>
                {MESES[m - 1]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportProductividad}
            disabled={exportingReport}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exportingReport ? "Generando..." : "Reporte Productividad Excel"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Certificados"
          value={totalCertificados}
          icon={GraduationCap}
          subtitle={selectedMes > 0 ? MESES[selectedMes - 1] : "Ciclo completo"}
          className="border-border shadow-sm"
        />
        <StatCard
          title="Recaudación Total"
          value={fmtCurrency(ingresoTotal)}
          icon={DollarSign}
          subtitle="Ingresos por trámites"
          className="border-border shadow-sm"
        />
        <StatCard
          title="Certificados Digitales"
          value={`${digitales} (${pctDigital}%)`}
          icon={Award}
          subtitle="Emisión electrónica"
          className="border-border shadow-sm"
        />
        <StatCard
          title="Certificados Físicos"
          value={fisicos}
          icon={TrendingUp}
          subtitle="Emisión impresa"
          className="border-border shadow-sm"
        />
      </div>

      {/* Monthly Chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-1">
          Trámites por Mes (Ciclo Escolar {selectedCycleLabel})
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Volumen mensual de certificados tramitados en ventanilla
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="mesNombre" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-foreground">{data.mesLargo}</p>
                        <p className="text-amber-500 font-semibold">Total: {data.total} certificados</p>
                        <p className="text-muted-foreground">Digitales: {data.digitales} | Físicos: {data.fisicos}</p>
                        <p className="text-emerald-500 font-mono font-bold">Ingreso: {fmtCurrency(data.ingreso)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthlyData.map(entry => (
                  <Cell
                    key={entry.mes}
                    fill={entry.mes === selectedMes ? "#f59e0b" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Preparatorias Ranking & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Preparatorias Ranking */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Emisión por Unidad Académica
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ranking de preparatorias del Sector Sur
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground font-semibold">
              {byPrepa.length} prepas activas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="pb-2">Clave</th>
                  <th className="pb-2">Preparatoria</th>
                  <th className="pb-2 text-center">Trámites</th>
                  <th className="pb-2 text-right">Recaudación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {byPrepa.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay registros para este periodo.
                    </td>
                  </tr>
                ) : (
                  byPrepa.map(p => (
                    <tr key={p.clave} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-amber-500">{p.clave}</td>
                      <td className="py-2.5 font-semibold text-foreground">{p.nombre}</td>
                      <td className="py-2.5 text-center font-mono font-bold">{p.total}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-500 font-bold">
                        {fmtCurrency(p.ingreso)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modalidad & Turno breakdowns */}
        <div className="space-y-5">
          {/* Modalidad Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Distribución por Modalidad
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Escolarizada, Semiescolarizada y Nocturno
            </p>
            <div className="space-y-3">
              {byModalidad.map(m => {
                const pct = totalCertificados > 0 ? ((m.total / totalCertificados) * 100).toFixed(0) : "0";
                return (
                  <div key={m.modalidad} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground">{m.modalidad}</span>
                      <span className="font-mono text-muted-foreground">{m.total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Turno Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Distribución por Turno
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Turnos de los alumnos egresados
            </p>
            <div className="space-y-3">
              {byTurno.map(t => {
                const pct = totalCertificados > 0 ? ((t.total / totalCertificados) * 100).toFixed(0) : "0";
                return (
                  <div key={t.turno} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground">{t.turno}</span>
                      <span className="font-mono text-muted-foreground">{t.total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
