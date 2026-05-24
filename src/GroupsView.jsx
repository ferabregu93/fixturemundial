import React from "react";
import PropTypes from "prop-types";
import { GROUPS, TEAMS } from "./data";

export default function GroupsView({ allTables, fixture, setGroupScore, hoveredTeam, setHoveredTeam }) {
  return (
    <div className="gg">
      {Object.entries(GROUPS).map(([grp]) => (
        <div key={grp} className="gcard">
          <div className="ghead">
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8, alignItems: 'center' }}>
              <div className="glabel">Grupo {grp}</div>
              <div style={{ display: 'flex', gap: 15, width: '100%', justifyContent: 'center' }}>
                {GROUPS[grp].teams.map(t => (
                  <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 45, gap: 2 }}>
                    <div style={{ fontSize: '18px' }}>{TEAMS[t]?.flag}</div>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--gold)' }}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="gtbl">
            <div className="trow" style={{ fontWeight: '800', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', marginBottom: '8px', paddingBottom: '4px' }}>
              <span>#</span>
              <span className="tc">Equipo</span>
              <span className="st">PJ</span>
              <span className="st">PTS</span>
              <span className="st">GF</span>
              <span className="st">GC</span>
              <span className="st">DG</span>
            </div>
            {allTables[grp].map((row, i) => (
              <div key={row.id} className={`trow ${i < 2 ? "ql" : i === 2 ? "th" : "el"}`}>
                <span className="pn">{i + 1}</span>
                <span className="tc">
                  <span className="tn">
                    <span className="tf">{TEAMS[row.id]?.flag}</span>
                    <span className="code">{row.id}</span>
                    <span className="fullname">{TEAMS[row.id]?.name || row.id}</span>
                  </span>
                </span>
                <span className="st">{row.pj}</span>
                <span className="st pts">{row.pts}</span>
                <span className="st">{row.gf}</span>
                <span className="st">{row.gc}</span>
                <span className="st">{row.dg >= 0 ? `+${row.dg}` : row.dg}</span>
              </div>
            ))}
          </div>
          <div className="msec">
            <div className="msec-title">Edición de Resultados</div>
            {fixture[grp].map((m, i) => (
              <div key={m.id} className="mrow">
                <div className="mt">
                  <span style={{ marginRight: '6px' }}>{TEAMS[m.home]?.flag}</span>
                  <span className="code">{m.home}</span>
                </div>
                <div className="sbox">
                  <div className="sbox-stepper">
                    <button className="step-btn" onClick={() => setGroupScore(grp, i, "gh", (Math.max(0, (parseInt(m.gh) || 0) - 1)).toString())}>▾</button>
                    <input type="number" className="sinput with-stepper" value={m.gh} onChange={e => setGroupScore(grp, i, "gh", e.target.value)} />
                    <button className="step-btn" onClick={() => setGroupScore(grp, i, "gh", (Math.min(99, (parseInt(m.gh) || 0) + 1)).toString())}>▴</button>
                  </div>
                  <span className="ssep">:</span>
                  <div className="sbox-stepper">
                    <button className="step-btn" onClick={() => setGroupScore(grp, i, "ga", (Math.max(0, (parseInt(m.ga) || 0) - 1)).toString())}>▾</button>
                    <input type="number" className="sinput with-stepper" value={m.ga} onChange={e => setGroupScore(grp, i, "ga", e.target.value)} />
                    <button className="step-btn" onClick={() => setGroupScore(grp, i, "ga", (Math.min(99, (parseInt(m.ga) || 0) + 1)).toString())}>▴</button>
                  </div>
                </div>
                <div className="mt aw">
                  <span className="code">{m.away}</span>
                  <span style={{ marginLeft: '6px' }}>{TEAMS[m.away]?.flag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

GroupsView.propTypes = {
  allTables: PropTypes.object.isRequired,
  fixture: PropTypes.object.isRequired,
  setGroupScore: PropTypes.func.isRequired,
  hoveredTeam: PropTypes.string,
  setHoveredTeam: PropTypes.func
};