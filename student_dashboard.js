// ============================================================================
// GLOBAL VARIABLES & INITIALIZATION
// ============================================================================
const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

let studentData = null;
let globalDbData = null;

let currDate = new Date();
let attMap = {}; 

// TABS SWITCHER LOGIC
window.switchView = function(viewId) {
    document.querySelectorAll('.portal-tab').forEach(b => {
        b.classList.remove('active');
    });
    let tabToActive = document.querySelector(`.portal-tab[data-target="${viewId}"]`);
    if(tabToActive) {
        tabToActive.classList.add('active');
    }

    document.querySelectorAll('.view-panel').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
};

// DOM LOADED EVENT
document.addEventListener('DOMContentLoaded', () => {
    
    const studentStr = localStorage.getItem('erp_active_student');
    if(!studentStr) { 
        window.location.href = 'login.html'; 
        return; 
    }
    
    studentData = JSON.parse(studentStr);
    
    // Populate Basic Profile Details
    let fullName = (studentData.studentFirstName || "") + " " + (studentData.studentLastName || "");
    document.getElementById('dashName').innerText = fullName;
    document.getElementById('dashRegNo').innerText = studentData.regNo || "N/A";
    document.getElementById('dashMobile').innerText = studentData.mobile || "N/A";
    
    let formatDob = studentData.dob ? new Date(studentData.dob).toLocaleDateString('en-GB') : "-";
    document.getElementById('dashDob').innerText = formatDob;
    
    let sClass = "-";
    let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { 
            sClass = match[1].trim() + " (" + match[2].trim() + ")"; 
            sSecRaw = match[2].trim(); 
        } else { 
            sClass = studentData.studentClass; 
        }
    }
    document.getElementById('dashClass').innerText = sClass;

    if(studentData.studentPhotoBase64 && studentData.studentPhotoBase64.startsWith('data:image')) {
        document.getElementById('dashAvatar').src = studentData.studentPhotoBase64;
    }

    // Click Handlers for Tabs
    document.querySelectorAll('.portal-tab').forEach(btn => {
        btn.addEventListener('click', function() { 
            switchView(this.getAttribute('data-target')); 
        });
    });

    // Logout Handler
    document.getElementById('btnStudentLogout').addEventListener('click', () => {
        if(confirm("Are you sure you want to log out?")) {
            localStorage.removeItem('erp_active_student'); 
            window.location.href = 'login.html';
        }
    });

    // ============================================================================
    // FETCH DATA FOR ALL MODULES (Assignments, Submissions, Attendance, Fees)
    // ============================================================================
    fetch(scriptURL, { 
        redirect: "follow" 
    })
    .then(res => {
        return res.json();
    })
    .then(data => {
        if(data.status === "Success") {
            globalDbData = data;
            processAssignments(data.assignments, data.submissions);
            processAttendance(data.attendance);
            processFeeLedger(data.receipts, data.setup, data.feeHeads);
        } else {
            console.error("Database fetch failed.");
        }
    })
    .catch(err => {
        console.error("Network issue:", err);
    });

    // Calendar Navigation
    document.getElementById('calPrevMonth').addEventListener('click', () => { 
        currDate.setMonth(currDate.getMonth() - 1); 
        renderCalendar(); 
    });
    document.getElementById('calNextMonth').addEventListener('click', () => { 
        currDate.setMonth(currDate.getMonth() + 1); 
        renderCalendar(); 
    });
});

