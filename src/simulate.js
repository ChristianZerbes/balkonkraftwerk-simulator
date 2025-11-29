const { getEntladeEffizienz } = require('./getEntladeEffizienz');

// ---- Konfiguration ----
const SOLAR_FAKTOR = 2;
const MAX_HAUSABGABE = 800;
const MAX_AKKULADUNG = 1800;
const MIN_AKKULADESTAND = 268
const MAX_AKKULADESTAND = 2607
const EFFIZIENZ_AKKU_LADEN = 0.88



/**
 * Erweitert das result-Array um simulierte Werte
 * @param {Array} result - Array aus readHomeAssistantFile()
 * @returns {Array} Neues Array mit zusätzlichen Feldern
 */
function simulate(result) {

    let previousTimestamp = 0

    let initialAkkuLadestand = result[0].akkuLadestand

    return result.map((entry, index) => {
        const solarleistung = Number(entry.solarleistung) || 0;
        const gesamtVerbrauch = Number(entry.gesamtVerbrauch) || 0;

        const simulierteSolarleistung = solarleistung * SOLAR_FAKTOR;

        const simulierteHausabgabe = Math.min(Math.min(simulierteSolarleistung, gesamtVerbrauch), MAX_HAUSABGABE);


        const simulierteAkkuLadung = simulierteSolarleistung - simulierteHausabgabe

        const simulierterNetzbezug = gesamtVerbrauch - simulierteHausabgabe;

        if (index > 0) {
            const t1 = new Date(previousTimestamp);
            const t2 = new Date(entry.timestamp);

            const seconds = (t2 - t1) / 1000;
            const hours = seconds / 3600;

            // W * Stunden = Wh
            initialAkkuLadestand += ((entry.akkuLadung * hours) * EFFIZIENZ_AKKU_LADEN);
            initialAkkuLadestand -= ((entry.akkuEntladung * hours) / getEntladeEffizienz(entry.akkuEntladung));
            initialAkkuLadestand = Math.min(initialAkkuLadestand, MAX_AKKULADESTAND)
            initialAkkuLadestand = Math.max(initialAkkuLadestand, MIN_AKKULADESTAND)
        }

        previousTimestamp = entry.timestamp;

        return {
            ...entry,
            simulierteSolarleistung,
            simulierteHausabgabe,
            simulierteAkkuLadung,
            simulierterNetzbezug,
            initialAkkuLadestand
        };
    });
}

module.exports = { simulate };