export default async function handler(req, res) {

try {

if (req.method !== "POST") {
return res.status(405).json({ error: "method not allowed", method: req.method })
}

// parse body safely
let body = req.body

if (typeof body === "string") {
body = JSON.parse(body)
}

const { action, data, index } = body

const token = process.env.GITHUB_TOKEN
const owner = process.env.GITHUB_OWNER
const repo = process.env.GITHUB_REPO
const path = "submissions.json"

// GET FILE
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

// HANDLE ACTIONS
if (action === "submit") {

content.projects.unshift(data)

}

if (action === "vote") {

if (content.projects[index]) {
content.projects[index].votes += 1
}

}

content.lastUpdated = new Date().toISOString()

// UPDATE FILE
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

return res.status(200).json({ success: true, result })

} catch (err) {

console.error("API ERROR:", err)

return res.status(500).json({
error: err.message
})

}
}