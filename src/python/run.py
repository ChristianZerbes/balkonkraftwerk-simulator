import csv
from datetime import datetime, timedelta
import os

# == getEntladeEffizienz.js ==
ENTLADE_EFFIZIENZ_MAP = [
    (0,   100, 0.70),
    (100, 200, 0.76),
    (200, 500, 0.82),
    (500, 800, 0.92)
]

def get_entlade_effizienz(watt):
    watt = float(watt) if watt is not None else 0
    for minval, maxval, eff in ENTLADE_EFFIZIENZ_MAP:
        if minval <= watt < maxval:
            return eff
    return ENTLADE_EFFIZIENZ_MAP[-1][2]

# == readHomeAssistantFile.js ==

ENTITY_MAP = {
    "sensor.shelly_pro_3_em_netzbezug": "netzbezug",
    "sensor.solarbank_3_e2700_pro_ac_hausabgabe": "hausabgabe",
    "sensor.solarbank_3_e2700_pro_solarleistung": "solarleistung",
    "sensor.anker_solix_akku_ladung": "akkuLadung",
    "sensor.anker_solix_akku_entladung": "akkuEntladung",
    "sensor.solarbank_3_e2700_pro_akkuenergie": "akkuLadestand"
}

def read_csv(file_path):
    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)[1:]  # skip header
    data = []
    for row in rows:
        if len(row) < 3:
            continue
        ent = row[0].strip()
        ent = ENTITY_MAP.get(ent, ent)
        try:
            val = float(row[1])
        except Exception:
            continue
        data.append({
            'entity_id': ent,
            'state': val,
            'last_changed': row[2].strip()
        })
    return data

def format_german_timestamp(ts):
    # expects string or datetime
    if not isinstance(ts, datetime):
        ts = datetime.fromisoformat(str(ts))
    # For ISO + ms + offset
    offset = timedelta(minutes = -ts.utcoffset().total_seconds() / 60) if ts.utcoffset() else timedelta()
    local_time = ts + offset
    ms = f"{ts.microsecond//1000:03d}" if hasattr(ts, 'microsecond') else "000"
    tz = local_time.strftime('%z')
    sign = "+" if int(tz) >= 0 else "-"
    hours = f"{abs(int(tz)//100):02d}" if tz else "01"
    minutes = f"{abs(int(tz)%100):02d}" if tz else "00"
    return local_time.strftime(f"%Y-%m-%dT%H:%M:%S.{ms}{sign}{hours}:{minutes}")

def build_time_series(entries):
    sorted_entries = sorted(
        [{'entity_id': e['entity_id'], 'state': e['state'], 'ts': datetime.fromisoformat(e['last_changed'])}
            for e in entries],
        key=lambda e: e['ts'])
    all_entities = list(set(e['entity_id'] for e in sorted_entries))
    last_known = {ent: None for ent in all_entities}
    result = []
    buffer = []
    if not sorted_entries: return []
    current_ts = sorted_entries[0]['ts']
    def apply_group(group, ts):
        for row in group:
            last_known[row['entity_id']] = row['state']
        snapshot = {'timestamp': ts.isoformat()}
        for ent in all_entities:
            snapshot[ent] = last_known[ent]
        result.append(snapshot)
    for row in sorted_entries:
        if row['ts'] == current_ts:
            buffer.append(row)
        else:
            apply_group(buffer, current_ts)
            buffer = [row]
            current_ts = row['ts']
    apply_group(buffer, current_ts)
    # Zusatz: gesamtVerbrauch
    for r in result:
        try:
            if r.get('netzbezug') is not None and r.get('hausabgabe') is not None:
                r['gesamtVerbrauch'] = r['netzbezug'] + r['hausabgabe']
            else:
                r['gesamtVerbrauch'] = None
        except:
            r['gesamtVerbrauch'] = None
    # Extra: Akku Ladestand fürs Simulieren
    for r in result:
        if 'akkuLadestand' not in r:
            r['akkuLadestand'] = None
    return result

def read_home_assistant_file(file_path):
    return build_time_series(read_csv(file_path))

# == calculateEnergy.js ==
def calculate_kwh_from_result(result, entity):
    if not result or len(result) < 2:
        raise Exception("Result array hat nicht genug Einträge.")
    if entity not in result[0]:
        raise Exception(f'Entität "{entity}" existiert nicht im result Array.')
    total_kwh = 0
    for i in range(len(result) - 1):
        curr = result[i]
        next_ = result[i+1]
        watt = curr.get(entity)
        if not isinstance(watt, (float, int)): continue
        try:
            t1 = datetime.fromisoformat(curr['timestamp'])
            t2 = datetime.fromisoformat(next_['timestamp'])
        except Exception:
            continue
        seconds = (t2-t1).total_seconds()
        hours = seconds / 3600
        kW = watt / 1000
        total_kwh += kW * hours
    return total_kwh

