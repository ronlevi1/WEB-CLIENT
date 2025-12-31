document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if user is already logged in
    // If yes, redirect to search page immediately
    if (sessionStorage.getItem('currentUser')) {
        window.location.href = 'search.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Reset error message
        errorMessage.classList.add('d-none');

        if (!username || !password) {
            showError('Please enter both username and password.');
            return;
        }

        // 2. Fetch Users from "Database" (localStorage)
        // localStorage holds the permanent user data (including playlists)
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // 3. Authenticate User
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            // 4. Login Success -> Save to SESSION storage (Temporary)
            // This data will be cleared when the browser is closed
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // 5. Redirect to Search Page
            window.location.href = 'search.html';
        } else {
            showError('Invalid username or password.');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }
});