import csv
from pathlib import Path
from typing import List, Dict, Any


def export_to_csv(data: List[Dict[str, Any]], file_path: str) -> None:
    """
    Exportiert ein Array von Dicts in eine CSV-Datei (Excel-kompatibel)
    """
    if not data:
        raise ValueError("Datenarray ist leer.")

    path = Path(file_path)
    keys = list(data[0].keys())

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")

        # Header
        writer.writerow(keys)

        # Rows
        for row in data:
            values = []
            for key in keys:
                value = row.get(key)
                if value is None:
                    values.append("")
                else:
                    values.append(str(value))
            writer.writerow(values)
