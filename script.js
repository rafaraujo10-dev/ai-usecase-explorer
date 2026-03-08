function generateDashboard(){

const ctx = document.getElementById('chart').getContext('2d');

new Chart(ctx, {
type: 'bar',
data: {
labels: [
'Customer Support AI',
'Marketing Automation',
'Lead Qualification',
'Knowledge Base AI'
],
datasets: [{
label: 'Opportunity Score',
data: [85,70,60,90],
backgroundColor: '#0B63F6'
}]
},
options: {
scales: {
y: {
beginAtZero: true,
max: 100
}
}
}

});

}