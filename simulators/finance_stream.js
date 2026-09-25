const SOURCE_ACCOUNTS = Array.from(
  { length: 150 },
  (_, index) => `CH-SOURCE-${String(index + 1).padStart(4, '0')}`,
);
const DESTINATION_ACCOUNTS = Array.from(
  { length: 150 },
  (_, index) => `CH-DEST-${String(index + 1).padStart(4, '0')}`,
);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api/ingest';

function randomAccount(accounts) {
  return accounts[Math.floor(Math.random() * accounts.length)];
}

function createEvent(sourceAccount = randomAccount(SOURCE_ACCOUNTS)) {
  const amount = Math.random() * 5000;
  return {
    timestamp: new Date().toISOString(),
    source_account: sourceAccount,
    destination_account: randomAccount(DESTINATION_ACCOUNTS),
    amount_chf: amount,
    Time: 0,
    ...Object.fromEntries(Array.from({ length: 28 }, (_, index) => [`V${index + 1}`, 0])),
    Amount: amount,
  };
}

async function sendEvent(event) {
  console.log(JSON.stringify(event));

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
  } catch (error) {
    console.error(`Could not send event to backend: ${error.message}`);
  }
}

setInterval(() => {
  sendEvent(createEvent());
}, 75);
