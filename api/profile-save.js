// /api/profile-save.js
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" })
  }

  const { wallet, username, bio } = req.body

  if (!wallet) {
    return res.status(400).json({ error: "missing wallet" })
  }

  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      Prefer: "resolution=merge-duplicates" // UPSERT
    },
    body: JSON.stringify({
      wallet,
      username,
      bio,
      updated: new Date().toISOString()
    })
  })

  const data = await r.json()
  res.status(200).json({ success: true, data })
}