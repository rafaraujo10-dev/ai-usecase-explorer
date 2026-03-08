const OPENAI_API_KEY = "{YOUR_OPENAI_API_KEY}"

async function analyzeBusiness(){

const description = document.getElementById("companyInput").value

document.getElementById("loading").innerText = "Analyzing..."

const prompt = `
You are an AI consultant.

A company described their business below.

Estimate their customer support metrics and AI automation potential.

Company description:
${description}

Return ONLY JSON in this format:

{
"tickets_per_day": number,
"annual_support_cost": number,
"automation_percentage": number,
"annual_savings": number
}
`

const response = await fetch("https://api.openai.com/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${OPENAI_API_KEY}`
},
body: JSON.stringify({
model: "gpt-4o-mini",
messages: [
{role:"system",content:"You estimate customer support operations for businesses"},
{role:"user",content:prompt}
]
})
})

const data = await response.json()
const text = data.choices[0].message.content
const result = JSON.parse(text)

document.getElementById("tickets").innerText =
"Estimated tickets/day: " + result.tickets_per_day

document.getElementById("cost").innerText =
"Estimated yearly support cost: $" + result.annual_support_cost

document.getElementById("automation").innerText =
"Estimated automation potential: " + result.automation_percentage + "%"

document.getElementById("savings").innerText =
"Estimated yearly AI savings: $" + result.annual_savings

createChart(result)

document.getElementById("loading").innerText = ""

}

function createChart(result){

const ctx = document.getElementById('costChart')

new Chart(ctx, {
type: 'bar',
data: {
labels: ["Current Cost", "AI Savings"],
datasets: [{
label: "Support Cost",
data: [
result.annual_support_cost,
result.annual_savings
],
backgroundColor: [
"#ef4444",
"#0B63F6"
]
}]
}
})

}