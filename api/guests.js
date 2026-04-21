// Vercel Serverless Function — proxy sécurisé vers Notion
const NOTION_TOKEN = (process.env.NOTION_TOKEN || '').trim();
const DATABASE_ID = '4f13871b459b4d469de4b4458ddcd89e';
const NOTION_URL = 'https://api.notion.com/v1';

function headers() {
  return {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function pageToGuest(page) {
  const p = page.properties;
  return {
    id: page.id,
    fullName: p.fullName?.title?.[0]?.plain_text || '',
    guests: p.guests?.number || 0,
    status: p.status?.select?.name || 'present',
    message: p.message?.rich_text?.[0]?.plain_text || '',
    createdAt: p.createdAt?.date?.start || page.created_time,
  };
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — lire tous les invités
  if (req.method === 'GET') {
    try {
      const allPages = [];
      let cursor = undefined;

      do {
        const body = { page_size: 100 };
        if (cursor) body.start_cursor = cursor;

        const r = await fetch(`${NOTION_URL}/databases/${DATABASE_ID}/query`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(body),
        });
        const data = await r.json();

        if (!r.ok) {
          return res.status(500).json({ error: data.message || 'Notion error' });
        }

        allPages.push(...data.results);
        cursor = data.has_more ? data.next_cursor : undefined;
      } while (cursor);

      return res.status(200).json(allPages.map(pageToGuest));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — ajouter un invité
  if (req.method === 'POST') {
    try {
      const { fullName, guests: guestCount, status, message, createdAt } = req.body;

      const r = await fetch(`${NOTION_URL}/pages`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            fullName: { title: [{ text: { content: fullName } }] },
            guests: { number: guestCount || 0 },
            status: { select: { name: status || 'present' } },
            message: { rich_text: [{ text: { content: message || '' } }] },
            createdAt: { date: { start: createdAt || new Date().toISOString() } },
          },
        }),
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ error: data.message || 'Notion error' });
      }

      return res.status(201).json(pageToGuest(data));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — modifier un invité
  if (req.method === 'PATCH') {
    try {
      const { id, fullName, guests: guestCount, message } = req.body;

      const r = await fetch(`${NOTION_URL}/pages/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          properties: {
            fullName: { title: [{ text: { content: fullName } }] },
            guests: { number: guestCount },
            message: { rich_text: [{ text: { content: message || '' } }] },
          },
        }),
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ error: data.message || 'Notion error' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — archiver un invité (suppression logique Notion)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      const r = await fetch(`${NOTION_URL}/pages/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ archived: true }),
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ error: data.message || 'Notion error' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Méthode non supportée' });
};
