function tableToCSV() {
    let csv_data = [];

    let rows = document.querySelector("table#output").getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        let cols = rows[i].querySelectorAll('td,th');

        let csvrow = [];
        for (let j = 0; j < cols.length; j++) {
            csvrow.push(cols[j].textContent);
        }

        csv_data.push(csvrow.join(","));
    }

    csv_data = csv_data.join('\n');

    let CSVFile = new Blob([csv_data], { type: "text/csv" });

    let temp_link = document.createElement('a');

    temp_link.download = "table.csv";
    let url = window.URL.createObjectURL(CSVFile);
    temp_link.href = url;

    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    temp_link.click();
    document.body.removeChild(temp_link);
}

function CSVToArray(str, delimiter = ",") {
    const headers = str
        .slice(0, str.indexOf("\n"))
        .split(delimiter);
    
    const arr = str
        .slice(str.indexOf("\n") + 1)
        .split("\n")
        .map((row) => row.split(delimiter));

    return arr;
}

function parseCSV() {
    const csvFile = document.getElementById("csvFile");
    const input = csvFile.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        const text = e.target.result;
        const data = CSVToArray(text);

        for (const job of data) {
            startJob(job);
        }
    };

    reader.readAsText(input);
}

function startJob(job) {
    const worker = new Worker('worker.js', {
        type: 'module'
    });
    
    worker.onmessage = (e) => {
        if (e.data == "Done!") {
            worker.terminate();
            return;
        }

        const result = e.data;
        
        const table_body = document.querySelector("table#output tbody");
        const row = document.createElement("tr");
        table_body.append(row);

        const job_id = document.createElement("td");
        job_id.textContent = job[0];
        row.append(job_id);

        const id = document.createElement("td");
        id.textContent = result.id;
        row.append(id);

        const x = document.createElement("td");
        x.textContent = result.x_pos;
        row.append(x);

        const y = document.createElement("td");
        y.textContent = result.y_pos;
        row.append(y);

        const success = document.createElement("td");
        success.textContent = result.after_adapt_log10_ber < result.baseline_log10_ber;
        row.append(success);

        const baseline = document.createElement("td");
        baseline.textContent = result.baseline_log10_ber;
        row.append(baseline);

        const before = document.createElement("td");
        before.textContent = result.before_adapt_log10_ber;
        row.append(before);

        const after = document.createElement("td");
        after.textContent = result.after_adapt_log10_ber;
        row.append(after);
    }
    
    worker.postMessage(job);
}