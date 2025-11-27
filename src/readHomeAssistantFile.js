const fs = require('fs');
const path = require('path');

// ---- CSV Einlesen mit Entity-Mapping ----
function readCSV(filePath) {
    const csv = fs.readFileSync(filePath, 'utf-8').trim().split('\n');

    const rows = csv.slice(1);

    const entityMap = {
        "sensor.shelly_pro_3_em_netzbezug": "netzbezug",
        "sensor.solarbank_3_e2700_pro_ac_hausabgabe": "hausabgabe",
        "sensor.solarbank_3_e2700_pro_solarleistung": "solarleistung",
        "sensor.anker_solix_akku_ladung": "akkuLadung",
        "sensor.anker_solix_akku_entladung": "akkuEntladung",
        "sensor.solarbank_3_e2700_pro_akkuenergie": "akkuLadestand"
    };

    return rows.map(line => {
        const parts = line.split(',');

        let entity_id = parts[0];

        if (entityMap[entity_id]) {
            entity_id = entityMap[entity_id];
        }

        return {
            entity_id,
            state: parts[1],
            last_changed: parts[2]
        };
    });
}

// ---- Timestamp → DE (ISO ähnlich) ----
function formatGermanTimestamp(ts) {
    const dtf = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const parts = dtf.formatToParts(new Date(ts));
    const get = (t) => parts.find(p => p.type === t).value;

    const date = `${get("year")}-${get("month")}-${get("day")}`;
    const time = `${get("hour")}:${get("minute")}:${get("second")}`;

    const offsetMinutes = -new Date(ts).getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

    return `${date}T${time}${sign}${hours}:${minutes}`;
}

// ---- TimeSeries Bauen ----
function buildTimeSeries(entries) {
    const sorted = entries
        .map(e => ({
            entity_id: e.entity_id,
            state: Number(e.state),
            ts: new Date(e.last_changed)
        }))
        .sort((a, b) => a.ts - b.ts);

    const allEntities = [...new Set(sorted.map(e => e.entity_id))];
    const lastKnown = {};
    for (const ent of allEntities) lastKnown[ent] = null;

    const result = [];

    let buffer = [];
    let currentTs = sorted[0]?.ts?.getTime();

    for (const row of sorted) {
        const tsMs = row.ts.getTime();

        if (tsMs === currentTs) {
            buffer.push(row);
        } else {
            applyGroup(buffer, currentTs);
            buffer = [row];
            currentTs = tsMs;
        }
    }

    applyGroup(buffer, currentTs);

    return result;

    function applyGroup(group, tsMs) {
        for (const row of group) {
            lastKnown[row.entity_id] = row.state;
        }

        const germanIso = formatGermanTimestamp(tsMs);

        const snapshot = { timestamp: germanIso };

        for (const ent of allEntities) {
            snapshot[ent] = lastKnown[ent];
        }

        result.push(snapshot);
    }
}

// ---- Exportierte Hauptfunktion ----
function readHomeAssistantFile(relativeFilePath) {
    const filePath = path.resolve(relativeFilePath);

    const data = readCSV(filePath);
    const result = buildTimeSeries(data);

    // Deine Zusatzberechnung
    for (const r of result) {
        if (r.netzbezug != null && r.hausabgabe != null) {
            r.gesamtVerbrauch = r.netzbezug + r.hausabgabe;
        } else {
            r.gesamtVerbrauch = null;
        }
    }

    return result;
}

module.exports = { readHomeAssistantFile };