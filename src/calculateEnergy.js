
/**
 * Berechnet kWh aus einem result-Array aus readHomeAssistantFile()
 * @param {Array} result - Das result-Array
 * @param {String} entity - z.B. "netzbezug", "hausabgabe", "solarleistung" ...
 * @returns {Number} kWh
 */
function calculateKwhFromResult(result, entity) {
    if (!result || result.length < 2) {
        throw new Error("Result array hat nicht genug Einträge.");
    }

    if (!result[0].hasOwnProperty(entity)) {
        throw new Error(`Entität "${entity}" existiert nicht im result Array.`);
    }

    let totalKwh = 0;

    for (let i = 0; i < result.length - 1; i++) {
        const curr = result[i];
        const next = result[i + 1];

        const watt = Number(curr[entity]);           // aktueller Wert
        if (!Number.isFinite(watt)) continue;        // ungültige Werte überspringen

        const t1 = new Date(curr.timestamp);
        const t2 = new Date(next.timestamp);

        const seconds = (t2 - t1) / 1000;
        const hours = seconds / 3600;

        const kW = watt / 1000;
        totalKwh += kW * hours;
    }

    return totalKwh;
}

module.exports = { calculateKwhFromResult };