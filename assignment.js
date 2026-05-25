// ============================================================================
// CUSTOM CONFIRM MODAL LOGIC
// ============================================================================
window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    
    overlay.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;">
            <p style="color:#555;margin-bottom:20px;">${message}</p>
            <div style="display:flex;justify-content:center;gap:10px;">
                <button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button>
                <button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('cc-cancel').addEventListener('click', () => {
        overlay.remove();
    });
    
    document.getElementById('cc-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
};

// ============================================================================
// MAIN DOM CONTENT LOADED
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Session Verification
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
        console.error("Error parsing rights:", e);
    }

    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    fetch(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ 
            action: "verifySession", 
            empId: activeUser.empId 
        }), 
        redirect: "follow", 
        headers: { 
            "Content-Type": "text/plain;charset=utf-8" 
        } 
    })
    .then(res => {
        return res.json();
    })
    .then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); 
            window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { 
            localStorage.setItem('erp_active_user', JSON.stringify(data.user)); 
        }
    })
    .catch(err => {
        console.log("Background sync paused.", err);
    });

    if (!isSA && !userRights.some(r => r.startsWith("HW_"))) { 
        window.location.href = 'index.html'; 
        return; 
    }

    // 2. Logout Logic
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { 
            customConfirm("Are you sure you want to logout?", () => { 
                localStorage.removeItem('erp_active_user'); 
                window.location.href = 'login.html'; 
            }); 
        });
    }

    // 3. Tab Navigation Logic for Admin
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') {
                return;
            }
            e.preventDefault();
            
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active');
            });
            document.querySelectorAll('.app-module').forEach(m => {
                m.classList.remove('active-module');
            });
            
            this.classList.add('active');
            let targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-module');

            // Handle Dynamic Categories dynamically
            if(this.getAttribute('data-cat')) {
                currentCategory = this.getAttribute('data-cat');
                let headerTitle = document.getElementById('listHeaderTitle');
                if (headerTitle) {
                    headerTitle.innerText = currentCategory.toUpperCase() + " RECORDS";
                }
                renderCommList();
            }
        });
    });

    // 4. Default Date Setting
    let dateInput = document.getElementById('hwDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // 5. Open Add Form Pre-filled
    let btnOpenAdd = document.getElementById('btnOpenAddForm');
    if (btnOpenAdd) {
        btnOpenAdd.addEventListener('click', () => {
            document.querySelectorAll('.app-module').forEach(m => {
                m.classList.remove('active-module');
            });
            document.getElementById('module-add-hw').classList.add('active-module');
            
            let dynTitle = document.getElementById('formDynamicTitle');
            if(dynTitle) {
                dynTitle.innerText = currentCategory.toUpperCase();
            }
            
            let hwTypeInput = document.getElementById('hwType');
            if(hwTypeInput) {
                hwTypeInput.value = currentCategory; 
            }
            
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        });
    }

    let allAssignments = [];
    let currentCategory = "Circular"; // Default category

    // 6. Fetch Data From Server
    function loadData() {
        let commListArea = document.getElementById('commListArea');
        if (commListArea) {
            commListArea.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Fetching records... ⏳</p>';
        }
        
        fetch(scriptURL, { 
            redirect: "follow" 
        })
        .then(res => {
            return res.json();
        })
        .then(res => {
            if(res.status === "Success") { 
                if(res.setup) {
                    const setupData = res.setup;
                    const fClassDropdown = document.getElementById('hwClass'); 
                    const fSecDropdown = document.getElementById('hwSection');
                    
                    let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))];
                    uniqueClasses.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
                    
                    if(fClassDropdown && fClassDropdown.options.length <= 2) { 
                        uniqueClasses.forEach(item => { 
                            fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; 
                        }); 
                    }
                    
                    if(fClassDropdown) {
                        fClassDropdown.addEventListener('change', function() {
                            let selClass = this.value; 
                            fSecDropdown.innerHTML = '<option value="">Select Section</option><option value="All">All Sections</option>';
                            if(selClass && selClass !== "All") {
                                let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                                let uniqueSecs = [...new Set(filteredSecs)].sort(); 
                                uniqueSecs.forEach(sec => { 
                                    fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; 
                                });
                            }
                        });
                    }
                }
                
                allAssignments = res.assignments || [];
                renderCommList();
            }
        })
        .catch(err => {
            console.error("Fetch Error:", err);
        });
    }

    // 7. Render List Logic
    function renderCommList() {
        const listArea = document.getElementById('commListArea'); 
        if(!listArea) return;
        
        listArea.innerHTML = '';
        
        let filtered = allAssignments.filter(a => {
            if(currentCategory === "Circular") {
                return ["Circular", "News", "Notice"].includes(a.Type);
            }
            if(currentCategory === "Homework") {
                return ["Homework", "Classwork", "Assignment", "Project"].includes(a.Type);
            }
            return a.Type === currentCategory;
        });

        filtered.reverse(); 

        if(filtered.length === 0) { 
            listArea.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">No ${currentCategory} records found.</p>`; 
            return; 
        }

        filtered.forEach(a => {
            let dateStr = new Date(a.Timestamp).toLocaleDateString('en-GB');
            let classInfo = (a.Class === "All" ? "Global" : `Class ${a.Class} (${a.Section})`);
            
            let attachBtn = "";
            if (a.Attachment_Base64) {
                attachBtn = `<a href="${a.Attachment_Base64}" download class="btn-attach" style="border:none; background:#3498db; color:white; padding:5px 10px;">📎 File</a>`;
            }

            listArea.innerHTML += `
                <div class="record-card">
                    <div>
                        <div style="font-size:11px; background:#fdebd0; color:#e67e22; padding:2px 6px; border-radius:3px; display:inline-block; margin-bottom:5px;">
                            <b>${a.Type}</b> • ${dateStr}
                        </div>
                        <h3 style="margin:0 0 5px 0; font-size:16px; color:#2980b9;">${a.Name}</h3>
                        <p style="margin:0; font-size:13px; color:#555;">${classInfo} | Subject: ${a.Subject || 'General'}</p>
                    </div>
                    <div>
                        ${attachBtn}
                    </div>
                </div>
            `;
        });
    }

    // Trigger Initial Load
    loadData();

    // 8. File Attachment to Base64
    const hwFileInput = document.getElementById('hwFile');
    if(hwFileInput) {
        hwFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) { 
                document.getElementById('hwFileName').innerText = file.name; 
                const reader = new FileReader(); 
                reader.onload = function(e) { 
                    document.getElementById('hwBase64').value = e.target.result; 
                }; 
                reader.readAsDataURL(file); 
            } else { 
                document.getElementById('hwFileName').innerText = "No file selected"; 
                document.getElementById('hwBase64').value = ""; 
            }
        });
    }

    // 9. Format Date Function
    function formatToDDMMYYYY(dateString) { 
        if(!dateString) {
            return ""; 
        }
        const d = new Date(dateString); 
        if(isNaN(d.getTime())) {
            return dateString; 
        }
        let day = d.getDate().toString().padStart(2, '0');
        let month = (d.getMonth() + 1).toString().padStart(2, '0');
        let year = d.getFullYear();
        return `${day}-${month}-${year}`; 
    }

    // 10. Save Communication Assignment
    const hwForm = document.getElementById('assignmentForm');
    if(hwForm) {
        hwForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            const btn = document.getElementById('btnSaveHw'); 
            btn.innerText = "Saving..."; 
            btn.disabled = true;

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
                    hwForm.reset(); 
                    document.getElementById('hwDate').value = new Date().toISOString().split('T')[0]; 
                    document.getElementById('hwFileName').innerText = "No file selected"; 
                    document.getElementById('hwBase64').value = "";
                    
                    let navActive = document.querySelector('.nav-btn.active');
                    if (navActive) {
                        navActive.click(); 
                    }
                    loadData(); 
                } else { 
                    alert("Error: " + data.message); 
                }
            })
            .catch(err => {
                console.error("Save Error:", err);
            })
            .finally(() => { 
                btn.innerText = "Save Entry"; 
                btn.disabled = false; 
            });
        });
    }
});
