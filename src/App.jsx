import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { TEAMS, GROUPS, R32_STRUCTURE, QF_STRUCTURE, SF4_STRUCTURE, SF2_STRUCTURE } from "./data";
import { generateOfficialPDF } from "./pdfEngine";
import "./styles.css";

const GroupsView = lazy(() => import("./GroupsView"));
const ThirdsView = lazy(() => import("./ThirdsView"));
const PlayoffView = lazy(() => import("./PlayoffView"));

// ─────────────────────────────────────────────
// LÓGICA DE SIMULACIÓN Y CÁLCULO
// ─────────────────────────────────────────────
function generateFixture() {
  const f = {};
  Object.entries(GROUPS).forEach(([g, { teams: t }]) => {
    f[g] = [
      { id: `${g}1`, home: t[0], away: t[1], gh: "", ga: "" },
      { id: `${g}2`, home: t[2], away: t[3], gh: "", ga: "" },
      { id: `${g}3`, home: t[0], away: t[2], gh: "", ga: "" },
      { id: `${g}4`, home: t[1], away: t[3], gh: "", ga: "" },
      { id: `${g}5`, home: t[0], away: t[3], gh: "", ga: "" },
      { id: `${g}6`, home: t[1], away: t[2], gh: "", ga: "" },
    ];
  });
  return f;
}

function calcGroupTable(grpId, matches) {
  const tb = {};
  GROUPS[grpId].teams.forEach(t => { tb[t] = { id: t, pj: 0, pts: 0, gf: 0, gc: 0, dg: 0 }; });
  matches.forEach(({ home, away, gh, ga }) => {
    if (gh === "" || ga === "" || gh === null || ga === null) return;
    const h = parseInt(gh), a = parseInt(ga);
    if (isNaN(h) || isNaN(a)) return;
    tb[home].pj++; tb[away].pj++;
    tb[home].gf += h; tb[home].gc += a; tb[away].gf += a; tb[away].gc += h;
    tb[home].dg = tb[home].gf - tb[home].gc; tb[away].dg = tb[away].gf - tb[away].gc;
    if (h > a) { tb[home].pts += 3; } else if (h < a) { tb[away].pts += 3; } else { tb[home].pts++; tb[away].pts++; }
  });
  return Object.values(tb).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return (TEAMS[a.id]?.rank || 99) - (TEAMS[b.id]?.rank || 99);
  });
}

