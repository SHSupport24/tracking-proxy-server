const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = 'xlogsga5-8jha-ch20-l4re-nqd4k9fphxxh';
const API_URL = 'https://api.trackingmore.com/v4/trackings';

// Healthcheck oder Debug-Route
app.get('/', (req, res) => res.send('🟢 Proxy läuft'));

// 🔍 Carrier automatisch erkennen
app.get('/detect', async (req, res) => {
  const tracking_number = req.query.tnr;

  if (!tracking_number) {
    return res.status(400).json({ error: 'Trackingnummer fehlt.' });
  }

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

// 📦 Trackingstatus: GET zuerst, POST als Fallback
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

  const getUrl = `https://api.trackingmore.com/v4/trackings/${carrier_code}/${tracking_number}`;
  const postUrl = `https://api.trackingmore.com/v4/trackings`;

  try {
    // 1. Versuche GET
    const response = await axios.get(getUrl, { headers });
    const status = response.data?.data?.tag || 'Unbekannt';
    return res.json({ status });
  } catch (getError) {
    // 2. Fallback auf POST
    try {
      const response = await axios.post(postUrl, {
        tracking_number,
        carrier_code
      }, { headers });

      const status = response.data?.data?.tag || 'Unbekannt';
      return res.json({ status });
    } catch (postError) {
      console.error('Tracking fehlgeschlagen:', postError.response?.data || postError.message);
      return res.status(500).json({ error: 'Tracking fehlgeschlagen.' });
    }
  }
});

// Render erwartet explizit process.env.PORT – kein Fallback!
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Tracking proxy läuft auf Port ${PORT}`);
});