import React from "react";
import PropTypes from "prop-types";
import { TEAMS } from "./data";

export default function RankingView({ fullRanking, fixture, scores, allBracketMatches }) {
  const [selectedTeamId, setSelectedTeamId] = React.useState(null);

  const teamMatches = React.useMemo(() => {
    if (!selectedTeamId) return [];
    
    const groupMatches = Object.values(fixture).flat().filter(m => m.home === selectedTeamId || m.away === selectedTeamId);
    const bracketMatches = allBracketMatches.filter(m => m.home === selectedTeamId || m.away === selectedTeamId);
    
    return [...groupMatches, ...bracketMatches].map(m => ({
      ...m,
      score: scores[m.id] || { gh: m.gh, ga: m.ga, winner: null }
    }));
  }, [selectedTeamId, fixture, scores, allBracketMatches]);

  const selectedTeam = selectedTeamId ? TEAMS[selectedTeamId] : null;

  return (
    <div className="ranking-container">
    <div className="gcard ranking-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="ghead">
        <div className="gltr" style={{ fontSize: '20px' }}>TABLA GENERAL DEL TORNEO</div>
      </div>
      <div className="gtbl" style={{ overflowX: 'auto' }}>
        <div className="trow rank-header">
          <span>POS</span>
          <span className="tc">Selección</span>
          <span className="st round-col">Ronda</span>
          <span className="st stat-col">PJ</span>
          <span className="st stat-col">PTS</span>
          <span className="st stat-col">DG</span>
          <span className="st stat-col">GF</span>
        </div>
        {fullRanking.map((team, i) => (
          <div key={team.id} className={`trow interactive ${i < 4 ? "ql" : team.round > 1 ? "th" : "el"}`} onClick={() => setSelectedTeamId(team.id)}>
            <span className="pn">{i + 1}</span>
            <span className="tc">
              <span className="tn">
                <span className="tf">{TEAMS[team.id]?.flag}</span>
                <span className="code">{team.id}</span>
                <span className="fullname">{TEAMS[team.id]?.name || team.id}</span>
              </span>
            </span>
            <span className="st round-col" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{team.roundName}</span>
            <span className="st stat-col">{team.pj}</span>
            <span className="st stat-col pts">{team.pts}</span>
            <span className="st stat-col">{team.dg >= 0 ? `+${team.dg}` : team.dg}</span>
            <span className="st stat-col">{team.gf}</span>
          </div>
        ))}
      </div>
    </div>

    {selectedTeamId && (
      <div className="overlay" onClick={() => setSelectedTeamId(null)}>
        <div className="modal history-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-title">
            Historial: {selectedTeam?.flag} {selectedTeam?.name}
          </div>
          <div className="history-list">
            {teamMatches.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Sin partidos registrados</p>
            ) : (
              teamMatches.map(m => {
                const isHome = m.home === selectedTeamId;
                const opponentId = isHome ? m.away : m.home;
                const opp = TEAMS[opponentId];
                const myG = isHome ? m.score.gh : m.score.ga;
                const oppG = isHome ? m.score.ga : m.score.gh;
                const isWin = m.score.winner === selectedTeamId || (!m.score.winner && parseInt(myG) > parseInt(oppG));
                const isLoss = (m.score.winner && m.score.winner !== selectedTeamId) || (!m.score.winner && parseInt(myG) < parseInt(oppG));

                return (
                  <div key={m.id} className="history-item">
                    <div className="history-meta">{m.label || "Fase de Grupos"}</div>
                    <div className="history-main">
                      <div className="h-team">
                        {selectedTeam?.flag} {selectedTeamId}
                      </div>
                      <div className={`h-score ${isWin ? 'win' : isLoss ? 'loss' : ''}`}>
                        {myG || 0} - {oppG || 0}
                        {isPenalty(m.score) && <span className="penal-tag">{m.score.winner === selectedTeamId ? ' (pen.)' : ''}</span>}
                      </div>
                      <div className="h-team" style={{ textAlign: 'right' }}>
                        {opp?.flag} {opponentId}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button className="mbtn cancel" style={{ marginTop: '20px', width: '100%' }} onClick={() => setSelectedTeamId(null)}>Cerrar</button>
        </div>
      </div>
    )}
    </div>
  );
}

const isPenalty = (s) => s.winner && s.gh !== "" && s.ga !== "" && parseInt(s.gh) === parseInt(s.ga);

RankingView.propTypes = {
  fullRanking: PropTypes.array.isRequired,
  fixture: PropTypes.object.isRequired,
  scores: PropTypes.object.isRequired,
  allBracketMatches: PropTypes.array.isRequired
};