// ============================================================================
// 1. SPLIT ASSIGNMENTS LOGIC (DASHBOARD + FULL VIEWS)
// ============================================================================
function processAssignments(assignments, submissions) {
    
    // Dashboard Targets
    const circCont = document.getElementById('circularListContainer');
    const hwBody = document.getElementById('hwTableBody');
    const achCont = document.getElementById('achievementContainer');
    
    // Full View Targets
    const hwFullList = document.getElementById('hwFullListContainer');
    const commFullList = document.getElementById('commFullListContainer');
    const feedbackFullList = document.getElementById('feedbackFullListContainer');

    // Reset UI
    circCont.innerHTML = ''; 
    hwBody.innerHTML = ''; 
    achCont.innerHTML = '';
    hwFullList.innerHTML = ''; 
    commFullList.innerHTML = ''; 
    feedbackFullList.innerHTML = '';

    if(!assignments || assignments.length === 0) { 
        let msg = '<p style="text-align:center; color:#777; font-size:12px;">No items found.</p>';
        circCont.innerHTML = msg; 
        hwBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No assignments.</td></tr>';
        achCont.innerHTML = '🏆 No achievements recorded yet.';
        hwFullList.innerHTML = msg; 
        commFullList.innerHTML = msg; 
        feedbackFullList.innerHTML = msg;
        return; 
    }

    let sClassRaw = ""; 
    let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { 
            sClassRaw = match[1].trim(); 
            sSecRaw = match[2].trim(); 
        } else { 
            sClassRaw = studentData.studentClass; 
        }
    }

    let myItems = assignments.filter(a => {
        let matchClass = String(a.Class) === String(sClassRaw) || String(a.Class) === "All" || !a.Class;
        let matchSec = String(a.Section) === String(sSecRaw) || String(a.Section) === "All" || !a.Section;
        return matchClass && matchSec;
    });

    myItems.reverse();

    let hwCount = 0; 
    let circCount = 0; 
    let achCount = 0; 
    let fbCount = 0;

    myItems.forEach(a => {
        let type = a.Type || "";
        let dateFormatted = new Date(a.Timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        // ==============================
        // CATEGORY: CIRCULARS / NEWS / PTM
        // ==============================
        if(type === "Circular" || type === "Notice" || type === "News" || type === "PTM") {
            circCount++;
            // Dashboard small card
            circCont.innerHTML += `
                <div class="circular-item">
                    <span class="circ-date">📅 ${dateFormatted}</span>
                    <span class="circ-tag">${type}</span>
                    <a href="#" class="circ-title" onclick="switchView('view-comm')">${a.Name}</a>
                    <p class="circ-desc">${a.Description || 'Click to view details.'}</p>
                </div>
            `;
            // Full Comm View Card
            let attachHtml = "";
            if (a.Attachment_Base64) {
                attachHtml = `<a href="${a.Attachment_Base64}" download class="btn-download">📎 Download</a>`;
            }
            commFullList.innerHTML += `
                <div class="circular-item" style="border-left-color:#3498db; padding:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span class="circ-tag" style="background:#e8f4f8; color:#2980b9;">${type}</span>
                        <span class="circ-date">📅 ${dateFormatted}</span>
                    </div>
                    <div class="circ-title" style="font-size:16px;">${a.Name}</div>
                    <div style="font-size:13px; color:#555; margin-top:8px; line-height:1.5;">${a.Description || ''}</div>
                    <div style="margin-top:10px;">${attachHtml}</div>
                </div>
            `;
        }
        
        // ==============================
        // CATEGORY: FEEDBACKS & REMARKS
        // ==============================
        else if (type === "Feedback" || type === "Remarks") {
            fbCount++;
            feedbackFullList.innerHTML += `
                <div class="circular-item" style="border-left-color:#27ae60; padding:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span class="circ-tag" style="background:#e8f5e9; color:#27ae60;">${type}</span>
                        <span class="circ-date">📅 ${dateFormatted}</span>
                    </div>
                    <div class="circ-title" style="font-size:16px; color:#27ae60;">${a.Name}</div>
                    <div style="font-size:13px; color:#555; margin-top:8px; line-height:1.5;">${a.Description || ''}</div>
                </div>
            `;
        }
        
        // ==============================
        // CATEGORY: HOMEWORK / ASSIGNMENTS
        // ==============================
        else if(type === "Homework" || type === "Classwork" || type === "Assignment" || type === "Project" || type === "Holiday Homework") {
            hwCount++;
            let deadlineStr = a.Date ? a.Date : '-';
            
            // CHECK SUBMISSION STATUS FROM DB
            let mySub = (submissions || []).find(s => String(s.Assignment_ID) === String(a.Assignment_ID) && String(s.Reg_No) === String(studentData.regNo));
            
            let statusLabel = "Pending"; 
            let statusClass = "pill-pending";
            let dashStatusClass = "status-pending";
            
            if(mySub) {
                if(mySub.Marks && String(mySub.Marks).trim() !== "") { 
                    statusLabel = "Checked"; 
                    statusClass = "pill-checked"; 
                    dashStatusClass = "status-done";
                } else { 
                    statusLabel = "Submitted"; 
                    statusClass = "pill-submitted"; 
                    dashStatusClass = "status-done"; // Shows green on dashboard
                }
            }
            
            // Dashboard Table Row
            hwBody.innerHTML += `
                <tr style="cursor:pointer;" onclick="switchView('view-homework')">
                    <td><span class="hw-icon">📗</span> <b>${a.Subject || 'General'}</b><br><span style="font-size:10px;color:#777;">${a.Name}</span></td>
                    <td>${dateFormatted}</td>
                    <td><b style="color:#c0392b;">${deadlineStr}</b></td>
                    <td><span class="${dashStatusClass}">${statusLabel}</span></td>
                </tr>
            `;

            // Full Homework UI Row (with Eye Button)
            let attachHtml = "";
            if (a.Attachment_Base64) {
                attachHtml = `<a href="${a.Attachment_Base64}" download class="btn-download">📎 File</a>`;
            } else {
                attachHtml = `<span style="color:#ccc; font-size:12px;">--</span>`;
            }

            // Protect JSON payload strings
            let aDataStr = JSON.stringify(a).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            let subDataStr = mySub ? JSON.stringify(mySub).replace(/'/g, "&#39;").replace(/"/g, "&quot;") : "null";
            
            hwFullList.innerHTML += `
                <div class="hw-list-row">
                    <div class="hw-icon-title">
                        <div class="h-icon">🎙️</div>
                        <div>
                            <div style="font-weight:bold; color:#2c3e50;">${a.Subject || 'General'}</div>
                            <div style="font-size:11px; color:#7f8c8d;">${a.Type} • ${a.Name}</div>
                        </div>
                    </div>
                    <div><span class="status-pill ${statusClass}">${statusLabel}</span></div>
                    <div style="font-weight:bold; color:#555;">${deadlineStr}</div>
                    <div class="desc-text">${a.Description || '--'}</div>
                    <div>${attachHtml}</div>
                    <div style="text-align:center;">
                        <button class="btn-eye" onclick='openHwModal(${aDataStr}, ${subDataStr})'>👁️</button>
                    </div>
                </div>
            `;
        }
        
        // ==============================
        // CATEGORY: ACHIEVEMENTS
        // ==============================
        else if(type === "Achievement") {
            achCount++;
            if(achCount === 1) {
                achCont.innerHTML = ''; 
            }
            achCont.innerHTML += `
                <div style="background:#fff3e0; padding:10px; border-left:4px solid #f39c12; margin-bottom:10px; text-align:left; border-radius:4px; font-size:14px;">
                    <b>⭐ ${a.Name}</b>: ${a.Description}
                </div>
            `;
        }
    });

    // Handling Empty States Post-Iteration
    if(circCount === 0) {
        circCont.innerHTML = '<p style="text-align:center; color:#777; font-size:12px;">No circulars found.</p>';
    }
    if(hwCount === 0) {
        hwBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No assignments.</td></tr>';
        hwFullList.innerHTML = '<p style="text-align:center; color:#777;">No homework assigned yet.</p>';
    }
    if(achCount === 0) {
        achCont.innerHTML = '🏆 No achievements recorded yet.';
    }
    if(circCount === 0) {
        commFullList.innerHTML = '<p style="text-align:center; color:#777;">No circulars/notices.</p>';
    }
    if(fbCount === 0) {
        feedbackFullList.innerHTML = '<p style="text-align:center; color:#777;">No feedbacks/remarks.</p>';
    }
}

// ============================================================================
// MODAL INTERACTION: EYE BUTTON LOGIC (Submissions)
// ============================================================================
let currentHwSelection = null;

window.openHwModal = function(hwData, subData) {
    currentHwSelection = hwData;
    
    document.getElementById('modHwTitle').innerText = hwData.Name;
    document.getElementById('modHwSub').innerText = hwData.Subject || 'General';
    document.getElementById('modHwDue').innerText = hwData.Date || 'No Deadline';
    document.getElementById('modHwDesc').innerText = hwData.Description || 'No description attached.';

    const subArea = document.getElementById('submissionArea');
    subArea.innerHTML = '';

    // If the teacher checked "Submission Required"
    if(hwData.Submission_Required === "Yes") {
        if(!subData) {
            // Scenario A: Not Submitted Yet
            subArea.innerHTML = `
                <h4 style="color:#2c3e50; margin-bottom:10px;">Submit Your Work</h4>
                <textarea id="stuAnsText" class="sub-textarea" placeholder="Type your answer here..."></textarea>
                <div style="margin-top:10px;">
                    <label style="font-size:12px; font-weight:bold; color:#555;">Attach File (Optional)</label><br>
                    <input type="file" id="stuAnsFile" style="margin-top:5px; font-size:12px;">
                    <input type="hidden" id="stuAnsBase64">
                </div>
                <button id="btnActualSubmit" class="btn-submit-hw" onclick="submitHwToDb()">Submit Homework</button>
            `;

            // Bind File Encoder after DOM insertion
            setTimeout(() => {
                let fileInp = document.getElementById('stuAnsFile');
                if(fileInp) {
                    fileInp.addEventListener('change', function() {
                        if(this.files[0]) {
                            const r = new FileReader();
                            r.onload = function(e) { 
                                document.getElementById('stuAnsBase64').value = e.target.result; 
                            }
                            r.readAsDataURL(this.files[0]);
                        }
                    });
                }
            }, 200);

        } else if (subData && (!subData.Marks || String(subData.Marks).trim() === "")) {
            // Scenario B: Submitted, Waiting for Marks
            subArea.innerHTML = `
                <div style="background:#e8f4f8; border:1px solid #bde0ef; padding:15px; border-radius:5px; text-align:center;">
                    <h3 style="color:#2980b9; margin:0 0 5px 0;">Status: Submitted</h3>
                    <p style="font-size:13px; color:#555; margin:0;">Your work has been submitted successfully and is waiting for teacher's review.</p>
                </div>
            `;
        } else if (subData && subData.Marks) {
            // Scenario C: Checked and Evaluated
            subArea.innerHTML = `
                <div style="background:#e8f5e9; border:1px solid #c8e6c9; padding:15px; border-radius:5px;">
                    <h3 style="color:#27ae60; margin:0 0 10px 0;">Status: Evaluated ✅</h3>
                    <div style="display:flex; justify-content:space-between; font-size:14px;">
                        <div><b>Marks Awarded:</b> <span style="font-size:18px; color:#e74c3c; font-weight:bold; margin-left:5px;">${subData.Marks}</span></div>
                    </div>
                    <div style="margin-top:10px; font-size:13px; color:#555;"><b>Teacher Remarks:</b> ${subData.Teacher_Remarks || 'Good work.'}</div>
                </div>
            `;
        }
    } else {
        // Scenario D: Read-only homework (Submission Required = No)
        subArea.innerHTML = `
            <p style="text-align:center; color:#95a5a6; font-size:13px; font-weight:bold;">
                No online submission required for this assignment.
            </p>
        `;
    }

    document.getElementById('hwModal').classList.add('active');
};

// Network Call to Submit DB
window.submitHwToDb = function() {
    if(!currentHwSelection) {
        return;
    }
    
    const btn = document.getElementById('btnActualSubmit');
    btn.innerText = "Submitting..."; 
    btn.disabled = true;

    const payload = {
        action: "submitHomework",
        data: {
            assignmentId: currentHwSelection.Assignment_ID,
            regNo: studentData.regNo,
            studentName: studentData.studentFirstName || studentData.studentName,
            answerText: document.getElementById('stuAnsText') ? document.getElementById('stuAnsText').value : "",
            attachmentBase64: document.getElementById('stuAnsBase64') ? document.getElementById('stuAnsBase64').value : ""
        }
    };

    fetch(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        redirect: "follow", 
        headers: { 
            "Content-Type": "text/plain;charset=utf-8" 
        } 
    })
    .then(res => {
        return res.json();
    })
    .then(data => {
        if(data.status === "Success") {
            alert(data.message);
            document.getElementById('hwModal').classList.remove('active');
            window.location.reload(); // Refresh to update status pills
        } else { 
            alert("Error: " + data.message); 
        }
    })
    .catch(err => {
        console.error("Submission error:", err);
        alert("Failed to submit assignment. Check network connection.");
    })
    .finally(() => { 
        btn.innerText = "Submit Homework"; 
        btn.disabled = false; 
    });
};

