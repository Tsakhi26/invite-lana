// Vercel Serverless Function — proxy sécurisé vers Airtable
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = 'app2et9SbsztGSlrK';
const TABLE_ID = 'tblJxjAmUy0D0f3TE';
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

function headers() {
  return {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — lire tous les invités
  if (req.method === 'GET') {
    try {
      const allRecords = [];
      let offset = null;

      do {
        const url = offset
          ? `${AIRTABLE_URL}?offset=${offset}`
          : AIRTABLE_URL;
        const r = await fetch(url, { headers: headers() });
        const data = await r.json();
        if (data.error) {
          return res.status(500).json({ error: data.error });
        }
        allRecords.push(...data.records);
        offset = data.offset || null;
      } while (offset);

      const guests = allRecords.map(rec => ({
        id: rec.id,
        fullName: rec.fields.fullName || '',
        guests: rec.fields.guests || 0,
        status: rec.fields.status || 'present',
        message: rec.fields.message || '',
        createdAt: rec.fields.createdAt || rec.createdTime,
      }));

      return res.status(200).json(guests);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — ajouter un invité
  if (req.method === 'POST') {
    try {
      const { fullName, guests: guestCount, status, message, createdAt } = req.body;

      const r = await fetch(AIRTABLE_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          records: [{
            fields: {
              fullName,
              guests: guestCount || 0,
              status,
              message: message || '',
              createdAt: createdAt || new Date().toISOString(),
            }
          }]
        }),
      });

      const data = await r.json();
      if (data.error) {
        return res.status(500).json({ error: data.error });
      }

      const rec = data.records[0];
      return res.status(201).json({
        id: rec.id,
        fullName: rec.fields.fullName,
        guests: rec.fields.guests,
        status: rec.fields.status,
        message: rec.fields.message,
        createdAt: rec.fields.createdAt,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — modifier un invité
  if (req.method === 'PATCH') {
    try {
      const { id, fullName, guests: guestCount, message } = req.body;

      const r = await fetch(AIRTABLE_URL, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          records: [{
            id,
            fields: { fullName, guests: guestCount, message: message || '' }
          }]
        }),
      });

      const data = await r.json();
      if (data.error) {
        return res.status(500).json({ error: data.error });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — supprimer un invité
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      const r = await fetch(`${AIRTABLE_URL}?records[]=${id}`, {
        method: 'DELETE',
        headers: headers(),
      });

      const data = await r.json();
      if (data.error) {
        return res.status(500).json({ error: data.error });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Méthode non supportée' });
};
