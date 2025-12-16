from datetime import datetime
from typing import List, Dict, Any


def calculate_kwh_from_result(result: List[Dict[str, Any]], entity: str) -> float:
    """
    Berechnet kWh aus einem result-Array
    """
    if not result or len(result) < 2:
        raise ValueError("Result array hat nicht genug Einträge.")

    if entity not in result[0]:
        raise ValueError(f'Entität "{entity}" existiert nicht im result Array.')

    total_kwh = 0.0

    for i in range(len(result) - 1):
        curr = result[i]
        next_ = result[i + 1]

        try:
            watt = float(curr[entity])
        except (TypeError, ValueError):
            continue

        t1 = datetime.fromisoformat(curr["timestamp"])
        t2 = datetime.fromisoformat(next_["timestamp"])

        seconds = (t2 - t1).total_seconds()
        hours = seconds / 3600

        kw = watt / 1000
        total_kwh += kw * hours

    return total_kwh
