import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res) {

try {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" })
  }

  // --- PARSE BODY ---
  let body = req.body

  if (!body) {
    const buffers = []
    for await (const chunk of req) buffers.push(chunk)
    body = JSON.parse(Buffer.concat(buffers).toString())
  }

  if (typeof body === "string") body = JSON.parse(body)

  const { action, data, index, wallet, timestamp, signature, message, projectId } = body

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const path = "submissions.json"

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: "missing env variables" })
  }

  // --- VERIFY SIGNATURE ---
  function verifySignature(pubKey, msg, sig) {
    try {
      const msgBytes = new TextEncoder().encode(msg)
      const sigBytes = new Uint8Array(sig)
      const pubBytes = bs58.decode(pubKey)
      return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes)
    } catch {
      return false
    }
  }

  // --- GET FILE ---
  async function getFile() {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    })

    const file = await r.json()

    const content = JSON.parse(
      Buffer.from(file.content, "base64").toString("utf8")
    )

    return { file, content }
  }

  // --- UPDATE FILE ---
  async function updateGitHub(content, retry = 0) {

    const { file } = await getFile()

    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: "update submissions",
        content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
        sha: file.sha
      })
    })

    const result = await r.json()

    if (result.message && result.message.includes("sha") && retry < 3) {
      await new Promise(r => setTimeout(r, 300))
      return updateGitHub(content, retry + 1)
    }

    return result
  }

  // --- LOAD DATA ---
  const { content } = await getFile()

  if (!content.projects) content.projects = []
  if (!content.votes) content.votes = {}
  if (!content.submissions) content.submissions = {}
  if (!content.voteIndex) content.voteIndex = {}
  if (!content.manifesto) content.manifesto = [] // ✅ NEW

  const ONE_DAY = 86400000
  const now = Date.now()

  // =========================
  // 🚀 SUBMIT PROJECT
  // =========================
  if (action === "submit") {

    const sub = data

    if (!sub.wallet || !sub.signature || !sub.message) {
      return res.status(400).json({ error: "missing signature data" })
    }

    const valid = verifySignature(sub.wallet, sub.message, sub.signature)

    if (!valid) {
      return res.status(400).json({ error: "invalid signature" })
    }

    if (Math.abs(now - sub.timestamp) > 5 * 60 * 1000) {
      return res.status(400).json({ error: "stale request" })
    }

    const lastSubmit = content.submissions[sub.wallet]

    if (lastSubmit && (sub.timestamp - lastSubmit < ONE_DAY)) {
      return res.status(400).json({
        error: "submit cooldown active"
      })
    }

    const exists = content.projects.some(p =>
      p.name === sub.name && p.github === sub.github
    )

    if (!exists) {
      content.projects.unshift(sub)
    }

    content.submissions[sub.wallet] = sub.timestamp
  }

  // =========================
  // 🗳️ VOTE
  // =========================
  if (action === "vote") {

    if (!wallet || !signature || !message || !projectId) {
      return res.status(400).json({ error: "missing signature data" })
    }

    const valid = verifySignature(wallet, message, signature)

    if (!valid) {
      return res.status(400).json({ error: "invalid signature" })
    }

    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return res.status(400).json({ error: "stale request" })
    }

    const lastVote = content.votes[wallet]

    if (lastVote && (timestamp - lastVote < ONE_DAY)) {
      return res.status(400).json({
        error: "vote cooldown active"
      })
    }

    content.votes[wallet] = timestamp
    content.voteIndex[wallet] = projectId

    const project = content.projects.find(p => p.id === projectId)

    if (project) {
      project.votes = (project.votes || 0) + (body.weight || 1)
    } else {
      return res.status(400).json({ error: "project not found" })
    }
  }

  // =========================
  // ✍️ MANIFESTO SIGN
  // =========================
  if (action === "signManifesto") {

    const entry = data

    if (!entry.wallet || !entry.signature || !entry.message) {
      return res.status(400).json({ error: "missing signature data" })
    }

    const valid = verifySignature(entry.wallet, entry.message, entry.signature)

    if (!valid) {
      return res.status(400).json({ error: "invalid signature" })
    }

    if (Math.abs(now - entry.timestamp) > 5 * 60 * 1000) {
      return res.status(400).json({ error: "stale request" })
    }

    const exists = content.manifesto.some(m => m.wallet === entry.wallet)

    if (exists) {
      return res.status(400).json({ error: "already signed" })
    }

    content.manifesto.unshift(entry)
  }

  content.lastUpdated = new Date().toISOString()

  await updateGitHub(content)

  return res.status(200).json({ success: true })

} catch (err) {

  console.error("API ERROR:", err)

  return res.status(500).json({
    error: err.message
  })

}
}