# == simulate.js ==
SOLAR_FAKTOR = 2
MAX_HAUSABGABE = 800
MAX_AKKULADUNG = 3600
MIN_AKKULADESTAND = 268
MAX_AKKULADESTAND = 4100
EFFIZIENZ_AKKU_LADEN = 0.88

def simulate(result):
    previous_ts = None
    simulierter_akku_ladestand = result[0].get('akkuLadestand', 0) or 0
    normierter_akku_ladestand = result[0].get('akkuLadestand', 0) or 0
    simulated_rows = []

    for i, entry in enumerate(result):
        solarleistung = float(entry.get("solarleistung") or 0)
        gesamt_verb = float(entry.get("gesamtVerbrauch") or 0)
        simulierte_solarleistung = solarleistung * SOLAR_FAKTOR
        tmp_simulierte_hausabgabe = min(min(simulierte_solarleistung, gesamt_verb), MAX_HAUSABGABE)
        simulierte_akku_ladung = max(min(simulierte_solarleistung - tmp_simulierte_hausabgabe, MAX_AKKULADUNG), 0)
        simulierte_akku_entladung = max(min(min(gesamt_verb, MAX_HAUSABGABE) - tmp_simulierte_hausabgabe, MAX_AKKULADUNG), 0)
        if i > 0 and previous_ts is not None:
            t1 = previous_ts
            t2 = datetime.fromisoformat(entry['timestamp'])
            seconds = (t2-t1).total_seconds()
            hours = seconds/3600
            lade_energie = simulierte_akku_ladung * hours * EFFIZIENZ_AKKU_LADEN
            if simulierter_akku_ladestand + lade_energie <= MAX_AKKULADESTAND:
                simulierter_akku_ladestand += lade_energie
            else:
                simulierter_akku_ladestand = MAX_AKKULADESTAND
                simulierte_akku_ladung = 0
            entlade_e = 0
            eff = get_entlade_effizienz(simulierte_akku_entladung)
            if eff > 0:
                entlade_e = (simulierte_akku_entladung * hours) / eff
            if simulierter_akku_ladestand - entlade_e > MIN_AKKULADESTAND:
                simulierter_akku_ladestand -= entlade_e
            else:
                simulierter_akku_ladestand = MIN_AKKULADESTAND
                simulierte_akku_entladung = 0
            # Exakte Normalisierung wie im Original (nicht verwendet, demo)
            try:
                n_akku_ladung = entry.get('akkuLadung', 0) or 0
                n_akku_entladung = entry.get('akkuEntladung', 0) or 0
                n_eff = get_entlade_effizienz(n_akku_entladung)
                normierter_akku_ladestand += n_akku_ladung * hours * EFFIZIENZ_AKKU_LADEN
                if n_eff > 0:
                    normierter_akku_ladestand -= n_akku_entladung * hours / n_eff
                normierter_akku_ladestand = min(normierter_akku_ladestand, MAX_AKKULADESTAND)
                normierter_akku_ladestand = max(normierter_akku_ladestand, MIN_AKKULADESTAND)
            except Exception:
                pass
            previous_ts = t2
        else:
            if 'timestamp' in entry:
                previous_ts = datetime.fromisoformat(entry['timestamp'])
        tmp_simulierter_netzbezug = gesamt_verb - tmp_simulierte_hausabgabe
        simulierte_hausabgabe = tmp_simulierte_hausabgabe + simulierte_akku_entladung
        simulierter_netzbezug = tmp_simulierter_netzbezug - simulierte_akku_entladung
        simulierte_verpuffte_solarleistung = 0
        if simulierte_akku_ladung == 0:
            simulierte_verpuffte_solarleistung = max(simulierte_solarleistung - simulierte_hausabgabe, 0)
        simulated_entry = dict(entry)
        simulated_entry.update({
            'simulierteSolarleistung': simulierte_solarleistung,
            'tmpSimulierteHausabgabe': tmp_simulierte_hausabgabe,
            'simulierteAkkuLadung': simulierte_akku_ladung,
            'simulierteVerpuffteSolarleistung': simulierte_verpuffte_solarleistung,
            'simulierteAkkuEntladung': simulierte_akku_entladung,
            'tmpSimulierterNetzbezug': tmp_simulierter_netzbezug,
            'simulierteHausabgabe': simulierte_hausabgabe,
            'simulierterNetzbezug': simulierter_netzbezug,
            'simulierterAkkuLadestand': simulierter_akku_ladestand,
            'normierterAkkuLadestand': normierter_akku_ladestand
        })
        simulated_rows.append(simulated_entry)
    return simulated_rows

