FROM python:3.10-slim

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY fraud_model.joblib .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]