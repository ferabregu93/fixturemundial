import React from "react";
import PropTypes from "prop-types";
import { TEAMS } from "./data";

export default function ThirdsView({ allThirds }) {
  return (
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
  );
}

ThirdsView.propTypes = {
  allThirds: PropTypes.array.isRequired
};