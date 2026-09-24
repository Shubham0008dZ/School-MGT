// ============================================================================
// ERP LOGIN & AUTHENTICATION SYSTEM (100% FIREBASE POWERED)
// ============================================================================
// Note: Google Apps Script / Sheet URLs have been completely removed.
// All data logic now exclusively uses Firebase Firestore (db) and Auth (auth).

let verifiedStudentId = ""; // Used to hold Firestore Document ID temporarily during setup

document.addEventListener("DOMContentLoaded", function() {
    
    // ========================================================================
    // UI SETUP LOGIC & TABS
    // ========================================================================
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
    
    // ========================================================================
    // AUTO-LOGIN CHECK
    // ========================================================================
    let savedCode = localStorage.getItem('erp_school_code');
    let savedName = localStorage.getItem('erp_school_name');
    let savedLogo = localStorage.getItem('erp_school_logo');
    
    if(savedCode && savedName) {
        showCredentialsStep(savedName, savedLogo);
    }
});

// Panel Transitions
window.openPanel = function(id) { document.getElementById(id).classList.add('active'); }
window.closePanels = function() { document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('active')); }


// ============================================================================
// PHASE 1: SCHOOL CODE VERIFICATION (Queries Firestore 'schools' collection)
// ============================================================================
document.getElementById('btnVerifyCode')?.addEventListener('click', function() {
    const codeInput = document.getElementById('schoolCodeInp').value.trim();
    if(!codeInput) { alert("Please enter a School Code."); return; }
    
    this.innerText = "Verifying..."; 
    this.disabled = true;
    
    // Lookup school strictly in Firestore
    db.collection("schools").doc(codeInput).get()
    .then((doc) => {
        if (doc.exists) {
            const schoolData = doc.data();
            
            if(schoolData.isActive === false) {
                alert("This school's account is currently inactive. Please contact the Administrator.");
                return;
            }

            // Save basic UI routing data to localStorage
            localStorage.setItem('erp_school_code', codeInput); // Key to filter multi-tenant data
            localStorage.setItem('erp_school_name', schoolData.schoolName);
            localStorage.setItem('erp_school_logo', schoolData.logoUrl || "");
            
            showCredentialsStep(schoolData.schoolName, schoolData.logoUrl);
        } else {
            alert("Invalid School Code. No such school exists in our database.");
        }
    })
    .catch((error) => {
        alert("Database connection error while verifying school code.");
        console.error("Firestore Error:", error);
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
    localStorage.removeItem('erp_school_code');
    localStorage.removeItem('erp_school_name');
    localStorage.removeItem('erp_school_logo');
    
    document.getElementById('step-credentials').classList.remove('active');
    document.getElementById('step-school-code').classList.add('active');
});


// ============================================================================
// PHASE 2: CREDENTIAL VERIFICATION 
// ============================================================================

// 1. STAFF / ADMIN LOGIN (Firebase Auth)
document.getElementById('btnStaffLogin')?.addEventListener('click', function() {
    if(!localStorage.getItem('erp_school_code')) { 
        alert("School connection missing. Please go back and verify code."); 
        return; 
    }
    
    const email = document.getElementById('staffId').value.trim(); 
    const pass = document.getElementById('staffPass').value;
    if(!email || !pass) { alert("Please fill all fields."); return; }
    
    this.innerText = "Authenticating..."; 
    this.disabled = true;
    
    // Login securely via Firebase Auth
    auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        const uid = userCredential.user.uid;
        // Fetch specific user rights and profile from Firestore 'users' collection
        return db.collection("users").doc(uid).get();
    })
    .then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            
            // Optional Security: Verify if the staff member belongs to the active school code
            if(userData.schoolCode !== localStorage.getItem('erp_school_code') && userData.Is_SuperAdmin !== "Yes") {
                auth.signOut();
                alert("Access Denied: You do not belong to this school.");
                return;
            }

            localStorage.setItem('erp_active_user', JSON.stringify(userData)); 
            window.location.href = 'index.html'; 
        } else {
            auth.signOut();
            alert("User profile not found in database! Contact Administrator.");
        }
    })
    .catch((error) => {
        alert("Login Failed: " + error.message);
    })
    .finally(() => { 
        this.innerText = "Login Securely"; 
        this.disabled = false; 
    });
});

// 2. STUDENT LOGIN (Custom Firestore Query)
document.getElementById('btnStudentLogin')?.addEventListener('click', function() {
    const schoolCode = localStorage.getItem('erp_school_code');
    if(!schoolCode) { alert("School connection missing."); return; }

    const uid = document.getElementById('studentId').value.trim(); 
    const pass = document.getElementById('studentPass').value;
    
    let setupPanel = document.getElementById('setupCheckboxPanel');
    const setupBoxVisible = setupPanel && setupPanel.style.display !== 'none';
    
    let chkNewPass = document.getElementById('chkNewPassword');
    const wantsNewPass = chkNewPass && chkNewPass.checked;
    
    if(!uid || !pass) { alert("Enter User ID and PIN/Password"); return; }
    
    this.innerText = "Checking Credentials..."; 
    this.disabled = true;

    // Search for student in Firestore verifying both PortalID and SchoolCode
    db.collection("students")
      .where("portalId", "==", uid)
      .where("schoolCode", "==", schoolCode)
      .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            alert("Student ID not found for this school.");
            return;
        }

        let studentDoc = querySnapshot.docs[0];
        let studentData = studentDoc.data();

        // Verify password (or PIN if first time)
        if (studentData.password === pass || studentData.pin === pass) {
            
            if(setupBoxVisible && wantsNewPass) {
                // User wants to set a new custom password
                verifiedStudentId = studentDoc.id; 
                openPanel('setPassPanel');
            } else {
                // Direct Login
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // If they checked the box but didn't go to setup, or if they just logged in with PIN normally,
                // you might want to auto-upgrade their PIN to a Password if it doesn't exist yet, but for now we just log them in.
                localStorage.setItem('erp_active_student', JSON.stringify(studentData));
                window.location.href = 'student_dashboard.html'; 
            }
        } else {
            alert("Invalid Password or PIN.");
        }
    })
    .catch(err => { 
        console.error(err); 
        alert("Database connection error."); 
    })
    .finally(() => { 
        this.innerText = "Student Login"; 
        this.disabled = false; 
    });
});

