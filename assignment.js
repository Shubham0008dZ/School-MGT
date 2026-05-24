window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
};

document.addEventListener('DOMContentLoaded', () => {
    
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => console.log("Background sync paused.", err));

    if (!isSA && !userRights.some(r => r.startsWith("HW_"))) { window.location.href = 'index.html'; return; }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { customConfirm("Are you sure you want to logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });
    }

    // TABS LOGIC FOR ADMIN
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return;
            e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];

    let allAssignments = [];
    let currentFilter = "Circular"; // Default tab

    // FETCH CLASSES AND ASSIGNMENTS FROM DB
    function loadData() {
        document.getElementById('commListArea').innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Fetching records... ⏳</p>';
        fetch(scriptURL, { redirect: "follow" })
        .then(res => res.json())
        .then(res => {
            if(res.status === "Success") { 
                if(res.setup) {
                    const setupData = res.setup;
                    const fClassDropdown = document.getElementById('hwClass');
                    const fSecDropdown = document.getElementById('hwSection');
                    
                    let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))];
                    uniqueClasses.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
                    
                    if(fClassDropdown.options.length <= 2) {
                        uniqueClasses.forEach(item => { fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; });
                    }

                    fClassDropdown.addEventListener('change', function() {
                        let selClass = this.value;
                        fSecDropdown.innerHTML = '<option value="">Select Section</option><option value="All">All Sections</option>';
                        if(selClass && selClass !== "All") {
                            let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                            let uniqueSecs = [...new Set(filteredSecs)].sort(); 
                            uniqueSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
                        }
                    });
                }
                
                // Store fetched assignments
                allAssignments = res.assignments || [];
                renderCommList();
            }
        });
    }

    // ==========================================
    // RENDER ADMIN LIST VIEW LOGIC
    // ==========================================
    const commTabs = document.querySelectorAll('.comm-tab');
    commTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            commTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            renderCommList();
        });
    });

    function renderCommList() {
        const listArea = document.getElementById('commListArea');
        const detailArea = document.getElementById('commDetailArea');
        listArea.innerHTML = '';
        detailArea.innerHTML = '<div class="empty-detail">Select an item from the left to view details.</div>';

        let filtered = allAssignments.filter(a => {
            if(currentFilter === "Homework") {
                return ["Homework", "Classwork", "Assignment", "Project", "Holiday Homework"].includes(a.Type);
            } else if (currentFilter === "Circular") {
                return ["Circular", "News", "Notice"].includes(a.Type);
            } else {
                return a.Type === currentFilter;
            }
        });

        filtered.reverse(); // Newest first

        if(filtered.length === 0) {
            listArea.innerHTML = `<p style="text-align:center; padding:20px; color:#999; font-size:13px;">No ${currentFilter} records found.</p>`;
            return;
        }

        filtered.forEach((a, idx) => {
            let dObj = document.createElement('div');
            dObj.className = 'comm-card-item';
            
            let dateStr = new Date(a.Timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            let classInfo = (a.Class === "All" ? "Global" : `Class ${a.Class} (${a.Section})`);

            dObj.innerHTML = `
                <span class="tag">${a.Type}</span> <span class="date">📅 ${dateStr}</span>
                <div class="title">${a.Name}</div>
                <div class="desc">${classInfo} • ${a.Subject || 'General'}</div>
            `;

            dObj.addEventListener('click', () => {
                document.querySelectorAll('.comm-card-item').forEach(c => c.classList.remove('active'));
                dObj.classList.add('active');
                renderDetailView(a);
            });

            listArea.appendChild(dObj);
        });
    }

    function renderDetailView(a) {
        const detailArea = document.getElementById('commDetailArea');
        let dateStr = new Date(a.Timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        let deadlineHtml = a.Date ? `<br><b style="color:#e74c3c;">Deadline: ${a.Date}</b>` : '';
        let classInfo = (a.Class === "All" ? "All Classes & Sections" : `Class ${a.Class} - Sec ${a.Section}`);
        
        let attachHtml = a.Attachment_Base64 ? `<a href="${a.Attachment_Base64}" download="Attachment_${a.Assignment_ID}" class="btn-download-detail">📎 Download Attachment</a>` : '';

        detailArea.innerHTML = `
            <div class="detail-header">
                <div>
                    <span style="font-size:11px; background:#f39c12; color:white; padding:3px 8px; border-radius:3px; font-weight:bold; margin-bottom:8px; display:inline-block;">${a.Type}</span>
                    <div class="detail-title">${a.Name}</div>
                    <div class="detail-meta">Subject: <b>${a.Subject || 'General'}</b> | Target: <b>${classInfo}</b></div>
                </div>
                <div style="text-align:right; font-size:12px; color:#7f8c8d;">
                    Posted: ${dateStr}
                    ${deadlineHtml}
                </div>
            </div>
            <div style="margin-bottom:15px; font-weight:bold; color:#2c3e50;">Description:</div>
            <div class="detail-body">${a.Description || 'No detailed description provided for this entry.'}</div>
            ${attachHtml}
        `;
    }

    document.getElementById('btnSyncComm')?.addEventListener('click', loadData);
    loadData();

    // FILE ATTACHMENT TO BASE64
    const hwFileInput = document.getElementById('hwFile');
    if(hwFileInput) {
        hwFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                document.getElementById('hwFileName').innerText = file.name;
                const reader = new FileReader();
                reader.onload = function(e) { document.getElementById('hwBase64').value = e.target.result; }
                reader.readAsDataURL(file);
            } else {
                document.getElementById('hwFileName').innerText = "No file selected";
                document.getElementById('hwBase64').value = "";
            }
        });
    }

    function formatToDDMMYYYY(dateString) {
        if(!dateString) return ""; const d = new Date(dateString); if(isNaN(d.getTime())) return dateString;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    }

    const hwForm = document.getElementById('assignmentForm');
    if(hwForm) {
        hwForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSaveHw');
            btn.innerText = "Saving..."; btn.disabled = true;

            let extraValidationPassed = true;
            if(!document.getElementById('hwType').value) { extraValidationPassed = false; }

            if(extraValidationPassed) {
                const payload = {
                    action: "saveAssignment",
                    data: {
                        acadYear: document.getElementById('acadYear').value,
                        date: formatToDDMMYYYY(document.getElementById('hwDate').value),
                        class: document.getElementById('hwClass').value,
                        section: document.getElementById('hwSection').value,
                        subject: document.getElementById('hwSubject').value,
                        type: document.getElementById('hwType').value,
                        name: document.getElementById('hwName').value,
                        studentWise: document.getElementById('hwStudentWise').checked,
                        description: document.getElementById('hwDesc').value,
                        attachmentBase64: document.getElementById('hwBase64').value,
                        submissionReq: document.getElementById('hwSubmissionReq').checked,
                        createdBy: activeUser.empId
                    }
                };

                fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
                .then(res => res.json())
                .then(data => {
                    if(data.status === "Success") {
                        alert(data.message);
                        hwForm.reset();
                        document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];
                        document.getElementById('hwFileName').innerText = "No file selected";
                        document.getElementById('hwBase64').value = "";
                        loadData(); // Auto sync list after save
                    } else { alert("Error: " + data.message); }
                }).catch(err => { alert("Failed to save. Please check connection."); })
                .finally(() => { btn.innerText = "Save Communication"; btn.disabled = false; });
            }
        });
    }
});
