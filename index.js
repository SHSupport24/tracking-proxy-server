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
    console.log('✅ Tracking registriert:', res.data);
    return true;
  } catch (err) {
    console.error('❌ POST fehlgeschlagen:', err.response?.data || err.message);
    return false;
  }
}

async function getTracking(tracking_number, carrier_code, headers) {
  try {
    const res = await axios.get(`${API_URL}/${carrier_code}/${tracking_number}`, { headers });
    console.log('🔄 GET Trackingdaten:', JSON.stringify(res.data, null, 2));
    return extractStatus(res.data.data);
  } catch (err) {
    const code = err.response?.data?.meta?.code;
    if (code === 4004) {
      console.warn('⚠️ Tracking nicht vorhanden (4004)');
      return null;
    }
    console.error('❌ GET fehlgeschlagen:', err.response?.data || err.message);
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

  try {
    let status = await getTracking(tracking_number, carrier_code, headers);

    if (status === null) {
      const created = await registerTracking(tracking_number, carrier_code, headers);
      if (!created) {
        return res.status(500).json({ error: 'Tracking konnte nicht angelegt werden.' });
      }

      // Retry bis zu 3x mit 8s Delay
      for (let i = 0; i < 3; i++) {
        console.log(`🔁 Warteversuch ${i + 1}/3...`);
        await new Promise(r => setTimeout(r, 8000));
        status = await getTracking(tracking_number, carrier_code, headers);
        if (status !== null) break;
      }
    }

    return res.json({ status: status || 'Kein Status verfügbar' });
  } catch (err) {
    console.error('❌ Proxy-Fehler:', err.message);
    return res.status(500).json({ error: 'Proxy-Fehler. Siehe Logs.' });
  }
});

app.get('/raw', async (req, res) => {
  const { tnr: tracking_number, carrier: carrier_code } = req.query;

  if (!tracking_number || !carrier_code) {
    return res.status(400).json({ error: 'Fehlende Parameter.' });
  }

  const headers = {
    'aftership-api-key': API_KEY,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(`${API_URL}/${carrier_code}/${tracking_number}`, { headers });
    res.json(response.data);
  } catch (err) {
    const errData = err.response?.data?.meta;
    if (errData?.code === 4004) {
      return res.status(200).json({ status: 'Unbekannt', error: errData });
    }
    res.status(500).json({ error: errData || err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ AfterShip-Proxy läuft auf Port ${PORT}`);
});