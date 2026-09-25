import os
import pandas as pd
import requests
import time
import random

# 1. Kugelsichere Pfad-Auflösung (egal von wo das Skript gestartet wird)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'replay_stream.csv')

print(f"1. Lade Daten absolut aus: {CSV_PATH}")
try:
    df = pd.read_csv(CSV_PATH)
except FileNotFoundError:
    print(f"FEHLER: Datei nicht gefunden unter {CSV_PATH}. Hast du train.py ausgeführt?")
    exit(1)

url = "http://localhost:8080/api/ingest"
print(f"2. Starte dynamische Datenpumpe. Sende an {url}...")

spike_events_left = 0

for index, row in df.iterrows():
    payload = row.to_dict()
    
    # 2. Generiere künstliche Transaction ID
    txn_hex = f"{random.randint(0, 0xFFFFFF):06x}".upper()
    payload['transaction_id'] = f"TXN-{txn_hex}"
    
    try:
        res = requests.post(url, json=payload, timeout=2)
        print(f"Event {index} ({payload['transaction_id']}) -> HTTP {res.status_code}")
    except requests.exceptions.ConnectionError:
        print("FEHLER: Java-Backend ist nicht erreichbar! Läuft der Docker-Container?")
        break
    except requests.exceptions.Timeout:
        print("FEHLER: Java-Backend antwortet nicht (Timeout)! Es steckt fest.")
        break
    
    # 3. Dynamischer Traffic Simulator (EKG-Muster)
    if spike_events_left > 0:
        # Während eines Spikes keine Pause
        spike_events_left -= 1
        time.sleep(0)
    else:
        # Normale Pause (50 bis 200 Millisekunden)
        time.sleep(random.uniform(0.05, 0.2))
        
        # 5% Chance, einen neuen Traffic-Spike auszulösen
        if random.random() < 0.05:
            spike_events_left = random.randint(15, 40)
            print(f"🚀 TRAFFIC SPIKE: Feuere die nächsten {spike_events_left} Events ohne Pause!")