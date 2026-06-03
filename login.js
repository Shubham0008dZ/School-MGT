// ============================================================================
// ERP LOGIN & AUTHENTICATION SYSTEM (Multi-Tenant Architecture)
// ============================================================================

// 1. MASTER ROUTER API (Ye wo URL hai jo tune Master Database se generate kiya)
const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbwA9_z-fgbbmC5kNZxrANT02drRvq32jmbrN9VxLh_n9jaEV-lWVltSynLBfQ_y5Y0P/exec';

// Ye variables dynamic school routing handle karenge
let targetScriptURL = "";
let verifiedStudentId = "";

document.addEventListener("DOMContentLoaded", function() {
    
    // UI SETUP LOGIC (Checks URL for ?setup=true to handle initial student PIN setup)
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';
    
    if (isSetupMode) {
        let setupPanel = document.getElementById('setupCheckboxPanel');
        if(setupPanel) setupPanel.style.display = 'block';
        
        // Auto switch to student tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.form-view').forEach(f => f.classList.remove('active'));
        
        let studentTabBtn = document.querySelector('.tab-btn[data-target="studentForm"]');
        if(studentTabBtn) studentTabBtn.classList.add('active');
        
        let studentFormView = document.getElementById('studentForm');
        if(studentFormView) studentFormView.classList.add('active');
    }

    // TAB LOGIC (Staff vs Student Login views)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form-view').forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            let targetId = this.getAttribute('data-target');
            if(document.getElementById(targetId)) {
                document.getElementById(targetId).classList.add('active');
            }
        });
    });
    
    // AUTO-LOGIN CHECK: Agar school pehle hi verify ho chuka hai is session mein
    let savedUrl = localStorage.getItem('erp_school_url');
    let savedName = localStorage.getItem('erp_school_name');
    let savedLogo = localStorage.getItem('erp_school_logo');
    
    if(savedUrl && savedName) {
        targetScriptURL = savedUrl;
        showCredentialsStep(savedName, savedLogo);
    }
});

// PANEL TRANSITIONS (For OTP & Custom Passwords)
window.openPanel = function(id) { document.getElementById(id).classList.add('active'); }
window.closePanels = function() { document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('active')); }


// ============================================================================
// PHASE 1: SCHOOL CODE VERIFICATION (Connects to Master API)
// ============================================================================
document.getElementById('btnVerifyCode')?.addEventListener('click', function() {
    const codeInput = document.getElementById('schoolCodeInp').value.trim();
    if(!codeInput) { alert("Please enter a School Code."); return; }
    
    this.innerText = "Verifying..."; 
    this.disabled = true;
    
    fetch(MASTER_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "verifySchoolCode", schoolCode: codeInput }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success" && data.schoolData) {
            
            // SCHOOL VERIFIED: Ab is specific school ka backend URL save kar lo
            targetScriptURL = data.schoolData.backendUrl;
            localStorage.setItem('erp_school_url', targetScriptURL);
            localStorage.setItem('erp_school_name', data.schoolData.schoolName);
            localStorage.setItem('erp_school_logo', data.schoolData.logoUrl);
            
            showCredentialsStep(data.schoolData.schoolName, data.schoolData.logoUrl);
            
        } else {
            alert(data.message || "Invalid School Code");
        }
    })
    .catch(err => {
        alert("Connection error while verifying school code.");
        console.error(err);
    })
    .finally(() => {
        this.innerText = "Verify School"; 
        this.disabled = false;
    });
});

function showCredentialsStep(name, logoUrl) {
    document.getElementById('step-school-code').classList.remove('active');
    document.getElementById('step-credentials').classList.add('active');
    
    document.getElementById('dynSchoolName').innerText = name;
    
    let logoImg = document.getElementById('dynSchoolLogo');
    let defaultLogo = document.getElementById('defaultLogo');
    
    // Agar Google sheet mein logo link hai toh wo dikhao, warna default building emoji
    if(logoUrl && logoUrl.startsWith('http')) {
        logoImg.src = logoUrl;
        logoImg.style.display = 'block';
        if(defaultLogo) defaultLogo.style.display = 'none';
    } else {
        logoImg.style.display = 'none';
        if(defaultLogo) defaultLogo.style.display = 'block';
    }
}

// "Change School" button logic
document.getElementById('btnBackToCode')?.addEventListener('click', function() {
    localStorage.removeItem('erp_school_url');
    localStorage.removeItem('erp_school_name');
    localStorage.removeItem('erp_school_logo');
    targetScriptURL = "";
    
    document.getElementById('step-credentials').classList.remove('active');
    document.getElementById('step-school-code').classList.add('active');
});


// ============================================================================
// PHASE 2: CREDENTIAL VERIFICATION (Connects to School-Specific API)
// ============================================================================

