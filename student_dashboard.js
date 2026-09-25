// ============================================================================
// STUDENT DASHBOARD SYSTEM (100% FIREBASE POWERED)
// ============================================================================

const schoolCode = localStorage.getItem('erp_school_code');
if(!schoolCode) { window.location.href = 'login.html'; }

// DYNAMIC NAVBAR UPDATE LOGIC
try {
    let savedName = localStorage.getItem('erp_school_name');
    let savedLogo = localStorage.getItem('erp_school_logo');
    
    let navNameEl = document.getElementById('dynamicNavName');
    let navLogoImg = document.getElementById('dynamicNavLogo');
    let navLogoDefault = document.getElementById('defaultNavLogo');
    
    if(savedName && navNameEl) navNameEl.innerText = savedName; 
    
    if(savedLogo && savedLogo.startsWith('http') && navLogoImg) {
        navLogoImg.src = savedLogo;
        navLogoImg.style.display = 'inline-block';
        if(navLogoDefault) navLogoDefault.style.display = 'none';
    }
} catch(error) {
    console.error("Navbar logic failed:", error);
}

let studentData = null;
let globalDbData = { assignments: [], submissions: [], attendance: [], receipts: [], events: [], feeHeads: [] };
let currentFeedFilter = "All";

let currDate = new Date();
let attMap = {}; 
let eventMap = {}; 

