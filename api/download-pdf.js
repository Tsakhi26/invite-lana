// =============================================
//  Vercel Serverless Function — proxy PDF
//  /api/download-pdf
//  Télécharge le PDF depuis tabrichi.com côté
//  serveur et le re-sert au client, sans CORS.
// =============================================

const PDF_SOURCE = 'http://tabrichi.com/lana/img/FairePartLana.pdf';

export default async function handler(req, res) {
  try {
    const response = await fetch(PDF_SOURCE);

    if (!response.ok) {
      res.status(502).json({ error: 'Impossible de récupérer le PDF source.' });
      return;
    }

    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="FairePartLana.pdf"');
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('Erreur proxy PDF :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
