export default async function handler(req, res) {

try {

// ✅ ONLY allow POST
if (req.method !== "POST") {
return res.status(405).json({ error: "method not allowed" })
}

// ✅ PARSE BODY PROPERLY
let body = ""

await new Promise((resolve) => {
req.on("data", chunk => body += chunk)
req.on("end", resolve)
})

const parsed = JSON.parse(body || "{}")

const { action, data } = parsed

if (!action) {
return res.status(400).json({ error: "missing action" })
}

// 🔐 ENV VARS
const token = process.env.GITHUB_TOKEN
const owner = "cryptogatsu"
const repo = "bioacc"
const path = "submissions.json"

// 📥 GET CURRENT FILE
const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json"
}
})

const file = await getRes.json()
const content = JSON.parse(Buffer.from(file.content, "base64").toString())

// ➕ ADD PROJECT
if (action === "submit") {
content.projects.push(data)
content.lastUpdated = new Date().toISOString()
}

// 📤 WRITE BACK TO GITHUB
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

console.error(err)
return res.status(500).json({ error: err.message })

}
}