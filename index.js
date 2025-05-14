const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const API_KEY = 'asat_0eae2906dc2f4067a2e7f1b1139896a8';
const API_URL = 'https://api.aftership.com/v4/trackings';

app.get('/', (req, res) => res.send('🟢 AfterShip Proxy läuft'));

function extractStatus(data) {
  return (
    data?.tracking?.tag ||
    data?.tracking?.subtag_message ||
    data?.tracking?.checkpoints?.slice(-1)?.[0]?.message ||
    'Kein Status verfügbar'
  );
}

async function registerTracking(tracking_number, carrier_code, headers) {
  try {
    const res = await axios.post(API_URL, {
      tracking: {
        tracking_number,
        slug: carrier_code
      }
    }, { headers });
    console.log('✅ POST erfolgreich:', res.data);
    return true;
  } catch (err) {
    console.error('❌ POST fehlgeschlagen:', err.response?.data || err.message);
    return false;
  }
}

async function getTracking(tracking_number, carrier_code, headers) {
  try {
    const res = await axios.get(`${API_URL}/${carrier_code}/${tracking_number}`, { headers });
    console.log('🔄 GET Erfolg:', res.data);
    return extractStatus(res.data.data);
  } catch (err) {
    console.warn('❗ GET fehlgeschlagen:', err.response?.data || err.message);
    if (err.response?.data?.meta?.code === 4004) return null;
    throw err;
  }
}

app.get('/track', async (req, res) => {
  const { tnr: tracking_number, carrier: carrier_code } = req.query;

  if (!tracking_number || !carrier_code) {
    return res.status(400).json({ error: 'Trackingnummer oder Carrier fehlt.' });
  }

  const headers = {
    'aftership-api-key': API_KEY,
    'Content-Type': 'application/json'
  };

  let status = await getTracking(tracking_number, carrier_code, headers);

  if (status === null) {
    const created = await registerTracking(tracking_number, carrier_code, headers);
    if (!created) {
      return res.status(500).json({ error: 'Tracking konnte nicht angelegt werden.' });
    }

    await new Promise(r => setTimeout(r, 3000)); // 3 Sekunden warten für AfterShip sync

    status = await getTracking(tracking_number, carrier_code, headers);
  }

  res.json({ status: status || 'Kein Status verfügbar' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ AfterShip Proxy läuft auf Port ${PORT}`);
});