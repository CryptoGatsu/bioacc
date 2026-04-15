export default async function handler(req, res) {

try {

  // ONLY POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" })
  }

  // --- BODY PARSING (ROBUST) ---
  let body = req.body

  if (!body) {
    const buffers = []
    for await (const chunk of req) {
      buffers.push(chunk)
    }
    const raw = Buffer.concat(buffers).toString()
    body = JSON.parse(raw)
  }

  if (typeof body === "string") {
    body = JSON.parse(body)
  }

  const { action, data, index } = body

  console.log("ACTION:", action)
  console.log("DATA:", data)

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const path = "submissions.json"

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: "missing env variables" })
  }

  // --- HELPER: GET LATEST FILE ---
  async function getFile() {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    })

    const file = await res.json()

    const content = JSON.parse(
      Buffer.from(file.content, "base64").toString("utf8")
    )

    return { file, content }
  }

  // --- HELPER: UPDATE WITH RETRY ---
  async function updateGitHub(content, retry = 0) {

    const { file } = await getFile()

    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
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

    const result = await updateRes.json()

    // RETRY ON SHA CONFLICT
    if (result.message && result.message.includes("sha") && retry < 3) {
      console.log("Retrying...", retry + 1)
      await new Promise(r => setTimeout(r, 300))
      return updateGitHub(content, retry + 1)
    }

    return result
  }

  // --- ALWAYS GET LATEST BEFORE MODIFY ---
  const { content } = await getFile()

  if (!content.projects) {
    content.projects = []
  }

  // --- ACTIONS ---
  if (action === "submit") {

    // prevent duplicate exact submissions (optional safety)
    const exists = content.projects.some(p =>
      p.name === data.name && p.github === data.github
    )

    if (!exists) {
      content.projects.unshift(data)
    }

  }

  if (action === "vote") {
    if (content.projects[index]) {
      content.projects[index].votes = (content.projects[index].votes || 0) + 1
    }
  }

  content.lastUpdated = new Date().toISOString()

  const result = await updateGitHub(content)

  console.log("GITHUB RESULT:", result)

  return res.status(200).json({ success: true })

} catch (err) {

  console.error("API ERROR:", err)

  return res.status(500).json({
    error: err.message
  })

}
}