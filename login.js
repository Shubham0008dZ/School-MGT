// ============================================================================
// ERP LOGIN & AUTHENTICATION SYSTEM (Multi-Tenant Architecture - FIREBASE EDITION)
// ============================================================================

// 1. MASTER ROUTER API (School verification remains on Google Apps Script)
const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbwA9_z-fgbbmC5kNZxrANT02drRvq32jmbrN9VxLh_n9jaEV-lWVltSynLBfQ_y5Y0P/exec';

let targetScriptURL = "";
let verifiedStudentId = "";

document.addEventListener("DOMContentLoaded", function() {
    
    // UI SETUP LOGIC
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';
    
    if (isSetupMode) {
        let setupPanel = document.getElementById('setupCheckboxPanel');
        if(setupPanel) setupPanel.style.display = 'block';
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.form-view').forEach(f => f.classList.remove('active'));
        
        let studentTabBtn = document.querySelector('.tab-btn[data-target="studentForm"]');
        if(studentTabBtn) studentTabBtn.classList.add('active');
        
        let studentFormView = document.getElementById('studentForm');
        if(studentFormView) studentFormView.classList.add('active');
    }

    // TAB LOGIC 
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
    
    // AUTO-LOGIN CHECK
    let savedUrl = localStorage.getItem('erp_school_url');
    let savedName = localStorage.getItem('erp_school_name');
    let savedLogo = localStorage.getItem('erp_school_logo');
    
    if(savedUrl && savedName) {
        targetScriptURL = savedUrl;
        showCredentialsStep(savedName, savedLogo);
    }
});

window.openPanel = function(id) { document.getElementById(id).classList.add('active'); }
window.closePanels = function() { document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('active')); }

// ============================================================================
// PHASE 1: SCHOOL CODE VERIFICATION 
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
            targetScriptURL = data.schoolData.backendUrl; // Purana logic intact rakha hai in case future me chahiye
            localStorage.setItem('erp_school_url', targetScriptURL);
            localStorage.setItem('erp_school_name', data.schoolData.schoolName);
            localStorage.setItem('erp_school_logo', data.schoolData.logoUrl);
            localStorage.setItem('erp_school_db', data.schoolData.dbName || "default"); // Firebase me school segregate karne ke liye
            
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
    
    if(logoUrl && logoUrl.startsWith('http')) {
        logoImg.src = logoUrl;
        logoImg.style.display = 'block';
        if(defaultLogo) defaultLogo.style.display = 'none';
    } else {
        logoImg.style.display = 'none';
        if(defaultLogo) defaultLogo.style.display = 'block';
    }
}

document.getElementById('btnBackToCode')?.addEventListener('click', function() {
    localStorage.removeItem('erp_school_url');
    localStorage.removeItem('erp_school_name');
    localStorage.removeItem('erp_school_logo');
    localStorage.removeItem('erp_school_db');
    targetScriptURL = "";
    
    document.getElementById('step-credentials').classList.remove('active');
    document.getElementById('step-school-code').classList.add('active');
});

// ============================================================================
// PHASE 2: CREDENTIAL VERIFICATION (FIREBASE IMPLEMENTATION)
// ============================================================================

// 1. STAFF / ADMIN LOGIN
document.getElementById('btnStaffLogin')?.addEventListener('click', function() {
    if(!localStorage.getItem('erp_school_name')) { alert("School connection missing. Please go back and verify code."); return; }
    
    const email = document.getElementById('staffId').value; 
    const pass = document.getElementById('staffPass').value;
    if(!email || !pass) { alert("Fill all fields"); return; }
    
    this.innerText = "Authenticating..."; this.disabled = true;
    
    // FIREBASE AUTH (Replaces old fetch call)
    auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        // Fetch User Data from Firestore 'users' collection to get Rights_JSON etc.
        db.collection("users").doc(userCredential.user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                localStorage.setItem('erp_active_user', JSON.stringify(userData)); 
                window.location.href = 'index.html'; 
            } else {
                alert("User profile not found in database!");
                auth.signOut();
            }
        });
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert("Login Failed: " + errorMessage);
    })
    .finally(() => { this.innerText = "Login Securely"; this.disabled = false; });
});