// ============================================================================
// 2. ATTENDANCE MODULE
// ============================================================================
function processAttendance(records) {
    if(!records) return;
    let totP = 0; 
    let totA = 0; 
    let totL = 0;
    
    records.forEach(r => {
        if(String(r.Reg_No) === String(studentData.regNo)) {
            let parts = String(r.Date).split('-');
            if(parts.length === 3) {
                let isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                attMap[isoDate] = r.Status;
                
                if(r.Status === 'P') {
                    totP++;
                } else if(r.Status === 'AB') {
                    totA++;
                } else if(r.Status === 'LC') {
                    totL++;
                }
            }
        }
    });

    document.getElementById('attTotalP').innerText = totP;
    document.getElementById('attTotalA').innerText = totA;
    document.getElementById('attTotalL').innerText = totL;

    renderCalendar();
}

function renderCalendar() {
    const year = currDate.getFullYear(); 
    const month = currDate.getMonth();
    document.getElementById('calMonthTitle').innerText = currDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calGrid = document.getElementById('bigCalGrid');
    
    let html = `
        <div class="cal-day-header">Su</div>
        <div class="cal-day-header">Mo</div>
        <div class="cal-day-header">Tu</div>
        <div class="cal-day-header">We</div>
        <div class="cal-day-header">Th</div>
        <div class="cal-day-header">Fr</div>
        <div class="cal-day-header">Sa</div>
    `;

    for(let i = 0; i < firstDay; i++) { 
        html += `<div class="big-cal-cell" style="background:none; border:none;"></div>`; 
    }
    
    for(let i = 1; i <= daysInMonth; i++) {
        let isoDate = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let status = attMap[isoDate]; 
        let dotHtml = '';
        
        if(status === 'P') {
            dotHtml = `<div class="dot p"></div>`;
        } else if(status === 'AB') {
            dotHtml = `<div class="dot a"></div>`;
        } else if(status === 'LC') {
            dotHtml = `<div class="dot l" style="background:#f39c12;"></div>`;
        }

        html += `<div class="big-cal-cell">${i}${dotHtml}</div>`;
    }
    
    calGrid.innerHTML = html;
}

