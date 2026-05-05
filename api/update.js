import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res) {

try {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" })
  }

  let body = req.body

  if (!body) {
    const buffers = []
    for await (const chunk of req) buffers.push(chunk)
    body = JSON.parse(Buffer.concat(buffers).toString())
  }

  if (typeof body === "string") body = JSON.parse(body)

  const { action, data, wallet, timestamp, signature, message, projectId } = body

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const path = "submissions.json"

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: "missing env variables" })
  }

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

  const { content } = await getFile()

  if (!content.projects) content.projects = []
  if (!content.votes) content.votes = {}
  if (!content.submissions) content.submissions = {}
  if (!content.voteIndex) content.voteIndex = {}
  if (!content.manifesto) content.manifesto = []
  if (!content.profiles) content.profiles = {} // 🔥 NEW

  const ONE_DAY = 86400000
  const now = Date.now()

  // =========================
  // 🔥 SAVE PROFILE
  // =========================
  if (action === "saveProfile") {

    const p = data

    if (!p.wallet || !p.signature || !p.message) {
      return res.status(400).json({ error: "missing signature data" })
    }

    const valid = verifySignature(p.wallet, p.message, p.signature)

    if (!valid) {
      return res.status(400).json({ error: "invalid signature" })
    }

    if (Math.abs(now - p.timestamp) > 5 * 60 * 1000) {
      return res.status(400).json({ error: "stale request" })
    }

    content.profiles[p.wallet] = {
      username: p.username || "",
      bio: p.bio || "",
      updated: new Date().toISOString()
    }
  }

  // =========================
  // (KEEP YOUR EXISTING LOGIC)
  // =========================

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