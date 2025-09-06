document.getElementById("csvFileInput").addEventListener("change", handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const records = parseCSV(text);
    displayAnalysis(records);
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj = {};
    headers.forEach((h, i) => {
      let val = values[i] || "";
      val = val.replace(/^"|"$/g, ""); // remove outer quotes
      val = val.replace(/""/g, '"');   // unescape inner quotes
      obj[h] = val;
    });
    return obj;
  });
}

function displayAnalysis(records) {
  const analysisDiv = document.getElementById("analysis");
  analysisDiv.innerHTML = "";

  if (!records.length) {
    analysisDiv.innerHTML = "<p>No records found in CSV.</p>";
    return;
  }

  const questions = [
    {
      q: "How many people used the calculator today?",
      a: () => {
        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return records.filter(r => r.time.startsWith(todayStr)).length;
      }
    },
    {
      q: "Most used plan type?",
      a: () => {
        const planCount = {};
        records.forEach(r => {
          try {
            const content = JSON.parse(r.content);
            content.policies.forEach(p => {
              planCount[p.planType] = (planCount[p.planType] || 0) + 1;
            });
          } catch(e) {}
        });
        const mostUsed = Object.entries(planCount).sort((a,b) => b[1]-a[1])[0];
        return mostUsed ? `${mostUsed[0]} (${mostUsed[1]} times)` : "N/A";
      }
    },
    {
      q: "Average PPT (years)?",
      a: () => {
        let total = 0, count = 0;
        records.forEach(r => {
          try {
            const content = JSON.parse(r.content);
            content.policies.forEach(p => {
              const ppt = parseFloat(p.pptYears);
              if (!isNaN(ppt)) { total += ppt; count++; }
            });
          } catch(e) {}
        });
        return count ? (total / count).toFixed(2) : "N/A";
      }
    },
    {
      q: "Total WPC amount (numeric only)?",
      a: () => {
        let total = 0;
        records.forEach(r => {
          try {
            const content = JSON.parse(r.content);
            content.policies.forEach(p => {
              const wpc = parseInt(p.wpc.replace(/,/g, "").replace(/[^\d]/g,""), 10);
              if (!isNaN(wpc)) total += wpc;
            });
          } catch(e) {}
        });
        return total.toLocaleString();
      }
    },
    {
      q: "Number of entries per category?",
      a: () => {
        const categoryCount = {};
        records.forEach(r => {
          try {
            const content = JSON.parse(r.content);
            const cat = content.categoryText || "Unknown";
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          } catch(e) {}
        });
        return Object.entries(categoryCount).map(([k,v]) => `${k}: ${v}`).join(", ");
      }
    }
  ];

  questions.forEach(item => {
    const qEl = document.createElement("div");
    qEl.className = "analysis-question";
    qEl.textContent = item.q;

    const aEl = document.createElement("div");
    aEl.className = "analysis-answer";
    aEl.textContent = item.a();

    analysisDiv.appendChild(qEl);
    analysisDiv.appendChild(aEl);
  });
}