window.switchView = function(viewId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.app-view').forEach(p => p.classList.remove('active'));
    let target = document.getElementById(viewId);
    if(target) target.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    
    const studentStr = localStorage.getItem('erp_active_student');
    if(!studentStr) { window.location.href = 'login.html'; return; }
    
    studentData = JSON.parse(studentStr);
    
    // Set Dynamic Greeting based on current time
    let hr = new Date().getHours();
    let greet = "Good Evening!";
    if(hr < 12) greet = "Good Morning!";
    else if(hr < 17) greet = "Good Afternoon!";
    let elGreet = document.getElementById('greetMsg');
    if(elGreet) elGreet.innerText = greet;

    // Populate Top Banner Profile Details
    let fullName = (studentData.studentFirstName || studentData.studentName || "Student") + " " + (studentData.studentLastName || "");
    if(document.getElementById('dashName')) document.getElementById('dashName').innerText = fullName;
    if(document.getElementById('dashRegNo')) document.getElementById('dashRegNo').innerText = studentData.portalId || studentData.regNo || "N/A";
    
    if(document.getElementById('dashAvatarBox')) {
        document.getElementById('dashAvatarBox').innerText = fullName.charAt(0).toUpperCase() || "S";
    }

    let sClass = "-"; let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { sClass = match[1].trim() + " (" + match[2].trim() + ")"; sSecRaw = match[2].trim(); } 
        else { sClass = studentData.studentClass; }
    }
    if(document.getElementById('dashClass')) document.getElementById('dashClass').innerText = sClass;
    
    if(document.getElementById('dashAvatarBox') && studentData.studentPhotoBase64 && studentData.studentPhotoBase64.startsWith('data:image')) {
        document.getElementById('dashAvatarBox').innerHTML = `<img src="${studentData.studentPhotoBase64}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
    }

    let ttDateEl = document.getElementById('ttDateStr');
    if(ttDateEl) ttDateEl.innerText = new Date().toLocaleDateString('en-GB');

    if(document.getElementById('btnStudentLogout')) {
        document.getElementById('btnStudentLogout').addEventListener('click', () => {
            if(confirm("Are you sure you want to log out?")) { 
                localStorage.removeItem('erp_active_student'); 
                window.location.href = 'login.html'; 
            }
        });
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ==========================================
    // DATA FETCHING FROM FIRESTORE (Replacing API)
    // ==========================================
    fetchAllStudentData();

    document.getElementById('calPrevMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('calNextMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() + 1); renderCalendar(); });
    document.getElementById('bigCalPrevMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('bigCalNextMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() + 1); renderCalendar(); });
});

async function fetchAllStudentData() {
    try {
        let stuId = studentData.portalId || studentData.regNo;
        
        // Parallel queries to Firestore for faster loading
        const [evtSnap, asgSnap, subSnap, attSnap, feeSnap] = await Promise.all([
            db.collection("events").where("schoolCode", "==", schoolCode).get(),
            db.collection("assignments").where("schoolCode", "==", schoolCode).get(),
            db.collection("submissions").where("schoolCode", "==", schoolCode).where("Reg_No", "==", stuId).get(),
            db.collection("attendance").where("schoolCode", "==", schoolCode).where("Reg_No", "==", stuId).get(),
            db.collection("fee_receipts").where("schoolCode", "==", schoolCode).where("Reg_No", "==", stuId).get()
        ]);

        globalDbData.events = evtSnap.docs.map(d => d.data());
        globalDbData.assignments = asgSnap.docs.map(d => { let obj = d.data(); obj.Assignment_ID = d.id; return obj; });
        globalDbData.submissions = subSnap.docs.map(d => d.data());
        globalDbData.attendance = attSnap.docs.map(d => d.data());
        globalDbData.receipts = feeSnap.docs.map(d => d.data());

        // Process fetched data
        processEvents(globalDbData.events); 
        renderFeed(globalDbData.assignments, globalDbData.submissions); 
        processAttendance(globalDbData.attendance); 
        processFeeLedger(globalDbData.receipts, null, []); // Pass fee setup later when ready

    } catch(err) {
        console.error("Firestore data fetch error:", err);
        let feedCont = document.getElementById('mainFeedContainer');
        if(feedCont) feedCont.innerHTML = `<p style="color:red; text-align:center;">Failed to connect to database. Please check your internet connection.</p>`;
    }
}

// ============================================================================
// EVENTS AND HOLIDAYS DISPATCH MODULE
// ============================================================================
function processEvents(events) {
    if(!events) return;
    
    let sClassRaw = studentData.studentClass ? studentData.studentClass.split('(')[0].trim() : "";
    let evtCont = document.getElementById('eventListContainer');
    if(evtCont) evtCont.innerHTML = '';
    
    let validEvents = events.filter(e => {
        if(e.Audience === "Employees") return false;
        if(e.Target_Class && e.Target_Class !== "All" && String(e.Target_Class) !== String(sClassRaw)) return false;
        return true;
    });

    if(validEvents.length === 0) {
        if(evtCont) evtCont.innerHTML = '<div class="empty-illustration"><span>📭</span><p>No upcoming events.</p></div>';
    } else {
        validEvents.forEach(e => {
            let pts = String(e.Date).split('-');
            if(pts.length === 3) {
                let iso = `${pts[2]}-${pts[1]}-${pts[0]}`;
                eventMap[iso] = { title: e.Title, desc: e.Description, isHoliday: (e.Is_Holiday === "Yes") };
                
                let dObj = new Date(iso);
                let dayStr = dObj.toLocaleDateString('en-GB', {day:'numeric'});
                let monStr = dObj.toLocaleDateString('en-GB', {month:'short'});
                if(evtCont) {
                    evtCont.innerHTML += `
                        <div class="event-list-item">
                            <div class="evt-date-box"><strong>${dayStr}</strong><span>${monStr}</span></div>
                            <div class="evt-details"><h4>${e.Title}</h4><p>${e.Description}</p></div>
                        </div>
                    `;
                }
            }
        });
    }
}

// ============================================================================
// TIMELINE FEED RENDERING & NAVIGATION PILLS
// ============================================================================
window.filterFeed = function(filterVal) {
    switchView('view-dashboard');
    
    document.querySelectorAll('.comm-pill').forEach(t => t.classList.remove('active-pill'));
    if(event && event.target && event.target.classList.contains('comm-pill')) {
        event.target.classList.add('active-pill');
    } else {
        let pill = document.querySelector(`.comm-pill[onclick="filterFeed('${filterVal}')"]`);
        if(pill) pill.classList.add('active-pill');
    }

    currentFeedFilter = filterVal;
    renderFeed(globalDbData.assignments, globalDbData.submissions);
}

function renderFeed(assignments, submissions) {
    const feedCont = document.getElementById('mainFeedContainer');
    if(!feedCont) return;
    feedCont.innerHTML = ''; 

    if(!assignments || assignments.length === 0) { 
        feedCont.innerHTML = '<p style="text-align:center; padding:30px; color:#94a3b8;">No updates found on database timeline.</p>';
        return; 
    }

    let sClassRaw = studentData.studentClass ? studentData.studentClass.split('(')[0].trim() : "";

    let myItems = assignments.filter(a => {
        let matchClass = String(a.Class) === String(sClassRaw) || String(a.Class) === "All" || !a.Class;
        
        let targets = ["All"];
        try { if(a.Target_Students && a.Target_Students.trim() !== "") targets = JSON.parse(a.Target_Students); } catch(e){}
        let myId = studentData.portalId || studentData.regNo;
        let matchTarget = targets.includes("All") || targets.includes(String(myId));

        // Sub Tab Filtering
        let typeMatch = true;
        if(currentFeedFilter === "Homework") typeMatch = ["Homework", "Classwork", "Assignment", "Project"].includes(a.Type);
        if(currentFeedFilter === "Circulars") typeMatch = ["Circular", "Notice", "News", "School News", "PTM"].includes(a.Type);
        if(currentFeedFilter === "Achievements") typeMatch = ["Achievement"].includes(a.Type);
        if(currentFeedFilter === "Remarks") typeMatch = ["Remarks", "Feedback"].includes(a.Type);
        if(currentFeedFilter === "PTM") typeMatch = ["PTM"].includes(a.Type);

        return matchClass && matchTarget && typeMatch;
    }).sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));

    if(myItems.length === 0) {
        feedCont.innerHTML = '<div class="empty-illustration"><span>📭</span><p>No recent updates in this category.</p></div>';
        return;
    }

    myItems.forEach(a => {
        let type = a.Type || "General";
        let dateFormatted = a.Timestamp ? new Date(a.Timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";
        
        let iconHtml = "📢"; let themeClass = "circ";
        if(["Homework", "Classwork", "Assignment", "Project"].includes(type)) { iconHtml = "📚"; themeClass = "hw"; }
        else if(type === "Achievement") { iconHtml = "🏆"; themeClass = "ach"; }
        else if(["Remarks", "Feedback"].includes(type)) { iconHtml = "📝"; themeClass = "rem"; }
        else if(type === "PTM") { iconHtml = "🤝"; themeClass = "ach"; }

        let subjectHtml = a.Subject ? `<span style="font-size:11px; font-weight:bold; color:#64748b; text-transform:uppercase;">${a.Subject}</span>` : '';
        let titleHtml = `<h3 class="f-title">${a.Name}</h3>`;
        let descHtml = `<p class="f-desc">${a.Description || ''}</p>`;
        
        let metaHtml = "";
        try {
            if(a.Metadata_JSON && a.Metadata_JSON.trim() !== "") {
                let meta = JSON.parse(a.Metadata_JSON);
                if(type === "Achievement") {
                    if(meta.rank) metaHtml += `<span style="font-size:11px; background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-weight:bold; margin-right:5px;">Rank: ${meta.rank}</span>`;
                    if(meta.level) metaHtml += `<span style="font-size:11px; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:bold; margin-right:5px;">Level: ${meta.level}</span>`;
                    if(meta.venue) metaHtml += `<span style="font-size:11px; color:#64748b; font-weight:bold;">Venue: ${meta.venue}</span>`;
                } else if(["Remarks", "Feedback"].includes(type) && meta.type) {
                    metaHtml += `<span style="font-size:11px; background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; font-weight:bold;">${meta.type}</span>`;
                }
            }
        } catch(e){}

        if(metaHtml !== "") metaHtml = `<div style="margin-bottom:12px;">${metaHtml}</div>`;

        let attachHtml = "";
        if(a.Attachment_Base64) {
            attachHtml = `<a href="${a.Attachment_Base64}" download class="btn-attach">📎 View Attachment</a>`;
        }

        if(type === "Time Table") {
            let ttWidget = document.querySelectorAll('.widget-card')[0];
            if(ttWidget) {
                let ttAttachBtn = a.Attachment_Base64 ? `<br><a href="${a.Attachment_Base64}" download class="btn-attach" style="margin-top:10px; display:inline-flex;">📎 Download Timetable</a>` : '';
                ttWidget.innerHTML = `
                    <div class="widget-header">
                        <h3>Timetable</h3>
                        <span class="widget-date">${dateFormatted}</span>
                    </div>
                    <div style="font-size:13px; color:#475569;">
                        <b>${a.Name}</b><br>${a.Description}${ttAttachBtn}
                    </div>
                `;
            }
        }

        let hwActionHtml = "";
        if(themeClass === "hw") {
            let myId = studentData.portalId || studentData.regNo;
            let mySub = (submissions || []).find(s => String(s.Assignment_ID) === String(a.Assignment_ID) && String(s.Reg_No) === String(myId));
            let statusLabel = "Pending"; let statusClass = "pending";
            if(mySub) {
                if(mySub.Marks && String(mySub.Marks).trim() !== "") { statusLabel = "Evaluated"; statusClass = "checked"; } 
                else { statusLabel = "Submitted"; statusClass = "submitted"; }
            }

            let aDataStr = JSON.stringify(a).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            let subDataStr = mySub ? JSON.stringify(mySub).replace(/'/g, "&#39;").replace(/"/g, "&quot;") : "null";
            
            hwActionHtml = `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px; border-top:1px dashed #e2e8f0; padding-top:10px;">
                    <div><span style="font-size:12px; font-weight:600; color:#475569;">Due: ${a.Date || '-'}</span> <span class="status-badge ${statusClass}">${statusLabel}</span></div>
                    <button class="btn-eye" onclick='openHwModal(${aDataStr},${subDataStr})'>👁️ Open Task</button>
                </div>
            `;
        } else {
            if(attachHtml) hwActionHtml = `<div style="margin-top:10px;">${attachHtml}</div>`;
            attachHtml = ""; 
        }

        feedCont.innerHTML += `
            <div class="feed-card">
                <div class="f-header">
                    <div class="f-header-left">
                        <div class="f-icon ${themeClass}">${iconHtml}</div>
                        <div class="f-meta">
                            <h4>${type}</h4>
                            <span>From: Administration</span>
                        </div>
                    </div>
                    <div class="f-time">${dateFormatted}</div>
                </div>
                <div class="f-body">
                    ${subjectHtml}${titleHtml}
                    ${metaHtml}${descHtml}
                    ${attachHtml}${hwActionHtml}
                </div>
            </div>
        `;
    });
}

// ============================================================================
// HOMEWORK SUBMISSION OVERLAY (FIRESTORE PUSH)
// ============================================================================
let currentHwSelection = null;
window.openHwModal = function(hwData, subData) {
    currentHwSelection = hwData;
    let titleEl = document.getElementById('modHwTitle');
    let subEl = document.getElementById('modHwSub');
    let dueEl = document.getElementById('modHwDue');
    let descEl = document.getElementById('modHwDesc');
    
    if(titleEl) titleEl.innerText = hwData.Name; 
    if(subEl) subEl.innerText = hwData.Subject || 'General'; 
    if(dueEl) dueEl.innerText = hwData.Date || 'No Deadline'; 
    if(descEl) descEl.innerText = hwData.Description || 'No description attached.';

    const subArea = document.getElementById('submissionArea'); 
    if(subArea) {
        subArea.innerHTML = '';
        if(hwData.Submission_Required === "Yes") {
            
            let isPastDue = false;
            let formattedDueDate = hwData.Date || "";
            if(formattedDueDate) {
                let parts = formattedDueDate.split('-'); 
                if(parts.length === 3) {
                    let dueDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59`);
                    if(new Date() > dueDateObj) isPastDue = true;
                }
            }

            if(isPastDue && (!subData || (!subData.Marks && subData.Status !== "Submitted"))) {
                subArea.innerHTML = `
                    <div style="background:#fef2f2; border:1px solid #fecaca; padding:15px; border-radius:8px; text-align:center;">
                        <h3 style="color:#b91c1c; margin:0 0 5px 0; font-size:15px;">Submission Closed</h3>
                        <p style="font-size:13px; color:#ef4444; margin:0;">The due date (${formattedDueDate}) has passed. You can no longer submit this task.</p>
                    </div>`;
            } else if(!subData) {
                subArea.innerHTML = `<h4 style="color:#0f172a; margin-bottom:10px; font-size:14px;">Submit Your Work</h4><textarea id="stuAnsText" class="sub-textarea" placeholder="Type your answer here..."></textarea><div style="margin-top:10px;"><label style="font-size:12px; font-weight:bold; color:#64748b;">Attach File (Optional)</label><br><input type="file" id="stuAnsFile" style="margin-top:5px; font-size:12px;"><input type="hidden" id="stuAnsBase64"></div><button id="btnActualSubmit" class="btn-submit-hw" onclick="submitHwToDb()">Submit Homework</button>`;
                setTimeout(() => { 
                    let fileInp = document.getElementById('stuAnsFile'); 
                    if(fileInp) {
                        fileInp.addEventListener('change', function() { 
                            if(this.files[0]) { 
                                const r = new FileReader(); r.onload = function(e) { document.getElementById('stuAnsBase64').value = e.target.result; }; r.readAsDataURL(this.files[0]); 
                            } 
                        }); 
                    }
                }, 200);
            } else if (subData && (!subData.Marks || String(subData.Marks).trim() === "")) {
                subArea.innerHTML = `<div style="background:#f0f9ff; border:1px solid #bae6fd; padding:15px; border-radius:8px; text-align:center;"><h3 style="color:#0284c7; margin:0 0 5px 0; font-size:15px;">Status: Submitted</h3><p style="font-size:13px; color:#475569; margin:0;">Waiting for teacher's review.</p></div>`;
            } else if (subData && subData.Marks) {
                let displayMarks = String(subData.Marks);
                subArea.innerHTML = `<div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px;"><h3 style="color:#15803d; margin:0 0 10px 0; font-size:15px;">Status: Evaluated ✅</h3><div style="display:flex; justify-content:space-between; font-size:14px;"><div><b style="color:#334155;">Marks Awarded:</b> <span style="font-size:18px; color:#b91c1c; font-weight:bold; margin-left:5px;">${displayMarks}</span></div></div><div style="margin-top:10px; font-size:13px; color:#475569;"><b>Teacher Remarks:</b> ${subData.Teacher_Remarks || 'Good work.'}</div></div>`;
            }
        } else {
            subArea.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:13px; font-weight:600;">No online submission required for this task.</p>`;
        }
    }
    let modal = document.getElementById('hwModal');
    if(modal) modal.classList.add('active');
};

