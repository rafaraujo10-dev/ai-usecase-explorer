async function analyzeBusiness() {
  const description = document.getElementById("companyInput").value.trim();

  if (!description) {
    alert("Please describe your company first.");
    return;
  }

  document.getElementById("loading").innerText = "Analyzing...";
  document.getElementById("tickets").innerText = "";
  document.getElementById("cost").innerText = "";
  document.getElementById("automation").innerText = "";
  document.getElementById("savings").innerText = "";

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: description
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    document.getElementById("tickets").innerText =
      "Estimated tickets/day: " + result.tickets_per_day;

    document.getElementById("cost").innerText =
      "Estimated yearly support cost: $" + Number(result.annual_support_cost).toLocaleString();

    document.getElementById("automation").innerText =
      "Estimated automation potential: " + result.automation_percentage + "%";

    document.getElementById("savings").innerText =
      "Estimated yearly AI savings: $" + Number(result.annual_savings).toLocaleString();

    createChart(result);

    document.getElementById("loading").innerText = "";
  } catch (error) {
    console.error(error);
    document.getElementById("loading").innerText = "Something went wrong.";
    alert("Error: " + error.message);
  }
}

let costChartInstance = null;

function createChart(result) {
  const ctx = document.getElementById("costChart").getContext("2d");

  if (costChartInstance) {
    costChartInstance.destroy();
  }

  costChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Current Cost", "AI Savings"],
      datasets: [
        {
          label: "Support Cost",
          data: [
            result.annual_support_cost,
            result.annual_savings
          ]
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}