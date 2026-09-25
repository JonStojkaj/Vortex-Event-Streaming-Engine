import joblib
import pandas as pd
from fastapi import FastAPI


app = FastAPI()
clf = joblib.load('fraud_model.joblib')


@app.post('/predict')
def predict(payload: dict) -> dict:
    feature_columns = ['Time', *[f'V{index}' for index in range(1, 29)], 'Amount']
    features = pd.DataFrame([{column: payload[column] for column in feature_columns}], columns=feature_columns)
    probabilities = clf.predict_proba(features)[0]
    fraud_index = list(clf.classes_).index(1)
    confidence = float(probabilities[fraud_index])
    return {'is_fraud': confidence > 0.85, 'confidence': confidence}