const { readHomeAssistantFile } = require('./readHomeAssistantFile');
const { calculateKwhFromResult } = require('./calculateEnergy');
const { exportToCsv } = require('./export');
const { simulate } = require('./simulate');
const path = require('path');

async function run() {
    const filePath = path.join(__dirname, '..', 'data', 'history-6.csv');
    const result = readHomeAssistantFile(filePath);

    const kWhNetz = calculateKwhFromResult(result, "netzbezug");
    const kWhSolar = calculateKwhFromResult(result, "solarleistung");
    const kwHVerbrauch = calculateKwhFromResult(result, "gesamtVerbrauch");
    const akkuLadung = calculateKwhFromResult(result, "akkuLadung");
    const akkuEntladung = calculateKwhFromResult(result, "akkuEntladung");

    // console.log("Netzbezug kWh:", kWhNetz);
    // console.log("Solarleistung kWh:", kWhSolar);
    // console.log("Gesamtverbrauch", kwHVerbrauch);
    // console.log("Akku Ladung", akkuLadung);
    // console.log("Akku Entladung", akkuEntladung);

    const simulated = simulate(result);

    exportToCsv(simulated, path.join(__dirname, '..', 'output', 'output.csv'));

}

run();