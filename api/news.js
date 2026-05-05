export default async function handler(req, res){

  try{

    let items = []

    // ========================
    // 🧪 BIO RXIV (REAL)
    // ========================
    try{
      const r = await fetch("https://api.biorxiv.org/details/biorxiv/2026-05-01/2026-05-04")
      const data = await r.json()

      items.push(...data.collection.slice(0,8).map(p => ({
        title: p.title,
        url: `https://www.biorxiv.org/content/${p.doi}v1`,
        source: "bioRxiv",
        date: p.date
      })))
    }catch(e){
      console.log("biorxiv fail", e)
    }

    // ========================
    // 🧬 PUBMED (REAL TITLES)
    // ========================
    try{
      const search = await fetch(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=date&retmax=6&term=biotech&retmode=json"
      )
      const searchData = await search.json()

      const ids = searchData.esearchresult.idlist.join(",")

      const summary = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`
      )

      const sumData = await summary.json()

      for(const id of ids.split(",")){
        const article = sumData.result[id]

        if(!article) continue

        items.push({
          title: article.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          source: "PubMed",
          date: new Date(article.pubdate || Date.now())
        })
      }

    }catch(e){
      console.log("pubmed fail", e)
    }


    // ========================
    // 📰 REAL BIOTECH NEWS (RSS PARSED)
    // ========================
    try{
      const rss = await fetch("https://endpts.com/feed/")
      const xml = await rss.text()

      const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]

      for(const m of matches.slice(0,5)){
        const block = m[1]

        const title = block.match(/<title>(.*?)<\/title>/)?.[1]
        const link = block.match(/<link>(.*?)<\/link>/)?.[1]
        const date = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]

        if(title && link){
          items.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g,""),
            url: link,
            source: "Endpoints",
            date: new Date(date)
          })
        }
      }

    }catch(e){
      console.log("rss fail", e)
    }


    // ========================
    // 🧠 SCORE
    // ========================
    items = items.map(i => ({
      ...i,
      score: scoreAlpha(i.title)
    }))


    // ========================
    // 🔥 TREND DETECTION
    // ========================
    const wordMap = {}

    for(const item of items){
      const words = item.title.toLowerCase().split(" ")
      for(const w of words){
        if(w.length < 5) continue
        wordMap[w] = (wordMap[w] || 0) + 1
      }
    }

    items = items.map(i => {
      let boost = 0
      for(const w of i.title.toLowerCase().split(" ")){
        if(wordMap[w] >= 3) boost += 2
      }
      return {
        ...i,
        score: i.score + boost,
        trending: boost > 0
      }
    })


    // ========================
    // ❌ REMOVE DUPLICATES
    // ========================
    const seen = new Set()
    items = items.filter(i => {
      if(seen.has(i.title)) return false
      seen.add(i.title)
      return true
    })

// ========================
// 🧬 BIOTECH COMPANY MAP
// ========================
const biotechCompanies = [
  { name: "moderna", ticker: "MRNA" },
  { name: "crispr", ticker: "CRSP" },
  { name: "vertex", ticker: "VRTX" },
  { name: "regeneron", ticker: "REGN" },
  { name: "illumina", ticker: "ILMN" },
  { name: "gilead", ticker: "GILD" },
  { name: "amgen", ticker: "AMGN" },
  { name: "biogen", ticker: "BIIB" },
  { name: "intellia", ticker: "NTLA" },
  { name: "beam", ticker: "BEAM" }
]

// ========================
// 🔗 MATCH COMPANIES
// ========================
items = items.map(item => {

  const title = item.title.toLowerCase()

  let matched = []

  for(const c of biotechCompanies){
    if(title.includes(c.name)){
      matched.push(c)
    }
  }

  let companyBoost = matched.length * 3

  return {
    ...item,
    companies: matched,
    score: item.score + companyBoost
  }
})
    // ========================
    // SORT
    // ========================
    items.sort((a,b) =>
      b.score - a.score ||
      new Date(b.date) - new Date(a.date)
    )


    return res.json({
      items: items.slice(0,25),
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("news error:", err)
    return res.status(500).json({ error:"failed to fetch news" })
  }
}



// ========================
// 🧠 ALPHA SCORING
// ========================
function scoreAlpha(title){

  let score = 0
  const t = title.toLowerCase()

  if(t.includes("fda")) score += 8
  if(t.includes("approval")) score += 7
  if(t.includes("phase 3")) score += 6
  if(t.includes("trial")) score += 4
  if(t.includes("endpoint")) score += 5

  if(t.includes("raises")) score += 5
  if(t.includes("funding")) score += 5
  if(t.includes("$")) score += 4

  if(t.includes("crispr")) score += 4
  if(t.includes("gene therapy")) score += 4
  if(t.includes("oncology")) score += 3

  if(t.includes("breakthrough")) score += 3
  if(t.includes("first")) score += 2

  return score
}