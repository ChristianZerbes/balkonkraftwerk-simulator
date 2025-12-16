import csv
from datetime import datetime
from typing import List, Dict, Any


def read_csv(file_path: str) -> List[Dict[str, Any]]:
    """
    Liest eine CSV-Datei ein und gibt eine Liste von Dicts zurück
    """
    results = []

    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append(row)

    return results


def calculate_differences(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Berechnet Differenzen zwischen aufeinanderfolgenden Einträgen
    """
    # ACHTUNG: isValidNumber ist bewusst nicht implementiert (kommt später)
    cleaned = [e for e in entries if isValidNumber(e["state"])]

    result = []

    for i in range(len(cleaned) - 1):
        curr = cleaned[i]
        next_ = cleaned[i + 1]

        state_diff = float(next_["state"]) - float(curr["state"])

        t1 = datetime.fromisoformat(curr["last_changed"].replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(next_["last_changed"].replace("Z", "+00:00"))

        time_diff_seconds = (t2 - t1).total_seconds()
        time_diff_hours = time_diff_seconds / 3600

        result.append({
            "from_index": i,
            "to_index": i + 1,
            "state_difference": state_diff,
            "time_difference_seconds": time_diff_seconds,
            "time_difference_hours": time_diff_hours,
            "watt": float(curr["state"]),
            "kW": float(curr["state"]) / 1000
        })

    return result


def calculate_kwh(entries: List[Dict[str, Any]]) -> float:
    """
    Summiert kWh aus Leistungs- und Zeitdifferenzen
    """
    kwh = 0.0
    for entry in entries:
        kwh += entry["kW"] * entry["time_difference_hours"]
    return kwh


# Beispiel (optional, kann später entfernt werden)
if __name__ == "__main__":
    data = read_csv("./data/history-2.csv")
    diffs = calculate_differences(data)
    print(diffs)
    print(calculate_kwh(diffs))
