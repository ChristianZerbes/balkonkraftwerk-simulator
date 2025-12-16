const fs = require('fs');
const path = require('path');

/**
 * Konvertiert ein Array von Objekten in eine CSV-Datei.
 * @param {Array} data - result-Array
 * @param {String} filePath - Pfad zur Ausgabedatei
 */
function exportToCsv(data, filePath) {
    if (!data || data.length === 0) {
        throw new Error("Datenarray ist leer.");
    }

    // Alle Keys sammeln (Spaltenüberschriften)
    const keys = Object.keys(data[0]);

    // CSV: Header
    let csv = keys.join(';') + '\r\n';  // Excel unter Windows liebt Semikolon

    // CSV: Zeilen
    for (const row of data) {
        const values = keys.map(key => {
            let value = row[key];

            // null/undefined -> leer
            if (value === null || value === undefined) return "";

            // Strings die Kommas, Semikolons oder Quotes enthalten → maskieren
            value = String(value);
            if (value.includes('"') || value.includes(';')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }

            return value;
        });

        csv += values.join(';') + '\r\n';
    }

    // Datei schreiben
    fs.writeFileSync(path.resolve(filePath), csv, 'utf8');
}

module.exports = { exportToCsv };
