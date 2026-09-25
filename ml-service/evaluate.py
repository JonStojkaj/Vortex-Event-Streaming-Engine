import pandas as pd
from sklearn.metrics import classification_report
import joblib

print("Lade Daten und Modell...")
df = pd.read_csv('data/creditcard.csv') 
X = df.drop('Class', axis=1)
y = df['Class']

model = joblib.load('fraud_model.joblib')

print("Führe Evaluation durch...\n")
y_pred = model.predict(X)

print(classification_report(y, y_pred, target_names=['Legitimate', 'Fraud']))