window.submitHwToDb = function() {
    if(!currentHwSelection) return;
    const btn = document.getElementById('btnActualSubmit'); 
    btn.innerText = "Submitting..."; 
    btn.disabled = true;

    let myId = studentData.portalId || studentData.regNo;
    let docId = `${schoolCode}_${currentHwSelection.Assignment_ID}_${myId}`;

    const submissionData = {
        schoolCode: schoolCode,
        Assignment_ID: currentHwSelection.Assignment_ID,
        Reg_No: myId,
        Student_Name: studentData.studentFirstName || studentData.studentName,
        Answer: document.getElementById('stuAnsText') ? document.getElementById('stuAnsText').value : "",
        Attachment_Base64: document.getElementById('stuAnsBase64') ? document.getElementById('stuAnsBase64').value : "",
        Status: "Submitted",
        Timestamp: new Date().toISOString()
    };

    db.collection("submissions").doc(docId).set(submissionData)
    .then(() => {
        alert("Homework Submitted Successfully!");
        let modal = document.getElementById('hwModal'); 
        if(modal) modal.classList.remove('active'); 
        // Update local array to show immediate change without full reload
        globalDbData.submissions.push(submissionData);
        renderFeed(globalDbData.assignments, globalDbData.submissions);
    })
    .catch(err => {
        alert("Error saving submission: " + err.message);
    })
    .finally(() => {
        btn.innerText = "Submit Homework"; 
        btn.disabled = false;
    });
};

