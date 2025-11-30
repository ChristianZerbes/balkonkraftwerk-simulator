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

    let normierterAkkuLadestand = result[0].akkuLadestand
    let simulierterAkkuLadestand = result[0].akkuLadestand

    return result.map((entry, index) => {
        const solarleistung = Number(entry.solarleistung) || 0;
        const gesamtVerbrauch = Number(entry.gesamtVerbrauch) || 0;

        const simulierteSolarleistung = solarleistung * SOLAR_FAKTOR;

        const tmpSimulierteHausabgabe = Math.min(Math.min(simulierteSolarleistung, gesamtVerbrauch), MAX_HAUSABGABE);


        let simulierteAkkuLadung = Math.min(simulierteSolarleistung - tmpSimulierteHausabgabe, MAX_AKKULADUNG)
        let simulierteAkkuEntladung = Math.min(gesamtVerbrauch, MAX_HAUSABGABE) - tmpSimulierteHausabgabe

        if (index > 0) {
            const t1 = new Date(previousTimestamp);
            const t2 = new Date(entry.timestamp);

            const seconds = (t2 - t1) / 1000;
            const hours = seconds / 3600;

            const ladeEnergie = ((simulierteAkkuLadung * hours) * EFFIZIENZ_AKKU_LADEN);

            if (simulierterAkkuLadestand + ladeEnergie <= MAX_AKKULADESTAND) {
                simulierterAkkuLadestand += ((simulierteAkkuLadung * hours) * EFFIZIENZ_AKKU_LADEN);
            } else {
                simulierterAkkuLadestand = MAX_AKKULADESTAND
                simulierteAkkuLadung = 0
            }

            const entladeEnergie = ((simulierteAkkuEntladung * hours) / getEntladeEffizienz(simulierteAkkuEntladung))

            if (simulierterAkkuLadestand - entladeEnergie > MIN_AKKULADESTAND) {
                simulierterAkkuLadestand -= ((simulierteAkkuEntladung * hours) / getEntladeEffizienz(simulierteAkkuEntladung))
            } else {
                simulierterAkkuLadestand = MIN_AKKULADESTAND
                simulierteAkkuEntladung = 0
            }

        }

        const tmpSimulierterNetzbezug = gesamtVerbrauch - tmpSimulierteHausabgabe;

        const simulierteHausabgabe = tmpSimulierteHausabgabe + simulierteAkkuEntladung
        const simulierterNetzbezug = tmpSimulierterNetzbezug - simulierteAkkuEntladung

        if (index > 0) {
            const t1 = new Date(previousTimestamp);
            const t2 = new Date(entry.timestamp);

            const seconds = (t2 - t1) / 1000;
            const hours = seconds / 3600;

            // W * Stunden = Wh
            normierterAkkuLadestand += ((entry.akkuLadung * hours) * EFFIZIENZ_AKKU_LADEN);
            normierterAkkuLadestand -= ((entry.akkuEntladung * hours) / getEntladeEffizienz(entry.akkuEntladung));
            normierterAkkuLadestand = Math.min(normierterAkkuLadestand, MAX_AKKULADESTAND)
            normierterAkkuLadestand = Math.max(normierterAkkuLadestand, MIN_AKKULADESTAND)

            if (normierterAkkuLadestand - ((entry.akkuEntladung * hours) / getEntladeEffizienz(entry.akkuEntladung)) > MIN_AKKULADESTAND) {

            }
        }

        previousTimestamp = entry.timestamp;
        previousAkkuLadestand = entry.simulierterAkkuLadestand

        return {
            ...entry,
            simulierteSolarleistung,
            tmpSimulierteHausabgabe,
            simulierteAkkuLadung,
            simulierteAkkuEntladung,
            tmpSimulierterNetzbezug,
            simulierteHausabgabe,
            simulierterNetzbezug,
            simulierterAkkuLadestand,
            normierterAkkuLadestand
        };
    });
}

module.exports = { simulate };