// ========================
// GLOBAL STATE
// ========================
window.wallet = null
window.tokenBalance = 0
window.voteBank = 0
window.remainingVotes = 0
window.backendData = null
window.profileCache = {}

// ========================
// LOAD BACKEND (PROJECT DATA ONLY)
// ========================
window.loadBackend = async function(){
  try{
    const url = "https://raw.githubusercontent.com/CryptoGatsu/bioacc-dev/main/submissions.json"

    const res = await fetch(url + "?t=" + Date.now(), {
      cache: "no-store"
    })

    window.backendData = await res.json()

  }catch(err){
    console.log("backend load error", err)
    window.backendData = null
  }
}

// ========================
// CLEAR PROFILE CACHE
// ========================
window.clearProfileCache = function(wallet){
  if(!wallet) return
  delete window.profileCache[wallet]
}

// ========================
// RESET WALLET STATE
// ========================
window.resetWalletState = function(){

  window.wallet = null
  window.tokenBalance = 0
  window.voteBank = 0
  window.remainingVotes = 0
  window.profileCache = {}

  localStorage.removeItem("wallet")

  const status = document.getElementById("walletStatus")
  if(status) status.innerText = ""

  const timer = document.getElementById("voteTimer")
  if(timer) timer.innerText = ""

  const title = document.getElementById("walletTitle")
  if(title) title.innerText = "wallet"

  const navProfile = document.getElementById("navProfile")
  if(navProfile) navProfile.remove()

  document.querySelectorAll(".connect-btn").forEach(btn=>{
    btn.style.display = "inline-block"
  })
}

// ========================
// LOAD PROFILE
// ========================
window.getProfile = async function(wallet){

  if(!wallet) return {}

  if(window.profileCache[wallet]){
    return window.profileCache[wallet]
  }

  try{
    const res = await fetch(`/api/profile?wallet=${wallet}&t=${Date.now()}`)
    const data = await res.json()

    const profile = data || {}

    window.profileCache[wallet] = profile
    return profile

  }catch(err){
    console.log("profile load error", err)
    return {}
  }
}

// ========================
// DISPLAY NAME
// ========================
window.getDisplayName = async function(wallet){

  if(!wallet) return ""

  const profile = await window.getProfile(wallet)

  if(profile && profile.username){
    return profile.username
  }

  return wallet.slice(0,4) + "..." + wallet.slice(-4)
}

// ========================
// CONNECT WALLET (FIXED)
// ========================
window.connectWallet = async function(){

  const provider = window.solana

  if(!provider || !provider.isPhantom){
    alert("Phantom not found")
    return
  }

  try{
    const resp = await provider.connect() // ✅ KEEP THIS NAME

    const wallet = resp.publicKey.toString()

    // 🔥 RESET if switching wallets
    if(window.wallet && window.wallet !== wallet){
      window.resetWalletState()
    }

    // 🔥 SET GLOBAL STATE
    window.wallet = wallet
    CURRENT_WALLET = wallet
    localStorage.setItem("wallet", wallet)

    console.log("CONNECTED:", wallet)

    // 🔥 LOAD DATA IN CORRECT ORDER
    await window.loadBackend()
    await loadWalletData()

    // 🔥 UPDATE UI ONCE (clean)
    await window.updateWalletUI(true)

    // 🔥 LOAD STATS AFTER UI EXISTS
    await loadStats(wallet)

    checkSubmissionLimit(window.wallet)

    // 🔥 HIDE CONNECT BUTTONS
    document.querySelectorAll(".connect-btn").forEach(btn=>{
      btn.style.display = "none"
    })

    // 🔥 OPTIONAL EVENT (safe)
    window.dispatchEvent(new CustomEvent("walletConnected", { detail: wallet }))

  }catch(err){
    console.log("connect error", err)
  }
}



// ========================
// AUTO CONNECT
// ========================
window.autoConnect = async function(){

  const provider = window.solana

  try{
    if(provider && provider.isPhantom){
      const res = await provider.connect({ onlyIfTrusted: true })
      window.wallet = res.publicKey.toString()
      CURRENT_WALLET = window.wallet
      localStorage.setItem("wallet", window.wallet)
    } else {
      window.wallet = localStorage.getItem("wallet")
    }
  }catch{
    window.wallet = localStorage.getItem("wallet")
  }

  if(window.wallet){
    await window.loadBackend()
    await loadWalletData()
  }

  await window.updateWalletUI(true)
}

