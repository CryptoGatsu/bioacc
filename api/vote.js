import nacl from "tweetnacl"
import bs58 from "bs58"

const TOKENS_PER_VOTE = 1_000_000
const TOKEN_MINT = "CLP3exiqE8drZSzwhPas257cTh1evzq6nr7i1Xwvpump"

// 🔥 YOUR HELIUS KEY (already provided)
const HELIUS_KEY = "abe30281-08a6-4f68-921b-4da93db84835"

async function getTokenBalance(wallet){
  try{
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`

    const res = await fetch(url,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        jsonrpc:"2.0",
        id:"1",
        method:"getTokenAccountsByOwner",
        params:[
          wallet,
          { mint: TOKEN_MINT },
          { encoding:"jsonParsed" }
        ]
      })
    })

    const json = await res.json()

    const accounts = json?.result?.value

    if(!accounts || accounts.length === 0){
      return 0
    }

    const balance =
      accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0

    return balance

  }catch(err){
    console.error("helius token fetch error:", err)
    return 0
  }
}

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET
    // ========================
    if(req.method === "GET"){
      const r = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=*`,{
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      })

      return res.json(await r.json())
    }

    // ========================
    // POST
    // ========================
    if(req.method !== "POST"){
      return res.status(405).json({ error:"method not allowed" })
    }

    const {
      wallet,
      projectId,
      amount,
      signature,
      message
    } = req.body

    console.log("VOTE BODY:", req.body)

    if(!wallet || !projectId || !signature || !message){
      return res.status(400).json({ error:"missing fields" })
    }

    const voteAmount = parseInt(amount) || 1

    if(voteAmount < 1){
      return res.status(400).json({ error:"invalid vote amount" })
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

    if(!message.startsWith(`vote:${wallet}:${projectId}`)){
      return res.status(401).json({ error:"invalid message format" })
    }

    const parts = message.split(":")
    const timestamp = parseInt(parts[3])

    if(Date.now() - timestamp > 60000){
      return res.status(401).json({ error:"signature expired" })
    }

    // ========================
    // 🔥 GET TOKEN BALANCE (HELIUS)
    // ========================
    const userTokens = await getTokenBalance(wallet)

    const totalVotingPower = Math.floor(userTokens / TOKENS_PER_VOTE)

    console.log("TOKENS:", userTokens)
    console.log("VOTES AVAILABLE:", totalVotingPower)

    if(totalVotingPower <= 0){
      return res.status(403).json({ error:"no voting power" })
    }

    // ========================
    // FETCH USER VOTES
    // ========================
    const voteCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/votes?wallet=eq.${wallet}&select=*`,
      {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      }
    )

    const existingVotes = await voteCheck.json()

    const now = Date.now()

    const votesToday = existingVotes.filter(v =>
      (now - new Date(v.created_at).getTime()) < 86400000
    )

    const votesUsedToday = votesToday.reduce((sum,v)=>sum + v.amount, 0)

    const remainingVotes = totalVotingPower - votesUsedToday

    if(voteAmount > remainingVotes){
      return res.status(403).json({
        error:"not enough voting power",
        remainingVotes
      })
    }

    // ========================
    // PROJECT RULES
    // ========================
    const projectVotes = existingVotes.filter(v => v.project_id === projectId)

    if(projectVotes.length >= 2){
      return res.status(403).json({ error:"max 2 votes per project" })
    }

    const lastProjectVote = projectVotes
      .map(v => new Date(v.created_at).getTime())
      .sort((a,b)=>b-a)[0]

    if(lastProjectVote && (Date.now() - lastProjectVote < 86400000)){
      return res.status(403).json({ error:"already voted today" })
    }

    // ========================
    // INSERT VOTE
    // ========================
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/votes`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        apikey: KEY,
        Authorization:`Bearer ${KEY}`
      },
      body: JSON.stringify({
        wallet,
        project_id: projectId,
        amount: voteAmount,
        created_at: new Date().toISOString()
      })
    })

    const insertText = await insertRes.text()

    if(!insertRes.ok){
      console.error("INSERT ERROR:", insertText)
      return res.status(500).json({ error:"vote insert failed" })
    }

    // ========================
    // INCREMENT PROJECT
    // ========================
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_votes`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        apikey: KEY,
        Authorization:`Bearer ${KEY}`
      },
      body: JSON.stringify({
        project_id: projectId,
        vote_amount: voteAmount
      })
    })

    if(!rpcRes.ok){
      return res.status(500).json({ error:"increment failed" })
    }

    return res.json({
      success:true,
      remainingVotes: remainingVotes - voteAmount
    })

  }catch(err){
    console.error("FATAL ERROR:", err)

    // 🔥 ALWAYS RETURN JSON (fixes your frontend crash)
    return res.status(500).json({
      error:"server crash",
      message: err.message
    })
  }
}