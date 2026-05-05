// ========================
// CONFIG
// ========================
const SUPABASE_URL = "YOUR_SUPABASE_URL"
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"

// ========================
// SAFE DOM HELPER
// ========================
function setText(id, value){
  const el = document.getElementById(id)
  if(el) el.innerText = value
}

// ========================
// LOAD PROFILE (DIRECT)
// ========================
window.loadProfile = async function(wallet){

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    })

    const data = await res.json()
    return data[0] || null

  }catch(err){
    console.log("profile load error", err)
    return null
  }
}

// ========================
// PROFILE CACHE
// ========================
window.profileCache = {}

window.getProfile = async function(wallet){

  if(window.profileCache[wallet]){
    return window.profileCache[wallet]
  }

  try{
    const res = await fetch(`/api/profile?wallet=${wallet}`)
    const text = await res.text()

    let data = {}
    try{
      data = JSON.parse(text)
    }catch{
      console.error("profile parse failed:", text)
    }

    const profile = data || {}

    window.profileCache[wallet] = profile
    return profile

  }catch(err){
    console.log("getProfile error", err)
    return {}
  }
}

// ========================
// DISPLAY NAME
// ========================
window.getDisplayName = async function(wallet){

  if(!wallet) return ""

  const profile = await window.getProfile(wallet)

  if(profile?.username){
    return profile.username
  }

  return wallet.slice(0,4) + "..." + wallet.slice(-4)
}

// ========================
// LOAD PROFILE STATS
// ========================
async function loadProfileStats(wallet){

  if(!wallet){
    console.log("no wallet for stats")
    return
  }

  try{
    console.log("loading stats for:", wallet)

    const res = await fetch(`/api/profile-stats?wallet=${wallet}`)
    const text = await res.text()

    let data
    try{
      data = JSON.parse(text)
    }catch{
      console.error("stats parse failed:", text)

      // 🔥 SAFE FALLBACK (NO CRASH)
      setText("statVotes", 0)
      setText("statProjects", 0)
      setText("statManifesto", "no")
      setText("statTokens", 0)

      return
    }

    console.log("stats data:", data)

    setText("statVotes", data.totalVotes || 0)
    setText("statProjects", (data.projectsVoted || []).length)
    setText("statManifesto", data.hasSigned ? "yes" : "no")

    // 🔥 TOKEN DISPLAY (from wallet.js)
    const tokens = Math.floor(window.tokenBalance || 0)
    setText("statTokens", tokens)

  }catch(err){
    console.log("stats error:", err)
  }
}

// ========================
// INIT STATE
// ========================
let profileReady = false

// ========================
// INIT PROFILE
// ========================
async function initProfile(){

  if(profileReady) return
  if(!window.wallet || window.wallet === "undefined") return

  profileReady = true

  try{

    const profile = await window.getProfile(window.wallet)

    await loadProfileStats(window.wallet)

    if(!window.backendData) window.backendData = { profiles:{} }
    window.backendData.profiles[window.wallet] = profile

  }catch(err){
    console.log("initProfile error:", err)
  }
}

// ========================
// WATCH WALLET
// ========================
function watchWalletChange(){

  let lastWallet = null

  setInterval(() => {

    if(window.wallet !== lastWallet){
      lastWallet = window.wallet
      profileReady = false

      if(window.wallet){
        initProfile()
      }
    }

  }, 500)
}

// ========================
// PAGE LOAD
// ========================
window.addEventListener("load", () => {

  setTimeout(() => {
    initProfile()
  }, 300)

  watchWalletChange()
})