// 2. STUDENT LOGIN
document.getElementById('btnStudentLogin')?.addEventListener('click', function() {
    if(!localStorage.getItem('erp_school_name')) { alert("School connection missing."); return; }

    const uid = document.getElementById('studentId').value; 
    const pass = document.getElementById('studentPass').value;
    
    let setupPanel = document.getElementById('setupCheckboxPanel');
    const setupBoxVisible = setupPanel && setupPanel.style.display !== 'none';
    
    let chkNewPass = document.getElementById('chkNewPassword');
    const wantsNewPass = chkNewPass && chkNewPass.checked;
    
    if(!uid || !pass) { alert("Enter User ID and PIN"); return; }
    
    this.innerText = "Checking Credentials..."; this.disabled = true;

    // FIRESTORE CUSTOM VERIFICATION FOR STUDENTS
    db.collection("students").where("portalId", "==", uid).get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            alert("Student ID not found.");
            return;
        }

        let studentDoc = querySnapshot.docs[0];
        let studentData = studentDoc.data();

        if (studentData.password === pass || studentData.pin === pass) {
            
            if(setupBoxVisible && wantsNewPass) {
                verifiedStudentId = studentDoc.id; // Store Firestore Document ID
                openPanel('setPassPanel');
            } else {
                window.history.replaceState({}, document.title, window.location.pathname);
                localStorage.setItem('erp_active_student', JSON.stringify(studentData));
                window.location.href = 'student_dashboard.html'; 
            }
        } else {
            alert("Invalid Password or PIN.");
        }
    })
    .catch(err => { console.error(err); alert("Database Connection error."); })
    .finally(() => { this.innerText = "Student Login"; this.disabled = false; });
});

// 3. SET NEW PASSWORD FOR STUDENT
document.getElementById('btnConfirmNewPass')?.addEventListener('click', function() {
    const p1 = document.getElementById('newPass1').value; 
    const p2 = document.getElementById('newPass2').value;
    if(!p1 || p1 !== p2) { alert("Passwords do not match."); return; }
    
    this.innerText = "Updating..."; this.disabled = true;

    // UPDATE FIRESTORE DOCUMENT
    db.collection("students").doc(verifiedStudentId).update({
        password: p1
    })
    .then(() => {
        alert("Password updated! Please login with your new password.");
        closePanels();
        document.getElementById('studentPass').value = "";
        
        let chkNewPass = document.getElementById('chkNewPassword');
        if(chkNewPass) chkNewPass.checked = false;
        
        let setupPanel = document.getElementById('setupCheckboxPanel');
        if(setupPanel) setupPanel.style.display = 'none';
        
        window.history.replaceState({}, document.title, window.location.pathname);
    })
    .catch(err => { console.error(err); alert("Update error."); })
    .finally(() => { this.innerText = "Update & Login"; this.disabled = false; });
});

// ============================================================================
// PHASE 3: OTP RESET FLOW
// ============================================================================
document.getElementById('btnSendOtp')?.addEventListener('click', function() {
    // Note: To send emails natively via Firebase, you need an extension like "Trigger Email from Firestore"
    // Or you can retain your old Apps Script URL just for sending OTPs.
    // For now, this is set to write an OTP request to a 'mail_queue' collection which an extension processes.
    
    const uid = document.getElementById('forgotStudentId').value;
    if(!uid) { alert("Enter User ID"); return; }
    
    this.innerText = "Sending..."; this.disabled = true;

    db.collection("students").where("portalId", "==", uid).get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) throw new Error("User ID not found");
        
        let studentDoc = querySnapshot.docs[0];
        let otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit OTP
        
        // Save OTP to student doc
        return db.collection("students").doc(studentDoc.id).update({
            resetOtp: otp
        });
    })
    .then(() => {
        // Assuming email is sent via Cloud Function triggered by doc update
        document.getElementById('otpStep1').style.display = 'none';
        document.getElementById('otpStep2').style.display = 'block';
    })
    .catch(err => { console.error(err); alert(err.message || "Connection error."); })
    .finally(() => { this.innerText = "Send OTP to Email"; this.disabled = false; });
});

document.getElementById('btnVerifyOtp')?.addEventListener('click', function() {
    const uid = document.getElementById('forgotStudentId').value;
    const otp = document.getElementById('resetOtp').value;
    const newPass = document.getElementById('resetNewPass').value;
    
    if(!otp || !newPass) { alert("Fill all fields."); return; }
    
    this.innerText = "Resetting..."; this.disabled = true;

    db.collection("students").where("portalId", "==", uid).get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) throw new Error("User ID not found");
        
        let studentDoc = querySnapshot.docs[0];
        let studentData = studentDoc.data();
        
        if(studentData.resetOtp === otp) {
            return db.collection("students").doc(studentDoc.id).update({
                password: newPass,
                resetOtp: firebase.firestore.FieldValue.delete() // Cleanup OTP
            });
        } else {
            throw new Error("Invalid OTP");
        }
    })
    .then(() => {
        alert("Password reset successfully. You can now login.");
        closePanels();
        document.getElementById('otpStep1').style.display = 'block';
        document.getElementById('otpStep2').style.display = 'none';
    })
    .catch(err => { console.error(err); alert(err.message || "Reset failed."); })
    .finally(() => { this.innerText = "Reset Password"; this.disabled = false; });
});
