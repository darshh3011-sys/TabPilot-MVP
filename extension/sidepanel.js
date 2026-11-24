const API_BASE = "http://localhost:8000"; // Replace with AWS API Gateway URL in production

const DEMO_RESPONSE = {
  matrix: [
    { option: "ASUS Vivobook 16", specs: "Ryzen 7, 16GB RAM, 512GB SSD", cost: "₹58,990", verdict: "Best Value" },
    { option: "Lenovo IdeaPad Slim 5", specs: "Core i5-13500H, 16GB, OLED", cost: "₹64,490", verdict: "Best Display" },
    { option: "HP Pavilion 15", specs: "Core i5-1335U, 8GB, 512GB", cost: "₹56,500", verdict: "RAM Limited" }
  ],
  dealbreakers: [
    "HP Pavilion 15 has soldered 8GB RAM — cannot be upgraded later.",
    "Lenovo OLED panel reduces real-world battery life to ~5.5 hrs.",
    "ASUS model lacks MS Office Home & Student pre-installed."
  ],
  checklist: [
    "Verify student discount ID on Lenovo / ASUS education store (saves ₹3,000).",
    "Confirm 16GB dual-channel memory before checkout.",
    "Check 1-year Accidental Damage Protection add-on pricing."
  ],
  voice_summary: "Top recommendation is the ASUS Vivobook 16 at 58,990 rupees for the best price-to-performance ratio. Avoid the HP Pavilion if you need upgradable memory, as its 8 gigabytes of RAM is soldered."
};

let latestVoiceSummary = DEMO_RESPONSE.voice_summary;

function renderResults(data) {
  document.getElementById("resultsArea").classList.remove("hidden");

  const tbody = document.getElementById("matrixBody");
  tbody.innerHTML = "";
  data.matrix.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${row.option}</strong></td><td>${row.specs}</td><td>${row.cost}</td><td>${row.verdict}</td>`;
    tbody.appendChild(tr);
  });

  const dbList = document.getElementById("dealbreakersList");
  dbList.innerHTML = "";
  data.dealbreakers.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    dbList.appendChild(li);
  });

  const checkContainer = document.getElementById("checklistContainer");
  checkContainer.innerHTML = "";
  data.checklist.forEach((step, idx) => {
    const label = document.createElement("label");
    label.className = "check-item";
    label.innerHTML = `<input type="checkbox" id="chk_${idx}" /> <span>${step}</span>`;
    checkContainer.appendChild(label);
  });

  latestVoiceSummary = data.voice_summary || DEMO_RESPONSE.voice_summary;
}

document.getElementById("demoPresetBtn").addEventListener("click", () => {
  document.getElementById("goalInput").value = "Compare 3 student laptops under ₹65,000 and highlight hidden hardware catch.";
  document.getElementById("tabCountStatus").textContent = "Loaded 3 preset comparison tabs.";
  renderResults(DEMO_RESPONSE);
});

document.getElementById("captureTabsBtn").addEventListener("click", () => {
  const goal = document.getElementById("goalInput").value.trim() || "Compare open tabs and summarize trade-offs";
  const statusEl = document.getElementById("tabCountStatus");
  statusEl.textContent = "Scanning open browser tabs...";

  chrome.runtime.sendMessage({ action: "CAPTURE_OPEN_TABS" }, async (response) => {
    const tabs = response?.tabs || [];
    statusEl.textContent = `Captured ${tabs.length} tab(s). Synthesizing via AWS backend...`;
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, tabs })
      });
      if (!res.ok) throw new Error("Backend offline");
      const data = await res.json();
      statusEl.textContent = `Analyzed ${tabs.length} live tab(s) successfully.`;
      renderResults(data);
    } catch (err) {
      statusEl.textContent = "Backend offline — showing structured fallback analysis for open tabs.";
      const fallback = {
        ...DEMO_RESPONSE,
        matrix: tabs.slice(0, 4).map((t, i) => ({
          option: t.title.slice(0, 28) || `Tab ${i + 1}`,
          specs: t.snippet.slice(0, 60) + "...",
          cost: "Extracted",
          verdict: i === 0 ? "Primary Focus" : "Compared"
        }))
      };
      renderResults(tabs.length ? fallback : DEMO_RESPONSE);
    }
  });
});

document.getElementById("voiceBtn").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/api/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: latestVoiceSummary })
    });
    if (res.ok) {
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
      return;
    }
  } catch (e) {}
  // Browser Web Speech fallback if ElevenLabs API key is not configured yet
  const utterance = new SpeechSynthesisUtterance(latestVoiceSummary);
  window.speechSynthesis.speak(utterance);
});