// ============================================================================
// FINANCIAL LEDGER SYSTEM
// ============================================================================
function processFeeLedger(receipts, setupData, feeHeads) {
    let tbody = document.getElementById('feeStatementBody'); 
    if(!receipts || receipts.length === 0) {
        if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No fee records found.</td></tr>';
        return;
    }
    // Advance fee calculation logic will be added here once we have full fee structure on Firebase
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Ledger will be visible after fee master setup.</td></tr>';
}

// ============================================================================
// ATTENDANCE CALENDAR ENGINE WITH EVENT TOOLTIPS
// ============================================================================
function processAttendance(records) {
    if(!records) return; let totP = 0; let totA = 0; let totL = 0;
    let myId = studentData.portalId || studentData.regNo;
    
    records.forEach(r => {
        if(String(r.Reg_No) === String(myId)) {
            let parts = String(r.Date).split('-');
            if(parts.length === 3) { 
                let isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                attMap[isoDate] = r.Status; 
                if(r.Status === 'P') totP++; 
                else if(r.Status === 'A') totA++; 
                else if(r.Status === 'L') totL++; 
            }
        }
    });
    if(document.getElementById('attTotalP')) document.getElementById('attTotalP').innerText = totP; 
    if(document.getElementById('attTotalA')) document.getElementById('attTotalA').innerText = totA; 
    if(document.getElementById('attTotalL')) document.getElementById('attTotalL').innerText = totL;
    renderCalendar();
}

