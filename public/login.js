document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        errorMessage.classList.add('d-none');

        try {
            // Check credentials against Server
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save to Session Storage (Client State)
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'search.html';
            } else {
                showError(data.message || 'Invalid username or password');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Server error. Please try again later.');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }
});