function resolveR32Teams(allTables, bestThirds) {
  const f = {}, s = {};
  Object.entries(allTables).forEach(([g, tbl]) => { f[g] = tbl[0]?.id; s[g] = tbl[1]?.id; });
  const t = bestThirds.map(x => x.id);
  const sl = id => id || "---";
  return {
    P73: { home: sl(s["A"]), away: sl(s["B"]) },  P74: { home: sl(f["E"]), away: sl(t[0]) },
    P75: { home: sl(f["F"]), away: sl(s["C"]) },  P76: { home: sl(f["C"]), away: sl(s["F"]) },
    P77: { home: sl(f["I"]), away: sl(t[1]) },    P78: { home: sl(s["E"]), away: sl(s["I"]) },
    P79: { home: sl(f["A"]), away: sl(t[2]) },    P80: { home: sl(f["L"]), away: sl(t[3]) },
    P81: { home: sl(f["D"]), away: sl(t[4]) },    P82: { home: sl(f["G"]), away: sl(t[5]) },
    P83: { home: sl(s["K"]), away: sl(s["L"]) },  P84: { home: sl(f["H"]), away: sl(s["J"]) },
    P85: { home: sl(f["B"]), away: sl(t[6]) },    P86: { home: sl(f["J"]), away: sl(s["H"]) },
    P87: { home: sl(f["K"]), away: sl(t[7]) },    P88: { home: sl(s["D"]), away: sl(s["G"]) },
  };
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("grupos");
  const [toast, setToast] = useState(null);
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("wc2026_theme");
    return saved || "dark";
  });
  const [fixture, setFixture] = useState(() => {
    const saved = localStorage.getItem("wc2026_fixture");
    return saved ? JSON.parse(saved) : generateFixture();
  });
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem("wc2026_scores");
    return saved ? JSON.parse(saved) : {};
  });
  const [modal, setModal] = useState(null);
  const [mH, setMH] = useState("");
  const [mA, setMA] = useState("");
  const [mWin, setMWin] = useState(null);
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem("wc2026_user");
    return saved || "";
  });
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(0.8);

  const vpRef = useRef(null);
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, sl: 0, st: 0 });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  // Gestión de Tema
  useEffect(() => { document.body.setAttribute("data-theme", theme); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  // Persistencia Automática (Guardado)
  useEffect(() => {
    localStorage.setItem("wc2026_fixture", JSON.stringify(fixture));
    localStorage.setItem("wc2026_scores", JSON.stringify(scores));
    localStorage.setItem("wc2026_theme", theme);
    localStorage.setItem("wc2026_user", userName);
  }, [fixture, scores, theme, userName]);

  // Función para resetear los datos
  const resetSimulation = () => {
    if (window.confirm("¿Deseas borrar todos los resultados y empezar de nuevo?")) {
      const newFixture = generateFixture();
      setFixture(newFixture);
      setScores({});
      setUserName("");
      showToast("🔄 Simulación reiniciada");
      localStorage.removeItem("wc2026_fixture");
      localStorage.removeItem("wc2026_scores");
      localStorage.removeItem("wc2026_user");
    }
  };

  // Motor de arrastre (Drag & Drop) para la llave
  const onMouseDown = e => {
    const el = vpRef.current;
    if (!el) return;
    dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = e => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const el = vpRef.current;
    if (!el) return;
    el.scrollLeft = d.sl - (e.clientX - d.sx);
    el.scrollTop = d.st - (e.clientY - d.sy);
  };
  const onMouseUp = () => {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  // ─────────────────────────────────────────────
  // MATRIZ DE CÁLCULO REACTIVO (useMemo)
  // ─────────────────────────────────────────────
  const allTables = useMemo(() => {
    const t = {};
    Object.keys(GROUPS).forEach(g => { t[g] = calcGroupTable(g, fixture[g]); });
    return t;
  }, [fixture]);

  const { playedMatches, totalGoals } = useMemo(() => {
    return Object.values(fixture).flat().reduce((acc, match) => {
      const h = parseInt(match.gh), a = parseInt(match.ga);
      if (!isNaN(h) && !isNaN(a)) { acc.playedMatches++; acc.totalGoals += (h + a); }
      return acc;
    }, { playedMatches: 0, totalGoals: 0 });
  }, [fixture]);

  const allThirds = useMemo(() => {
    return Object.entries(allTables)
      .map(([grp, tbl]) => ({ ...tbl[2], grp }))
      .filter(t => t && t.id && t.pj !== undefined)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return (TEAMS[a.id]?.rank || 99) - (TEAMS[b.id]?.rank || 99);
      });
  }, [allTables]);

  const bestThirds = allThirds.slice(0, 8);
  const r32Teams = useMemo(() => resolveR32Teams(allTables, bestThirds), [allTables, bestThirds]);

  const winOf = useCallback((id, home, away) => {
    const s = scores[id] || {};
    if (s.winner) return s.winner;
    const h = parseInt(s.gh), a = parseInt(s.ga);
    if (!isNaN(h) && !isNaN(a) && h !== a) return h > a ? home : away;
    return null;
  }, [scores]);

  const bracket = useMemo(() => {
    const r32 = R32_STRUCTURE.map(({ id, label }) => {
      const t = r32Teams[id] || { home: "---", away: "---" };
      return { id, label, home: t.home, away: t.away };
    });
    const wR32 = id => { const m = r32.find(x => x.id === id); return m ? winOf(id, m.home, m.away) || "---" : "---"; };
    const qf = QF_STRUCTURE.map(({ id, label, srcA, srcB }) => ({ id, label, home: wR32(srcA), away: wR32(srcB) }));
    const wQF = id => { const m = qf.find(x => x.id === id); return m ? winOf(id, m.home, m.away) || "---" : "---"; };
    const sf4 = SF4_STRUCTURE.map(({ id, label, srcA, srcB }) => ({ id, label, home: wQF(srcA), away: wQF(srcB) }));
    const wSF4 = id => { const m = sf4.find(x => x.id === id); return m ? winOf(id, m.home, m.away) || "---" : "---"; };
    const sf2 = SF2_STRUCTURE.map(({ id, label, srcA, srcB }) => ({ id, label, home: wSF4(srcA), away: wSF4(srcB) }));
    const wSF2 = id => { const m = sf2.find(x => x.id === id); return m ? winOf(id, m.home, m.away) || "---" : "---"; };
    const lSF2 = id => { const m = sf2.find(x => x.id === id); if (!m) return "---"; const w = wSF2(id); return w && w !== "---" ? (w === m.home ? m.away : m.home) : "---"; };
    
    const final = { id: "P104", label: "P104 · Dom 19/07", home: wSF2("P101"), away: wSF2("P102") };
    const thirdMatch = { id: "P103", label: "P103 · Sáb 18/07", home: lSF2("P101"), away: lSF2("P102") };
    const champion = winOf("P104", final.home, final.away);
    const thirdPlace = winOf("P103", thirdMatch.home, thirdMatch.away);
    
    return { r32, qf, sf4, sf2, final, thirdMatch, champion, thirdPlace };
  }, [r32Teams, winOf]);

  const allBracketMatches = useMemo(() => [
    ...bracket.r32, ...bracket.qf, ...bracket.sf4, ...bracket.sf2,
    bracket.final, bracket.thirdMatch
  ], [bracket]);

  const bfm = id => allBracketMatches.find(x => x.id === id);

  // ─────────────────────────────────────────────
  // INTERACCIONES Y UI
  // ─────────────────────────────────────────────
  const setGroupScore = (grp, idx, field, val) => {
    const parsed = val === "" ? "" : Math.max(0, Math.min(99, parseInt(val) || 0)).toString();
    setFixture(prev => ({ ...prev, [grp]: prev[grp].map((m, i) => i === idx ? { ...m, [field]: parsed } : m) }));
  };

  const openModal = match => {
    const s = scores[match.id] || {};
    setModal(match); setMH(s.gh || ""); setMA(s.ga || ""); setMWin(s.winner || null);
  };

  const confirmModal = () => {
    if (!modal) return;

    let finalH = mH;
    let finalA = mA;
    if (finalH !== "" && finalA === "") finalA = "0";
    if (finalA !== "" && finalH === "") finalH = "0";

    const h = parseInt(finalH), a = parseInt(finalA);
    let winner = mWin;
    if (!winner && !isNaN(h) && !isNaN(a)) { if (h > a) winner = modal.home; else if (a > h) winner = modal.away; }

    // Disparar animación de confeti si se define el ganador de la gran final (P104)
    if (modal.id === "P104" && winner) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
      script.onload = () => {
        window.confetti({
          particleCount: 250,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4A017', '#F5C842', '#E8E8F0'] // Colores temáticos del simulador
        });
      };
      document.head.appendChild(script);
    }

    setScores(prev => ({ ...prev, [modal.id]: { gh: finalH, ga: finalA, winner } }));
    setModal(null);
    showToast("✓ Resultado guardado");
  };

  const handleExport = async (debug = false) => {
    setExporting(true);
    await generateOfficialPDF(bracket, userName, debug);
    setExporting(false);
  };

  const exportCSV = () => {
    let csv = "ID,Ronda,Local,Goles Local,Goles Visitante,Visitante,Ganador\n";
    allBracketMatches.forEach(m => {
      const s = scores[m.id] || {};
      csv += `${m.id},"${m.label}",${m.home},${s.gh || 0},${s.ga || 0},${m.away},${s.winner || ""}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `datos_mundial_${userName || '2026'}.csv`;
    a.click();
    showToast("📊 Datos exportados en CSV");
  };

  // Soporte Touch para el viewport de la llave
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        dragRef.current = { dragging: true, sx: touch.clientX, sy: touch.clientY, sl: el.scrollLeft, st: el.scrollTop };
      }
    };
    const handleTouchMove = (e) => {
      if (!dragRef.current.dragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      el.scrollLeft = dragRef.current.sl - (touch.clientX - dragRef.current.sx);
      el.scrollTop = dragRef.current.st - (touch.clientY - dragRef.current.sy);
    };
    
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <div className="app">
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === "dark" ? "☀️ TEMA CLARO" : "🌙 TEMA OSCURO"}
      </button>

      <div className="header">
        <div className="hbadge">⚽ FIFA World Cup 2026 · 🇺🇸 🇨🇦 🇲🇽</div>
        <h1 className="htitle">SIMULADOR MUNDIAL</h1>
        <div className="hsub">Motor Analítico Oficial</div>
      </div>

      <div className="stats-bar">
        <div className="schip"><div className="schip-val">{playedMatches}</div><div className="schip-lbl">Partidos</div></div>
        <div className="schip"><div className="schip-val">{totalGoals}</div><div className="schip-lbl">Goles</div></div>
        <div className="schip"><div className="schip-val">{playedMatches > 0 ? (totalGoals / playedMatches).toFixed(1) : "—"}</div><div className="schip-lbl">Promedio</div></div>
        <div className="schip"><div className="schip-val">{bestThirds.length}</div><div className="schip-lbl">3ros</div></div>
        {bracket.champion && TEAMS[bracket.champion] && (
          <div className="schip" style={{ borderColor: "var(--gold)", background: "var(--win-bg)" }}>
            <div className="schip-val" style={{ color: "var(--gold)", fontWeight: 900 }}>
               <span style={{ fontSize: '24px', marginRight: '8px' }}>{TEAMS[bracket.champion].flag}</span>
               {bracket.champion}
            </div>
            <div className="schip-lbl" style={{ color: "var(--gold)" }}>Campeón</div>
          </div>
        )}
      </div>
      <div className="pbar"><div className="pfill" style={{ width: `${(playedMatches / 72) * 100}%` }} /></div>

      <div className="nav">
        <button className={`nbtn ${tab === "grupos" ? "active" : ""}`} onClick={() => setTab("grupos")}>Grupos</button>
        <button className={`nbtn ${tab === "terceros" ? "active" : ""}`} onClick={() => setTab("terceros")}>Terceros</button>
        <button className={`nbtn ${tab === "playoff" ? "active" : ""}`} onClick={() => setTab("playoff")}>Llave Final</button>
        <button className="nbtn" onClick={resetSimulation} style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Reiniciar</button>
      </div>

      {/* RENDER GRUPOS */}
      <Suspense fallback={<div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Cargando sección...</div>}>
        {tab === "grupos" && (
          <GroupsView 
            allTables={allTables} 
            fixture={fixture} 
            setGroupScore={setGroupScore} 
            hoveredTeam={hoveredTeam}
            setHoveredTeam={setHoveredTeam}
          />
        )}
        {tab === "terceros" && <ThirdsView allThirds={allThirds} />}
        {tab === "playoff" && (
          <PlayoffView 
            bracket={bracket} 
            scores={scores} 
            openModal={openModal} 
            zoom={zoom} 
            setZoom={setZoom} 
            vpRef={vpRef} 
            onMouseDown={onMouseDown} 
            allBracketMatches={allBracketMatches}
            showToast={showToast}
          />
        )}
      </Suspense>

      {/* PANEL DE EXPORTACIÓN */}
      <div className="export-panel">
        <h3 className="text-gold" style={{ marginBottom: "16px" }}>Exportación PDF Oficial</h3>
        <input type="text" placeholder="Tu Nombre / Entidad" value={userName} onChange={e => setUserName(e.target.value)} 
               style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-main)", color: "var(--text)", border: "1px solid var(--border)", marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="ebtn" onClick={() => handleExport(false)} disabled={exporting}>📄 Inyectar PDF Oficial</button>
          <button className="ebtn" onClick={() => handleExport(true)} disabled={exporting} style={{ borderColor: "#E53935", color: "#E53935" }}>🛠 Modo Calibración</button>
          <button className="ebtn" onClick={exportCSV} style={{ borderColor: "var(--accent-blue)", color: "var(--accent-blue)" }}>📊 Exportar Datos (CSV)</button>
        </div>
      </div>

      {/* MODAL PREMIUM DE RESULTADOS */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" onKeyDown={e => e.key === 'Enter' && confirmModal()}>
            <div className="modal-title">Carga de Resultado</div>
            <div className="modal-teams">
              <div className="modal-team">
                <div className="modal-team-flag">{TEAMS[modal.home]?.flag}</div>
                <div className="modal-team-name"><span className="code">{modal.home}</span> <span className="fullname">{TEAMS[modal.home]?.name || modal.home}</span></div>
              </div>
              <div className="modal-vs">VS</div>
              <div className="modal-team">
                <div className="modal-team-flag">{TEAMS[modal.away]?.flag}</div>
                <div className="modal-team-name"><span className="code">{modal.away}</span> <span className="fullname">{TEAMS[modal.away]?.name || modal.away}</span></div>
              </div>
            </div>
            <div className="modal-inputs">
              <div className="modal-stepper">
                <button className="step-btn-lg" onClick={() => { 
                  setMH(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString()); 
                  if (mA === "") setMA("0");
                  setMWin(null); 
                }}>▾</button>
                <input 
                  type="number" 
                  onFocus={e => e.target.select()}
                  aria-label={`Goles ${TEAMS[modal.home]?.name}`} 
                  className="mi with-stepper" 
                  value={mH} 
                  onChange={e => { setMH(e.target.value); setMWin(null); }} 
                  placeholder="0" 
                />
                <button className="step-btn-lg" onClick={() => { 
                  setMH(prev => Math.min(99, (parseInt(prev) || 0) + 1).toString()); 
                  if (mA === "") setMA("0");
                  setMWin(null); 
                }}>▴</button>
              </div>
              <span style={{ fontSize: 24, fontWeight: 900, color: "var(--muted)" }}>:</span>
              <div className="modal-stepper">
                <button className="step-btn-lg" onClick={() => { 
                  setMA(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString()); 
                  if (mH === "") setMH("0");
                  setMWin(null); 
                }}>▾</button>
                <input 
                  type="number" 
                  onFocus={e => e.target.select()}
                  aria-label={`Goles ${TEAMS[modal.away]?.name}`} 
                  className="mi with-stepper" 
                  value={mA} 
                  onChange={e => { setMA(e.target.value); setMWin(null); }} 
                  placeholder="0" 
                />
                <button className="step-btn-lg" onClick={() => { 
                  setMA(prev => Math.min(99, (parseInt(prev) || 0) + 1).toString()); 
                  if (mH === "") setMH("0");
                  setMWin(null); 
                }}>▴</button>
              </div>
            </div>
            {mH === mA && mH !== "" && (
              <>
                <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Empate: Elegir ganador (Penales)</div>
                <div className="win-sel">
                  <div className={`wopt ${mWin === modal.home ? "sel" : ""}`} onClick={() => setMWin(modal.home)}>
                    <span className="code">{modal.home}</span> <span className="fullname">{TEAMS[modal.home]?.name || modal.home}</span>
                  </div>
                  <div className={`wopt ${mWin === modal.away ? "sel" : ""}`} onClick={() => setMWin(modal.away)}>
                    <span className="code">{modal.away}</span> <span className="fullname">{TEAMS[modal.away]?.name || modal.away}</span>
                  </div>
                </div>
              </>
            )}
            <div className="mbts">
              <button className="mbtn cancel" onClick={() => setModal(null)}>Cancelar</button>
              <button className="mbtn ok" onClick={confirmModal}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="alert" aria-live="polite">{toast}</div>}
    </div>
  );
}