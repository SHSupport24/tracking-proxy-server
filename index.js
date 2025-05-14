const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Tracking-Api-Key']
}));
app.use(express.json());

const API_KEY = 'xlogsga5-8jha-ch20-l4re-nqd4k9fphxxh';
const API_URL = 'https://api.trackingmore.com/v4/trackings';

app.get('/', (req, res) => res.send('🟢 Proxy läuft'));

function extractStatus(data) {
  const checkpoints = data?.origin_info?.trackinfo;
  const lastCheckpoint = checkpoints?.[checkpoints.length - 1];

  return (
    lastCheckpoint?.StatusDescription ||
    data?.latest_status?.status ||
    data?.latest_status ||
    data?.latest_event ||
    data?.status_description ||
    data?.tag ||
    data?.status ||
    'Kein Status verfügbar'
  );
}

async function getTracking(tracking_number, carrier_code, headers) {
  const getUrl = `${API_URL}/${carrier_code}/${tracking_number}`;
  try {
    const response = await axios.get(getUrl, { headers });
    console.log('🔄 GET Erfolg:', JSON.stringify(response.data));
    return extractStatus(response.data.data);
  } catch (error) {
    console.warn('❗ GET fehlgeschlagen:', error.response?.data || error.message);
    return null;
  }
}

async function createTracking(tracking_number, carrier_code, headers) {
  try {
    const response = await axios.post(API_URL, {
      tracking_number,
      carrier_code,
      title: 'Trello',
      customer_name: 'Power-Up',
      order_id: tracking_number,
      lang: 'de'
    }, { headers });

    console.log('✅ POST Erfolg:', JSON.stringify(response.data));
    return true;
  } catch (error) {
    console.error('❌ POST Fehler:', error.response?.data || error.message);
    return false;
  }
}

app.get('/track', async (req, res) => {
  const tracking_number = req.query.tnr;
  const carrier_code = req.query.carrier;

  if (!tracking_number || !carrier_code) {
    return res.status(400).json({ error: 'Trackingnummer oder Carrier fehlt.' });
  }

  const headers = {
    'Tracking-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  };

  // Versuch 1: Direkt abrufen
  let status = await getTracking(tracking_number, carrier_code, headers);
  if (status && status !== 'Kein Status verfügbar') {
    return res.json({ status });
  }

  // Wenn fehlgeschlagen: anlegen
  const created = await createTracking(tracking_number, carrier_code, headers);
  if (!created) {
    return res.status(500).json({ error: 'Tracking konnte nicht erstellt werden.' });
  }

  // Versuch 2: Status erneut abrufen
  status = await getTracking(tracking_number, carrier_code, headers);
  return res.json({ status: status || 'Kein Status verfügbar' });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Tracking proxy läuft auf Port ${PORT}`);
});