window.addEventListener("walletConnected", (e) => {
  CURRENT_WALLET = e.detail

  console.log("Wallet set:", CURRENT_WALLET)

  // 🔥 RUN IMMEDIATELY
  loadStats(CURRENT_WALLET)
})

// ========================
// LOAD TOKEN DATA (HELIUS)
// ========================
async function loadWalletData(){

  try{

    if(!window.wallet){
      window.tokenBalance = 0
      window.voteBank = 0
      return
    }

    const TOKEN_MINT = "CLP3exiqE8drZSzwhPas257cTh1evzq6nr7i1Xwvpump"
    const HELIUS_RPC = "https://rpc.helius.xyz/?api-key=abe30281-08a6-4f68-921b-4da93db84835"

    const res = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          window.wallet,
          { mint: TOKEN_MINT },
          { encoding: "jsonParsed" }
        ]
      })
    })

    const data = await res.json()

    let balance = 0

    if(data.result && data.result.value.length > 0){
      balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0
    }

    window.tokenBalance = balance
    window.voteBank = Math.floor(balance / 1000000)

  }catch(err){
    console.log("helius token fetch error", err)
    window.tokenBalance = 0
    window.voteBank = 0
  }
}

// ========================
// 🔥 HEADER STATS + TIMER
// ========================
async function loadHeaderStats(){

  if(!window.wallet) return

  try{

    const res = await fetch(`/api/profile-stats?wallet=${window.wallet}`)
    const data = await res.json()

    const used = data.totalVotes || 0
    const max = data.maxVotes || 0

    // 🔥 TRACK REMAINING VOTES
    window.remainingVotes = Math.max(0, max - used)

    const percent = max === 0 ? 0 : used / max

    let color = "#6eff3e"

    if(used >= max){
      color = "#6eff3e"
    } else if(percent > 0.7){
      color = "#ff3e3e"
    } else if(percent > 0.4){
      color = "#ffd93e"
    }

    const status = document.getElementById("walletStatus")

    if(status){

      const name = await window.getDisplayName(window.wallet)

      status.innerHTML = `
        User: ${name}
        | Tokens: ${Math.floor(window.tokenBalance).toLocaleString()}
        | Votes: <span style="color:${color}; font-weight:bold;">
          ${used} / ${max}
        </span>
        | <span id="voteTimer"></span>
      `
    }

    startVoteCountdown(data.lastVoteTime)

  }catch(err){
    console.log("header stats error", err)
  }
}

// ========================
// 🔥 COUNTDOWN TIMER
// ========================
window.voteTimerInterval = null

function startVoteCountdown(lastVoteTime){

  const el = document.getElementById("voteTimer")
  if(!el) return

  // 🔥 prevent duplicate timers
  if(window.voteTimerInterval){
    clearInterval(window.voteTimerInterval)
  }

  function update(){

    if(!lastVoteTime){
  el.innerText = ""
  return
  }

    const now = Date.now()
    const diff = 86400000 - (now - new Date(lastVoteTime).getTime())

    if(diff <= 0){
      el.innerText = "Vote Reset: ready"
      return
    }

    const hrs = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)

    el.innerText = `Vote Reset: ${hrs}h ${mins}m ${secs}s`
  }

  update()
  window.voteTimerInterval = setInterval(update, 1000)
}

// ========================
// UI UPDATE
// ========================
window.updateWalletUI = async function(forceFresh = false){

  const old = document.getElementById("navProfile")
  if(old) old.remove()

  const oldTooltip = document.getElementById("profileTooltip")
  if(oldTooltip) oldTooltip.remove()

  if(!window.wallet){
    window.wallet = localStorage.getItem("wallet")
  }

  const duplicates = document.querySelectorAll("#navProfile")
  if(duplicates.length > 1){
    duplicates.forEach((el, i)=>{
      if(i !== 0) el.remove()
    })
  }

  if(!window.wallet){
    document.querySelectorAll(".connect-btn").forEach(btn=>{
      btn.style.display = "inline-block"
    })
    return
  }

  document.querySelectorAll(".connect-btn").forEach(btn=>{
    btn.style.display = "none"
  })

  if(forceFresh){
    window.clearProfileCache(window.wallet)
  }

  const name = await window.getDisplayName(window.wallet)

  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML =
      `wallet: ${name} | tokens: ${Math.floor(window.tokenBalance)} | votes: ${window.voteBank}`
  }

  const title = document.getElementById("walletTitle")
  if(title){
    title.innerText = name
  }

  const btn = document.getElementById("connectBtn")
