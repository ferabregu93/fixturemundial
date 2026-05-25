import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { TEAMS, GROUPS, R32_STRUCTURE, QF_STRUCTURE, SF4_STRUCTURE, SF2_STRUCTURE } from "./data";
import { generateOfficialPDF } from "./pdfEngine";
import "./styles.css";

const GroupsView = lazy(() => import("./GroupsView"));
const ThirdsView = lazy(() => import("./ThirdsView"));
const PlayoffView = lazy(() => import("./PlayoffView"));
const RankingView = lazy(() => import("./RankingView"));

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
  Object.entries(allTables).forEach(([g, tbl]) => { 
    f[g] = tbl[0]?.pj > 0 ? tbl[0].id : null; 
    s[g] = tbl[1]?.pj > 0 ? tbl[1].id : null; 
  });

  // Lógica mejorada para asignar terceros evitando enfrentamientos del mismo grupo
  const getThird = (avoidGrp, index) => {
    const available = bestThirds.filter(t => t.id && t.pj > 0);
    if (available.length === 0) return null;
    
    let selected = available[index % available.length];
    // Si el tercero es del mismo grupo, intentamos el siguiente para evitar rematches
    if (selected && selected.grp === avoidGrp) {
      selected = available[(index + 1) % available.length];
    }
    return selected?.id || null;
  };

  const sl = id => id || "---";
  return {
    P73: { home: sl(s["A"]), away: sl(s["B"]) },
    P74: { home: sl(f["E"]), away: sl(getThird("E", 0)) },
    P75: { home: sl(f["F"]), away: sl(s["C"]) },
    P76: { home: sl(f["C"]), away: sl(s["F"]) },
    P77: { home: sl(f["I"]), away: sl(getThird("I", 1)) },
    P78: { home: sl(s["E"]), away: sl(s["I"]) },
    P79: { home: sl(f["A"]), away: sl(getThird("A", 2)) },
    P80: { home: sl(f["L"]), away: sl(getThird("L", 3)) },
    P81: { home: sl(f["D"]), away: sl(getThird("D", 4)) },
    P82: { home: sl(f["G"]), away: sl(getThird("G", 5)) },
    P83: { home: sl(s["K"]), away: sl(s["L"]) },  P84: { home: sl(f["H"]), away: sl(s["J"]) },
    P85: { home: sl(f["B"]), away: sl(getThird("B", 6)) },    P86: { home: sl(f["J"]), away: sl(s["H"]) },
    P87: { home: sl(f["K"]), away: sl(getThird("K", 7)) },    P88: { home: sl(s["D"]), away: sl(s["G"]) },
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

  // Motor de captura de Reporte Completo (Infografía para amigos)
  const downloadPredictionImage = async () => {
    const reportEl = document.getElementById("full-prediction-report");
    if (!reportEl) return;
    
    setExporting(true);
    showToast("📸 Generando reporte de predicción...");

    // Carga dinámica de html2canvas
    if (!window.html2canvas && !document.getElementById('script-html2canvas')) {
      const script = document.createElement("script");
      script.id = 'script-html2canvas';
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      await new Promise(r => { script.onload = r; document.head.appendChild(script); });
    }

    try {
      // Hacemos el elemento visible temporalmente para la captura
      reportEl.style.display = "block";
      
      const canvas = await window.html2canvas(reportEl, {
        backgroundColor: theme === "dark" ? "#0A0A0F" : "#F4F6F8",
        scale: 3, // Ultra resolución para combatir la compresión de WhatsApp
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Asegurar que el clon sea visible
          const el = clonedDoc.getElementById("full-prediction-report");
          if (el) el.style.display = "block";
        }
      });

      // Volvemos a ocultar
      reportEl.style.display = "none";

      const link = document.createElement("a");
      link.download = `prediccion_mundial_${userName || "2026"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      showToast("✅ Reporte descargado. ¡Compártelo!");
    } catch (err) {
      console.error(err);
      showToast("❌ Error al generar imagen");
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────
  // MATRIZ DE CÁLCULO REACTIVO (useMemo)
  // ─────────────────────────────────────────────
  const allTables = useMemo(() => {
    const t = {};
    Object.keys(GROUPS).forEach(g => { t[g] = calcGroupTable(g, fixture[g]); });
    return t;
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

  const bestThirds = useMemo(() => allThirds.slice(0, 8), [allThirds]);
  const r32Teams = useMemo(() => resolveR32Teams(allTables, bestThirds), [allTables, bestThirds]);

  const winOf = useCallback((id, home, away) => {
    const s = scores[id] || {};
    if (s.winner && s.winner !== "---") return s.winner;
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

  const fullRanking = useMemo(() => {
    const stats = {};
    // Inicializar con estadísticas de grupos
    Object.values(allTables).flat().forEach(t => {
      stats[t.id] = { ...t, round: 1, roundName: "Grupos" };
    });

    // Sumar estadísticas de Playoffs
    allBracketMatches.forEach(m => {
      const s = scores[m.id];
      if (!s || s.gh === "" || s.ga === "") return;
      const h = parseInt(s.gh), a = parseInt(s.ga);
      
      [ {id: m.home, gf: h, gc: a}, {id: m.away, gf: a, gc: h} ].forEach((team, idx) => {
        const st = stats[team.id];
        if (!st) return;
        st.pj++;
        st.gf += team.gf;
        st.gc += team.gc;
        st.dg = st.gf - st.gc;
        // En eliminación directa, FIFA cuenta empate si va a penales (h === a)
        if (team.gf > team.gc) st.pts += 3;
        else if (team.gf === team.gc) st.pts += 1;
      });
    });

    // Determinar Ronda Alcanzada (Pesos para ordenamiento)
    const setR = (tid, val, name) => { 
      if (tid && tid !== "---" && tid !== "TBD" && stats[tid] && stats[tid].round < val) { 
        stats[tid].round = val; 
        stats[tid].roundName = name; 
      } 
    };
    
    bracket.r32.forEach(m => { if(m.home !== "---") setR(m.home, 2, "16vos"); if(m.away !== "---") setR(m.away, 2, "16vos"); });
    bracket.qf.forEach(m => { if(m.home !== "---") setR(m.home, 3, "Octavos"); if(m.away !== "---") setR(m.away, 3, "Octavos"); });
    bracket.sf4.forEach(m => { if(m.home !== "---") setR(m.home, 4, "Cuartos"); if(m.away !== "---") setR(m.away, 4, "Cuartos"); });
    bracket.sf2.forEach(m => { if(m.home !== "---") setR(m.home, 5, "Semis"); if(m.away !== "---") setR(m.away, 5, "Semis"); });
    
    const fMatch = bracket.final;
    const tMatch = bracket.thirdMatch;
    
    const finalWinner = bracket.champion;
    const finalLoser = finalWinner ? (finalWinner === fMatch.home ? fMatch.away : fMatch.home) : null;
    const thirdWinner = bracket.thirdPlace;
    const thirdLoser = thirdWinner ? (thirdWinner === tMatch.home ? tMatch.away : tMatch.home) : null;

    if (thirdLoser && thirdLoser !== "---") setR(thirdLoser, 6, "4to Puesto");
    if (thirdWinner && thirdWinner !== "---") setR(thirdWinner, 7, "3er Puesto");
    if (finalLoser && finalLoser !== "---") setR(finalLoser, 8, "Subcampeón");
    if (finalWinner && finalWinner !== "---") setR(finalWinner, 9, "Campeón");

    return Object.values(stats).sort((a, b) => {
      // 1. Prioridad: Ronda alcanzada
      if (b.round !== a.round) return b.round - a.round;
      // 2. Puntos acumulados
      if (b.pts !== a.pts) return b.pts - a.pts;
      // 3. Diferencia de gol
      if (b.dg !== a.dg) return b.dg - a.dg;
      // 4. Goles a favor
      return b.gf - a.gf;
    });
  }, [allTables, allBracketMatches, scores, bracket]);

  const topScoringTeam = useMemo(() => {
    let top = { id: null, gf: -1 };
    Object.values(allTables).flat().forEach(t => {
      if (t.gf > top.gf) top = { id: t.id, gf: t.gf };
    });
    return top;
  }, [allTables]);

  const { playedMatches, totalGoals } = useMemo(() => {
    return Object.values(fixture).flat().reduce((acc, match) => {
      const h = parseInt(match.gh), a = parseInt(match.ga);
      if (!isNaN(h) && !isNaN(a)) { acc.playedMatches++; acc.totalGoals += (h + a); }
      return acc;
    }, { playedMatches: 0, totalGoals: 0 });
  }, [fixture]);

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

      {/* PANEL DE EXPORTACIÓN (Movido Arriba) */}
      <div className="export-panel" style={{ marginTop: "0", marginBottom: "40px" }}>
        <h3 className="text-gold" style={{ marginBottom: "16px" }}>Compartir Predicción</h3>
        <input type="text" placeholder="Tu Nombre / Entidad" value={userName} onChange={e => setUserName(e.target.value)} 
               style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-main)", color: "var(--text)", border: "1px solid var(--border)", marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="ebtn" style={{ background: "var(--gold)", color: "#000", border: "none" }} onClick={downloadPredictionImage} disabled={exporting}>📸 Descargar Imagen de Predicción</button>
        </div>
      </div>

      <div className="nav">
        <button className={`nbtn ${tab === "grupos" ? "active" : ""}`} onClick={() => setTab("grupos")}>Grupos</button>
        <button className={`nbtn ${tab === "terceros" ? "active" : ""}`} onClick={() => setTab("terceros")}>Terceros</button>
        <button className={`nbtn ${tab === "ranking" ? "active" : ""}`} onClick={() => setTab("ranking")}>Ranking</button>
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
        {tab === "ranking" && <RankingView fullRanking={fullRanking} fixture={fixture} scores={scores} allBracketMatches={allBracketMatches} />}
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

      <footer style={{ textAlign: "center", marginTop: "60px", paddingBottom: "40px", fontSize: "12px", color: "var(--muted)", opacity: 0.6 }}>
        Desarrollado por Fernando Abregu
      </footer>

      {toast && <div className="toast" role="alert" aria-live="polite">{toast}</div>}

      {/* CONTENEDOR OCULTO PARA EXPORTACIÓN (Solo se usa para generar la imagen) */}
      <div id="full-prediction-report" style={{ display: "none", width: "1400px", padding: "60px", background: "var(--bg-main)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-20deg)", fontSize: "800px", opacity: 0.05, pointerEvents: "none", zIndex: 0 }}>
          🏆
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ color: "var(--gold)", fontSize: "64px", fontFamily: "Barlow Condensed", fontWeight: 900, marginBottom: "15px" }}>MI PREDICCIÓN MUNDIAL 2026</h1>
          <div style={{ display: "inline-block", padding: "10px 40px", background: "var(--win-bg)", borderRadius: "50px", border: "2px solid var(--gold)" }}>
             <span style={{ color: "var(--gold)", fontSize: "22px", fontWeight: "800", letterSpacing: "4px" }}>
               {userName ? `PREDICCIÓN DE: ${userName.toUpperCase()}` : "SIMULADOR OFICIAL"}
             </span>
          </div>
        </div>
        
        {/* SECCIÓN PREMIUM: CAMPEÓN Y ESTADÍSTICAS */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "25px", marginBottom: "50px" }}>
           <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "24px", border: "3px solid var(--gold)", boxShadow: "0 15px 40px rgba(212,160,23,0.2)", display: "flex", alignItems: "center", gap: "25px" }}>
              <div style={{ fontSize: "70px" }}>🏆</div>
              <div>
                <div style={{ color: "var(--gold)", fontSize: "14px", fontWeight: "900", letterSpacing: "3px", textTransform: "uppercase" }}>Campeón del Mundo</div>
                <div style={{ fontSize: "42px", fontWeight: "900", color: "var(--text)", fontFamily: "Barlow Condensed" }}>
                  {bracket.champion ? `${TEAMS[bracket.champion]?.flag} ${TEAMS[bracket.champion]?.name.toUpperCase()}` : "POR DEFINIR"}
                </div>
                <div style={{ color: "var(--gold)", fontSize: "16px", fontWeight: "700" }}>
                  {bracket.thirdPlace ? `🥉 3er Puesto: ${TEAMS[bracket.thirdPlace]?.name}` : ""}
                </div>
              </div>
           </div>
           <div style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "24px", border: "1px solid var(--border)", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
             <div style={{ color: "var(--muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "5px" }}>Goles Totales</div>
             <div style={{ color: "var(--gold)", fontSize: "52px", fontWeight: "900", fontFamily: "Barlow Condensed" }}>{totalGoals}</div>
           </div>
           <div style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "24px", border: "1px solid var(--border)", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
             <div style={{ color: "var(--muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "5px" }}>Máxima Ofensiva</div>
             <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "900", fontFamily: "Barlow Condensed" }}>
               {topScoringTeam.id ? `${TEAMS[topScoringTeam.id]?.flag} ${TEAMS[topScoringTeam.id]?.name}` : "---"}
             </div>
             <div style={{ fontSize: "14px", color: "var(--gold)", fontWeight: "bold" }}>({topScoringTeam.gf} GF)</div>
           </div>
        </div>

        {/* Ranking General en Reporte (Movido Arriba) */}
        <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--gold)", marginBottom: "50px" }}>
           <div style={{ color: "var(--gold)", fontWeight: "900", marginBottom: "25px", fontSize: "28px", textAlign: "center", textTransform: "uppercase", fontFamily: "Barlow Condensed", letterSpacing: "3px" }}>Tabla General del Torneo</div>
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "30px" }}>
             {[0, 1, 2].map(colIdx => (
               <div key={colIdx}>
                 <div style={{ display: "grid", gridTemplateColumns: "35px 1fr 65px 35px", fontSize: "10px", color: "var(--muted)", fontWeight: "bold", paddingBottom: "8px", borderBottom: "1px solid var(--border)", marginBottom: "8px" }}>
                   <span>POS</span>
                   <span>SELECCIÓN</span>
                   <span>RONDA</span>
                   <span style={{ textAlign: "center" }}>PTS</span>
                 </div>
                 {fullRanking.slice(colIdx * 16, (colIdx + 1) * 16).map((team, i) => {
                    const pos = colIdx * 16 + i + 1;
                    const isTop4 = pos <= 4;
                    return (
                      <div key={team.id} style={{ display: "grid", gridTemplateColumns: "35px 1fr 65px 35px", alignItems: "center", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: team.round > 1 ? 1 : 0.45 }}>
                        <span style={{ fontWeight: "900", color: isTop4 ? "var(--gold)" : "inherit" }}>{pos}</span>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: team.round > 1 ? "bold" : "normal" }}>{TEAMS[team.id]?.flag} {TEAMS[team.id]?.name || team.id}</span>
                        <span style={{ fontSize: "9px", textTransform: "uppercase", color: isTop4 ? "var(--gold)" : "var(--muted)", fontWeight: "bold" }}>{team.roundName}</span>
                        <span style={{ textAlign: "center", fontWeight: "900", color: team.round > 1 ? "var(--gold)" : "inherit" }}>{team.pts}</span>
                      </div>
                    );
                 })}
               </div>
             ))}
           </div>
        </div>

        {/* RESULTADOS DE PLAYOFFS COMPACTOS (Después del Ranking) */}
        <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--border)", marginBottom: "50px" }}>
          <div style={{ color: "var(--gold)", fontWeight: "900", marginBottom: "25px", fontSize: "28px", textAlign: "center", textTransform: "uppercase", fontFamily: "Barlow Condensed", letterSpacing: "3px" }}>Fase de Eliminación Directa</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {[
              { title: "Finales", matches: [bracket.final, bracket.thirdMatch] },
              { title: "Semifinales", matches: bracket.sf2 },
              { title: "Cuartos", matches: bracket.sf4 },
              { title: "Octavos", matches: bracket.qf },
              { title: "16vos (Lado A)", matches: bracket.r32.slice(0, 8) },
              { title: "16vos (Lado B)", matches: bracket.r32.slice(8, 16) }
            ].map(round => (
              <div key={round.title} style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "15px", border: "1px solid var(--border)" }}>
                 <div style={{ color: "var(--gold)", fontWeight: "900", marginBottom: "12px", fontSize: "13px", textAlign: "center", borderBottom: "1px solid rgba(212,160,23,0.1)", paddingBottom: "5px" }}>{round.title.toUpperCase()}</div>
                 {round.matches.map(m => {
                   const s = scores[m.id] || {};
                   const homeT = TEAMS[m.home];
                   const awayT = TEAMS[m.away];
                   const gh = parseInt(s.gh);
                   const ga = parseInt(s.ga);
                   const derivedWinner = s.winner || (!isNaN(gh) && !isNaN(ga) && gh !== ga ? (gh > ga ? m.home : m.away) : null);
                   const isPenalty = derivedWinner && !isNaN(gh) && !isNaN(ga) && gh === ga;
                   const isHW = derivedWinner === m.home;
                   const isAW = derivedWinner === m.away;

                   return (
                     <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "6px", opacity: m.home === "---" ? 0.4 : 1 }}>
                       <span style={{ flex: 1, textAlign: "right", fontWeight: "800", color: isHW ? "var(--gold)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden" }}>
                         {homeT?.flag || "🏳️"} {m.home}{isPenalty && isHW ? " (pen.)" : ""}
                       </span>
                       <span style={{ margin: "0 8px", background: "#FFFFFF", padding: "1px 5px", borderRadius: "4px", color: "#000000", fontWeight: "900", minWidth: "40px", textAlign: "center", border: "1px solid var(--gold)", fontSize: "11px" }}>
                         {s.gh !== "" && s.gh !== undefined ? s.gh : "-"} : {s.ga !== "" && s.ga !== undefined ? s.ga : "-"}
                       </span>
                       <span style={{ flex: 1, textAlign: "left", fontWeight: "800", color: isAW ? "var(--gold)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden" }}>
                         {isPenalty && isAW ? "(pen.) " : ""}{m.away} {awayT?.flag || "🏳️"}
                       </span>
                     </div>
                   );
                 })}
              </div>
            ))}
          </div>
        </div>

        {/* FASE DE GRUPOS (Al final) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "50px" }}>
           {Object.keys(GROUPS).map(g => (
             <div key={g} style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "20px", border: "1px solid var(--border)" }}>
               <div style={{ color: "var(--gold)", fontWeight: "900", marginBottom: "15px", fontSize: "18px", textAlign: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>GRUPO {g}</div>
               
               {/* Tabla de Clasificación */}
               <div style={{ marginBottom: "20px" }}>
                  {/* Headers Detallados */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 20px 20px 20px 30px", fontSize: "9px", color: "var(--muted)", fontWeight: "bold", paddingBottom: "5px", borderBottom: "1px solid var(--border)" }}>
                    <span>EQUIPO</span>
                    <span style={{ textAlign: "center" }}>PJ</span>
                    <span style={{ textAlign: "center" }}>GF</span>
                    <span style={{ textAlign: "center" }}>GC</span>
                    <span style={{ textAlign: "center" }}>DG</span>
                    <span style={{ textAlign: "center" }}>PTS</span>
                  </div>
                  {allTables[g].map((t, idx) => (
                   <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 18px 18px 18px 18px 25px", alignItems: "center", fontSize: "10px", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: idx < 2 ? 1 : 0.35 }}>
                     <span style={{ fontWeight: idx < 2 ? "900" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{idx+1}. {TEAMS[t.id]?.flag} {t.id}</span>
                      <span style={{ textAlign: "center" }}>{t.pj}</span>
                      <span style={{ textAlign: "center" }}>{t.gf}</span>
                      <span style={{ textAlign: "center" }}>{t.gc}</span>
                      <span style={{ textAlign: "center" }}>{t.dg >= 0 ? `+${t.dg}` : t.dg}</span>
                      <span style={{ textAlign: "center", fontWeight: "900", color: idx < 2 ? "var(--gold)" : "inherit" }}>{t.pts}</span>
                    </div>
                  ))}
               </div>

                {/* Resultados de Partidos */}
                <div style={{ borderTop: "1px dashed rgba(212,160,23,0.3)", paddingTop: "15px" }}>
                  {fixture[g].map((m) => {
                    const gh = parseInt(m.gh);
                    const ga = parseInt(m.ga);
                    const isHW = !isNaN(gh) && !isNaN(ga) && gh > ga;
                    const isAW = !isNaN(gh) && !isNaN(ga) && ga > gh;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "8px", color: "var(--text)" }}>
                        <span style={{ flex: 1, textAlign: "right", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", color: isHW ? "var(--gold)" : "inherit" }}>
                          {TEAMS[m.home]?.flag} {TEAMS[m.home]?.name || m.home}
                        </span>
                        <span style={{ margin: "0 10px", background: "#FFFFFF", padding: "4px 10px", borderRadius: "6px", color: "#000000", fontWeight: "900", minWidth: "55px", textAlign: "center", border: "1px solid var(--gold)", fontSize: "14px" }}>
                          {m.gh !== "" ? m.gh : "0"} - {m.ga !== "" ? m.ga : "0"}
                        </span>
                        <span style={{ flex: 1, textAlign: "left", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", color: isAW ? "var(--gold)" : "inherit" }}>
                           {TEAMS[m.away]?.name || m.away} {TEAMS[m.away]?.flag}
                        </span>
                      </div>
                    );
                  })}
                </div>
             </div>
           ))}
        </div>

        {/* Ranking Mejores Terceros en Reporte */}
        <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--gold)", marginBottom: "50px" }}>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "25px" }}>
              <span style={{ fontSize: "32px" }}>🏅</span>
              <div style={{ color: "var(--gold)", fontWeight: "900", fontSize: "32px", textAlign: "center", textTransform: "uppercase", fontFamily: "Barlow Condensed", letterSpacing: "3px" }}>Ranking de Mejores Terceros</div>
              <span style={{ fontSize: "32px" }}>🏅</span>
           </div>
           <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
             {allThirds.map((t, i) => (
               <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", padding: "10px 15px", background: i < 8 ? "var(--win-bg)" : "rgba(0,0,0,0.1)", borderRadius: "10px", border: i < 8 ? "1px solid var(--gold)" : "1px solid var(--border)", opacity: i < 8 ? 1 : 0.35 }}>
                 <span style={{ fontWeight: i < 8 ? "900" : "normal" }}>
                   {i + 1}. {TEAMS[t.id]?.flag} {t.id} <span style={{ fontSize: "10px", color: "var(--muted)" }}>(G{t.grp})</span>
                 </span>
                 <span style={{ fontWeight: "900", color: i < 8 ? "var(--gold)" : "inherit" }}>{t.pts} PTS</span>
               </div>
             ))}
           </div>
        </div>

      </div>
      </div>
    </div>
  );
}