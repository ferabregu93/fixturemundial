import React from "react";
import PropTypes from "prop-types";
import { TEAMS } from "./data";

export default function ThirdsView({ allThirds }) {
  return (
    <div className="thirds-container">
      <div className="thirds-legend">
        <div className="legend-title">📋 Cómo se seleccionan los 8 mejores terceros</div>
        <div className="legend-text">
          <p>
            Según el Anexo C del reglamento de la FIFA, <strong>solo los 8 mejores terceros clasifican</strong> a la ronda de 32avos. 
            Se ordenan por:
          </p>
          <ol>
            <li><strong>Puntos</strong> (ganador: 3 pts, empate: 1 pt)</li>
            <li><strong>Diferencia de goles</strong> (goles a favor - goles en contra)</li>
            <li><strong>Goles a favor</strong></li>
            <li><strong>Fair Play</strong> (menos tarjetas amarillas y rojas)</li>
            <li><strong>Ranking FIFA</strong> (como último criterio de desempate)</li>
          </ol>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            ℹ️ Los terceros con fondo rojo están fuera de competencia.
          </p>
        </div>
      </div>

      <div className="thirds-grid">
        {allThirds.map((t, i) => (
          <div key={t.id} className={`third-card ${i >= 8 ? "cut" : ""}`}>
            <div className="trk">{i >= 8 ? "—" : i + 1}</div>
            <div className="tinfo">
              <div className="tnm">
                <span style={{ fontSize: '18px', marginRight: '8px' }}>{TEAMS[t.id]?.flag}</span>
                <span className="code">{t.id}</span> 
                <span className="fullname">{TEAMS[t.id]?.name || t.id}</span>
              </div>
              <div className="tpts">{t.pts}pts · DG {t.dg > 0 ? `+${t.dg}` : t.dg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ThirdsView.propTypes = {
  allThirds: PropTypes.array.isRequired
};