function renderCalendar() {
    const year = currDate.getFullYear(); const month = currDate.getMonth();
    
    let calT1 = document.getElementById('calMonthTitle');
    let calT2 = document.getElementById('bigCalMonthTitle');
    if(calT1) calT1.innerText = currDate.toLocaleDateString('en-GB', { month: 'short' });
    if(calT2) calT2.innerText = currDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calGrid = document.getElementById('bigCalGrid'); const smallCalGrid = document.getElementById('smallCalGrid');
    
    let htmlBig = `<div class="cal-day-header">Su</div><div class="cal-day-header">Mo</div><div class="cal-day-header">Tu</div><div class="cal-day-header">We</div><div class="cal-day-header">Th</div><div class="cal-day-header">Fr</div><div class="cal-day-header">Sa</div>`;
    let htmlSmall = htmlBig;

    for(let i = 0; i < firstDay; i++) { htmlBig += `<div class="cal-cell" style="background:none; border:none;"></div>`; htmlSmall += `<div class="cal-cell small"></div>`; }
    
    for(let i = 1; i <= daysInMonth; i++) {
        let isoDate = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        let status = attMap[isoDate]; 
        let evt = eventMap[isoDate];
        
        let dotHtml = ''; let smallDot = '';
        let hoverCardContent = "";
        let isHolidayStyle = "";

        if(evt && evt.isHoliday) {
            isHolidayStyle = "background:#fef2f2; color:#ef4444; border-color:#fecaca;";
            hoverCardContent = `<strong>🎉 ${evt.title}</strong><br><small>${evt.desc}</small>`;
            smallDot = `<div class="cal-dot" style="background:#ef4444;"></div>`;
        } 
        else if(status === 'P') { 
            dotHtml = `<div class="dot p"></div>`; smallDot = `<div class="cal-dot" style="background:#27ae60;"></div>`;
            hoverCardContent = `<strong>Present</strong>`;
        } 
        else if(status === 'A') { 
            dotHtml = `<div class="dot a"></div>`; smallDot = `<div class="cal-dot" style="background:#ef4444;"></div>`;
            hoverCardContent = `<strong style="color:#ef4444;">Absent</strong>`;
        } 
        else if(status === 'L') { 
            dotHtml = `<div class="dot l"></div>`; smallDot = `<div class="cal-dot" style="background:#f59e0b;"></div>`;
            hoverCardContent = `<strong style="color:#f59e0b;">Leave / Late</strong>`;
        }

        if(evt && !evt.isHoliday) {
            hoverCardContent += hoverCardContent ? `<hr style="margin:5px 0; border:1px solid #334155;">` : ``;
            hoverCardContent += `<strong>📌 ${evt.title}</strong>`;
            smallDot = `<div class="cal-dot" style="background:#3b82f6;"></div>`;
        }

        let hoverHtml = hoverCardContent ? `<div class="hover-card">${hoverCardContent}</div>` : "";
        let isToday = isoDate === new Date().toISOString().split('T')[0] ? "today" : "";

        htmlBig += `<div class="cal-cell ${isToday}" style="${isHolidayStyle}">${i}${dotHtml}${hoverHtml}</div>`;
        htmlSmall += `<div class="cal-cell small ${isToday}">${i}${smallDot}</div>`;
    }
    
    if(calGrid) calGrid.innerHTML = htmlBig;
    if(smallCalGrid) smallCalGrid.innerHTML = htmlSmall;
}
