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

// Carrier-Erkennung (wird aktuell nicht verwendet, aber bleibt drin)
app.get('/detect', async (req, res) => {
  const tracking_number = req.query.tnr;
  if (!tracking_number) return res.status(400).json({ error: 'Trackingnummer fehlt.' });

  try {
    const response = await axios.post('https://api.trackingmore.com/v4/carriers/detect', {
      tracking_number
    }, {
      headers: {
        'Tracking-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const carrier = response.data?.data?.[0]?.code;
    res.json({ carrier });
  } catch (error) {
    console.error('Carrier Detect Fehler:', error.response?.data || error.message);
    res.status(500).json({ error: 'Carrier-Erkennung fehlgeschlagen.' });
  }
});

// DHL-Tracking: GET bevorzugt, POST als Fallback
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

  const getUrl = `${API_URL}/${carrier_code}/${tracking_number}`;
  const postUrl = API_URL;

  try {
    // 1. GET versuchen
    const response = await axios.get(getUrl, { headers });
    const status = response.data?.data?.tag || 'Unbekannt';
    return res.json({ status });
  } catch (getError) {
    console.error('Fehler bei GET:', getError.response?.data || getError.message);

    // 2. Fallback POST
    try {
      const response = await axios.post(postUrl, {
        tracking_number,
        carrier_code
      }, { headers });

      const status = response.data?.data?.tag || 'Unbekannt';
      return res.json({ status });
    } catch (postError) {
      console.error('Fehler bei POST:', postError.response?.data || postError.message);
      return res.status(500).json({ error: 'Tracking fehlgeschlagen.' });
    }
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Tracking proxy läuft auf Port ${PORT}`);
});