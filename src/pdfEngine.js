import { jsPDF } from "jspdf";
import { TEAMS } from "./data";

const COORD_MAP = {
  "P73": { home: { x: 20, y: 45 }, away: { x: 80, y: 45 } },
  "P74": { home: { x: 20, y: 55 }, away: { x: 80, y: 55 } },
  "P75": { home: { x: 20, y: 65 }, away: { x: 80, y: 65 } },
  "P76": { home: { x: 20, y: 75 }, away: { x: 80, y: 75 } },
  "P77": { home: { x: 20, y: 85 }, away: { x: 80, y: 85 } },
  "P78": { home: { x: 20, y: 95 }, away: { x: 80, y: 95 } },
  "P79": { home: { x: 20, y: 105 }, away: { x: 80, y: 105 } },
  "P80": { home: { x: 20, y: 115 }, away: { x: 80, y: 115 } },
  "P81": { home: { x: 130, y: 45 }, away: { x: 190, y: 45 } },
  "P82": { home: { x: 130, y: 55 }, away: { x: 190, y: 55 } },
  "P83": { home: { x: 130, y: 65 }, away: { x: 190, y: 65 } },
  "P84": { home: { x: 130, y: 75 }, away: { x: 190, y: 75 } },
  "P85": { home: { x: 130, y: 85 }, away: { x: 190, y: 85 } },
  "P86": { home: { x: 130, y: 95 }, away: { x: 190, y: 95 } },
  "P87": { home: { x: 130, y: 105 }, away: { x: 190, y: 105 } },
  "P88": { home: { x: 130, y: 115 }, away: { x: 190, y: 115 } },
  "P89": { home: { x: 40, y: 50 }, away: { x: 60, y: 50 } },
  "P90": { home: { x: 40, y: 70 }, away: { x: 60, y: 70 } },
  "P91": { home: { x: 40, y: 90 }, away: { x: 60, y: 90 } },
  "P92": { home: { x: 40, y: 110 }, away: { x: 60, y: 110 } },
  "P93": { home: { x: 150, y: 50 }, away: { x: 170, y: 50 } },
  "P94": { home: { x: 150, y: 70 }, away: { x: 170, y: 70 } },
  "P95": { home: { x: 150, y: 90 }, away: { x: 170, y: 90 } },
  "P96": { home: { x: 150, y: 110 }, away: { x: 170, y: 110 } },
  "P97": { home: { x: 50, y: 60 }, away: { x: 70, y: 60 } },
  "P98": { home: { x: 50, y: 100 }, away: { x: 70, y: 100 } },
  "P99": { home: { x: 160, y: 60 }, away: { x: 140, y: 60 } },
  "P100": { home: { x: 160, y: 100 }, away: { x: 140, y: 100 } },
  "P101": { home: { x: 60, y: 80 }, away: { x: 80, y: 80 } },
  "P102": { home: { x: 140, y: 80 }, away: { x: 120, y: 80 } },
  "P103": { home: { x: 105, y: 180 }, away: { x: 125, y: 180 } }, // Tercer Puesto
  "P104": { home: { x: 105, y: 150 }, away: { x: 125, y: 150 } }, // Gran Final
};

export async function generateOfficialPDF(bracket, userName, debugMode = false) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(9);
  
  if (debugMode) {
    doc.setTextColor(255, 0, 0);
    Object.entries(COORD_MAP).forEach(([matchId, pos]) => {
      doc.text(`${matchId}-L`, pos.home.x, pos.home.y);
      doc.text(`${matchId}-V`, pos.away.x, pos.away.y);
    });
    doc.save("Calibracion_Coordenadas.pdf");
    return;
  }

  doc.setTextColor(0, 0, 0);
  const allMatches = [
    ...(bracket.r32 || []), ...(bracket.qf || []), 
    ...(bracket.sf4 || []), ...(bracket.sf2 || []), 
    bracket.final, bracket.thirdMatch
  ];

  allMatches.forEach(match => {
    if (!match) return;
    const coords = COORD_MAP[match.id];
    if (coords) {
      const isUndefined = (id) => id === "---" || id === "TBD" || !id;
      const homeName = isUndefined(match.home) ? "" : match.home;
      const awayName = isUndefined(match.away) ? "" : match.away;
      doc.text(homeName, coords.home.x, coords.home.y);
      doc.text(awayName, coords.away.x, coords.away.y);
    }
  });

  doc.save(`Fifa_WorldCup2026_${userName || "Oficial"}.pdf`);
}