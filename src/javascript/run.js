const { readHomeAssistantFile } = require('./readHomeAssistantFile');
const { calculateKwhFromResult } = require('./calculateEnergy');
const { exportToCsv } = require('./export');
const { simulate } = require('./simulate');
const path = require('path');

function printSimulationTable({
    kWhNetz,
    kWhSolar,
    kwHVerbrauch,
    hausabgabe,
    akkuLadung,
    akkuEntladung,

    simulatedKWhNetz,
    simulatedSolarleistung,
    simulierteAkkuLadung,
    simulierteAkkuEntladung,
    simulierteHausabgabe,
    simulierteVerpuffteSolarleistung
}) {

    const r = (v) => (typeof v === "number" ? v.toFixed(2) : v);
    const d = (real, sim) =>
        (typeof real === "number" && typeof sim === "number")
            ? (sim - real).toFixed(2)
            : "";

    const table = [
        {
            Messwert: "Netzbezug (kWh)",
            Real: r(kWhNetz),
            Simuliert: r(simulatedKWhNetz),
            Differenz: d(kWhNetz, simulatedKWhNetz)
        },
        {
            Messwert: "Solarleistung (kWh)",
            Real: r(kWhSolar),
            Simuliert: r(simulatedSolarleistung),
            Differenz: d(kWhSolar, simulatedSolarleistung)
        },
        {
            Messwert: "Gesamtverbrauch (kWh)",
            Real: r(kwHVerbrauch),
            Simuliert: "",
            Differenz: ""
        },
        {
            Messwert: "Hausabgabe (kWh)",
            Real: r(hausabgabe),
            Simuliert: r(simulierteHausabgabe),
            Differenz: d(hausabgabe, simulierteHausabgabe)
        },
        {
            Messwert: "Akku Ladung (kWh)",
            Real: r(akkuLadung),
            Simuliert: r(simulierteAkkuLadung),
            Differenz: d(akkuLadung, simulierteAkkuLadung)
        },
        {
            Messwert: "Akku Entladung (kWh)",
            Real: r(akkuEntladung),
            Simuliert: r(simulierteAkkuEntladung),
            Differenz: d(akkuEntladung, simulierteAkkuEntladung)
        },
        {
            Messwert: "Verpuffte Solarleistung",
            Real: "",
            Simuliert: r(simulierteVerpuffteSolarleistung),
            Differenz: ""
        }
    ];

    console.log("\n==== Simulationsergebnisse ====\n");
    console.table(table);
}



async function run() {
    const date = "tmp_2025-12-12"
    const filePath = path.join(__dirname, '../..', 'data', date + '.csv');
    const result = readHomeAssistantFile(filePath);

    const kWhNetz = calculateKwhFromResult(result, "netzbezug");
    const kWhSolar = calculateKwhFromResult(result, "solarleistung");
    const kwHVerbrauch = calculateKwhFromResult(result, "gesamtVerbrauch");
    const akkuLadung = calculateKwhFromResult(result, "akkuLadung");
    const akkuEntladung = calculateKwhFromResult(result, "akkuEntladung");
    const hausabgabe = calculateKwhFromResult(result, "hausabgabe")

    const simulated = simulate(result)

    const simulatedKWhNetz = calculateKwhFromResult(simulated, "simulierterNetzbezug");
    const simulatedSolarleistung = calculateKwhFromResult(simulated, "simulierteSolarleistung");
    const simulierteAkkuLadung = calculateKwhFromResult(simulated, "simulierteAkkuLadung");
    const simulierteAkkuEntladung = calculateKwhFromResult(simulated, "simulierteAkkuEntladung");
    const simulierteHausabgabe = calculateKwhFromResult(simulated, "simulierteHausabgabe");
    const simulierteVerpuffteSolarleistung = calculateKwhFromResult(simulated, "simulierteVerpuffteSolarleistung");

    printSimulationTable({
        kWhNetz,
        kWhSolar,
        kwHVerbrauch,
        hausabgabe,
        akkuLadung,
        akkuEntladung,

        simulatedKWhNetz,
        simulatedSolarleistung,
        simulierteAkkuLadung,
        simulierteAkkuEntladung,
        simulierteHausabgabe,
        simulierteVerpuffteSolarleistung
    });

    exportToCsv(simulated, path.join(__dirname, '../..', 'output', 'result ' + date + '.csv'));

}

run();