// ============================================================================
// 3. FEES MODULE
// ============================================================================
function processFeeLedger(receipts, setupData, feeHeads) {
    let classFeeAmount = 0;
    
    if(studentData.studentClass && setupData && setupData.classes) { 
        let cSetup = setupData.classes.find(c => `${c.name} (${c.section})` === studentData.studentClass || c.name === studentData.studentClass); 
        if(cSetup && cSetup.fee) { 
            classFeeAmount = parseFloat(cSetup.fee); 
        } 
    }

    let paidMap = {}; 
    let myReceipts = (receipts||[]).filter(r => String(r.Reg_No) === String(studentData.regNo));
    
    myReceipts.forEach(r => {
        try { 
            let rawHeads = String(r.Paid_Heads || "").trim();
            if(rawHeads !== "" && rawHeads !== "[]" && rawHeads.startsWith("[")) {
                let details = JSON.parse(rawHeads); 
                details.forEach(d => { 
                    let uid = d.head + "_" + d.period; 
                    paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0);
                }); 
            }
        } catch(e) {
            console.error("Fee parsing issue", e);
        }
    });

    let tbody = document.getElementById('feeStatementBody'); 
    tbody.innerHTML = ''; 
    
    let totalDue = 0;
    let totalPaid = 0;
    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    academicMonths.forEach(month => {
        let tAmt = classFeeAmount; 
        let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0; 
        let tBal = tAmt - tPaid; 
        
        totalDue += tAmt; 
        totalPaid += tPaid;
        
        let tStatus = tBal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
        
        tbody.innerHTML += `
            <tr>
                <td><b>Monthly Tuition Fee (${month})</b></td>
                <td>₹${tAmt.toFixed(2)}</td>
                <td>₹${tPaid.toFixed(2)}</td>
                <td>${tStatus}</td>
            </tr>
        `;
        
        (feeHeads||[]).forEach(fh => {
            if(fh.Frequency === "Monthly") {
                let fhAmt = parseFloat(fh.Amount) || 0; 
                let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0; 
                let fhBal = fhAmt - fhPaid; 
                
                totalDue += fhAmt; 
                totalPaid += fhPaid;
                
                let fhStatus = fhBal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
                
                tbody.innerHTML += `
                    <tr>
                        <td><b>${fh.Head_Name} (${month})</b></td>
                        <td>₹${fhAmt.toFixed(2)}</td>
                        <td>₹${fhPaid.toFixed(2)}</td>
                        <td>${fhStatus}</td>
                    </tr>
                `;
            }
        });
    });
    
    (feeHeads||[]).forEach(fh => {
        if(fh.Frequency === "Annually" || fh.Frequency === "One Time (Annually)") {
            let amt = parseFloat(fh.Amount) || 0; 
            let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0; 
            let bal = amt - pd; 
            
            totalDue += amt; 
            totalPaid += pd;
            
            let anStatus = bal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${fh.Head_Name} (Annual)</b></td>
                    <td>₹${amt.toFixed(2)}</td>
                    <td>₹${pd.toFixed(2)}</td>
                    <td>${anStatus}</td>
                </tr>
            `;
        }
    });

    document.getElementById('feeTotApplicable').innerText = "₹" + totalDue.toFixed(2);
    document.getElementById('feeTotPaid').innerText = "₹" + totalPaid.toFixed(2);
    document.getElementById('feeTotDue').innerText = "₹" + (totalDue - totalPaid).toFixed(2);
}
