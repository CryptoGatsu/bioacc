export default async function handler(req, res) {

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const OWNER = "cryptogatsu"
const REPO = "bioacc"
const PATH = "submissions.json"

const githubApi = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`

try {

// GET CURRENT FILE
const fileRes = await fetch(githubApi, {
headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
})

const fileData = await fileRes.json()

const content = JSON.parse(
Buffer.from(fileData.content, "base64").toString()
)

let projects = content.projects || []

// HANDLE ACTION
const { action, data, index, wallet } = req.body

if(action === "submit"){

// prevent duplicate wallet
if(projects.find(p => p.wallet === data.wallet)){
return res.status(400).json({ error: "already submitted" })
}

projects.push(data)

}

if(action === "vote"){

let votes = content.votes || {}

if(!votes[wallet]) votes[wallet] = []

if(votes[wallet].includes(index)){
return res.status(400).json({ error: "already voted" })
}

projects[index].votes += 1
votes[wallet].push(index)

content.votes = votes

}

content.projects = projects
content.lastUpdated = new Date().toISOString()

// UPDATE FILE
await fetch(githubApi, {
method: "PUT",
headers: {
Authorization: `Bearer ${GITHUB_TOKEN}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
message: "update submissions",
content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
sha: fileData.sha
})
})

res.status(200).json({ success: true })

}catch(e){
res.status(500).json({ error: e.message })
}

}