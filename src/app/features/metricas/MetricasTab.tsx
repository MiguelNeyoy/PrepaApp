import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Building2, DollarSign, FileSpreadsheet, GraduationCap, TrendingUp, Users } from "lucide-react";
import { CustomSelect, StatCard } from "../../components/controls";
import {
  CICLO_MESES,
  MESES,
  MESES_SHORT,
  NIVEL_COLOR,
  NIVELES,
  exportReporteProductividadTituloXlsx,
  fmtCurrency,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getPeriodoAnioForCiclo,
} from "../../domain";
import type { Alumno, Catalogos, NivelEstudio } from "../../domain";

export function MetricasTab({ alumnos, catalogos }: { alumnos: Alumno[]; catalogos?: Catalogos }) {
  const currentCycleEndYear = getCicloEscolarAnioFin();
  const [selectedCicloAnioFin, setSelectedCicloAnioFin] = useState(currentCycleEndYear);
  const [selectedMes, setSelectedMes] = useState(0);
  const [exportingReport, setExportingReport] = useState(false);

  const niveles = useMemo(
    () => catalogos?.niveles.filter(nivel => nivel.activo).map(nivel => nivel.nombre) ?? NIVELES,
    [catalogos]
  );

  const nivelColors = useMemo(() => {
    const dynamic = Object.fromEntries((catalogos?.niveles ?? []).map(nivel => [nivel.nombre, nivel.colorHex]));
    return { ...NIVEL_COLOR, ...dynamic } as Record<NivelEstudio, string>;
  }, [catalogos]);

  const selectedCycleLabel = getCicloEscolarLabel(selectedCicloAnioFin);

  const availableCycles = useMemo(() => {
    const ciclos = new Set(alumnos.map(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio)));
    ciclos.add(currentCycleEndYear);
    ciclos.add(selectedCicloAnioFin);
    return Array.from(ciclos).sort((a, b) => a - b);
  }, [alumnos, currentCycleEndYear, selectedCicloAnioFin]);

  const cicloAlumnos = useMemo(() =>
    alumnos.filter(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) === selectedCicloAnioFin),
    [alumnos, selectedCicloAnioFin]
  );

  const monthlyData = useMemo(() => {
    return CICLO_MESES.map(mes => {
      const mesData = cicloAlumnos.filter(a => a.mes === mes);
      const byNivel = Object.fromEntries(
        niveles.map(nivel => {
          const nd = mesData.filter(a => a.nivel === nivel);
          return [nivel, { total: nd.length, ingreso: nd.reduce((s, a) => s + a.pago, 0) }];
        })
      ) as Record<NivelEstudio, { total: number; ingreso: number }>;
      return {
        mes,
        mesNombre: MESES_SHORT[mes - 1],
        mesLargo: MESES[mes - 1],
        total: mesData.length,
        ingreso: mesData.reduce((s, a) => s + a.pago, 0),
        byNivel,
      };
    });
  }, [cicloAlumnos, niveles]);

  const activeMonths = monthlyData.filter(m => m.total > 0);
  const activeMonthNums = new Set(activeMonths.map(m => m.mes));

  const selectedMonthData = monthlyData.find(m => m.mes === selectedMes) ?? monthlyData[0];
  const selectedMonthYear = selectedMes > 0 ? getPeriodoAnioForCiclo(selectedMes, selectedCicloAnioFin) : selectedCicloAnioFin;

  const anualByNivel = useMemo(() => {
    return niveles.map(nivel => {
      const nd = cicloAlumnos.filter(a => a.nivel === nivel);
      return {
        nivel,
        total: nd.length,
        ingreso: nd.reduce((s, a) => s + a.pago, 0),
      };
    }).filter(n => n.total > 0);
  }, [cicloAlumnos, niveles]);

  const totalAnual = cicloAlumnos.length;
  const ingresoAnual = cicloAlumnos.reduce((s, a) => s + a.pago, 0);

  const getFacultadNombre = (codigo: string) => {
    const facultad = catalogos?.facultades.find(item => item.codigo === codigo);
    return facultad ? `${facultad.codigo} - ${facultad.nombre}` : codigo;
  };

  const anualByFacultad = useMemo(() => {
    const grouped = new Map<string, { codigo: string; nombre: string; total: number; ingreso: number }>();

    for (const alumno of cicloAlumnos) {
      const current = grouped.get(alumno.escuela) ?? {
        codigo: alumno.escuela,
        nombre: getFacultadNombre(alumno.escuela),
        total: 0,
        ingreso: 0,
      };
      current.total += 1;
      current.ingreso += alumno.pago;
      grouped.set(alumno.escuela, current);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      b.ingreso - a.ingreso || b.total - a.total || a.nombre.localeCompare(b.nombre, "es")
    );
  }, [cicloAlumnos, catalogos]);

  const anualByCarrera = useMemo(() => {
    const grouped = new Map<string, { carrera: string; facultadCodigo: string; total: number; ingreso: number }>();

    for (const alumno of cicloAlumnos) {
      const key = `${alumno.escuela}::${alumno.carrera}`;
      const current = grouped.get(key) ?? {
        carrera: alumno.carrera,
        facultadCodigo: alumno.escuela,
        total: 0,
        ingreso: 0,
      };
      current.total += 1;
      current.ingreso += alumno.pago;
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      b.ingreso - a.ingreso || b.total - a.total || a.carrera.localeCompare(b.carrera, "es")
    );
  }, [cicloAlumnos]);

  const renderRanking = (
    title: string,
    subtitle: string,
    Icon: React.ElementType,
    nameHeader: string,
    rows: { label: string; detail?: string; total: number; ingreso: number }[]
  ) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No hay registros para el ciclo {selectedCycleLabel}.
        </div>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-secondary text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-bold">{nameHeader}</th>
                <th className="px-3 py-2 text-center font-bold">Cant.</th>
                <th className="px-3 py-2 text-right font-bold">Ingreso</th>
                <th className="px-3 py-2 text-right font-bold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map(row => {
                const pct = ingresoAnual > 0 ? Math.round((row.ingreso / ingresoAnual) * 100) : 0;
                return (
                  <tr key={`${row.label}-${row.detail ?? ""}`} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2.5 min-w-0">
                      <p className="font-semibold text-foreground truncate">{row.label}</p>
                      {row.detail && <p className="text-[10px] text-muted-foreground truncate">{row.detail}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-foreground">{row.total}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground whitespace-nowrap">{fmtCurrency(row.ingreso)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-muted-foreground w-7 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const exportSelectedReport = async () => {
    if (!catalogos || exportingReport) return;
    setExportingReport(true);
    try {
      await exportReporteProductividadTituloXlsx(alumnos, catalogos, selectedCicloAnioFin);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Métricas Financieras</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos por nivel académico, facultad, carrera y periodo</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Ciclo
          </span>
          <CustomSelect
            size="sm"
            className="w-28"
            value={String(selectedCicloAnioFin)}
            onChange={v => setSelectedCicloAnioFin(Number(v))}
            options={availableCycles.map(ciclo => ({
              value: String(ciclo),
              label: getCicloEscolarLabel(ciclo),
            }))}
          />
          <button
            onClick={exportSelectedReport}
            disabled={!catalogos || exportingReport}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exportingReport ? "Generando..." : "Reporte Ciclo"}
          </button>
        </div>
      </div>

      {/* Annual summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={`Total Solicitudes Ciclo ${selectedCycleLabel}`}
          value={String(totalAnual)}
          icon={Users}
          color="blue"
        />
        <StatCard
          label={`Ingreso Ciclo ${selectedCycleLabel}`}
          value={fmtCurrency(ingresoAnual)}
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          label="Promedio Mensual"
          value={fmtCurrency(Math.round(ingresoAnual / Math.max(activeMonths.length, 1)))}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Two-column charts row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Bar chart: income by month */}
        <div className="col-span-3 bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-foreground mb-0.5">Ingresos por Mes — Ciclo {selectedCycleLabel}</p>
          <p className="text-[10px] text-muted-foreground mb-4">Total recaudado cada periodo</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activeMonths} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="mesNombre"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                width={38}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#1a2742", fontWeight: 600 }}
                formatter={(v: number) => [fmtCurrency(v), "Ingreso"]}
              />
              <Bar dataKey="ingreso" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar: by nivel */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-foreground mb-0.5">Solicitudes por Nivel</p>
          <p className="text-[10px] text-muted-foreground mb-4">Acumulado del ciclo {selectedCycleLabel}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={anualByNivel} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="nivel"
                type="category"
                tick={{ fill: "#6b82a8", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={110}
                tickFormatter={v => v.length > 14 ? v.slice(0, 13) + "…" : v}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [v, "Solicitudes"]}
              />
              <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                {anualByNivel.map((entry, i) => (
                  <Cell
                    key={`cell-nivel-${i}`}
                    fill={nivelColors[entry.nivel as NivelEstudio] ?? "#6b7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {renderRanking(
          "Ingreso por Facultad",
          `Acumulado del ciclo ${selectedCycleLabel}`,
          Building2,
          "Facultad",
          anualByFacultad.map(item => ({
            label: item.nombre,
            total: item.total,
            ingreso: item.ingreso,
          }))
        )}
        {renderRanking(
          "Ingreso por Carrera",
          `Acumulado del ciclo ${selectedCycleLabel}`,
          GraduationCap,
          "Carrera",
          anualByCarrera.map(item => ({
            label: item.carrera,
            detail: getFacultadNombre(item.facultadCodigo),
            total: item.total,
            ingreso: item.ingreso,
          }))
        )}
      </div>

      {/* Monthly breakdown table — tabbed by month */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Desglose por Nivel
            </span>
          </div>
        </div>

        {/* Month tabs */}
        <div className="px-4 pt-3 pb-0">
          <div className="flex gap-1 bg-secondary/20 border border-border rounded-xl p-1">
            {CICLO_MESES.map(mes => {
              const hasData = activeMonthNums.has(mes);
              const isActive = mes === selectedMes;
              return (
                <button
                  key={mes}
                  onClick={() => setSelectedMes(mes)}
                  className={`relative flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-400 text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {MESES_SHORT[mes - 1]}
                  {hasData && !isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setSelectedMes(0)}
              className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-l border-border/30 ml-1 ${
                selectedMes === 0
                  ? "bg-accent text-accent-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-4">
          {(() => {
            const isAnual = selectedMes === 0;
            const rows = niveles.map(nivel => {
              const nd = isAnual
                ? anualByNivel.find(n => n.nivel === nivel) ?? { total: 0, ingreso: 0 }
                : selectedMonthData.byNivel[nivel];
              return { nivel, ...nd };
            }).filter(r => r.total > 0);
            const totalCount = isAnual ? totalAnual : selectedMonthData.total;
            const totalIncome = isAnual ? ingresoAnual : selectedMonthData.ingreso;
            const label = isAnual ? `ciclo ${selectedCycleLabel}` : `${MESES[selectedMes - 1]} ${selectedMonthYear}`;

            if (totalCount === 0) return (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No hay registros para {label}.
              </div>
            );

            return (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Nivel</th>
                    <th className="text-center px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Cantidad</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ingreso</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ nivel, total, ingreso }) => {
                    const pct = totalIncome > 0 ? Math.round((ingreso / totalIncome) * 100) : 0;
                    return (
                      <tr key={nivel} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: nivelColors[nivel as NivelEstudio] ?? "#6b7280" }}
                            />
                            <span className="font-medium text-foreground">{nivel}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-foreground">{total}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground">{fmtCurrency(ingreso)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: nivelColors[nivel as NivelEstudio] ?? "#6b7280" }}
                              />
                            </div>
                            <span className="font-mono text-muted-foreground w-7 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-amber-400/15 bg-amber-400/5">
                    <td className="px-3 py-3 font-bold text-foreground tracking-wide">TOTAL</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-foreground">{totalCount}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-400">{fmtCurrency(totalIncome)}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-400">100%</td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
