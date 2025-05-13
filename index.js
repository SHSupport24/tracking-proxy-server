const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = 'xlogsga5-8jha-ch20-l4re-nqd4k9fphxxh';
const API_URL = 'https://api.trackingmore.com/v4/trackings';

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

// 📦 Trackingstatus abfragen
app.get('/track', async (req, res) => {
  const tracking_number = req.query.tnr;
  const carrier_code = req.query.carrier;

  if (!tracking_number || !carrier_code) {
    return res.status(400).json({ error: 'Trackingnummer oder Carrier fehlt.' });
  }

  try {
    const response = await axios.post(API_URL, {
      tracking_number,
      carrier_code
    }, {
      headers: {
        'Tracking-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const status = response.data?.data?.tag || 'Unbekannt';
    res.json({ status });
  } catch (error) {
    console.error('Track Fehler:', error.response?.data || error.message);
    res.status(500).json({ error: 'Tracking fehlgeschlagen.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy läuft auf Port ${PORT}`);
});