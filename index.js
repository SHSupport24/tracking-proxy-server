const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => res.send('🟢 ParcelsApp Proxy aktiv'));

function extractStatus(json) {
  const checkpoints = json?.tracking?.checkpoints;
  if (checkpoints && checkpoints.length > 0) {
    return checkpoints[checkpoints.length - 1].message || 'Kein Status verfügbar';
  }
  return 'Kein Status verfügbar';
}

app.get('/track', async (req, res) => {
  const { tnr: tracking_number } = req.query;

  if (!tracking_number) {
    return res.status(400).json({ error: 'Trackingnummer fehlt.' });
  }

  try {
    const response = await axios.get(`https://parcelsapp.com/en/tracking/${tracking_number}.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ParcelsTrackerBot/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.data?.tracking) {
      return res.status(404).json({ error: 'Trackingdaten fehlen.' });
    }

    const status = extractStatus(response.data);
    res.json({ status });

  } catch (err) {
    console.error('❌ Fehler beim Abrufen:', err.response?.data || err.message);
    res.status(500).json({ error: 'Fehler beim Abrufen von ParcelsApp.' });
  }
});

app.get('/raw', async (req, res) => {
  const { tnr: tracking_number } = req.query;

  if (!tracking_number) {
    return res.status(400).json({ error: 'Trackingnummer fehlt.' });
  }

  try {
    const response = await axios.get(`https://parcelsapp.com/en/tracking/${tracking_number}.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ParcelsTrackerBot/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.data?.tracking) {
      return res.status(404).json({ error: 'Trackingdaten fehlen.' });
    }

    res.json(response.data);

  } catch (err) {
    console.error('❌ RAW-Fehler:', err.response?.data || err.message);
    res.status(500).json({ error: 'RAW-Abruffehler.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ ParcelsApp-Proxy läuft auf Port ${PORT}`);
});