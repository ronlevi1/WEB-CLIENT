document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const YOUTUBE_API_KEY = 'AIzaSyBTxP58Z4Ahou8WIW1AWI7AVEKBRZj0xkw'; 
    
    // --- DOM Elements ---
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const videoContainer = document.getElementById('videoContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Video Modal Elements
    const videoModalEl = document.getElementById('videoModal');
    const videoModal = new bootstrap.Modal(videoModalEl);
    const videoFrame = document.getElementById('videoFrame');
    const videoModalLabel = document.getElementById('videoModalLabel');

    // Playlist Modal Elements
    const playlistModalEl = document.getElementById('playlistModal');
    const playlistModal = new bootstrap.Modal(playlistModalEl);
    const existingPlaylistSelect = document.getElementById('existingPlaylistSelect');
    const newPlaylistNameInput = document.getElementById('newPlaylistName');
    const saveToPlaylistBtn = document.getElementById('saveToPlaylistBtn');
    
    // Toast Elements
    const liveToast = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastBody');
    const toast = new bootstrap.Toast(liveToast);

    // --- State Management ---
    let currentUser = null;
    let currentSelectedVideo = null; // Stores the video user wants to add to playlist

    // --- Initialization ---
    function init() {
        // 1. Check Auth
        const sessionUser = sessionStorage.getItem('currentUser');
        if (!sessionUser) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = JSON.parse(sessionUser);

        // 2. Update UI
        userGreeting.textContent = `Hello, ${currentUser.username}`;

        // 3. Initialize User Data Structure if needed (First time setup for playlists)
        if (!currentUser.playlists) {
            currentUser.playlists = [];
            updateUserStorage(currentUser);
        }
    }

    init();

    // --- Event Listeners ---

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Search
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Handle Video Modal Close (Stop video audio)
    videoModalEl.addEventListener('hidden.bs.modal', () => {
        videoFrame.src = '';
    });

    // Save to Playlist
    saveToPlaylistBtn.addEventListener('click', handleSaveToPlaylist);


    // --- Core Functions ---

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading(true);
        videoContainer.innerHTML = ''; // Clear previous results

        try {
            // בדיקה אם המשתמש שכח לשים מפתח API
            if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE' || YOUTUBE_API_KEY === '') {
                throw new Error('Missing YouTube API Key. Please update the code with a valid key.');
            }

            // קריאה ל-YouTube API
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            renderVideos(data.items);

        } catch (error) {
            console.error('Search error:', error);
            videoContainer.innerHTML = `<div class="alert alert-danger w-100">Error: ${error.message}</div>`;
        } finally {
            showLoading(false);
        }
    }

    function renderVideos(videos) {
        if (!videos || videos.length === 0) {
            videoContainer.innerHTML = '<div class="col-12 text-center text-muted">No results found.</div>';
            return;
        }

        videos.forEach(item => {
            const videoId = item.id.videoId;
            const snippet = item.snippet;
            
            // Create Card HTML
            const col = document.createElement('div');
            col.className = 'col';
            
            col.innerHTML = `
                <div class="card h-100 video-card shadow-sm">
                    <div class="position-relative" onclick="openVideo('${videoId}', '${escapeHtml(snippet.title)}')">
                        <img src="${snippet.thumbnails.high.url}" class="card-img-top" alt="${snippet.title}">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="bi bi-play-circle-fill text-white" style="font-size: 3rem; opacity: 0.8;"></i>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title card-title-clamp" title="${snippet.title}">${snippet.title}</h6>
                        <p class="card-text text-muted small mb-3">${snippet.channelTitle}</p>
                        
                        <button class="btn btn-outline-primary btn-sm mt-auto w-100 add-playlist-btn">
                            <i class="bi bi-plus-lg"></i> Add to Playlist
                        </button>
                    </div>
                </div>
            `;

            // Add Event Listener specifically for the "Add to Playlist" button
            const addBtn = col.querySelector('.add-playlist-btn');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening the video modal
                openAddToPlaylistModal({
                    id: videoId,
                    title: snippet.title,
                    thumbnail: snippet.thumbnails.high.url,
                    channel: snippet.channelTitle,
                    publishedAt: snippet.publishedAt
                });
            });

            videoContainer.appendChild(col);
        });
    }

    // --- Modal Logic ---

    // 1. Play Video
    window.openVideo = function(videoId, title) {
        videoModalLabel.textContent = title;
        // Autoplay enabled
        videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoModal.show();
    };

    // 2. Open Playlist Modal
    function openAddToPlaylistModal(videoObj) {
        currentSelectedVideo = videoObj;
        
        // Reset Form
        newPlaylistNameInput.value = '';
        existingPlaylistSelect.innerHTML = '<option value="" selected>-- Choose a playlist --</option>';

        // Populate Existing Playlists (Sync from currentUser)
        if (currentUser.playlists && currentUser.playlists.length > 0) {
            currentUser.playlists.forEach(pl => {
                const option = document.createElement('option');
                option.value = pl.name;
                option.textContent = `${pl.name} (${pl.videos.length} videos)`;
                existingPlaylistSelect.appendChild(option);
            });
        }

        playlistModal.show();
    }

    // 3. Save Logic
    function handleSaveToPlaylist() {
        const selectedExisting = existingPlaylistSelect.value;
        const newPlaylistName = newPlaylistNameInput.value.trim();

        if (!selectedExisting && !newPlaylistName) {
            alert('Please select an existing playlist or enter a name for a new one.');
            return;
        }

        // Fetch fresh data from localStorage to avoid conflicts
        const allUsers = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        
        if (userIndex === -1) {
            alert('User not found. Please login again.');
            return;
        }

        let userPlaylists = allUsers[userIndex].playlists || [];
        let targetPlaylistName = '';

        if (newPlaylistName) {
            // Check if already exists
            if (userPlaylists.some(p => p.name.toLowerCase() === newPlaylistName.toLowerCase())) {
                alert('A playlist with this name already exists.');
                return;
            }
            // Create New
            userPlaylists.push({
                name: newPlaylistName,
                createdAt: new Date().toISOString(),
                videos: [currentSelectedVideo]
            });
            targetPlaylistName = newPlaylistName;
        } else {
            // Add to Existing
            const playlist = userPlaylists.find(p => p.name === selectedExisting);
            // Check if video already in playlist
            if (playlist.videos.some(v => v.id === currentSelectedVideo.id)) {
                alert('This video is already in the selected playlist.');
                return;
            }
            playlist.videos.push(currentSelectedVideo);
            targetPlaylistName = selectedExisting;
        }

        // UPDATE STORAGE (Both Local and Session)
        allUsers[userIndex].playlists = userPlaylists;
        localStorage.setItem('users', JSON.stringify(allUsers));
        
        // Update Session User
        currentUser.playlists = userPlaylists;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // UI Feedback
        playlistModal.hide();
        showToast(`Added to "${targetPlaylistName}" successfully!`);
    }

    // --- Helpers ---

    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }

    function showToast(message) {
        toastBody.textContent = message;
        toast.show();
    }

    function updateUserStorage(userObj) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const idx = users.findIndex(u => u.id === userObj.id);
        if (idx !== -1) {
            users[idx] = userObj;
            localStorage.setItem('users', JSON.stringify(users));
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
        }
    }

    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});