document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. SECURITY & RBAC
    // ==========================================
    const activeUserStr = localStorage.getItem('erp_active_user');
    
    if (!activeUserStr) { 
        window.location.href = 'login.html'; 
        return; 
    }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    
    try { 
        userRights = JSON.parse(activeUser.Rights_JSON || "[]"); 
    } catch(e) {
        console.error("Rights parsing error:", e);
    }

    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    // REAL-TIME SESSION VERIFICATION
    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }) })
    .then(res => res.json())
    .then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => console.log("Background sync paused."));

    // USER NAME INJECTION
    const topRightSpans = document.querySelectorAll('.top-right span');
    if(topRightSpans.length > 0) { topRightSpans[0].innerHTML = `👤 Welcome, <b>${activeUser.empName}</b>`; }

    if (!isSA && !userRights.some(r => r.startsWith("FEE_"))) { window.location.href = 'index.html'; return; }

    // AGGRESSIVE DOM REMOVAL
    if (!isSA) {
        if(!userRights.includes("FEE_Add")) {
            let addBtn1 = document.getElementById('btn-open-add-receipt');
            let addBtn2 = document.getElementById('sideAddReceipt');
            if(addBtn1) addBtn1.remove();
            if(addBtn2) addBtn2.remove();
        }
        if(!userRights.includes("FEE_Setup")) {
            let setupNav = document.querySelector('.nav-btn[data-target="module-fee-setup"]');
            if(setupNav) setupNav.remove();
        }
    }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Are you sure you want to logout?")) { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }
        });
    }

    let allStudents = []; let setupClasses = []; let feeHeads = []; let feeReceipts = [];
    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    function formatToDDMMYYYY(dateString) {
        if(!dateString) return ""; const d = new Date(dateString); if(isNaN(d.getTime())) return dateString;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    }

    document.getElementById('feeDate').value = new Date().toISOString().split('T')[0];

    // ==========================================
    // CUSTOM PRINT EXECUTION (RENAMES PDF FILE)
    // ==========================================
    function executePrint(studentName, receiptNo) {
        let originalTitle = document.title;
        let safeName = studentName ? studentName.replace(/[^a-zA-Z0-9]/g, "_") : "Student";
        let safeReceipt = receiptNo ? String(receiptNo).replace(/[^a-zA-Z0-9]/g, "_") : "Receipt";
        
        // This forces the browser to use this name when saving as PDF
        document.title = `${safeName}_Receipt_${safeReceipt}`;
        
        window.print();
        
        // Restore title after print dialog closes
        document.title = originalTitle;
    }

    function initData() {
        document.getElementById('receiptsTableBody').innerHTML = '<tr><td colspan="11" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        fetch(scriptURL).then(res => res.json()).then(res => {
            if(res.status === "Success") {
                allStudents = res.data; feeHeads = res.feeHeads || []; feeReceipts = res.receipts || [];
                if(res.setup && res.setup.classes) { setupClasses = res.setup.classes; }
                populateStudentsDropdown(); renderFeeHeadsSetupList(); renderReceiptsTable(); updateNextReceiptNo();
            }
        });
    }

    function showView(targetId) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById(targetId).classList.add('active-module');
    }

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); const targetId = this.getAttribute('data-target'); if(targetId) showView(targetId);
        });
    });

    const addReceiptTrigger = document.getElementById('btn-open-add-receipt');
    if(addReceiptTrigger) {
        addReceiptTrigger.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('sideAddReceipt').classList.add('active'); showView('module-add-receipt');
        });
    }

    document.getElementById('btnSyncFees').addEventListener('click', initData);

    function populateStudentsDropdown() {
        const sel = document.getElementById('feeStudentSelect'); sel.innerHTML = '<option value="">-- Search and Select Student --</option>';
        allStudents.forEach(s => { let val = `${s.regNo} - ${s.studentFirstName || s.studentName} (${s.studentClass}) - ${s.fatherName}`; sel.innerHTML += `<option value="${s.regNo}">${val}</option>`; });
    }

    document.getElementById('feeStudentSelect').addEventListener('change', triggerTableGeneration);
    document.getElementById('feeMonthSelect').addEventListener('change', triggerTableGeneration);

    function triggerTableGeneration() {
        const regNo = document.getElementById('feeStudentSelect').value; const selectedMonth = document.getElementById('feeMonthSelect').value;
        if(!regNo) { clearProfilePanel(); return; }
        const student = allStudents.find(s => String(s.regNo) === String(regNo));
        if(student) {
            document.getElementById('profName').innerText = student.studentFirstName || student.studentName || 'N/A';
            document.getElementById('profReg').innerText = student.regNo; document.getElementById('profClass').innerText = student.studentClass || '-';
            document.getElementById('profFather').innerText = student.fatherName || '-'; document.getElementById('profMother').innerText = student.motherName || '-';
            generateFeeTable(student, selectedMonth);
        }
    }

    function clearProfilePanel() {
        ['profName','profReg','profClass','profFather','profMother'].forEach(id => document.getElementById(id).innerText = "-");
        document.getElementById('feeHeadsTbody').innerHTML = '<tr><td colspan="9" style="text-align:center;">Select a student to view fee heads</td></tr>'; resetTotals();
    }

    function generateFeeTable(student, selectedMonthVal) {
        const tbody = document.getElementById('feeHeadsTbody'); tbody.innerHTML = '';
        let classFeeAmount = 0;
        if(student.studentClass) { let cSetup = setupClasses.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass); if(cSetup && cSetup.fee) { classFeeAmount = parseFloat(cSetup.fee); } }
        let paidMap = {};
        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(student.regNo).trim()) {
                try { let details = JSON.parse(r.Paid_Heads || "[]"); details.forEach(d => { let uid = d.head + "_" + d.period; paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0); }); } catch(e) {}
            }
        });
        
        let allRows = []; let selectedMonthIdx = academicMonths.indexOf(selectedMonthVal); if (selectedMonthIdx === -1) selectedMonthIdx = 0; 
        for(let i = 0; i <= selectedMonthIdx; i++) {
            let uid = "Monthly Tuition Fee_" + academicMonths[i]; let alreadyPaid = paidMap[uid] || 0; let remaining = classFeeAmount - alreadyPaid;
            if(remaining > 0) { allRows.push({ head: "Monthly Tuition Fee", period: academicMonths[i], amount: remaining }); }
        }
        
        feeHeads.forEach(fh => {
            let amount = parseFloat(fh.Amount) || 0;
            if (fh.Frequency === "Monthly") {
                for(let i = 0; i <= selectedMonthIdx; i++) {
                    let uid = fh.Head_Name + "_" + academicMonths[i]; let alreadyPaid = paidMap[uid] || 0; let remaining = amount - alreadyPaid;
                    if(remaining > 0) { allRows.push({ head: fh.Head_Name, period: academicMonths[i], amount: remaining }); }
                }
            } else {
                let uid = fh.Head_Name + "_" + fh.Frequency; let alreadyPaid = paidMap[uid] || 0; let remaining = amount - alreadyPaid;
                if(remaining > 0) { allRows.push({ head: fh.Head_Name, period: fh.Frequency, amount: remaining }); }
            }
        });

        if(allRows.length === 0) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:green; font-weight:bold;">All Fees Cleared / Paid up to selected month!</td></tr>'; resetTotals(); return; }
        
        allRows.forEach((r, idx) => {
            tbody.innerHTML += `<tr class="f-row" data-head="${r.head}" data-period="${r.period}"><td><input type="checkbox" class="f-chk" title="Check to delete/exclude row"></td><td class="f-head" style="text-align:left;"><b>${r.head}</b></td><td>${r.period}</td><td><input type="number" class="f-actual" value="${r.amount.toFixed(2)}" readonly style="border:none; background:transparent; font-weight:bold;"></td><td><input type="number" class="f-conc" value="0.00"></td><td><input type="number" class="f-waiver" value="0.00"></td><td><input type="number" class="f-net" value="${r.amount.toFixed(2)}" style="font-weight:bold; color:#e74c3c; background:#fff;"></td><td><input type="number" class="f-paid" value="${r.amount.toFixed(2)}" style="background:#e8f4f8;"></td><td><input type="number" class="f-bal" value="0.00" readonly style="border:none; background:transparent; font-weight:bold;"></td></tr>`;
        });
        
        attachCalculationListeners(); calculateTotals();
    }

    function attachCalculationListeners() {
        document.querySelectorAll('.f-row').forEach(row => {
            row.querySelector('.f-conc').addEventListener('input', () => { updateRowNetAndPaid(row); calculateTotals(); });
            row.querySelector('.f-waiver').addEventListener('input', () => { updateRowNetAndPaid(row); calculateTotals(); });
            row.querySelector('.f-net').addEventListener('input', () => { row.querySelector('.f-paid').value = (parseFloat(row.querySelector('.f-net').value) || 0).toFixed(2); updateRowBal(row); calculateTotals(); });
            row.querySelector('.f-paid').addEventListener('input', () => { updateRowBal(row); calculateTotals(); });
            row.querySelector('.f-chk').addEventListener('change', function() {
                if(this.checked) { row.classList.add('disabled-row'); row.querySelector('.f-paid').value = "0.00"; } else { row.classList.remove('disabled-row'); updateRowNetAndPaid(row); }
                calculateTotals();
            });
        });
        document.getElementById('finalAdvance').addEventListener('input', calculateTotals);
    }

    function updateRowNetAndPaid(row) {
        let act = parseFloat(row.querySelector('.f-actual').value) || 0; let conc = parseFloat(row.querySelector('.f-conc').value) || 0; let waiv = parseFloat(row.querySelector('.f-waiver').value) || 0;
        let net = act - conc - waiv; if(net < 0) net = 0; 
        row.querySelector('.f-net').value = net.toFixed(2); row.querySelector('.f-paid').value = net.toFixed(2); row.querySelector('.f-bal').value = "0.00"; 
    }

    function updateRowBal(row) {
        let net = parseFloat(row.querySelector('.f-net').value) || 0; let paid = parseFloat(row.querySelector('.f-paid').value) || 0;
        row.querySelector('.f-bal').value = (net - paid).toFixed(2);
    }

    function calculateTotals() {
        let totAct = 0, totConc = 0, totWaiv = 0, totNet = 0, totPaid = 0, totBal = 0;
        document.querySelectorAll('.f-row').forEach(row => {
            if(!row.querySelector('.f-chk').checked) { 
                totAct += parseFloat(row.querySelector('.f-actual').value) || 0; totConc += parseFloat(row.querySelector('.f-conc').value) || 0;
                totWaiv += parseFloat(row.querySelector('.f-waiver').value) || 0; totNet += parseFloat(row.querySelector('.f-net').value) || 0;
                totPaid += parseFloat(row.querySelector('.f-paid').value) || 0; totBal += parseFloat(row.querySelector('.f-bal').value) || 0;
            }
        });
        document.getElementById('totActual').innerText = totAct.toFixed(2); document.getElementById('totConcession').innerText = totConc.toFixed(2);
        document.getElementById('totWaiver').innerText = totWaiv.toFixed(2); document.getElementById('totNet').innerText = totNet.toFixed(2);
        document.getElementById('totPaid').innerText = totPaid.toFixed(2); document.getElementById('totBal').innerText = totBal.toFixed(2);
        document.getElementById('profPayable').innerText = totNet.toFixed(2); document.getElementById('finalPayable').value = totNet.toFixed(2);
        let advance = parseFloat(document.getElementById('finalAdvance').value) || 0; let finalPaid = totPaid + advance;
        document.getElementById('finalTotalPaid').value = finalPaid.toFixed(2); document.getElementById('payAmount').value = finalPaid.toFixed(2); 
    }

    function resetTotals() {
        ['totActual', 'totConcession', 'totWaiver', 'totNet', 'totPaid', 'totBal'].forEach(id => document.getElementById(id).innerText = "0.00");
        document.getElementById('finalPayable').value = "0.00"; document.getElementById('finalAdvance').value = "0.00"; document.getElementById('finalTotalPaid').value = "0.00"; document.getElementById('payAmount').value = "";
    }

    function updateNextReceiptNo() {
        let maxNo = 0; feeReceipts.forEach(r => { let parts = String(r.Receipt_No).replace("'", "").split('/'); let num = parseInt(parts[parts.length - 1], 10); if(!isNaN(num) && num > maxNo) maxNo = num; });
        document.getElementById('feeReceiptNo').value = `2026-27/${maxNo + 1}`;
    }

    function saveReceipt(onSuccessAction) {
        const regNo = document.getElementById('feeStudentSelect').value; if(!regNo) { alert("Please select a student first."); return; }
        const month = document.getElementById('feeMonthSelect').value; if(!month) { alert("Please select Fee Installment Month."); return; }
        let paidDetails = [];
        document.querySelectorAll('.f-row').forEach(row => {
            if(!row.querySelector('.f-chk').checked) { 
                paidDetails.push({ head: row.getAttribute('data-head'), period: row.getAttribute('data-period'), actual: row.querySelector('.f-actual').value, adj: (parseFloat(row.querySelector('.f-conc').value) || 0) + (parseFloat(row.querySelector('.f-waiver').value) || 0), payable: row.querySelector('.f-net').value, paid: row.querySelector('.f-paid').value, bal: row.querySelector('.f-bal').value });
            }
        });
        if(paidDetails.length === 0) { alert("No fees selected to pay."); return; }
        const payload = { action: "saveReceipt", data: { receiptNo: document.getElementById('feeReceiptNo').value, regNo: regNo, studentName: document.getElementById('profName').innerText, classSec: document.getElementById('profClass').innerText, installment: month, totalAmount: document.getElementById('finalTotalPaid').value, paymentMode: document.getElementById('payType').value, date: formatToDDMMYYYY(document.getElementById('feeDate').value), bankName: document.getElementById('payBank').value || '-', refNo: document.getElementById('payRef').value || '-', paidHeads: paidDetails } };
        
        if(onSuccessAction === 'print') { 
            populatePrintTemplate(payload.data, paidDetails, document.getElementById('profFather').innerText, document.getElementById('profMother').innerText); 
        }
        
        document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '0.5');
        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json()).then(data => {
            document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '1');
            if(data.status === "Success") {
                if(onSuccessAction === 'print') { 
                    executePrint(document.getElementById('profName').innerText, payload.data.receiptNo); 
                    initData(); 
                } else { 
                    alert(data.message); 
                    if(onSuccessAction === 'close') { showView('module-receipts-list'); initData(); } 
                    if(onSuccessAction === 'new') { document.getElementById('feeStudentSelect').value = ""; clearProfilePanel(); initData(); } 
                }
            }
        });
    }

    document.getElementById('btnSaveReceiptClose').addEventListener('click', () => saveReceipt('close')); document.getElementById('btnSaveReceiptNew').addEventListener('click', () => saveReceipt('new')); document.getElementById('btnSaveReceiptPrint').addEventListener('click', () => saveReceipt('print'));

    function renderReceiptsTable() {
        const tbody = document.getElementById('receiptsTableBody'); tbody.innerHTML = '';
        if(feeReceipts.length === 0) { tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No receipts generated yet.</td></tr>'; return; }
        
        [...feeReceipts].reverse().forEach((r, idx) => {
            
            let particularsStr = "";
            try { 
                let rawHeads = String(r.Paid_Heads || "").trim();
                let rawSummary = String(r.Receipt_Summary || "").trim();
                
                if(rawHeads !== "" && rawHeads !== "[]" && rawHeads.startsWith("[")) {
                    let details = JSON.parse(rawHeads); 
                    let pList = [];
                    details.forEach(d => { 
                        let pName = d.head || "Fee";
                        if(d.period && d.period !== "Monthly" && d.period !== "Annually" && d.period !== "One Time" && d.period !== "Quarterly") {
                            pName += ` (${d.period})`;
                        } else if (d.period) {
                            pName += ` (${d.period})`;
                        }
                        pList.push(`• ${pName}: ₹${parseFloat(d.paid || 0).toFixed(2)}`);
                    }); 
                    particularsStr = pList.join("<br>");
                    if (particularsStr === "") particularsStr = rawSummary || "Fee Payment";
                } else if (rawSummary !== "") {
                    particularsStr = rawSummary;
                } else {
                    particularsStr = "Fee Payment";
                }
            } catch(e){
                particularsStr = r.Receipt_Summary || "Details Unavailable";
            }

            let rNo = String(r.Receipt_No).replace("'", ""); let rDate = String(r.Date).replace("'", ""); let safeReceipt = JSON.stringify(r).replace(/'/g, "&#39;"); 
            let btnHTML = `<button class="btn-red" style="background:#3498db;" title="Print" onclick='printFromHistory(${safeReceipt})'>🖨️</button>`;
            if(isSA || userRights.includes("FEE_Delete")) {
                btnHTML += `<button class="btn-red" title="Delete" onclick="deleteReceipt('${rNo}')">🗑️</button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td><td><b>${rNo}</b></td><td>${r.Reg_No}</td>
                    <td><a href="#" class="student-ledger-link" onclick="openLedger('${r.Reg_No}')" title="View Fee Ledger">${r.Student_Name}</a></td>
                    <td>${r.Class_Section}</td>
                    <td style="text-align:left; line-height:1.4; font-size:11px;">${particularsStr}</td>
                    <td>${r.Payment_Mode}</td><td style="color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td>
                    <td>${rDate}</td><td>${new Date(r.Timestamp).toLocaleString()}</td>
                    <td>${btnHTML}</td>
                </tr>
            `;
        });
    }

    window.printFromHistory = function(r) {
        let student = allStudents.find(s => String(s.regNo) === String(r.Reg_No)); 
        let fName = student ? (student.fatherName || '-') : '-';
        let mName = student ? (student.motherName || '-') : '-';
        
        let detailsArray = []; 
        try { if(typeof r.Paid_Heads === 'string') { detailsArray = JSON.parse(r.Paid_Heads || "[]"); } } catch(e){}
        let rData = { receiptNo: String(r.Receipt_No).replace("'", ""), regNo: r.Reg_No, studentName: r.Student_Name, classSec: r.Class_Section, installment: String(r.Installment).replace("'", ""), date: String(r.Date).replace("'", ""), totalAmount: r.Amount, paymentMode: r.Payment_Mode, bankName: r.Bank_Name || '-', refNo: String(r.Ref_No).replace("'", "") || '-' };
        
        populatePrintTemplate(rData, detailsArray, fName, mName); 
        executePrint(rData.studentName, rData.receiptNo);
    }

    function populatePrintTemplate(rData, detailsArray, fName, mName) {
        document.getElementById('p-adm').innerText = rData.regNo; 
        document.getElementById('p-name').innerText = rData.studentName; 
        document.getElementById('p-father').innerText = fName; 
        document.getElementById('p-mother').innerText = mName; 
        document.getElementById('p-class').innerText = rData.classSec; 
        document.getElementById('p-receipt').innerText = rData.receiptNo; 
        document.getElementById('p-date').innerText = rData.date; 
        document.getElementById('p-period').innerText = rData.installment;
        
        let pBody = document.getElementById('print-particulars-body'); pBody.innerHTML = ''; let tAct=0, tAdj=0, tPay=0, tPaid=0, tBal=0;
        detailsArray.forEach(d => {
            let fee = parseFloat(d.actual) || 0; let adj = parseFloat(d.adj) || 0; let pay = parseFloat(d.payable) || 0; let pd = parseFloat(d.paid) || 0; let bal = parseFloat(d.bal) || 0;
            tAct += fee; tAdj += adj; tPay += pay; tPaid += pd; tBal += bal;
            let displayName = d.head;
            if(d.period && d.period !== "Monthly" && d.period !== "Annually" && d.period !== "One Time" && d.period !== "Quarterly") { displayName += ` <span style="color:#555; font-size:11px;">(${d.period})</span>`; } else { displayName += ` <span style="color:#555; font-size:11px;">(${d.period})</span>`; }
            pBody.innerHTML += `<tr><td style="text-align:left; border:1px solid #333; padding:5px;">${displayName}</td><td style="border:1px solid #333; padding:5px;">${fee.toFixed(2)}</td><td style="border:1px solid #333; padding:5px;">${adj.toFixed(2)}</td><td style="border:1px solid #333; padding:5px;">${pay.toFixed(2)}</td><td style="border:1px solid #333; padding:5px;">${pd.toFixed(2)}</td><td style="border:1px solid #333; padding:5px;">${bal.toFixed(2)}</td></tr>`;
        });
        document.getElementById('p-t-fees').innerText = tAct.toFixed(2); document.getElementById('p-t-adj').innerText = tAdj.toFixed(2); document.getElementById('p-t-pay').innerText = tPay.toFixed(2); document.getElementById('p-t-paid').innerText = tPaid.toFixed(2); document.getElementById('p-t-bal').innerText = tBal.toFixed(2); document.getElementById('p-words').innerText = tPaid.toFixed(2) + " /-"; document.getElementById('p-pmode').innerText = rData.paymentMode; document.getElementById('p-pbank').innerText = rData.bankName; document.getElementById('p-pdate').innerText = rData.date; document.getElementById('p-pdet').innerText = rData.refNo; document.getElementById('p-pamt').innerText = rData.totalAmount;
    }

    window.deleteReceipt = function(receiptNo) {
        if(confirm(`Are you sure you want to Delete Receipt No: ${receiptNo}?\nThis will revert the fee ledger.`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "deleteReceipt", receiptNo: receiptNo }) })
            .then(res => res.json())
            .then(data => { if(data.status === "Success") { alert(data.message); initData(); } });
        }
    }

    function renderFeeHeadsSetupList() {
        const tbody = document.getElementById('feeHeadsListBody'); tbody.innerHTML = '';
        if(feeHeads.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No Fee Heads Configured.</td></tr>'; return; }
        feeHeads.forEach((f, idx) => {
            tbody.innerHTML += `<tr><td>${idx + 1}</td><td><b>${f.Head_Name}</b></td><td>${f.Frequency}</td><td>₹${f.Amount}</td><td><button class="btn-red" onclick="deleteFeeHead('${f.Head_Name}')">🗑️</button></td></tr>`;
        });
    }

    document.getElementById('feeSetupForm').addEventListener('submit', function(e) {
        e.preventDefault(); const btnSubmit = document.getElementById('btnSubmitFeeHead'); btnSubmit.disabled = true; btnSubmit.innerText = "Adding Fee Head..."; btnSubmit.style.opacity = '0.6';
        const payload = { action: "saveFeeHead", data: { headName: document.getElementById('headName').value.trim(), frequency: document.getElementById('headFreq').value, amount: document.getElementById('headAmount').value || 0 } };
        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(data => { 
            btnSubmit.disabled = false; btnSubmit.innerText = "Add Fee Head"; btnSubmit.style.opacity = '1';
            if(data.status === "Success") { alert(data.message); this.reset(); initData(); } else { alert("Error: " + data.message); }
        }).catch(err => { btnSubmit.disabled = false; btnSubmit.innerText = "Add Fee Head"; btnSubmit.style.opacity = '1'; alert("Connection error."); });
    });

    window.deleteFeeHead = function(headName) {
        if(confirm(`Delete Fee Head: ${headName}?`)) { 
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "deleteFeeHead", headName: headName }) })
            .then(res => res.json())
            .then(data => { if(data.status === "Success") initData(); }); 
        }
    }

    // ==========================================
    // EXPORT DROPDOWN LOGIC
    // ==========================================
    const exportToggle = document.getElementById('btnExportLedgerToggle');
    const exportMenu = document.getElementById('ledgerExportMenu');
    
    if(exportToggle && exportMenu) {
        exportToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.style.display = exportMenu.style.display === 'flex' ? 'none' : 'flex';
        });
        document.addEventListener('click', () => { 
            exportMenu.style.display = 'none'; 
        });
    }

    // ==========================================
    // EXPORT TO PDF LOGIC (html2pdf)
    // ==========================================
    document.getElementById('exportLedgerPdfBtn').addEventListener('click', () => {
        let sName = document.getElementById('l-name').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let sReg = document.getElementById('l-reg').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let sClass = document.getElementById('l-class').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let fileName = `${sName}_${sReg}_${sClass}.pdf`;
        
        let element = document.getElementById('ledgerExportArea');
        
        let opt = {
            margin:       0.3,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        // Temporarily change background to white for clean PDF
        let originalBg = element.style.background;
        element.style.background = "#fff";
        
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.background = originalBg;
        });
    });

    // ==========================================
    // EXPORT TO EXCEL LOGIC (Raw HTML wrapper)
    // ==========================================
    document.getElementById('exportLedgerExcelBtn').addEventListener('click', () => {
        let sName = document.getElementById('l-name').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let sReg = document.getElementById('l-reg').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let sClass = document.getElementById('l-class').innerText.replace(/[^a-zA-Z0-9]/g, "_");
        let fileName = `${sName}_${sReg}_${sClass}.xls`;

        let exportDiv = document.getElementById('ledgerExportArea').cloneNode(true);
        
        let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #2c3e50; color: white; font-weight: bold; }
            </style>
        </head>
        <body>
            ${exportDiv.innerHTML}
        </body>
        </html>
        `;

        let blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // ==========================================
    // 8. THE "KUNDLI" - STUDENT FEE LEDGER 
    // ==========================================
    window.openLedger = function(regNo) {
        let student = allStudents ? allStudents.find(s => String(s.regNo) === String(regNo)) : null;
        
        let sName = "Unknown (Deleted)";
        let sClass = "-";
        let sFather = "-";

        if (student) {
            sName = student.studentFirstName || student.studentName || 'N/A';
            sClass = student.studentClass || '-';
            sFather = student.fatherName || '-';
        } else {
            let rec = feeReceipts.find(r => String(r.Reg_No) === String(regNo));
            if(rec) {
                sName = rec.Student_Name;
                sClass = rec.Class_Section;
            }
        }
        
        document.getElementById('l-name').innerText = sName; 
        document.getElementById('l-reg').innerText = regNo; 
        document.getElementById('l-class').innerText = sClass; 
        document.getElementById('l-father').innerText = sFather;
        
        let classFeeAmount = 0;
        if(student && student.studentClass && setupClasses) { 
            let cSetup = setupClasses.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass); 
            if(cSetup && cSetup.fee) { classFeeAmount = parseFloat(cSetup.fee); } 
        }
        
        let paidMap = {}; 
        let histBody = document.getElementById('ledgerHistoryBody'); 
        histBody.innerHTML = '';
        
        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(regNo).trim()) {
                
                let particularsStr = "";
                try { 
                    let rawHeads = String(r.Paid_Heads || "").trim();
                    let rawSummary = String(r.Receipt_Summary || "").trim();
                    
                    if(rawHeads !== "" && rawHeads !== "[]" && rawHeads.startsWith("[")) {
                        let details = JSON.parse(rawHeads); 
                        let pList = [];
                        details.forEach(d => { 
                            let pName = d.head || "Fee";
                            if(d.period && d.period !== "Monthly" && d.period !== "Annually" && d.period !== "One Time" && d.period !== "Quarterly") {
                                pName += ` (${d.period})`;
                            } else if (d.period) {
                                pName += ` (${d.period})`;
                            }
                            pList.push(`• ${pName}: ₹${parseFloat(d.paid || 0).toFixed(2)}`);
                            
                            let uid = d.head + "_" + d.period; 
                            paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0);
                        }); 
                        particularsStr = pList.join("<br>");
                        
                        if (particularsStr === "") {
                             particularsStr = rawSummary || "Fee Payment";
                        }
                    } else if (rawSummary !== "") {
                        particularsStr = rawSummary;
                    } else {
                        particularsStr = "Fee Payment";
                    }
                } catch(e){
                    particularsStr = r.Receipt_Summary || "Details Unavailable";
                }
                
                let rNo = String(r.Receipt_No).replace("'", ""); 
                let rDate = String(r.Date).replace("'", "");
                
                histBody.innerHTML += `<tr><td style="padding:10px; border:1px solid #ccc;">${rDate}</td><td style="padding:10px; border:1px solid #ccc;">${rNo}</td><td style="padding:10px; border:1px solid #ccc;">${r.Payment_Mode}</td><td style="padding:10px; border:1px solid #ccc; text-align:left; line-height:1.4; font-size:11px;">${particularsStr}</td><td style="padding:10px; border:1px solid #ccc; color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td></tr>`;
            }
        });
        
        if(histBody.innerHTML === '') {
            histBody.innerHTML = '<tr><td colspan="5" style="padding:10px; border:1px solid #ccc; text-align:center;">No payment history found.</td></tr>';
        }
        
        let tbody = document.getElementById('ledgerTableBody'); 
        tbody.innerHTML = ''; 
        let totalDue = 0, totalPaid = 0;
        
        academicMonths.forEach(month => {
            let tAmt = classFeeAmount; 
            let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0; 
            let tBal = tAmt - tPaid; 
            totalDue += tAmt; 
            totalPaid += tPaid;
            
            // HIGHLIGHT FULLY PAID ROWS
            let rowBg = (tAmt > 0 && tBal <= 0) ? 'background-color:#e8f5e9;' : '';
            let tStyle = tBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
            
            tbody.innerHTML += `<tr style="${rowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>Monthly Tuition Fee (${month})</b></td><td style="padding:10px; border:1px solid #ccc;">₹${tAmt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${tPaid.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${tStyle} font-weight:bold;">₹${tBal.toFixed(2)}</td></tr>`;
            
            feeHeads.forEach(fh => {
                if(fh.Frequency === "Monthly") {
                    let fhAmt = parseFloat(fh.Amount) || 0; 
                    let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0; 
                    let fhBal = fhAmt - fhPaid; 
                    totalDue += fhAmt; 
                    totalPaid += fhPaid;
                    
                    let subRowBg = (fhAmt > 0 && fhBal <= 0) ? 'background-color:#e8f5e9;' : '';
                    let fhStyle = fhBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                    
                    tbody.innerHTML += `<tr style="${subRowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>${fh.Head_Name} (${month})</b></td><td style="padding:10px; border:1px solid #ccc;">₹${fhAmt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${fhPaid.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${fhStyle} font-weight:bold;">₹${fhBal.toFixed(2)}</td></tr>`;
                }
            });
        });
        
        feeHeads.forEach(fh => {
            if(fh.Frequency === "Annually" || fh.Frequency === "One Time (Annually)") {
                let amt = parseFloat(fh.Amount) || 0; 
                let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0; 
                let bal = amt - pd; 
                totalDue += amt; 
                totalPaid += pd;
                
                let anRowBg = (amt > 0 && bal <= 0) ? 'background-color:#e8f5e9;' : '';
                let balStyle = bal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                
                tbody.innerHTML += `<tr style="${anRowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>${fh.Head_Name} (Annual)</b></td><td style="padding:10px; border:1px solid #ccc;">₹${amt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${pd.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${balStyle} font-weight:bold;">₹${bal.toFixed(2)}</td></tr>`;
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

    initData();
});