// 3. SET NEW PASSWORD FOR STUDENT
document.getElementById('btnConfirmNewPass')?.addEventListener('click', function() {
    if(!verifiedStudentId) return;

    const p1 = document.getElementById('newPass1').value; 
    const p2 = document.getElementById('newPass2').value;
    if(!p1 || p1 !== p2) { alert("Passwords do not match."); return; }
    if(p1.length < 6) { alert("Password should be at least 6 characters."); return; }
    
    this.innerText = "Updating..."; 
    this.disabled = true;

    // Update the specific student's document in Firestore
    db.collection("students").doc(verifiedStudentId).update({
        password: p1
    })
    .then(() => {
        alert("Password updated! Please login with your new password.");
        closePanels();
        
        document.getElementById('studentPass').value = "";
        document.getElementById('newPass1').value = "";
        document.getElementById('newPass2').value = "";
        
        let chkNewPass = document.getElementById('chkNewPassword');
        if(chkNewPass) chkNewPass.checked = false;
        
        let setupPanel = document.getElementById('setupCheckboxPanel');
        if(setupPanel) setupPanel.style.display = 'none';
        
        window.history.replaceState({}, document.title, window.location.pathname);
        verifiedStudentId = ""; // Reset security variable
    })
    .catch(err => { 
        console.error(err); 
        alert("Update error. Check connection."); 
    })
    .finally(() => { 
        this.innerText = "Update & Login"; 
        this.disabled = false; 
    });
});


// ============================================================================
// PHASE 3: OTP RESET FLOW
// ============================================================================
document.getElementById('btnSendOtp')?.addEventListener('click', function() {
    const schoolCode = localStorage.getItem('erp_school_code');
    const uid = document.getElementById('forgotStudentId').value.trim();
    
    if(!schoolCode) { alert("School connection missing."); return; }
    if(!uid) { alert("Enter User ID"); return; }
    
    this.innerText = "Sending..."; 
    this.disabled = true;

    db.collection("students")
      .where("portalId", "==", uid)
      .where("schoolCode", "==", schoolCode)
      .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            throw new Error("User ID not found for this school.");
        }
        
        let studentDoc = querySnapshot.docs[0];
        // Generate a 6 digit OTP
        let otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        
        // Save OTP directly into the student's Firestore document
        return db.collection("students").doc(studentDoc.id).update({
            resetOtp: otp
        });
    })
    .then(() => {
        // Here, a Firebase Cloud Function or Extension (like 'Trigger Email') 
        // should detect this change and email the OTP to the student.
        document.getElementById('otpStep1').style.display = 'none';
        document.getElementById('otpStep2').style.display = 'block';
    })
    .catch(err => { 
        alert(err.message || "Connection error."); 
    })
    .finally(() => { 
        this.innerText = "Send OTP to Email"; 
        this.disabled = false; 
    });
});

document.getElementById('btnVerifyOtp')?.addEventListener('click', function() {
    const schoolCode = localStorage.getItem('erp_school_code');
    const uid = document.getElementById('forgotStudentId').value.trim();
    const otp = document.getElementById('resetOtp').value.trim();
    const newPass = document.getElementById('resetNewPass').value;
    
    if(!otp || !newPass) { alert("Fill all fields."); return; }
    if(newPass.length < 6) { alert("Password should be at least 6 characters."); return; }
    
    this.innerText = "Resetting..."; 
    this.disabled = true;

    db.collection("students")
      .where("portalId", "==", uid)
      .where("schoolCode", "==", schoolCode)
      .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) throw new Error("User ID not found");
        
        let studentDoc = querySnapshot.docs[0];
        let studentData = studentDoc.data();
        
        // Verify OTP strictly
        if(studentData.resetOtp && studentData.resetOtp === otp) {
            
            // Delete OTP and set new password
            return db.collection("students").doc(studentDoc.id).update({
                password: newPass,
                resetOtp: firebase.firestore.FieldValue.delete() // Cleanup
            });
        } else {
            throw new Error("Invalid or Expired OTP.");
        }
    })
    .then(() => {
        alert("Password reset successfully. You can now login.");
        closePanels();
        
        document.getElementById('otpStep1').style.display = 'block';
        document.getElementById('otpStep2').style.display = 'none';
        
        // Clear fields
        document.getElementById('forgotStudentId').value = "";
        document.getElementById('resetOtp').value = "";
        document.getElementById('resetNewPass').value = "";
    })
    .catch(err => { 
        alert(err.message || "Reset failed."); 
    })
    .finally(() => { 
        this.innerText = "Reset Password"; 
        this.disabled = false; 
    });
});
