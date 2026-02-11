{
  /* GRÁFICO PRINCIPAL */
}
<Card className="shadow-lg border-slate-200 bg-white">
  <CardHeader className="pb-6 border-b border-slate-100">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <CardTitle className="text-lg text-slate-800">Projeção vs Meta</CardTitle>

      {/* LEGENDA (Mesmas cores do Sumário) */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
        <div className={cn("flex items-center gap-1.5", COLORS.baseline.text)}>
          <div className={cn("w-3 h-3 rounded", COLORS.baseline.bg)} />
          Base
        </div>
        <div className={cn("flex items-center gap-1.5", COLORS.pipeline.text)}>
          <div className={cn("w-3 h-3 rounded", COLORS.pipeline.bg)} />
          Pipeline
        </div>
        <div className={cn("flex items-center gap-1.5", COLORS.effort.text)}>
          <div className={cn("w-3 h-3 rounded", COLORS.effort.bg)} />
          Esforço
        </div>
        <div className={cn("flex items-center gap-1.5", COLORS.meta.text)}>
          <div className={cn("w-4 h-0.5", COLORS.meta.bg)} />
          Meta
        </div>
        <div className={cn("flex items-center gap-1.5", COLORS.realized.text)}>
          <div className={cn("w-4 h-1 rounded-full", COLORS.realized.bg)} />
          Realizado
        </div>
      </div>
    </div>
  </CardHeader>
  <CardContent className="pt-8 pl-0">
    {isLoading ? (
      <Skeleton className="h-[400px] w-full" />
    ) : (
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fmChart} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.baseline.hex} stopOpacity={1} />
                <stop offset="100%" stopColor={COLORS.baseline.hex} stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.pipeline.hex} stopOpacity={1} />
                <stop offset="100%" stopColor={COLORS.pipeline.hex} stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradEffort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.effort.hex} stopOpacity={1} />
                <stop offset="100%" stopColor={COLORS.effort.hex} stopOpacity={0.6} />
              </linearGradient>
              <filter id="shadowRealized" height="130%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={COLORS.realized.hex} floodOpacity="0.3" />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />

            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: COLORS.text }} axisLine={false} tickLine={false} dy={15} />

            {/* EIXO Y CORRIGIDO: Inicia em 0, largura fixa e ticks ajustados */}
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: COLORS.text }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={6}
              domain={[0, "auto"]}
            />

            <Tooltip content={forecastTooltip} cursor={{ fill: "rgba(241, 245, 249, 0.4)" }} />

            <Bar dataKey="baseline" fill="url(#gradBaseline)" stackId="forecast" barSize={48} />
            <Bar dataKey="pipelineAlloc" fill="url(#gradPipeline)" stackId="forecast" barSize={48} />
            {valorAdicional > 0 && (
              <Bar
                dataKey="incrementalAlloc"
                fill="url(#gradEffort)"
                stackId="forecast"
                radius={[6, 6, 0, 0]}
                barSize={48}
              />
            )}
            {valorAdicional === 0 && (
              <Bar
                dataKey="pipelineAlloc"
                fill="url(#gradPipeline)"
                stackId="forecast"
                barSize={48}
                radius={[6, 6, 0, 0]}
              />
            )}

            <Line
              dataKey="meta"
              type="step"
              stroke={COLORS.meta.hex}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />

            <Line
              dataKey="faturadoPlot"
              type="monotone"
              stroke={COLORS.realized.hex}
              strokeWidth={4}
              filter="url(#shadowRealized)"
              dot={{
                r: 6,
                fill: "#fff",
                stroke: COLORS.realized.hex,
                strokeWidth: 3,
              }}
              activeDot={{ r: 8, strokeWidth: 0, fill: COLORS.realized.hex }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )}
  </CardContent>
</Card>;
