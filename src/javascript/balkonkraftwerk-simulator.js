const fs = require('fs');
const csv = require('csv-parser');

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function calculateDifferences(entries) {
  // Liste bereinigen
  const cleaned = entries.filter(e => isValidNumber(e.state));

  const result = [];

  for (let i = 0; i < cleaned.length - 1; i++) {
    const curr = cleaned[i];
    const next = cleaned[i + 1];

    const stateDiff = Number(next.state) - Number(curr.state);

    const time1 = new Date(curr.last_changed);
    const time2 = new Date(next.last_changed);
    const timeDiffSeconds = (time2 - time1) / 1000;
    const timeDiffHours = timeDiffSeconds / (60 * 60)

    result.push({
      from_index: i,
      to_index: i + 1,
      state_difference: stateDiff,
      time_difference_seconds: timeDiffSeconds,
      time_difference_hours: timeDiffHours,
      watt: curr.state,
      kW: curr.state / 1000
    });
  }

  return result;
}

function calculatekWh(entries) {
  let kWh = 0
  for (const entry of entries) {
    kWh += (entry.kW * entry.time_difference_hours)
  }
  return kWh
}

// Beispiel:
readCsv('./data/history-2.csv').then(json => {
  const differences = calculateDifferences(json)
  console.log(differences)
  const kWh = calculatekWh(differences)
  console.log(kWh)
});
