document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault(); 

        // 1. Collect Data
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Reset error state
        hideError();

        // 2. Client Side Validations
        if (!username || !email || !password || !confirmPassword) {
            showError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }

        // 3. Interact with "Database" (LocalStorage)
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // 4. Check for uniqueness
        const userExists = users.some(user => user.username === username || user.email === email);

        if (userExists) {
            showError('Username or Email already exists.');
            return;
        }

        // 5. Create new user object
        const newUser = {
            id: Date.now(),
            username: username,
            email: email,
            password: password, 
            isAdmin: false
        };

        // 6. Save to LocalStorage
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // 7. Success
        alert('Registration successful! Redirecting to login...');
        window.location.href = 'login.html';
    });

    // Helper: Show Error (Bootstrap style)
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none'); // Remove hidden class to show
    }

    // Helper: Hide Error
    function hideError() {
        errorMessage.classList.add('d-none'); // Add hidden class to hide
        errorMessage.textContent = '';
    }
});