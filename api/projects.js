import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET PROJECTS
    // ========================
   if(req.method === "GET"){

  const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*`, {
    headers:{
      apikey: KEY,
      Authorization:`Bearer ${KEY}`
    }
  })

  const text = await r.text()

  try{
    const data = JSON.parse(text)
    return res.json(data)
  }catch{
    console.error("SUPABASE BAD RESPONSE:", text)
    return res.status(500).json({ error:"invalid supabase response" })
  }
}

    // ========================
    // SUBMIT PROJECT (SECURE)
    // ========================
    if(req.method === "POST"){

      const {
        id,
        name,
        github,
        social,
        website,
        description,
        logo,
        wallet,
        signature,
        message
      } = req.body

      // 🔥 VALIDATION
      if(!wallet || !signature || !message){
        return res.status(400).json({ error:"missing fields" })
      }

      if(!name || !github || !social){
        return res.status(400).json({ error:"missing required project fields" })
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

      // 🔥 REPLAY PROTECTION
      const parts = message.split(":")
      const timestamp = parseInt(parts[2])

      if(Date.now() - timestamp > 60000){
        return res.status(401).json({ error:"signature expired" })
      }

      // 🔥 ENSURE MESSAGE MATCHES ACTION
      if(!message.startsWith(`submit:${wallet}`)){
        return res.status(401).json({ error:"invalid message format" })
      }

// ========================
// 🚫 RATE LIMIT: 1 PROJECT / DAY (FIXED)
// ========================
const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

const checkRes = await fetch(
  `${SUPABASE_URL}/rest/v1/projects?wallet=eq.${wallet}&select=created_at&order=created_at.desc&limit=1`,
  {
    headers:{
      apikey: KEY,
      Authorization:`Bearer ${KEY}`
    }
  }
)

if(!checkRes.ok){
  const err = await checkRes.text()
  console.error("rate limit fetch failed:", err)
  return res.status(500).json({ error:"rate limit check failed" })
}

const existing = await checkRes.json()

if(existing && existing.length > 0){
  const last = new Date(existing[0].created_at).getTime()

  if(now - last < DAY){
    return res.status(400).json({
      error: "you can only submit 1 project every 24 hours"
    })
  }
}

      // ========================
// SAVE TO SUPABASE (FIXED)
// ========================
const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`,{
  method:"POST",
  headers:{
    "Content-Type":"application/json",
    apikey: KEY,
    Authorization:`Bearer ${KEY}`
  },
  body: JSON.stringify({
    id,
    name,
    github,
    social,
    website,
    description,
    logo,
    votes: 0,
    wallet,
    created_at: new Date().toISOString()
  })
})

// 🔥 HANDLE ERROR RESPONSE PROPERLY
if (!r.ok) {
  const errText = await r.text()
  console.error("Supabase insert failed:", errText)

  return res.status(500).json({
    error: "database insert failed",
    details: errText
  })
}

// 🔥 SAFE RESPONSE PARSING (NO CRASH)
const text = await r.text()

let data = null
try {
  data = text ? JSON.parse(text) : null
} catch (e) {
  console.warn("Non-JSON response from Supabase:", text)
}

// ✅ ALWAYS RETURN SUCCESS IF INSERT WORKED
return res.json({
  success: true,
  data
})
}

return res.status(405).json({ error:"method not allowed" })

}catch(err){
  console.log("projects api error:", err)
  return res.status(500).json({ error:"server crash" })
}
}