export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "method not allowed" })
}

try {

const body = typeof req.body === "string"
? JSON.parse(req.body)
: req.body

const { action, data } = body

if (action !== "submit") {
return res.status(400).json({ error: "invalid action" })
}

const token = process.env.GITHUB_TOKEN
const owner = process.env.GITHUB_OWNER
const repo = process.env.GITHUB_REPO
const path = "submissions.json"

// 1. GET current file
const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json"
}
})

const file = await getRes.json()

const content = JSON.parse(
Buffer.from(file.content, "base64").toString("utf8")
)

// 2. UPDATE data
content.projects.unshift(data)
content.lastUpdated = new Date().toISOString()

// 3. PUSH update
const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
method: "PUT",
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json"
},
body: JSON.stringify({
message: "new submission",
content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
sha: file.sha
})
})

const result = await updateRes.json()

return res.status(200).json({ success: true, result })

} catch (err) {

console.error("API ERROR:", err)

return res.status(500).json({
error: err.message
})

}
}