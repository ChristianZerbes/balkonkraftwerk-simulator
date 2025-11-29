// Dynamische Mappingtabelle für Entladeeffizienz
const entladeEffizienzMap = [
    { min: 0, max: 100, eff: 0.70 },
    { min: 100, max: 200, eff: 0.76 },
    { min: 200, max: 500, eff: 0.82 },
    { min: 500, max: 800, eff: 0.92 }
];

/**
 * Berechnet die Entladeeffizienz basierend auf der Leistung (W)
 * @param {Number} watt - aktuelle Entladeleistung in Watt
 * @returns {Number} Effizienz zwischen 0 und 1
 */
function getEntladeEffizienz(watt) {
    watt = Number(watt) || 0;

    for (const zone of entladeEffizienzMap) {
        if (watt >= zone.min && watt < zone.max) {
            return zone.eff;
        }
    }

    // Falls außerhalb des Bereiches → letztes Intervall nehmen
    return entladeEffizienzMap[entladeEffizienzMap.length - 1].eff;
}

module.exports = { getEntladeEffizienz };
