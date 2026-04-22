document.addEventListener('DOMContentLoaded', () => {
    // API URL - KEEP DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    const loginForm = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btnLogin');
    const errorBox = document.getElementById('errorBox');

    // On Load, check if already logged in. If yes, auto redirect to dashboard.
    if (localStorage.getItem('erp_active_user')) {
        window.location.href = 'index.html';
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value.trim();

        if(!userId || !password) return;

        errorBox.style.display = 'none';
        let originalText = btnLogin.innerText;
        btnLogin.innerText = 'Authenticating...';
        btnLogin.disabled = true;

        const payload = {
            action: "login",
            userId: userId,
            password: password
        };

        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                // Save User Info & Rights locally in browser
                localStorage.setItem('erp_active_user', JSON.stringify(data.user));
                
                // Redirect to Main App Dashboard
                window.location.href = 'index.html';
            } else {
                errorBox.innerText = data.message;
                errorBox.style.display = 'block';
                btnLogin.innerText = originalText;
                btnLogin.disabled = false;
            }
        })
        .catch(err => {
            errorBox.innerText = "Connection Error. Try Again.";
            errorBox.style.display = 'block';
            btnLogin.innerText = originalText;
            btnLogin.disabled = false;
        });
    });
});