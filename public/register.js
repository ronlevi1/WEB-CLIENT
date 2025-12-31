document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Reset error state
        errorMessage.classList.add('d-none');

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            return showError('Please fill in all fields.');
        }
        if (password !== confirmPassword) {
            return showError('Passwords do not match.');
        }

        const newUser = { username, email, password };

        try {
            // Send request to Server
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            const data = await response.json();

            if (data.success) {
                alert('Registration successful! Redirecting to login...');
                window.location.href = 'login.html';
            } else {
                showError(data.message || 'Registration failed');
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