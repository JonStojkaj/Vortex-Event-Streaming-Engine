import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MAX_EVENTS = 100;
const CHART_EVENTS = 30;
const BROKER_URL = 'ws://localhost:8080/ws';
const HISTORY_URL = 'http://localhost:8080/api/transactions';

function formatAmount(amount) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function secondBucket(timestamp) {
  const date = new Date(timestamp);
  date.setMilliseconds(0);
  return date.toISOString();
}

function addToBuckets(currentBuckets, timestamps) {
  const buckets = new Map(currentBuckets.map((bucket) => [bucket.timestamp, bucket.count]));

  timestamps.forEach((timestamp) => {
    const timestampKey = secondBucket(timestamp);
    buckets.set(timestampKey, (buckets.get(timestampKey) || 0) + 1);
  });

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-CHART_EVENTS)
    .map(([timestamp, count]) => ({ timestamp, count }));
}

function topPatterns(event) {
  return Object.entries(event)
    .filter(([key, value]) => /^V([1-9]|1[0-9]|2[0-8])$/.test(key) && Number.isFinite(Number(value)))
    .map(([key, value]) => ({ key, value: Number(value) }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 2);
}

function App() {
  const [events, setEvents] = useState([]);
  const [throughputBuckets, setThroughputBuckets] = useState([]);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [threatCount, setThreatCount] = useState(0);
  const [connection, setConnection] = useState('connecting');
  const logWindowRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    let disposed = false;
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      onConnect: () => {
        setConnection('connected');
        const subscription = client.subscribe('/topic/transactions', (msg) => {
          try {
            const event = JSON.parse(msg.body);
            setAnalyzedCount((count) => count + 1);
            setThroughputBuckets((currentBuckets) => addToBuckets(currentBuckets, [event.timestamp]));

            if (event.fraudulent === true) {
              setThreatCount((count) => count + 1);
              setEvents((currentEvents) => [event, ...currentEvents].slice(0, MAX_EVENTS));
            }
          } catch {
            console.error('Received an invalid stream event.');
          }
        });

        client.onDisconnect = () => {
          subscription.unsubscribe();
          setConnection('disconnected');
        };
      },
      onWebSocketClose: () => setConnection('disconnected'),
      onWebSocketError: () => setConnection('disconnected'),
      onStompError: () => setConnection('disconnected'),
    });

    async function loadHistoryAndConnect() {
      try {
        const response = await fetch(HISTORY_URL);
        if (!response.ok) {
          throw new Error(`History request failed with ${response.status}`);
        }

        const history = await response.json();
        if (!disposed) {
          const threats = history.filter((event) => event.fraudulent === true);
          setAnalyzedCount(history.length);
          setThreatCount(threats.length);
          setEvents(threats.slice(0, MAX_EVENTS));
          setThroughputBuckets(addToBuckets([], history.map((event) => event.timestamp)));
        }
      } catch (error) {
        console.error(`Could not load transaction history: ${error.message}`);
      }

      if (!disposed) {
        client.activate();
      }
    }

    loadHistoryAndConnect();

    return () => {
      disposed = true;
      client.deactivate();
    };
  }, []);

  useEffect(() => {
    const logWindow = logWindowRef.current;

    if (logWindow && shouldAutoScrollRef.current) {
      logWindow.scrollTop = logWindow.scrollHeight;
    }
  }, [events]);

  function handleLogScroll() {
    const logWindow = logWindowRef.current;

    if (logWindow) {
      const distanceFromBottom = logWindow.scrollHeight - logWindow.scrollTop - logWindow.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 24;
    }
  }

  const visibleEvents = events.filter((event) => event.fraudulent === true);
  const chartData = throughputBuckets.map((bucket) => ({
    timestamp: formatTimestamp(bucket.timestamp),
    count: bucket.count,
  }));
  const currentTps = throughputBuckets.at(-1)?.count || 0;

  const connectionLabel = {
    connected: 'Live verbunden',
    connecting: 'Verbindung wird hergestellt',
    disconnected: 'Verbindung unterbrochen',
  }[connection];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Vortex Stream Console">
          <span className="brand-mark">V</span>
          <span>
            <strong>Vortex</strong>
            <small>Stream Console</small>
          </span>
        </a>
        <div className={`connection-pill ${connection}`}>
          <span className="status-dot" aria-hidden="true" />
          {connectionLabel}
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Realtime finance operations</p>
          <h1>Der Stream im Blick.</h1>
          <p className="intro-copy">
            Live-Transaktionsstream, in Echtzeit verarbeitet und über den Vortex-Broker verteilt.
          </p>
        </div>
        <div className="topic-badge">
          <span>SUBSCRIBED TO</span>
          <code>/topic/transactions</code>
        </div>
      </section>

      <section className="chart-panel" aria-label="Live-Durchsatz der Transaktionen">
        <div className="chart-header">
          <div>
            <p className="eyebrow">Throughput pulse</p>
            <h2>Events pro Sekunde</h2>
          </div>
          <span className="event-count">letzte {chartData.length} Sekunden</span>
        </div>
        <div className="chart-wrap">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e3e9df" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tick={{ fill: '#718078', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#718078', fontSize: 10 }} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => `Zeit ${label}`}
                  formatter={(value) => [value, 'Events / Sekunde']}
                  contentStyle={{ background: '#1d2524', border: '0', color: '#fffdf5', fontFamily: 'DM Mono, monospace', fontSize: 11 }}
                />
                <Line type="monotone" dataKey="count" stroke="#19705d" strokeWidth={2.5} dot={{ fill: '#f1bf51', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#db684f' }} isAnimationActive animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Noch keine Transaktionen für den Verlauf.</div>
          )}
        </div>
      </section>

      <section className="metrics" aria-label="Stream-Kennzahlen">
        <article className="metric-card primary-metric">
          <span className="metric-label">Analysierte Events</span>
          <strong>{analyzedCount.toLocaleString('de-CH')}</strong>
          <span className="metric-note">alle eingehenden Events</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Aktuelle TPS</span>
          <strong>{currentTps.toLocaleString('de-CH')}</strong>
          <span className="metric-note">Events in der letzten Sekunde</span>
        </article>
        <article className="metric-card alert-metric">
          <span className="metric-label">Abgewehrte Bedrohungen</span>
          <strong>{threatCount.toLocaleString('de-CH')}</strong>
          <span className="metric-note">nur ML-Fraud-Events</span>
        </article>
      </section>

      <section className="stream-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Live activity</p>
            <h2>Threat Monitor</h2>
          </div>
          <span className="event-count">{events.length} Bedrohungen</span>
        </div>

        <div className="log-window" ref={logWindowRef} onScroll={handleLogScroll}>
          {visibleEvents.length === 0 ? (
            <div className="empty-state">
              <div className="pulse-ring" aria-hidden="true"><span /></div>
              <h3>Keine Bedrohungen im Feed</h3>
              <p>Unauffällige Transaktionen werden im Hintergrund verarbeitet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>TXN ID</th>
                    <th>Zeitpunkt</th>
                    <th className="amount-column">Betrag</th>
                    <th className="amount-column">Confidence Score</th>
                    <th>Auffällige Muster (XAI)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((event, index) => (
                    <tr className="flagged-row" key={`${event.timestamp}-${index}`}>
                      <td className="transaction-id-cell">{event.transaction_id}</td>
                      <td className="timestamp-cell">{formatTimestamp(event.timestamp)}</td>
                      <td className="amount-cell">
                        <span>{formatAmount(Number(event.amount_chf))}</span>
                        {event.fraudReason && (
                          <span className="alert-reason-badge">{event.fraudReason}</span>
                        )}
                      </td>
                      <td className="confidence-cell">{(Number(event.confidence || 0) * 100).toFixed(1)}%</td>
                      <td>
                        <div className="xai-patterns">
                          {topPatterns(event).map(({ key, value }) => (
                            <span className="xai-badge" key={key}>{key}: {value.toFixed(2)}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <footer>
        <span>VORTEX EVENT STREAMING ENGINE</span>
        <span>WebSocket · {BROKER_URL}</span>
      </footer>
    </main>
  );
}

export default App;
