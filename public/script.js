const descriptionInput = document.getElementById("companyDescription");
const analyzeBtn = document.getElementById("analyzeBtn");

const ticketsPerDayEl = document.getElementById("ticketsPerDay");
const annualSupportCostEl = document.getElementById("annualSupportCost");
const automationPercentageEl = document.getElementById("automationPercentage");
const annualSavingsEl = document.getElementById("annualSavings");

const summaryEl = document.getElementById("summary");
const assumptionsEl = document.getElementById("assumptions");
const errorMessageEl = document.getElementById("errorMessage");
const loadingMessageEl = document.getElementById("loadingMessage");

let resultsChart = null;

analyzeBtn.addEventListener("click", async () => {
  const description = descriptionInput.value.trim();

  clearError();

  if (!description) {
    showError("Please describe your company first.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ description })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong.");
      console.error("Analyze error:", data);
      return;
    }

    renderResults(data);
  } catch (error) {
    showError("Network error while calling /analyze.");
    console.error(error);
  } finally {
    setLoading(false);
  }
});

function renderResults(data) {
  ticketsPerDayEl.textContent = formatNumber(data.tickets_per_day);
  annualSupportCostEl.textContent = formatCurrency(data.annual_support_cost);
  automationPercentageEl.textContent = `${formatNumber(data.automation_percentage)}%`;
  annualSavingsEl.textContent = formatCurrency(data.annual_savings);

  if (summaryEl) {
    summaryEl.textContent = data.summary || "";
  }

  if (assumptionsEl) {
    assumptionsEl.innerHTML = "";

    const assumptions = Array.isArray(data.assumptions) ? data.assumptions : [];
    assumptions.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      assumptionsEl.appendChild(li);
    });
  }

  renderChart(data);
}

function renderChart(data) {
  const canvas = document.getElementById("resultsChart");

  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const ctx = canvas.getContext("2d");

  if (resultsChart) {
    resultsChart.destroy();
  }

  resultsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Tickets/Day", "Annual Support Cost", "Automation %", "Annual Savings"],
      datasets: [
        {
          label: "Estimated Value",
          data: [
            data.tickets_per_day || 0,
            data.annual_support_cost || 0,
            data.automation_percentage || 0,
            data.annual_savings || 0
          ]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? "Analyzing..." : "Analyze AI Opportunity";

  if (loadingMessageEl) {
    loadingMessageEl.hidden = !isLoading;
  }
}

function showError(message) {
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
}

function clearError() {
  if (errorMessageEl) {
    errorMessageEl.textContent = "";
  }
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(number);
}