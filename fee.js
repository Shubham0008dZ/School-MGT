document.addEventListener('DOMContentLoaded', () => {
    // API URL - REPLACE THIS WITH YOUR DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    let allStudents = [];
    let setupClasses = [];
    let feeHeads = [];
    let feeReceipts = [];

    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    function formatToDDMMYYYY(dateString) {
        if(!dateString) return "";
        const d = new Date(dateString);
        if(isNaN(d.getTime())) return dateString;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    }

    const today = new Date();
    document.getElementById('feeDate').value = today.toISOString().split('T')[0];

    // ==========================================
    // 1. DATA FETCHING
    // ==========================================
    function initData() {
        document.getElementById('receiptsTableBody').innerHTML = '<tr><td colspan="10" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success") {
                    allStudents = res.data; feeHeads = res.feeHeads || []; feeReceipts = res.receipts || [];
                    if(res.setup && res.setup.classes) setupClasses = res.setup.classes;
                    
                    populateStudentsDropdown();
                    renderFeeHeadsSetupList();
                    renderReceiptsTable();
                    updateNextReceiptNo();
                }
            });
    }

    function showView(targetId) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById(targetId).classList.add('active-module');
    }

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; 
            e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            if(targetId) showView(targetId);
        });
    });

    document.getElementById('btn-open-add-receipt').addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('sideAddReceipt').classList.add('active');
        showView('module-add-receipt');
    });

    document.getElementById('btnSyncFees').addEventListener('click', initData);

    // ==========================================
    // 3. STUDENT SELECTION & PROFILE
    // ==========================================
    function populateStudentsDropdown() {
        const sel = document.getElementById('feeStudentSelect');
        sel.innerHTML = '<option value="">-- Search and Select Student --</option>';
        allStudents.forEach(s => {
            let sName = s.studentFirstName || s.studentName || 'N/A';
            let val = `${s.regNo} - ${sName} (${s.studentClass}) - ${s.fatherName || 'No Father Name'}`;
            sel.innerHTML += `<option value="${s.regNo}">${val}</option>`;
        });
    }

    document.getElementById('feeStudentSelect').addEventListener('change', triggerTableGeneration);
    document.getElementById('feeMonthSelect').addEventListener('change', triggerTableGeneration);

    function triggerTableGeneration() {
        const regNo = document.getElementById('feeStudentSelect').value;
        const selectedMonth = document.getElementById('feeMonthSelect').value;
        if(!regNo) { clearProfilePanel(); return; }

        const student = allStudents.find(s => String(s.regNo) === String(regNo));
        if(student) {
            document.getElementById('profName').innerText = student.studentFirstName || student.studentName || 'N/A';
            document.getElementById('profReg').innerText = student.regNo;
            document.getElementById('profClass').innerText = student.studentClass || '-';
            document.getElementById('profFather').innerText = student.fatherName || '-';
            document.getElementById('profMother').innerText = student.motherName || '-';
            generateFeeTable(student, selectedMonth);
        }
    }

    function clearProfilePanel() {
        ['profName','profReg','profClass','profFather','profMother'].forEach(id => document.getElementById(id).innerText = "-");
        document.getElementById('feeHeadsTbody').innerHTML = '<tr><td colspan="9" style="text-align:center;">Select a student to view fee heads</td></tr>';
        resetTotals();
    }

    // ==========================================
    // 4. AUTO FEE TABLE (DYNAMIC MONTHLY HEADS)
    // ==========================================
    function generateFeeTable(student, selectedMonthVal) {
        const tbody = document.getElementById('feeHeadsTbody');
        tbody.innerHTML = '';
        
        let classFeeAmount = 0;
        if(student.studentClass) {
            let cSetup = setupClasses.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass);
            if(cSetup && cSetup.fee) classFeeAmount = parseFloat(cSetup.fee);
        }

        let paidMap = {};
        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(student.regNo).trim()) {
                try {
                    let detailsRaw = r.Paid_Heads;
                    if (typeof detailsRaw === 'string') {
                        let details = JSON.parse(detailsRaw || "[]");
                        details.forEach(d => {
                            let uid = d.head + "_" + d.period;
                            paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0);
                        });
                    }
                } catch(e) {}
            }
        });

        let allRows = [];
        let selectedMonthIdx = academicMonths.indexOf(selectedMonthVal);
        if (selectedMonthIdx === -1) selectedMonthIdx = 0; 

        // 1. Core Monthly Tuition rows
        for(let i = 0; i <= selectedMonthIdx; i++) {
            let uid = "Monthly Tuition Fee_" + academicMonths[i];
            let alreadyPaid = paidMap[uid] || 0;
            let remaining = classFeeAmount - alreadyPaid;
            if(remaining > 0) {
                allRows.push({ head: "Monthly Tuition Fee", period: academicMonths[i], amount: remaining });
            }
        }

        // 2. Custom Fee Heads
        feeHeads.forEach(fh => {
            let amount = parseFloat(fh.Amount) || 0;
            
            // If frequency is Monthly, loop it just like Tuition Fee!
            if (fh.Frequency === "Monthly") {
                for(let i = 0; i <= selectedMonthIdx; i++) {
                    let uid = fh.Head_Name + "_" + academicMonths[i];
                    let alreadyPaid = paidMap[uid] || 0;
                    let remaining = amount - alreadyPaid;
                    if(remaining > 0) {
                        allRows.push({ head: fh.Head_Name, period: academicMonths[i], amount: remaining });
                    }
                }
            } else {
                // One Time, Annually, Quarterly
                let uid = fh.Head_Name + "_" + fh.Frequency;
                let alreadyPaid = paidMap[uid] || 0;
                let remaining = amount - alreadyPaid;
                if(remaining > 0) {
                    allRows.push({ head: fh.Head_Name, period: fh.Frequency, amount: remaining });
                }
            }
        });

        if(allRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:green; font-weight:bold;">All Fees Cleared / Paid up to selected month!</td></tr>';
            resetTotals();
            return;
        }

        allRows.forEach((r, idx) => {
            tbody.innerHTML += `
                <tr class="f-row" data-head="${r.head}" data-period="${r.period}">
                    <td><input type="checkbox" class="f-chk" title="Check to delete/exclude row"></td>
                    <td class="f-head" style="text-align:left;"><b>${r.head}</b></td>
                    <td>${r.period}</td>
                    <td><input type="number" class="f-actual" value="${r.amount.toFixed(2)}" readonly style="border:none; background:transparent; font-weight:bold;"></td>
                    <td><input type="number" class="f-conc" value="0.00"></td>
                    <td><input type="number" class="f-waiver" value="0.00"></td>
                    <td><input type="number" class="f-net" value="${r.amount.toFixed(2)}" style="font-weight:bold; color:#e74c3c; background:#fff;"></td>
                    <td><input type="number" class="f-paid" value="${r.amount.toFixed(2)}" style="background:#e8f4f8;"></td>
                    <td><input type="number" class="f-bal" value="0.00" readonly style="border:none; background:transparent; font-weight:bold;"></td>
                </tr>
            `;
        });

        attachCalculationListeners();
        calculateTotals();
    }

    // ==========================================
    // 5. MATH & CHECKBOX LOGIC
    // ==========================================
    function attachCalculationListeners() {
        document.querySelectorAll('.f-row').forEach(row => {
            row.querySelector('.f-conc').addEventListener('input', () => { updateRowNetAndPaid(row); calculateTotals(); });
            row.querySelector('.f-waiver').addEventListener('input', () => { updateRowNetAndPaid(row); calculateTotals(); });
            
            row.querySelector('.f-net').addEventListener('input', () => { 
                let net = parseFloat(row.querySelector('.f-net').value) || 0;
                row.querySelector('.f-paid').value = net.toFixed(2);
                updateRowBal(row);
                calculateTotals(); 
            });

            row.querySelector('.f-paid').addEventListener('input', () => { updateRowBal(row); calculateTotals(); });
            
            row.querySelector('.f-chk').addEventListener('change', function() {
                if(this.checked) {
                    row.classList.add('disabled-row');
                    row.querySelector('.f-paid').value = "0.00"; 
                } else {
                    row.classList.remove('disabled-row');
                    updateRowNetAndPaid(row); 
                }
                calculateTotals();
            });
        });
        document.getElementById('finalAdvance').addEventListener('input', calculateTotals);
    }

    function updateRowNetAndPaid(row) {
        let act = parseFloat(row.querySelector('.f-actual').value) || 0;
        let conc = parseFloat(row.querySelector('.f-conc').value) || 0;
        let waiv = parseFloat(row.querySelector('.f-waiver').value) || 0;
        let net = act - conc - waiv;
        if(net < 0) net = 0; 
        row.querySelector('.f-net').value = net.toFixed(2);
        row.querySelector('.f-paid').value = net.toFixed(2); 
        row.querySelector('.f-bal').value = "0.00"; 
    }

    function updateRowBal(row) {
        let net = parseFloat(row.querySelector('.f-net').value) || 0;
        let paid = parseFloat(row.querySelector('.f-paid').value) || 0;
        row.querySelector('.f-bal').value = (net - paid).toFixed(2);
    }

    function calculateTotals() {
        let totAct = 0, totConc = 0, totWaiv = 0, totNet = 0, totPaid = 0, totBal = 0;

        document.querySelectorAll('.f-row').forEach(row => {
            if(!row.querySelector('.f-chk').checked) { 
                totAct += parseFloat(row.querySelector('.f-actual').value) || 0;
                totConc += parseFloat(row.querySelector('.f-conc').value) || 0;
                totWaiv += parseFloat(row.querySelector('.f-waiver').value) || 0;
                totNet += parseFloat(row.querySelector('.f-net').value) || 0;
                totPaid += parseFloat(row.querySelector('.f-paid').value) || 0;
                totBal += parseFloat(row.querySelector('.f-bal').value) || 0;
            }
        });

        document.getElementById('totActual').innerText = totAct.toFixed(2);
        document.getElementById('totConcession').innerText = totConc.toFixed(2);
        document.getElementById('totWaiver').innerText = totWaiv.toFixed(2);
        document.getElementById('totNet').innerText = totNet.toFixed(2);
        document.getElementById('totPaid').innerText = totPaid.toFixed(2);
        document.getElementById('totBal').innerText = totBal.toFixed(2);

        document.getElementById('profPayable').innerText = totNet.toFixed(2);
        document.getElementById('finalPayable').value = totNet.toFixed(2);
        
        let advance = parseFloat(document.getElementById('finalAdvance').value) || 0;
        let finalPaid = totPaid + advance;
        document.getElementById('finalTotalPaid').value = finalPaid.toFixed(2);
        document.getElementById('payAmount').value = finalPaid.toFixed(2); 
    }

    function resetTotals() {
        ['totActual', 'totConcession', 'totWaiver', 'totNet', 'totPaid', 'totBal'].forEach(id => document.getElementById(id).innerText = "0.00");
        document.getElementById('finalPayable').value = "0.00"; document.getElementById('finalAdvance').value = "0.00";
        document.getElementById('finalTotalPaid').value = "0.00"; document.getElementById('payAmount').value = "";
    }

    function updateNextReceiptNo() {
        let maxNo = 0;
        feeReceipts.forEach(r => {
            let parts = String(r.Receipt_No).replace("'", "").split('/');
            let num = parseInt(parts[parts.length - 1], 10);
            if(!isNaN(num) && num > maxNo) maxNo = num;
        });
        document.getElementById('feeReceiptNo').value = `2026-27/${maxNo + 1}`;
    }

    // ==========================================
    // 6. SAVE RECEIPT & PRINT LOGIC
    // ==========================================
    function saveReceipt(onSuccessAction) {
        const regNo = document.getElementById('feeStudentSelect').value;
        if(!regNo) { alert("Please select a student first."); return; }
        const month = document.getElementById('feeMonthSelect').value;
        if(!month) { alert("Please select Fee Installment Month."); return; }

        let paidDetails = [];
        document.querySelectorAll('.f-row').forEach(row => {
            if(!row.querySelector('.f-chk').checked) { 
                paidDetails.push({
                    head: row.getAttribute('data-head'),
                    period: row.getAttribute('data-period'),
                    actual: row.querySelector('.f-actual').value,
                    adj: (parseFloat(row.querySelector('.f-conc').value) || 0) + (parseFloat(row.querySelector('.f-waiver').value) || 0),
                    payable: row.querySelector('.f-net').value,
                    paid: row.querySelector('.f-paid').value,
                    bal: row.querySelector('.f-bal').value
                });
            }
        });

        if(paidDetails.length === 0) { alert("No fees selected to pay."); return; }

        const payload = {
            action: "saveReceipt",
            data: {
                receiptNo: document.getElementById('feeReceiptNo').value,
                regNo: regNo,
                studentName: document.getElementById('profName').innerText,
                classSec: document.getElementById('profClass').innerText,
                installment: month,
                totalAmount: document.getElementById('finalTotalPaid').value,
                paymentMode: document.getElementById('payType').value,
                date: formatToDDMMYYYY(document.getElementById('feeDate').value),
                bankName: document.getElementById('payBank').value || '-',
                refNo: document.getElementById('payRef').value || '-',
                paidHeads: paidDetails 
            }
        };

        if(onSuccessAction === 'print') {
            populatePrintTemplate(payload.data, paidDetails, document.getElementById('profFather').innerText);
        }

        document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '0.5');

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
            .then(res => res.json())
            .then(data => {
                document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '1');
                if(data.status === "Success") {
                    if(onSuccessAction === 'print') {
                        window.print();
                        initData(); 
                    } else {
                        alert(data.message);
                        if(onSuccessAction === 'close') { showView('module-receipts-list'); initData(); }
                        if(onSuccessAction === 'new') { document.getElementById('feeStudentSelect').value = ""; clearProfilePanel(); initData(); }
                    }
                }
            });
    }

    document.getElementById('btnSaveReceiptClose').addEventListener('click', () => saveReceipt('close'));
    document.getElementById('btnSaveReceiptNew').addEventListener('click', () => saveReceipt('new'));
    document.getElementById('btnSaveReceiptPrint').addEventListener('click', () => saveReceipt('print'));

    // ==========================================
    // 7. FEE RECEIPTS LIST RENDERING 
    // ==========================================
    function renderReceiptsTable() {
        const tbody = document.getElementById('receiptsTableBody');
        tbody.innerHTML = '';
        if(feeReceipts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No receipts generated yet.</td></tr>';
            return;
        }

        [...feeReceipts].reverse().forEach((r, idx) => {
            let rNo = String(r.Receipt_No).replace("'", ""); 
            let rDate = String(r.Date).replace("'", "");
            let safeReceipt = JSON.stringify(r).replace(/'/g, "&#39;"); 
            
            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td><td><b>${rNo}</b></td><td>${r.Reg_No}</td>
                    <td><a href="#" class="student-ledger-link" onclick="openLedger('${r.Reg_No}')" title="View Fee Ledger">${r.Student_Name}</a></td>
                    <td>${r.Class_Section}</td><td>${r.Payment_Mode}</td><td style="color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td>
                    <td>${rDate}</td><td>${new Date(r.Timestamp).toLocaleString()}</td>
                    <td>
                        <button class="btn-red" style="background:#3498db;" title="Print" onclick='printFromHistory(${safeReceipt})'>🖨️</button>
                        <button class="btn-red" title="Delete" onclick="deleteReceipt('${rNo}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    window.printFromHistory = function(r) {
        let student = allStudents.find(s => String(s.regNo) === String(r.Reg_No));
        let fName = student ? (student.fatherName || '-') : '-';
        
        let detailsArray = [];
        try { if(typeof r.Paid_Heads === 'string') detailsArray = JSON.parse(r.Paid_Heads || "[]"); } catch(e){}

        let rData = {
            receiptNo: String(r.Receipt_No).replace("'", ""), regNo: r.Reg_No, studentName: r.Student_Name,
            classSec: r.Class_Section, installment: String(r.Installment).replace("'", ""), date: String(r.Date).replace("'", ""),
            totalAmount: r.Amount, paymentMode: r.Payment_Mode, bankName: r.Bank_Name || '-', refNo: String(r.Ref_No).replace("'", "") || '-'
        };
        populatePrintTemplate(rData, detailsArray, fName);
        window.print();
    }

    function populatePrintTemplate(rData, detailsArray, fName) {
        document.getElementById('p-adm').innerText = rData.regNo;
        document.getElementById('p-name').innerText = rData.studentName;
        document.getElementById('p-father').innerText = fName;
        document.getElementById('p-class').innerText = rData.classSec;
        document.getElementById('p-receipt').innerText = rData.receiptNo;
        document.getElementById('p-date').innerText = rData.date;
        document.getElementById('p-period').innerText = rData.installment;

        let pBody = document.getElementById('print-particulars-body');
        pBody.innerHTML = '';
        let tAct=0, tAdj=0, tPay=0, tPaid=0, tBal=0;

        detailsArray.forEach(d => {
            let fee = parseFloat(d.actual) || 0; let adj = parseFloat(d.adj) || 0;
            let pay = parseFloat(d.payable) || 0; let pd = parseFloat(d.paid) || 0; let bal = parseFloat(d.bal) || 0;
            tAct += fee; tAdj += adj; tPay += pay; tPaid += pd; tBal += bal;
            
            let displayName = d.head;
            if(d.period && d.period !== "Monthly" && d.period !== "Annually" && d.period !== "One Time" && d.period !== "Quarterly") {
                displayName += ` <span style="color:#555; font-size:11px;">(${d.period})</span>`;
            } else {
                displayName += ` <span style="color:#555; font-size:11px;">(${d.period})</span>`;
            }
            pBody.innerHTML += `<tr><td style="text-align:left;">${displayName}</td><td>${fee.toFixed(2)}</td><td>${adj.toFixed(2)}</td><td>${pay.toFixed(2)}</td><td>${pd.toFixed(2)}</td><td>${bal.toFixed(2)}</td></tr>`;
        });

        document.getElementById('p-t-fees').innerText = tAct.toFixed(2); document.getElementById('p-t-adj').innerText = tAdj.toFixed(2);
        document.getElementById('p-t-pay').innerText = tPay.toFixed(2); document.getElementById('p-t-paid').innerText = tPaid.toFixed(2);
        document.getElementById('p-t-bal').innerText = tBal.toFixed(2); document.getElementById('p-words').innerText = tPaid.toFixed(2) + " /-";
        document.getElementById('p-pmode').innerText = rData.paymentMode; document.getElementById('p-pbank').innerText = rData.bankName;
        document.getElementById('p-pdate').innerText = rData.date; document.getElementById('p-pdet').innerText = rData.refNo;
        document.getElementById('p-pamt').innerText = rData.totalAmount;
    }

    window.deleteReceipt = function(receiptNo) {
        if(confirm(`Are you sure you want to Delete Receipt No: ${receiptNo}?\nThis will revert the fee ledger.`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "deleteReceipt", receiptNo: receiptNo }) })
            .then(res => res.json())
            .then(data => { if(data.status === "Success") { alert(data.message); initData(); } });
        }
    }

    // ==========================================
    // 8. THE "KUNDLI" - STUDENT FEE LEDGER 
    // ==========================================
    window.openLedger = function(regNo) {
        let student = allStudents.find(s => String(s.regNo) === String(regNo));
        if(!student) return;

        document.getElementById('l-name').innerText = student.studentFirstName || student.studentName || 'N/A';
        document.getElementById('l-reg').innerText = student.regNo;
        document.getElementById('l-class').innerText = student.studentClass || '-';
        document.getElementById('l-father').innerText = student.fatherName || '-';

        let classFeeAmount = 0;
        if(student.studentClass) {
            let cSetup = setupClasses.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass);
            if(cSetup && cSetup.fee) classFeeAmount = parseFloat(cSetup.fee);
        }

        let paidMap = {};
        let histBody = document.getElementById('ledgerHistoryBody');
        histBody.innerHTML = '';

        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(regNo).trim()) {
                try {
                    let details = JSON.parse(r.Paid_Heads || "[]");
                    details.forEach(d => {
                        let uid = d.head + "_" + d.period;
                        paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid);
                    });
                } catch(e){}
                
                let rNo = String(r.Receipt_No).replace("'", ""); 
                let rDate = String(r.Date).replace("'", "");
                histBody.innerHTML += `<tr><td>${rDate}</td><td>${rNo}</td><td>${r.Payment_Mode}</td><td style="color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td></tr>`;
            }
        });

        if(histBody.innerHTML === '') histBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No payment history found.</td></tr>';

        let tbody = document.getElementById('ledgerTableBody');
        tbody.innerHTML = '';
        let totalDue = 0, totalPaid = 0;

        // Separate Tuition and Monthly Heads logically
        academicMonths.forEach(month => {
            
            // 1. Tuition Fee 
            let tAmt = classFeeAmount;
            let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0;
            let tBal = tAmt - tPaid;
            totalDue += tAmt; totalPaid += tPaid;
            
            let tStyle = tBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
            tbody.innerHTML += `<tr><td><b>Monthly Tuition Fee (${month})</b></td><td>₹${tAmt.toFixed(2)}</td><td style="color:#2980b9;">₹${tPaid.toFixed(2)}</td><td style="${tStyle} font-weight:bold;">₹${tBal.toFixed(2)}</td></tr>`;

            // 2. Custom Monthly Fees
            feeHeads.forEach(fh => {
                if(fh.Frequency === "Monthly") {
                    let fhAmt = parseFloat(fh.Amount) || 0;
                    let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0;
                    let fhBal = fhAmt - fhPaid;
                    totalDue += fhAmt; totalPaid += fhPaid;
                    
                    let fhStyle = fhBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                    tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (${month})</b></td><td>₹${fhAmt.toFixed(2)}</td><td style="color:#2980b9;">₹${fhPaid.toFixed(2)}</td><td style="${fhStyle} font-weight:bold;">₹${fhBal.toFixed(2)}</td></tr>`;
                }
            });
        });

        // 3. Other Frequency Fees (Annually, Quarterly, One Time)
        feeHeads.forEach(fh => {
            if(fh.Frequency !== "Monthly") {
                let amt = parseFloat(fh.Amount) || 0;
                // Check exact frequency OR fallback for older entries that might have saved differently
                let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0;
                let bal = amt - pd;
                totalDue += amt; totalPaid += pd;
                
                let balStyle = bal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (${fh.Frequency})</b></td><td>₹${amt.toFixed(2)}</td><td style="color:#2980b9;">₹${pd.toFixed(2)}</td><td style="${balStyle} font-weight:bold;">₹${bal.toFixed(2)}</td></tr>`;
            }
        });

        document.getElementById('l-tot-due').innerText = "₹" + totalDue.toFixed(2);
        document.getElementById('l-tot-paid').innerText = "₹" + totalPaid.toFixed(2);
        document.getElementById('l-tot-bal').innerText = "₹" + (totalDue - totalPaid).toFixed(2);

        document.getElementById('ledgerModal').classList.add('active');
    }

    document.getElementById('closeLedgerBtn').addEventListener('click', () => {
        document.getElementById('ledgerModal').classList.remove('active');
    });

    // ==========================================
    // 9. FEE HEADS SETUP
    // ==========================================
    function renderFeeHeadsSetupList() {
        const tbody = document.getElementById('feeHeadsListBody');
        tbody.innerHTML = '';
        if(feeHeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No Fee Heads Configured.</td></tr>';
            return;
        }
        feeHeads.forEach((f, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td><td><b>${f.Head_Name}</b></td><td>${f.Frequency}</td><td>₹${f.Amount}</td>
                    <td><button class="btn-red" onclick="deleteFeeHead('${f.Head_Name}')">🗑️</button></td>
                </tr>
            `;
        });
    }

    document.getElementById('feeSetupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Button Disable Logic applied here
        const btnSubmit = document.getElementById('btnSubmitFeeHead');
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Adding Fee Head...";
        btnSubmit.style.opacity = '0.6';

        const payload = {
            action: "saveFeeHead",
            data: { headName: document.getElementById('headName').value.trim(), frequency: document.getElementById('headFreq').value, amount: document.getElementById('headAmount').value || 0 }
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(data => { 
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Add Fee Head";
            btnSubmit.style.opacity = '1';
            
            if(data.status === "Success") { 
                alert(data.message); 
                this.reset(); 
                initData(); 
            } else {
                alert("Error: " + data.message);
            }
        }).catch(err => {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Add Fee Head";
            btnSubmit.style.opacity = '1';
            alert("Connection error.");
        });
    });

    window.deleteFeeHead = function(headName) {
        if(confirm(`Delete Fee Head: ${headName}?`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "deleteFeeHead", headName: headName }) })
            .then(res => res.json())
            .then(data => { if(data.status === "Success") initData(); });
        }
    }

    initData();
});