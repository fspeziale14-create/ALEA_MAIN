// ================================================================
// ALEA — Storico Analisi
// Visualizza snapshot salvati, confronto tra due periodi.
// ================================================================

import { useState, useEffect } from 'react';
import {
  Trash2, GitCompare, ChevronDown, ChevronUp, X,
  TrendingUp, TrendingDown, Minus, Star, Target,
  ArrowUp, ArrowDown, BarChart2, Calendar, AlertCircle, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// ── TIPI ─────────────────────────────────────────────────────────

interface DishSnapshot {
  name: string;
  category: string;
  score: number | null;
  marginPct: number;
  foodCostPct: number;
  frequency: number;
  priceNet: number;
  ingredientCost: number;
  hasMissingCosts: boolean;
  quadrant: 'stella' | 'promuovi' | 'rivedi' | 'valuta';
}

interface AnalysisSnapshot {
  id: string;
  label: string;
  period_start: string;
  period_end: string;
  created_at: string;
  data: {
    dishes: DishSnapshot[];
    kpi: { avgFoodCost: number; avgMargin: number; topDish: string; missingCount: number };
  };
}

interface StoricoViewProps {
  isDinner: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
  accentColor: string;
  supabase: any;
  isLoggedIn: boolean;
}

// ── HELPERS ───────────────────────────────────────────────────────

const quadrantLabel: Record<string, string> = {
  stella: '⭐ Stella',
  promuovi: '📣 Da promuovere',
  rivedi: '🔍 Da rivedere',
  valuta: '💤 Da valutare',
};

const quadrantColor = (q: string, isDinner: boolean) => {
  if (q === 'stella')   return isDinner ? 'text-amber-400' : 'text-amber-600';
  if (q === 'promuovi') return isDinner ? 'text-emerald-400' : 'text-emerald-600';
  if (q === 'rivedi')   return isDinner ? 'text-rose-400' : 'text-rose-600';
  return isDinner ? 'text-slate-400' : 'text-slate-500';
};

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

// ── COMPONENTE PRINCIPALE ─────────────────────────────────────────

export function StoricoView({
  isDinner, textColor, mutedText, cardBg, accentColor, supabase, isLoggedIn
}: StoricoViewProps) {

  const divider  = isDinner ? 'border-[#334155]' : 'border-[#EAE5DA]';
  const rowHover = isDinner ? 'hover:bg-[#334155]/40' : 'hover:bg-[#F4F1EA]/60';

  const [snapshots, setSnapshots] = useState<AnalysisSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Confronto
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  // Carica snapshots
  useEffect(() => {
    if (!isLoggedIn) return;
    const load = async () => {
      setLoading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase
        .from('analysis_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false });
      if (data) setSnapshots(data as AnalysisSnapshot[]);
      setLoading(false);
    };
    load();
  }, [isLoggedIn]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setDeletingId(null); return; }
    await supabase.from('analysis_snapshots').delete().eq('id', id).eq('user_id', userId);
    setSnapshots(prev => prev.filter(s => s.id !== id));
    setConfirmDeleteId(null);
    setDeletingId(null);
    if (compareA === id) setCompareA(null);
    if (compareB === id) setCompareB(null);
  };

  // ── CONFRONTO ────────────────────────────────────────────────
  const snapshotA = snapshots.find(s => s.id === compareA);
  const snapshotB = snapshots.find(s => s.id === compareB);

  const buildComparison = () => {
    if (!snapshotA || !snapshotB) return null;
    const dishesA = snapshotA.data.dishes;
    const dishesB = snapshotB.data.dishes;
    const allNames = Array.from(new Set([...dishesA.map(d => d.name), ...dishesB.map(d => d.name)]));

    return allNames.map(name => {
      const a = dishesA.find(d => d.name === name);
      const b = dishesB.find(d => d.name === name);
      if (!a || !b) return null; // piatto non presente in entrambi
      const marginDiff = b.marginPct - a.marginPct;
      const freqDiff = b.frequency - a.frequency;
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      const quadrantChanged = a.quadrant !== b.quadrant;
      // Mostra solo se c'è qualcosa di interessante
      if (Math.abs(marginDiff) < 0.5 && Math.abs(freqDiff) < 2 && !quadrantChanged) return null;
      return { name, category: a.category, a, b, marginDiff, freqDiff, scoreDiff, quadrantChanged };
    }).filter(Boolean) as Array<{
      name: string; category: string;
      a: DishSnapshot; b: DishSnapshot;
      marginDiff: number; freqDiff: number; scoreDiff: number; quadrantChanged: boolean;
    }>;
  };

  const comparison = compareMode ? buildComparison() : null;

  // ── RENDER ────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className={`flex items-center justify-center py-20 ${mutedText}`}>Caricamento…</div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${textColor}`}>Storico Analisi</h1>
          <p className={`${mutedText} mt-1`}>
            {snapshots.length === 0
              ? 'Nessun periodo salvato. Carica le frequenze nella tab Redditività e salva la prima analisi.'
              : `${snapshots.length} period${snapshots.length === 1 ? 'o' : 'i'} salvat${snapshots.length === 1 ? 'o' : 'i'}.`}
          </p>
        </div>
        {snapshots.length >= 2 && (
          <button
            onClick={() => { setCompareMode(v => !v); setCompareA(null); setCompareB(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
              compareMode
                ? 'bg-[#967D62] text-white border-[#967D62]'
                : (isDinner ? 'border-[#334155] text-[#94A3B8] hover:border-[#967D62]/60' : 'border-[#EAE5DA] text-[#8C8A85] hover:border-[#967D62]/60')
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {compareMode ? 'Esci dal confronto' : 'Confronta periodi'}
          </button>
        )}
      </div>

      {/* ── SELEZIONE CONFRONTO ── */}
      {compareMode && (
        <Card className={cardBg}>
          <CardContent className="pt-5">
            <p className={`text-sm font-semibold ${textColor} mb-3`}>
              Seleziona due periodi da confrontare — il primo è il riferimento (A), il secondo è quello più recente (B).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['A', 'B'] as const).map(side => {
                const selectedId = side === 'A' ? compareA : compareB;
                const otherId = side === 'A' ? compareB : compareA;
                return (
                  <div key={side}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${accentColor}`}>Periodo {side}</p>
                    <select
                      value={selectedId ?? ''}
                      onChange={e => side === 'A' ? setCompareA(e.target.value || null) : setCompareB(e.target.value || null)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDinner ? 'bg-[#0F172A] border-[#334155] text-[#F4F1EA]' : 'bg-white border-[#EAE5DA] text-[#2C2A28]'}`}
                    >
                      <option value="">— Seleziona —</option>
                      {snapshots.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === otherId}>
                          {s.label} ({formatDate(s.period_start)} → {formatDate(s.period_end)})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RISULTATI CONFRONTO ── */}
      {compareMode && compareA && compareB && comparison && (
        <div className="space-y-4">
          {/* KPI confronto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Food Cost A', val: `${snapshotA!.data.kpi.avgFoodCost.toFixed(1)}%`, diff: snapshotB!.data.kpi.avgFoodCost - snapshotA!.data.kpi.avgFoodCost, lowerIsBetter: true },
              { label: 'Food Cost B', val: `${snapshotB!.data.kpi.avgFoodCost.toFixed(1)}%`, diff: snapshotB!.data.kpi.avgFoodCost - snapshotA!.data.kpi.avgFoodCost, lowerIsBetter: true },
              { label: 'Margine A', val: `${snapshotA!.data.kpi.avgMargin.toFixed(1)}%`, diff: snapshotB!.data.kpi.avgMargin - snapshotA!.data.kpi.avgMargin, lowerIsBetter: false },
              { label: 'Margine B', val: `${snapshotB!.data.kpi.avgMargin.toFixed(1)}%`, diff: snapshotB!.data.kpi.avgMargin - snapshotA!.data.kpi.avgMargin, lowerIsBetter: false },
            ].map((kpi, i) => {
              const improved = kpi.lowerIsBetter ? kpi.diff < 0 : kpi.diff > 0;
              const DiffIcon = kpi.diff === 0 ? Minus : kpi.diff > 0 ? ArrowUp : ArrowDown;
              const diffColor = kpi.diff === 0 ? mutedText : improved ? (isDinner ? 'text-emerald-400' : 'text-emerald-600') : (isDinner ? 'text-rose-400' : 'text-rose-600');
              return (
                <div key={i} className={`p-4 rounded-xl border ${cardBg}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText} mb-1`}>{kpi.label}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{kpi.val}</p>
                  {i >= 2 && (
                    <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${diffColor}`}>
                      <DiffIcon className="w-3 h-3" />
                      {Math.abs(kpi.diff).toFixed(1)}pp
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabella differenze piatti */}
          <Card className={cardBg}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base ${textColor}`}>
                Variazioni significative — {comparison.length} piatt{comparison.length === 1 ? 'o' : 'i'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparison.length === 0 ? (
                <p className={`text-sm ${mutedText} py-4 text-center`}>Nessuna variazione significativa tra i due periodi.</p>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-2 border-b ${divider} text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                    <span>Piatto</span>
                    <span className="text-right w-20">Margine</span>
                    <span className="text-right w-16">Ordini</span>
                    <span className="text-right w-16">Score</span>
                    <span className="text-right w-28">Quadrante</span>
                  </div>
                  {comparison.map(c => {
                    const marginUp = c.marginDiff > 0;
                    const freqUp = c.freqDiff > 0;
                    const scoreUp = c.scoreDiff > 0;
                    return (
                      <div key={c.name} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 py-2.5 px-1 rounded-lg items-center ${rowHover} transition-colors`}>
                        <div>
                          <p className={`text-sm font-semibold ${textColor}`}>{c.name}</p>
                          <p className={`text-xs ${mutedText}`}>{c.category}</p>
                        </div>
                        {/* Margine */}
                        <div className="text-right w-20">
                          <p className={`text-sm font-bold ${marginUp ? (isDinner ? 'text-emerald-400' : 'text-emerald-600') : (isDinner ? 'text-rose-400' : 'text-rose-600')}`}>
                            {c.marginDiff > 0 ? '+' : ''}{c.marginDiff.toFixed(1)}pp
                          </p>
                          <p className={`text-xs ${mutedText}`}>{c.a.marginPct.toFixed(1)}% → {c.b.marginPct.toFixed(1)}%</p>
                        </div>
                        {/* Ordini */}
                        <div className="text-right w-16">
                          <p className={`text-sm font-bold ${freqUp ? (isDinner ? 'text-emerald-400' : 'text-emerald-600') : c.freqDiff < 0 ? (isDinner ? 'text-rose-400' : 'text-rose-600') : mutedText}`}>
                            {c.freqDiff > 0 ? '+' : ''}{c.freqDiff}
                          </p>
                          <p className={`text-xs ${mutedText}`}>{c.a.frequency} → {c.b.frequency}</p>
                        </div>
                        {/* Score */}
                        <div className="text-right w-16">
                          <p className={`text-sm font-bold ${scoreUp ? accentColor : c.scoreDiff < 0 ? (isDinner ? 'text-rose-400' : 'text-rose-600') : mutedText}`}>
                            {c.scoreDiff > 0 ? '+' : ''}{c.scoreDiff.toFixed(0)}
                          </p>
                          <p className={`text-xs ${mutedText}`}>{(c.a.score ?? 0).toFixed(0)} → {(c.b.score ?? 0).toFixed(0)}</p>
                        </div>
                        {/* Quadrante */}
                        <div className="text-right w-28">
                          {c.quadrantChanged ? (
                            <div>
                              <p className={`text-xs font-semibold ${quadrantColor(c.b.quadrant, isDinner)}`}>{quadrantLabel[c.b.quadrant]}</p>
                              <p className={`text-[10px] line-through ${mutedText}`}>{quadrantLabel[c.a.quadrant]}</p>
                            </div>
                          ) : (
                            <p className={`text-xs ${quadrantColor(c.a.quadrant, isDinner)}`}>{quadrantLabel[c.a.quadrant]}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── LISTA PERIODI ── */}
      {snapshots.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-4 ${mutedText}`}>
          <BarChart2 className="w-12 h-12 opacity-30" />
          <p className="text-sm">Nessuna analisi salvata ancora.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className={`text-sm font-bold uppercase tracking-wider ${mutedText}`}>Periodi salvati</h2>
          {snapshots.map(snap => {
            const isExpanded = expandedId === snap.id;
            const dishes = snap.data.dishes;
            const stelle = dishes.filter(d => d.quadrant === 'stella');
            const rivedi = dishes.filter(d => d.quadrant === 'rivedi');
            const promuovi = dishes.filter(d => d.quadrant === 'promuovi');
            return (
              <Card key={snap.id} className={cardBg}>
                {/* Header periodo */}
                <div className={`flex items-center gap-3 px-5 py-4 cursor-pointer ${rowHover} rounded-xl transition-colors`}
                  onClick={() => setExpandedId(isExpanded ? null : snap.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-bold text-base ${textColor}`}>{snap.label}</span>
                      <span className={`text-xs ${mutedText}`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatDate(snap.period_start)} → {formatDate(snap.period_end)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className={`text-xs ${mutedText}`}>FC medio: <span className={`font-semibold ${textColor}`}>{snap.data.kpi.avgFoodCost.toFixed(1)}%</span></span>
                      <span className={`text-xs ${mutedText}`}>Margine medio: <span className={`font-semibold ${textColor}`}>{snap.data.kpi.avgMargin.toFixed(1)}%</span></span>
                      <span className={`text-xs ${mutedText}`}>Top: <span className={`font-semibold ${accentColor}`}>{snap.data.kpi.topDish}</span></span>
                      {snap.data.kpi.missingCount > 0 && (
                        <span className={`text-xs text-amber-500`}>{snap.data.kpi.missingCount} costi mancanti</span>
                      )}
                    </div>
                  </div>
                  {/* Pillole quadranti */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDinner ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>⭐ {stelle.length}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDinner ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>📣 {promuovi.length}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDinner ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>🔍 {rivedi.length}</span>
                  </div>
                  {/* Tasto elimina */}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(snap.id); }}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDinner ? 'text-[#94A3B8] hover:text-rose-400 hover:bg-rose-950/20' : 'text-[#8C8A85] hover:text-rose-500 hover:bg-rose-50'}`}
                    title="Elimina periodo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? <ChevronUp className={`w-4 h-4 shrink-0 ${mutedText}`} /> : <ChevronDown className={`w-4 h-4 shrink-0 ${mutedText}`} />}
                </div>

                {/* Confirm delete */}
                {confirmDeleteId === snap.id && (
                  <div className={`mx-4 mb-3 px-4 py-3 rounded-lg border flex items-center gap-3 ${isDinner ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50 border-rose-200'}`}>
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <p className={`text-sm flex-1 ${isDinner ? 'text-rose-300' : 'text-rose-700'}`}>Eliminare questo periodo? L'azione è irreversibile.</p>
                    <button onClick={() => handleDelete(snap.id)} disabled={deletingId === snap.id}
                      className="px-3 py-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                      {deletingId === snap.id ? '…' : 'Elimina'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className={`p-1 rounded ${mutedText} hover:${textColor}`}><X className="w-4 h-4" /></button>
                  </div>
                )}

                {/* Dettaglio espanso */}
                {isExpanded && (
                  <CardContent className={`pt-0 border-t ${divider}`}>
                    <div className="space-y-4 pt-4">
                      {/* Tabella piatti */}
                      <div className="space-y-1">
                        <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-2 border-b ${divider} text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                          <span>Piatto</span>
                          <span className="text-right w-16">Margine</span>
                          <span className="text-right w-16">Ordini</span>
                          <span className="text-right w-16">Score</span>
                          <span className="text-right w-24">Quadrante</span>
                        </div>
                        {dishes
                          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                          .map(d => (
                          <div key={d.name} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 py-2 px-1 rounded-lg items-center ${rowHover} transition-colors`}>
                            <div>
                              <p className={`text-sm font-medium ${textColor}`}>{d.name}</p>
                              <p className={`text-xs ${mutedText}`}>{d.category}</p>
                            </div>
                            <p className={`text-sm font-bold text-right w-16 ${d.hasMissingCosts ? mutedText : d.marginPct >= 60 ? (isDinner ? 'text-emerald-400' : 'text-emerald-600') : d.marginPct >= 40 ? accentColor : (isDinner ? 'text-rose-400' : 'text-rose-600')}`}>
                              {d.hasMissingCosts ? '—' : `${d.marginPct.toFixed(1)}%`}
                            </p>
                            <p className={`text-sm font-bold text-right w-16 ${textColor}`}>{d.frequency > 0 ? d.frequency : '—'}</p>
                            <p className={`text-sm font-bold text-right w-16 ${accentColor}`}>{d.score != null ? d.score.toFixed(0) : '—'}</p>
                            <p className={`text-xs font-semibold text-right w-24 ${quadrantColor(d.quadrant, isDinner)}`}>{quadrantLabel[d.quadrant]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
