export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "method not allowed" })
}

try {

// ✅ FIX: manually parse body
const body = typeof req.body === "string"
? JSON.parse(req.body)
: req.body

const { action, data } = body

if (action === "submit") {

const fs = require("fs")
const path = require("path")

const filePath = path.join(process.cwd(), "submissions.json")

// read existing
let json = JSON.parse(fs.readFileSync(filePath, "utf8"))

json.projects.unshift(data)
json.lastUpdated = new Date().toISOString()

// write back
fs.writeFileSync(filePath, JSON.stringify(json, null, 2))

return res.status(200).json({ success: true })
}

return res.status(400).json({ error: "invalid action" })

} catch (err) {

console.error("API ERROR:", err)

return res.status(500).json({
error: err.message
})

}
}