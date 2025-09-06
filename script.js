document.getElementById('csvFile').addEventListener('change', handleFile);

function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const csv = event.target.result;
        const rows = parseCSV(csv);
        if (rows.length < 1) {
            alert('Invalid or empty CSV');
            return;
        }
        const headers = rows[0];
        const data = rows.slice(1).map(r => {
            let obj = {};
            headers.forEach((h, i) => obj[h] = r[i]);
            return obj;
        });
        data.forEach(d => {
            try {
                d.content = JSON.parse(d.content);
            } catch (err) {
                console.error('Invalid JSON in content:', err);
                d.content = {};
            }
        });
        analyze(data);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (field || row.length) {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                }
                if (char === '\r' && text[i + 1] === '\n') i++;
            } else {
                field += char;
            }
        }
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function parseCustomDate(dateStr) {
    if (!dateStr) return new Date(0);
    const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = dateStr.match(/(\w+)\s(\d+),\s(\d+),\s(\d+):(\d+)\s(\w+)/);
    if (!parts) return new Date(0);
    const [, monthStr, day, year, hour, minute, period] = parts;
    const month = monthMap[monthStr];
    if (month === undefined) return new Date(0);
    let hour24 = parseInt(hour, 10);
    if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
    const date = new Date(parseInt(year), month, parseInt(day), hour24, parseInt(minute), 0);
    return isNaN(date) ? new Date(0) : date;
}

function analyze(records) {
    records.forEach(r => r.parsedDate = parseCustomDate(r.time));
    const maxTime = Math.max(...records.map(r => r.parsedDate.getTime()));
    const latestDate = new Date(maxTime);
    const latestDateStr = latestDate.toDateString();
    const todayRecords = records.filter(r => r.parsedDate.toDateString() === latestDateStr);
    const uniqueUsersToday = new Set(todayRecords.map(r => r.empId)).size;

    let planTypes = {};
    let pptSum = 0;
    let pptCount = 0;
    let premiumSum = 0;
    let premiumCount = 0;
    let categories = {};
    records.forEach(r => {
        const cat = r.content.categoryValue || 'Unknown';
        categories[cat] = (categories[cat] || 0) + 1;
        if (Array.isArray(r.content.policies)) {
            r.content.policies.forEach(p => {
                const type = p.planType || 'Unknown';
                planTypes[type] = (planTypes[type] || 0) + 1;
                const ppt = parseInt(p.pptYears, 10) || 0;
                pptSum += ppt;
                pptCount++;
                const premium = parseFloat((p.premium || '0').replace(/,/g, '')) || 0;
                premiumSum += premium;
                premiumCount++;
            });
        }
    });

    const mostUsedPlan = Object.keys(planTypes).length > 0
        ? Object.keys(planTypes).reduce((a, b) => planTypes[a] > planTypes[b] ? a : b)
        : 'None';
    const avgPpt = pptCount > 0 ? (pptSum / pptCount).toFixed(2) : '0';
    const avgPremium = premiumCount > 0 ? (premiumSum / premiumCount).toFixed(2) : '0';
    const mostCommonCategory = Object.keys(categories).length > 0
        ? Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b)
        : 'None';
    const totalEntries = records.length;
    const totalPolicies = premiumCount;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    function addQuestion(question, answer) {
        const qElem = document.createElement('p');
        qElem.className = 'question';
        qElem.textContent = question;
        const aElem = document.createElement('p');
        aElem.className = 'answer';
        aElem.textContent = answer;
        resultsDiv.appendChild(qElem);
        resultsDiv.appendChild(aElem);
    }

    addQuestion(`How many people used the calculator on ${latestDateStr}?`, uniqueUsersToday);
    addQuestion('What is the most used type of plan?', mostUsedPlan);
    addQuestion('What is the average PPT in years?', avgPpt);
    addQuestion('What is the average premium?', avgPremium);
    addQuestion('What is the most common category?', mostCommonCategory);
    addQuestion('Total number of calculations performed:', totalEntries);
    addQuestion('Total number of policies calculated:', totalPolicies);
}
