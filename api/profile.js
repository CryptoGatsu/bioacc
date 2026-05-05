import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET PROFILE
    // ========================
    if(req.method === "GET"){

      const { wallet } = req.query

      if(!wallet){
        return res.json({})
      }

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}&select=*`,
        {
          headers:{
            apikey: KEY,
            Authorization:`Bearer ${KEY}`
          }
        }
      )

      const data = await r.json()

      return res.json(data[0] || {})
    }

    // ========================
    // SAVE PROFILE
    // ========================
    if(req.method === "POST"){

      const {
        wallet,
        username,
        bio,
        signature,
        message
      } = req.body

      // ========================
      // VALIDATION
      // ========================
      if(!wallet || !signature || !message){
        return res.status(400).json({ error:"missing fields" })
      }

      // ========================
      // VERIFY SIGNATURE
      // ========================
      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        new Uint8Array(signature),
        bs58.decode(wallet)
      )

      if(!isValid){
        return res.status(401).json({ error:"invalid signature" })
      }

      if(!message.startsWith(`profile:${wallet}`)){
        return res.status(401).json({ error:"invalid message format" })
      }

      const parts = message.split(":")
      const timestamp = parseInt(parts[2])

      if(Date.now() - timestamp > 60000){
        return res.status(401).json({ error:"signature expired" })
      }

      // ========================
      // UPSERT PROFILE
      // ========================
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          apikey: KEY,
          Authorization:`Bearer ${KEY}`,
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          wallet,
          username: username || "",
          bio: bio || "",
          updated: new Date().toISOString()
        })
      })

      const text = await r.text()

      try{
        return res.json(JSON.parse(text))
      }catch{
        console.error("profile save error:", text)
        return res.status(500).json({ error:"save failed" })
      }
    }

    return res.status(405).json({ error:"method not allowed" })

  }catch(err){
    console.log("profile api error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}