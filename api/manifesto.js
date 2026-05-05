import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET
    // ========================
    if(req.method === "GET"){

      const r = await fetch(`${SUPABASE_URL}/rest/v1/manifesto?select=*`,{
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      })

      return res.json(await r.json())
    }

    // ========================
    // POST (SECURE)
    // ========================
    if(req.method === "POST"){

      const { wallet, note, signature, message } = req.body

      if(!wallet || !signature || !message){
        return res.status(400).json({ error:"missing fields" })
      }

      // 🔥 VERIFY SIGNATURE
      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        new Uint8Array(signature),
        bs58.decode(wallet)
      )

      if(!isValid){
        return res.status(401).json({ error:"invalid signature" })
      }

      // 🔥 OPTIONAL: replay protection
      if(!message.includes(wallet)){
        return res.status(401).json({ error:"invalid message" })
      }

      // ========================
      // SAVE TO SUPABASE
      // ========================
      await fetch(`${SUPABASE_URL}/rest/v1/manifesto`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          apikey: KEY,
          Authorization:`Bearer ${KEY}`,
          Prefer:"resolution=merge-duplicates"
        },
        body: JSON.stringify({
          wallet,
          note,
          created_at: new Date().toISOString()
        })
      })

      return res.json({ success:true })
    }

    return res.status(405).json({ error:"method not allowed" })

  }catch(err){
    console.log("manifesto error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}