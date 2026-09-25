# Vortex Event Streaming Engine

Vortex is a containerized, real-time transaction monitoring platform. It ingests financial events, enriches each event with a machine-learning fraud assessment, persists the result, and distributes the assessed stream to an operational dashboard over STOMP/WebSockets.

The project demonstrates how an event-driven processing path can connect data ingestion, anomaly detection, persistence, and live observability in a single reproducible development environment.

## Why It Exists

Financial transaction systems need to evaluate high-volume event streams without waiting for batch processing. Vortex provides a focused reference architecture for that workflow:

- accept transaction events through an HTTP ingestion API;
- evaluate model features through a dedicated inference service;
- persist the assessed transaction for short-term history and inspection;
- publish the result to subscribed clients in real time; and
- expose throughput and threat activity through a browser-based operations console.

## Architecture

```text
Node.js simulator or historical replay
                |
                v
      Spring Boot ingestion API :8080
          |                 |
          |                 +--> H2 transaction store
          v
   FastAPI inference service :5000
          |
          v
  fraud_model.joblib (Random Forest)

Spring Boot --> STOMP/WebSocket /topic/transactions --> React dashboard
Spring Boot --> STOMP/WebSocket /topic/metrics      --> subscribed clients
```

### Event Processing Flow

1. The Node.js simulator generates synthetic transaction events at a steady interval. `ml-service/pump.py` can alternatively replay the prepared test stream.
2. The Spring Boot API receives the event at `POST /api/ingest` and forwards the model features to the inference service.
3. The FastAPI service extracts `Time`, `V1` through `V28`, and `Amount`, then returns a fraud probability. Events above the configured `0.85` threshold are marked as fraudulent.
4. The backend stores the assessed transaction in an in-memory H2 database and publishes it to `/topic/transactions`.
5. The React client loads recent history through `GET /api/transactions` and subscribes to the live STOMP topic for subsequent events.

The backend also maintains a rolling 60-second metrics window and publishes aggregate stream metrics to `/topic/metrics`.

## Core Capabilities

- Real-time HTTP ingestion and asynchronous client delivery through WebSockets.
- Dedicated Python inference boundary that keeps model execution separate from the Java event-processing layer.
- Random Forest classification over the credit-card dataset's PCA-derived features.
- Short-term transaction persistence with Spring Data JPA and H2.
- Live dashboard with throughput visualization, connection state, transaction history, and flagged-event monitoring.
- Fully containerized local environment orchestrated with Docker Compose.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Event processing API | Java 21, Spring Boot 3.4, Spring Web, Spring Data JPA |
| Real-time delivery | Spring WebSocket, STOMP, in-memory broker |
| Persistence | H2 in-memory database |
| Inference service | Python 3.10, FastAPI, Uvicorn, pandas, scikit-learn, joblib |
| Dashboard | React 19, Vite, Recharts, handwritten CSS |
| Event simulation | Node.js 22 |
| Runtime and delivery | Docker, Docker Compose, Nginx |

## Repository Layout

```text
backend/       Spring Boot API, persistence, stream processing, and WebSocket configuration
frontend/      React operations dashboard and production Nginx image
ml-service/    FastAPI inference endpoint, model artifact, training and replay utilities
simulators/    Node.js synthetic transaction producer
docs/          Project documentation and visual assets
```

## Quickstart

### Prerequisites

- Docker Desktop with Docker Compose
- For optional host-based replay: Python 3.10+ and the packages in `ml-service/requirements.txt`

### Run the full stack

From the repository root:

```bash
docker compose up --build -d
```

The Compose profile starts the backend, inference service, frontend, and synthetic event simulator. Open the dashboard at [http://localhost](http://localhost).

Useful service endpoints:

| Endpoint | Purpose |
| --- | --- |
| `http://localhost` | React dashboard served by Nginx |
| `http://localhost:8080/api/transactions` | Recent transaction history |
| `http://localhost:8080/ws` | STOMP/WebSocket handshake endpoint |
| `http://localhost:5000/predict` | Model inference API |
| `http://localhost:8080/h2-console` | H2 inspection console |

### Replay the prepared stream

The Compose simulator starts automatically. To replay `data/replay_stream.csv` instead, start the backend and inference service and run the pump from the repository root:

```bash
docker compose up --build -d backend ml-service
python3 ml-service/pump.py
```

### Stop the environment

```bash
docker compose down
```

## Model and Data Notes

The supplied model is trained by `ml-service/train.py` using `data/creditcard.csv`. The training utility creates `data/replay_stream.csv` from its test split and serializes the classifier to `fraud_model.joblib`.

The default Compose simulator is intended for streaming and integration demonstrations. It supplies synthetic transaction metadata and zero-valued model features; it is not a production fraud-data generator. For model-oriented replay, use the prepared CSV pump.

The repository does not include a reproducible held-out threshold-tuning workflow. Model metrics should therefore be treated as experiment-specific until evaluation is made deterministic, stratified, and isolated from training data.

## Scope and Production Considerations

This repository is a reference implementation for event streaming and model-serving integration. Production deployments would typically replace the in-memory H2 store and simple broker with durable infrastructure, add authentication and authorization, externalize service URLs and model thresholds, introduce observability and retries, and apply schema validation at the ingestion boundary.