// 1. STAFF / ADMIN LOGIN
document.getElementById('btnStaffLogin')?.addEventListener('click', function() {
    if(!targetScriptURL) { alert("School connection missing. Please go back and verify code."); return; }
    
    const uid = document.getElementById('staffId').value; 
    const pass = document.getElementById('staffPass').value;
    if(!uid || !pass) { alert("Fill all fields"); return; }
    
    this.innerText = "Authenticating..."; this.disabled = true;
    
    fetch(targetScriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "login", userId: uid, password: pass }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success") { 
            localStorage.setItem('erp_active_user', JSON.stringify(data.user)); 
            window.location.href = 'index.html'; 
        } else { 
            alert(data.message); 
        }
    })
    .catch(err => alert("Connection Error."))
    .finally(() => { this.innerText = "Login Securely"; this.disabled = false; });
});

// 2. STUDENT LOGIN
document.getElementById('btnStudentLogin')?.addEventListener('click', function() {
    if(!targetScriptURL) { alert("School connection missing. Please go back and verify code."); return; }

    const uid = document.getElementById('studentId').value; 
    const pass = document.getElementById('studentPass').value;
    
    let setupPanel = document.getElementById('setupCheckboxPanel');
    const setupBoxVisible = setupPanel && setupPanel.style.display !== 'none';
    
    let chkNewPass = document.getElementById('chkNewPassword');
    const wantsNewPass = chkNewPass && chkNewPass.checked;
    
    if(!uid || !pass) { alert("Enter User ID and PIN"); return; }
    
    this.innerText = "Checking Credentials..."; this.disabled = true;

    fetch(targetScriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "loginStudent", userId: uid, password: pass }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success") {
            if(setupBoxVisible && wantsNewPass) {
                verifiedStudentId = uid;
                openPanel('setPassPanel');
            } else {
                window.history.replaceState({}, document.title, window.location.pathname);
                localStorage.setItem('erp_active_student', JSON.stringify(data.user));
                window.location.href = 'student_dashboard.html'; 
            }
        } else { 
            alert(data.message); 
        }
    })
    .catch(err => { console.error(err); alert("Connection error."); })
    .finally(() => { this.innerText = "Student Login"; this.disabled = false; });
});

// 3. SET NEW PASSWORD FOR STUDENT
document.getElementById('btnConfirmNewPass')?.addEventListener('click', function() {
    if(!targetScriptURL) return;

    const p1 = document.getElementById('newPass1').value; 
    const p2 = document.getElementById('newPass2').value;
    if(!p1 || p1 !== p2) { alert("Passwords do not match."); return; }
    
    this.innerText = "Updating..."; this.disabled = true;

    fetch(targetScriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "resetStudentPassword", userId: verifiedStudentId, newPassword: p1 }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success") {
            alert("Password updated! Please login with your new password.");
            closePanels();
            document.getElementById('studentPass').value = "";
            
            let chkNewPass = document.getElementById('chkNewPassword');
            if(chkNewPass) chkNewPass.checked = false;
            
            let setupPanel = document.getElementById('setupCheckboxPanel');
            if(setupPanel) setupPanel.style.display = 'none';
            
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            alert(data.message);
        }
    })
    .catch(err => { console.error(err); alert("Connection error."); })
    .finally(() => { this.innerText = "Update & Login"; this.disabled = false; });
});

// ============================================================================
// PHASE 3: OTP RESET FLOW
// ============================================================================
document.getElementById('btnSendOtp')?.addEventListener('click', function() {
    if(!targetScriptURL) { alert("School connection missing."); return; }

    const uid = document.getElementById('forgotStudentId').value;
    if(!uid) { alert("Enter User ID"); return; }
    
    this.innerText = "Sending..."; this.disabled = true;

    fetch(targetScriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "sendStudentOTP", userId: uid }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success") {
            document.getElementById('otpStep1').style.display = 'none';
            document.getElementById('otpStep2').style.display = 'block';
        } else { alert(data.message); }
    })
    .catch(err => { console.error(err); alert("Connection error."); })
    .finally(() => { this.innerText = "Send OTP to Email"; this.disabled = false; });
});

document.getElementById('btnVerifyOtp')?.addEventListener('click', function() {
    if(!targetScriptURL) return;

    const uid = document.getElementById('forgotStudentId').value;
    const otp = document.getElementById('resetOtp').value;
    const newPass = document.getElementById('resetNewPass').value;
    
    if(!otp || !newPass) { alert("Fill all fields."); return; }
    
    this.innerText = "Resetting..."; this.disabled = true;

    fetch(targetScriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "resetStudentPassword", userId: uid, otp: otp, newPassword: newPass }), 
        redirect: "follow", 
        headers: { "Content-Type": "text/plain;charset=utf-8" } 
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "Success") {
            alert("Password reset successfully. You can now login.");
            closePanels();
            document.getElementById('otpStep1').style.display = 'block';
            document.getElementById('otpStep2').style.display = 'none';
        } else { alert(data.message); }
    })
    .catch(err => { console.error(err); alert("Connection error."); })
    .finally(() => { this.innerText = "Reset Password"; this.disabled = false; });
});