# == export.js ==
def export_to_csv(data, file_path):
    if not data:
        raise Exception("Datenarray ist leer.")
    keys = list(data[0].keys())
    with open(file_path, "w", encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys, delimiter=';')
        writer.writeheader()
        for row in data:
            writer.writerow({k: row.get(k, "") for k in keys})

# == "run.js" ==

def print_simulation_table(real, simulated):
    def r(val):
        return f"{val:.2f}" if isinstance(val, (float, int)) else val
    def d(real, sim):
        try:
            return f"{sim - real:.2f}"
        except:
            return ""
    table = [
        {
            "Messwert": "Netzbezug (kWh)",
            "Real": r(real['netz']),
            "Simuliert": r(simulated['netz']),
            "Differenz": d(real['netz'], simulated['netz'])
        },
        {
            "Messwert": "Solarleistung (kWh)",
            "Real": r(real['solar']),
            "Simuliert": r(simulated['solar']),
            "Differenz": d(real['solar'], simulated['solar'])
        },
        {
            "Messwert": "Gesamtverbrauch (kWh)",
            "Real": r(real['verbrauch']),
            "Simuliert": "",
            "Differenz": ""
        },
        {
            "Messwert": "Hausabgabe (kWh)",
            "Real": r(real['hausabgabe']),
            "Simuliert": r(simulated['hausabgabe']),
            "Differenz": d(real['hausabgabe'], simulated['hausabgabe'])
        },
        {
            "Messwert": "Akku Ladung (kWh)",
            "Real": r(real['akku_ladung']),
            "Simuliert": r(simulated['akku_ladung']),
            "Differenz": d(real['akku_ladung'], simulated['akku_ladung'])
        },
        {
            "Messwert": "Akku Entladung (kWh)",
            "Real": r(real['akku_entladung']),
            "Simuliert": r(simulated['akku_entladung']),
            "Differenz": d(real['akku_entladung'], simulated['akku_entladung'])
        },
        {
            "Messwert": "Verpuffte Solarleistung",
            "Real": "",
            "Simuliert": r(simulated['verpuffte']),
            "Differenz": ""
        }
    ]
    print("\n==== Simulationsergebnisse ====\n")
    for row in table:
        print(f"{row['Messwert']:30s} | {row['Real']:>10} | {row['Simuliert']:>10} | {row['Differenz']:>10}")

def main():
    # Beispiel: Dateiname und Ordner ggf. anpassen!
    date = "tmp_2025-12-12"
    file_path = os.path.join("data", date + ".csv")
    output_path = os.path.join("output", f"result_{date}.csv")
    result = read_home_assistant_file(file_path)

    reals = {
        'netz': calculate_kwh_from_result(result, "netzbezug"),
        'solar': calculate_kwh_from_result(result, "solarleistung"),
        'verbrauch': calculate_kwh_from_result(result, "gesamtVerbrauch"),
        'hausabgabe': calculate_kwh_from_result(result, "hausabgabe"),
        'akku_ladung': calculate_kwh_from_result(result, "akkuLadung"),
        'akku_entladung': calculate_kwh_from_result(result, "akkuEntladung")
    }
    simulated_data = simulate(result)
    sims = {
        'netz': calculate_kwh_from_result(simulated_data, "simulierterNetzbezug"),
        'solar': calculate_kwh_from_result(simulated_data, "simulierteSolarleistung"),
        'hausabgabe': calculate_kwh_from_result(simulated_data, "simulierteHausabgabe"),
        'akku_ladung': calculate_kwh_from_result(simulated_data, "simulierteAkkuLadung"),
        'akku_entladung': calculate_kwh_from_result(simulated_data, "simulierteAkkuEntladung"),
        'verpuffte': calculate_kwh_from_result(simulated_data, "simulierteVerpuffteSolarleistung")
    }

    print_simulation_table(reals, sims)
    os.makedirs("output", exist_ok=True)
    export_to_csv(simulated_data, output_path)
    print(f"\nSimulierte Daten als CSV nach '{output_path}' geschrieben.")

if __name__ == "__main__":
    main()