if(btn){
  btn.style.display = window.wallet ? "none" : "inline-block"
}

  // 🔥 LOAD HEADER STATS
  await loadHeaderStats()

  const nav = document.querySelector(".nav-links") || document.querySelector(".nav div:last-child")

  if(nav){

    let el = document.getElementById("navProfile")

    if(!el){
      el = document.createElement("span")
      el.id = "navProfile"
      el.className = "profile-link"
      el.style.marginLeft = "20px"
      el.style.cursor = "pointer"
      el.style.position = "relative"

      nav.appendChild(el)
    }

    const name = await window.getDisplayName(window.wallet)

    el.innerHTML = `
      <span>${name} ▾</span>
      <div id="walletDropdown" style="
        display:none;
        position:absolute;
        right:0;
        top:30px;
        background:#000;
        border:1px solid #222;
        padding:10px;
        width:180px;
        z-index:9999;
      ">
        <div class="dropdown-item" onclick="copyWallet()">copy address</div>
        <div class="dropdown-item" onclick="goProfile()">profile</div>
        <div class="dropdown-item" onclick="disconnectWallet()" style="color:#ff4444;">disconnect</div>
      </div>
    `

    el.onclick = (e)=>{
      e.stopPropagation()
      const dd = el.querySelector("#walletDropdown")
      dd.style.display = dd.style.display === "block" ? "none" : "block"
    }

    document.addEventListener("click", ()=>{
      const dd = el.querySelector("#walletDropdown")
      if(dd) dd.style.display = "none"
    })
  }
}

// ========================
// DISCONNECT
// ========================
window.disconnectWallet = function(){

  // 🔥 CLEAR STATE
  window.wallet = null
  window.tokenBalance = 0
  window.voteBank = 0
  window.remainingVotes = 0

  localStorage.removeItem("wallet")
  window.profileCache = {}

  // 🔥 STOP TIMER
  if(window.voteTimerInterval){
    clearInterval(window.voteTimerInterval)
    window.voteTimerInterval = null
  }

  // 🔥 CLEAR HEADER UI
  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML = ""
  }

  const timer = document.getElementById("voteTimer")
  if(timer){
    timer.innerText = ""
  }

  const title = document.getElementById("walletTitle")
  if(title){
    title.innerText = "wallet"
  }

  // 🔥 REMOVE NAV DROPDOWN
  const el = document.getElementById("navProfile")
  if(el) el.remove()

  const dd = document.getElementById("walletDropdown")
  if(dd) dd.remove()

  // 🔥 SHOW CONNECT BUTTONS AGAIN
  document.querySelectorAll(".connect-btn").forEach(btn=>{
    btn.style.display = "inline-block"
  })
}

// ========================
// LISTEN FOR WALLET CHANGES
// ========================
window.addEventListener("DOMContentLoaded", () => {

  if(window.solana){

    window.solana.on("accountChanged", async (pubKey) => {

      if(pubKey){
        const newWallet = pubKey.toString()

        if(newWallet !== window.wallet){
          window.resetWalletState()

          window.wallet = newWallet
          localStorage.setItem("wallet", window.wallet)

          await loadWalletData()
          await window.updateWalletUI(true)
        }

      } else {
        window.resetWalletState()
      }
    })
  }
})

window.copyWallet = function(){
  navigator.clipboard.writeText(window.wallet)
  alert("wallet copied")
}

window.goProfile = function(){
  window.location = "/profile?wallet=" + window.wallet
}
window.refreshVotingUI = async function(){

  await loadWalletData()
  await window.updateWalletUI(true)

  // 🔥 refresh project list if exists
  if(window.loadProjects){
    window.loadProjects()
  }
}