export default async function handler(req, res) {

try {

  // ✅ ONLY allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed", method: req.method })
  }

  // ✅ ROBUST BODY PARSING (fixes your issue)
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

  console.log("BODY RECEIVED:", body)
  console.log("ACTION:", action)

  // ✅ ENV
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const path = "submissions.json"

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: "missing env variables" })
  }

  // ✅ GET CURRENT FILE
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  })

  const file = await getRes.json()

  if (!file.content) {
    return res.status(500).json({ error: "failed to fetch file from github", file })
  }

  const content = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8")
  )

  // ✅ ENSURE STRUCTURE
  if (!content.projects) {
    content.projects = []
  }

  // ✅ HANDLE ACTIONS
  if (action === "submit") {
    console.log("ADDING PROJECT:", data)
    content.projects.unshift(data)
  }

  if (action === "vote") {
    if (content.projects[index]) {
      content.projects[index].votes = (content.projects[index].votes || 0) + 1
    }
  }

  content.lastUpdated = new Date().toISOString()

  // ✅ UPDATE FILE ON GITHUB
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

  console.log("GITHUB RESPONSE:", result)

  return res.status(200).json({ success: true, result })

} catch (err) {

  console.error("API ERROR:", err)

  return res.status(500).json({
    error: err.message
  })

}
}