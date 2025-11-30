const { readHomeAssistantFile } = require('./readHomeAssistantFile');
const { calculateKwhFromResult } = require('./calculateEnergy');
const { exportToCsv } = require('./export');
const { simulate } = require('./simulate');
const path = require('path');

async function run() {
    const filePath = path.join(__dirname, '..', 'data', '2025-11-23.csv');
    const result = readHomeAssistantFile(filePath);

    const kWhNetz = calculateKwhFromResult(result, "netzbezug");
    const kWhSolar = calculateKwhFromResult(result, "solarleistung");
    const kwHVerbrauch = calculateKwhFromResult(result, "gesamtVerbrauch");
    const akkuLadung = calculateKwhFromResult(result, "akkuLadung");
    const akkuEntladung = calculateKwhFromResult(result, "akkuEntladung");
    const hausabgabe = calculateKwhFromResult(result, "hausabgabe")

    console.log("Netzbezug kWh:", kWhNetz);
    console.log("Solarleistung kWh:", kWhSolar);
    console.log("Gesamtverbrauch", kwHVerbrauch);
    console.log("Hausabgabe", hausabgabe)
    console.log("Akku Ladung", akkuLadung);
    console.log("Akku Entladung", akkuEntladung);

    const simulated = simulate(result)

    const simulatedKWhNetz = calculateKwhFromResult(simulated, "simulierterNetzbezug");
    const simulatedSolarleistung = calculateKwhFromResult(simulated, "simulierteSolarleistung");
    const simulierteAkkuLadung = calculateKwhFromResult(simulated, "simulierteAkkuLadung");
    const simulierteAkkuEntladung = calculateKwhFromResult(simulated, "simulierteAkkuEntladung");
    const simulierteHausabgabe = calculateKwhFromResult(simulated, "simulierteHausabgabe");
    const simulierteVerpuffteSolarleistung = calculateKwhFromResult(simulated, "simulierteVerpuffteSolarleistung");

    console.log("Simulierter Netzbezug kWh:", simulatedKWhNetz);
    console.log("Simulierte Solarleistung kWh:", simulatedSolarleistung);
    console.log("Simulierte Akku Ladung", simulierteAkkuLadung);
    console.log("Simulierte Akku Entladung", simulierteAkkuEntladung);
    console.log("Simulierte Hausabgabe", simulierteHausabgabe);
    console.log("Simulierte Verpuffte Solarleistung", simulierteVerpuffteSolarleistung);


    exportToCsv(simulated, path.join(__dirname, '..', 'output', 'output.csv'));

}

run();