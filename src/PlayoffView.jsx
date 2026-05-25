import React, { useEffect, useRef, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { TEAMS } from "./data";

function BracketMatch({ match, scores, onOpen }) {
  if (!match) return <div style={{ height: 52 }} />;
  const s = scores[match.id] || {};
  const isTBD = match.home === "---" && match.away === "---";
  const winner = useMemo(() => {
    if (s.winner) return s.winner;
    const h = parseInt(s.gh), a = parseInt(s.ga);
    if (!isNaN(h) && !isNaN(a) && h !== a) return h > a ? match.home : match.away;
    return null;
  }, [s, match.home, match.away]);
  const hasWinner = winner !== null;
  return (
    <div 
      className={`bm ${isTBD ? "tbd" : ""} ${hasWinner ? "has-winner" : ""}`} 
      onClick={() => !isTBD && onOpen(match)} 
      title={match.label}
      role="button"
      tabIndex={isTBD ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && !isTBD && onOpen(match)}
    >
      <div className="bm-lbl">{match.label}</div>
        {[{ id: match.home, sc: s.gh }, { id: match.away, sc: s.ga }].map(({ id: tid, sc }, ri) => {
        const t = TEAMS[tid]; const isW = winner === tid; const isL = winner && winner !== tid;
        return (
          <div key={ri} className={`bt ${isW ? "win" : isL ? "los" : ""}`}>
            <span className="bti"><span className="btfl">{t?.flag}</span><span className="btnm"><span className="code">{tid}</span> {tid !== "---" && <span className="fullname">{t?.name || tid}</span>}</span></span>
            <span className="btsc">{sc !== "" && sc !== undefined ? sc : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

BracketMatch.propTypes = {
  match: PropTypes.object,
  scores: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired
};

const BCol = ({ ids, label, variant, side, mt, bfm, scores, openModal }) => (
  <div className={`bcol ${side}`} style={{ paddingTop: mt || 0 }}>
    <div className={`rnd-hdr ${variant}`}>{label}</div>
    {ids.map(id => <BracketMatch key={id} match={bfm(id)} scores={scores} onOpen={openModal} />)}
  </div>
);

BCol.propTypes = {
  ids: PropTypes.array.isRequired,
  label: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  side: PropTypes.string.isRequired,
  mt: PropTypes.number,
  bfm: PropTypes.func.isRequired,
  scores: PropTypes.object.isRequired,
  openModal: PropTypes.func.isRequired
};

const ListSection = ({ title, matches, scores, openModal }) => {
  if (!matches) return null;
  const matchesArr = Array.isArray(matches) ? matches : [matches];
  if (matchesArr.length === 0) return null;

  return (
    <div className="list-round">
      <h3>{title}</h3>
      <div className="list-matches">
        {matchesArr.map(m => (
          <BracketMatch key={m.id} match={m} scores={scores} onOpen={openModal} />
        ))}
      </div>
    </div>
  );
};

ListSection.propTypes = {
  title: PropTypes.string.isRequired,
  matches: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  scores: PropTypes.object.isRequired,
  openModal: PropTypes.func.isRequired
};

export default function PlayoffView({ bracket, scores, openModal, zoom, setZoom, vpRef, onMouseDown, allBracketMatches, showToast }) {
  const [viewMode, setViewMode] = useState("bracket");
  const matchMap = useMemo(() => {
    const map = {};
    allBracketMatches.forEach(m => { if (m) map[m.id] = m; });
    return map;
  }, [allBracketMatches]);

  const bfm = id => matchMap[id];
  const outerRef = useRef(null);

  const toggleFullScreen = async () => {
    const el = outerRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        // Intentar bloquear la orientación a horizontal (landscape) en móviles
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock("landscape").catch(() => {});
        }
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        if (window.screen?.orientation?.unlock) window.screen.orientation.unlock();
      }
    } catch (err) {
      console.error("Error con el modo pantalla completa:", err);
    }
  };

  const downloadScreenshot = async () => {
    const canvasEl = outerRef.current?.querySelector(".bracket-canvas");
    if (!canvasEl) return;

    // Carga dinámica de html2canvas para no sobrecargar el bundle inicial
    if (!window.html2canvas && !document.getElementById('script-html2canvas')) {
      const script = document.createElement("script");
      script.id = 'script-html2canvas';
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      await new Promise((resolve) => {
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    try {
      const canvas = await window.html2canvas(canvasEl, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-panel').trim() || "#12121A",
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedCanvas = clonedDoc.querySelector(".bracket-canvas");
          if (clonedCanvas) clonedCanvas.style.transform = "none";
        }
      });

      const link = document.createElement("a");
      link.download = "llave_mundial_2026.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("📸 Captura descargada correctamente");
    } catch (error) {
      showToast("❌ Error al generar la captura");
      console.error("html2canvas error:", error);
    }
  };

  // Implementación de Pinch-to-Zoom para móviles
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;

    let initialDist = 0;

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );

        if (initialDist === 0) {
          initialDist = dist;
        } else {
          const delta = dist / initialDist;
          setZoom(z => Math.min(1.2, Math.max(0.3, z + (delta - 1) * 0.01)));
        }
      }
    };

    const handleTouchEnd = () => { initialDist = 0; };

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [vpRef, setZoom]);

  return (
    <>
      <div className="playoff-legend">
        <div className="legend-title">🎯 Emparejamientos con Terceros</div>
        <div className="legend-text">
          Los <strong>8 mejores terceros clasificados</strong> se enfrentan a los primeros puestos según la <strong>tabla predefinida de la FIFA (Anexo C)</strong>.
          Los emparejamientos varían según qué grupos tienen los terceros clasificados, pero siempre siguiendo una combinación específica para garantizar equidad.
          <br/><br/>
          <strong>Partidos fijos:</strong> 1A vs 3?, 1B vs 3?, etc. | <strong>Partidos entre segundos:</strong> 2A vs 2B, 2D vs 2G, etc.
        </div>
      </div>

      <div className="bracket-outer" ref={outerRef}>
      <div className="bracket-zoom-controls">
        <button className={`zc-btn ${viewMode === 'bracket' ? 'active' : ''}`} onClick={() => setViewMode('bracket')} title="Vista Llave">📊</button>
        <button className={`zc-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vista Lista">📋</button>
        
        <div className="zc-divider" />

        <button className="zc-btn" onClick={toggleFullScreen} title="Pantalla Completa">⛶</button>
        
        {viewMode === 'bracket' && (
          <>
            <button className="zc-btn" onClick={downloadScreenshot} title="Descargar PNG">📸</button>
            <div className="zc-divider" />
            <button className="zc-btn" onClick={() => setZoom(z => Math.min(1.2, z + 0.1))} title="Aumentar Zoom">＋</button>
            <button className="zc-btn" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} title="Reducir Zoom">－</button>
            <button className="zc-btn" onClick={() => setZoom(0.55)} title="Restablecer" style={{ fontSize: '10px', fontWeight: '900' }}>FIT</button>
          </>
        )}
      </div>

      {viewMode === 'bracket' ? (
        <div className="bracket-viewport" ref={vpRef} onMouseDown={onMouseDown} style={{ height: "65vh" }}>
          <div className="bracket-canvas" style={{ transform: `scale(${zoom})` }}>
            <BCol ids={["P73","P74","P75","P77","P76","P78","P79","P80"]} label="16vos" variant="dieciseis" side="left paired" bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P89","P90","P91","P92"]} label="Octavos" variant="octavos" side="left paired" mt={55} bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P97","P98"]} label="Cuartos" variant="cuartos" side="left paired" mt={155} bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P101"]} label="Semifinal" variant="semi" side="left solo" mt={360} bfm={bfm} scores={scores} openModal={openModal} />
            <div className="bcol center-col">
              <div className="final-wrapper">
                <div className="rnd-hdr final">🏆 Gran Final</div>
                <BracketMatch match={bracket.final} scores={scores} onOpen={openModal} />
              </div>
              <div className="third-place-wrapper">
                <div className="rnd-hdr third">🥉 Tercer Puesto</div>
                <div className="match-third">
                  <BracketMatch match={bracket.thirdMatch} scores={scores} onOpen={openModal} />
                </div>
              </div>
            </div>
            <BCol ids={["P102"]} label="Semifinal" variant="semi" side="right solo" mt={360} bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P99","P100"]} label="Cuartos" variant="cuartos" side="right paired" mt={155} bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P93","P94","P95","P96"]} label="Octavos" variant="octavos" side="right paired" mt={55} bfm={bfm} scores={scores} openModal={openModal} />
            <BCol ids={["P81","P82","P83","P84","P85","P87","P86","P88"]} label="16vos" variant="dieciseis" side="right paired" bfm={bfm} scores={scores} openModal={openModal} />
          </div>
        </div>
      ) : (
        <div className="bracket-list-view" style={{ height: "65vh", overflowY: "auto", padding: "40px" }}>
          <ListSection title="16vos de Final" matches={bracket.r32} scores={scores} openModal={openModal} />
          <ListSection title="Octavos de Final" matches={bracket.qf} scores={scores} openModal={openModal} />
          <ListSection title="Cuartos de Final" matches={bracket.sf4} scores={scores} openModal={openModal} />
          <ListSection title="Semifinales" matches={bracket.sf2} scores={scores} openModal={openModal} />
          <ListSection title="Tercer Puesto" matches={bracket.thirdMatch} scores={scores} openModal={openModal} />
          <ListSection title="Gran Final" matches={bracket.final} scores={scores} openModal={openModal} />
        </div>
      )}
      </div>
    </>
  );
}

PlayoffView.propTypes = {
  bracket: PropTypes.object.isRequired,
  scores: PropTypes.object.isRequired,
  openModal: PropTypes.func.isRequired,
  zoom: PropTypes.number.isRequired,
  setZoom: PropTypes.func.isRequired,
  vpRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  onMouseDown: PropTypes.func,
  allBracketMatches: PropTypes.array.isRequired,
  showToast: PropTypes.func.isRequired
};