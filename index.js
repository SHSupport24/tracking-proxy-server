const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'aftership-api-key']
}));
app.use(express.json());

const API_KEY = 'asat_0eae2906dc2f4067a2e7f1b1139896a8'; // ← dein AfterShip API-Key
const API_URL = 'https://api.aftership.com/v4/trackings';

app.get('/', (req, res) => res.send('🟢 AfterShip Proxy aktiv'));

function extractStatus(data) {
  return (
    data?.tracking?.tag ||
    data?.tracking?.subtag_message ||
    data?.tracking?.checkpoints?.slice(-1)?.[0]?.message ||
    'Kein Status verfügbar'
  );
}

app.get('/track', async (req, res) => {
  const tracking_number = req.query.tnr;
  const carrier_code = req.query.carrier;

  if (!tracking_number || !carrier_code) {
    return res.status(400).json({ error: 'Trackingnummer oder Carrier fehlt.' });
  }

  const headers = {
    'aftership-api-key': API_KEY,
    'Content-Type': 'application/json'
  };

  const url = `${API_URL}/${carrier_code}/${tracking_number}`;

  try {
    const response = await axios.get(url, { headers });
    const status = extractStatus(response.data.data);
    return res.json({ status });
  } catch (error) {
    console.error('AfterShip Fehler:', error.response?.data || error.message);
    return res.status(500).json({ error: 'AfterShip Tracking fehlgeschlagen.' });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ AfterShip-Proxy läuft auf Port ${PORT}`);
});