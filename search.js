document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Auth Guard (Session Check) ---
    // Read from sessionStorage (Temporary session)
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    // If no session, redirect to login
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Ensure playlist structure exists for the user
    if (!currentUser.playlists) {
        currentUser.playlists = {};
        updateUserStorage(currentUser);
    }

    // --- 2. Variables & Elements ---
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const videoContainer = document.getElementById('videoContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Modals & Toast
    const videoModal = new bootstrap.Modal(document.getElementById('videoModal'));
    const videoFrame = document.getElementById('videoFrame');
    const videoModalLabel = document.getElementById('videoModalLabel');

    const playlistModal = new bootstrap.Modal(document.getElementById('playlistModal'));
    const existingPlaylistSelect = document.getElementById('existingPlaylistSelect');
    const newPlaylistNameInput = document.getElementById('newPlaylistName');
    const saveToPlaylistBtn = document.getElementById('saveToPlaylistBtn');

    const toastElement = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastBody');
    const toast = new bootstrap.Toast(toastElement);

    // Temp variable to hold video data while modal is open
    let currentVideoToAdd = null;

    // --- 3. UI Initialization ---
    
    // Display "Hello [Name]" + Avatar
    userGreeting.innerHTML = `
        <img src="https://ui-avatars.com/api/?name=${currentUser.username}&background=random&color=fff" 
             class="rounded-circle me-2 border border-white" width="32" height="32" alt="Avatar">
        <span>Hello, <strong>${currentUser.username}</strong></span>
    `;

    // ** Sync Search with QueryString **
    // If page loads with ?q=Something, perform search automatically
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    
    if (initialQuery) {
        searchInput.value = initialQuery;
        performSearch(initialQuery);
    }

    // --- 4. Event Listeners ---

    // Logout
    logoutBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem('currentUser'); // Clear session
            window.location.href = 'login.html';
        }
    });

    // Search Actions
    searchBtn.addEventListener('click', handleSearchSubmit);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchSubmit();
    });

    // Stop video when modal closes
    document.getElementById('videoModal').addEventListener('hidden.bs.modal', () => {
        videoFrame.src = '';
    });

    // ** Save to Playlist Logic **
    saveToPlaylistBtn.addEventListener('click', () => {
        const selectedList = existingPlaylistSelect.value;
        const newList = newPlaylistNameInput.value.trim();
        
        // Priority: New list name > Selected list
        let targetPlaylistName = newList || selectedList;

        if (!targetPlaylistName) {
            alert("Please select or create a playlist.");
            return;
        }

        addVideoToPlaylist(targetPlaylistName, currentVideoToAdd);
        playlistModal.hide();
        
        // Reset form
        existingPlaylistSelect.value = "";
        newPlaylistNameInput.value = "";
    });

    // --- 5. Main Logic Functions ---

    function handleSearchSubmit() {
        const query = searchInput.value.trim();
        if (!query) return;

        // ** Update QueryString without reloading **
        const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
        history.pushState({ path: newUrl }, '', newUrl);

        performSearch(query);
    }

    async function performSearch(query) {
        loadingSpinner.classList.remove('d-none');
        videoContainer.innerHTML = '';

        try {
            // Fetch from our Node.js Proxy
            const response = await fetch(`http://localhost:3000/api/search?q=${query}`);
            if (!response.ok) throw new Error('Network error');

            const data = await response.json();
            renderVideos(data.items);

        } catch (error) {
            console.error('Error:', error);
            videoContainer.innerHTML = `<div class="col-12 text-center text-danger mt-4">Failed to load videos.</div>`;
        } finally {
            loadingSpinner.classList.add('d-none');
        }
    }

    function renderVideos(videos) {
        if (!videos || videos.length === 0) {
            videoContainer.innerHTML = `<div class="col-12 text-center text-muted">No results found.</div>`;
            return;
        }

        // Get list of ALL video IDs the user has saved (to check for duplicates)
        const allSavedVideoIds = getAllSavedVideoIds();

        videoContainer.innerHTML = videos.map(video => {
            const videoId = video.id; 
            const title = video.snippet.title;
            const thumbnail = video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url;
            const viewCount = video.statistics?.viewCount || 0;
            const durationISO = video.contentDetails?.duration || '';
            
            const formattedViews = formatViews(viewCount);
            const formattedDuration = formatDuration(durationISO);
            // Escape special chars for HTML attributes
            const safeTitle = title.replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            // ** Visual Feedback Logic **
            // Check if this specific video is already in favorites
            const isFavorite = allSavedVideoIds.includes(videoId);
            
            let actionButton;
            
            if (isFavorite) {
                // Option A: Already Saved (Grey Button with Checkmark)
                actionButton = `
                    <button class="btn btn-saved btn-sm w-100 mt-auto" disabled>
                        <i class="bi bi-check-lg"></i> Saved
                    </button>`;
            } else {
                // Option B: Not Saved (Red "Add" Button)
                // We pass the video data as a string to the openPlaylistModal function
                const videoDataString = encodeURIComponent(JSON.stringify({
                    id: videoId,
                    title: safeTitle,
                    thumbnail: thumbnail,
                    views: formattedViews,
                    duration: formattedDuration
                }));

                actionButton = `
                    <button class="btn btn-outline-danger btn-sm w-100 mt-auto" 
                            onclick="openPlaylistModal('${videoDataString}')">
                        <i class="bi bi-heart"></i> Add to Favorites
                    </button>`;
            }

            return `
                <div class="col">
                    <div class="card h-100 video-card border-0 shadow-sm">
                        <div class="position-relative" onclick="openVideo('${videoId}', '${safeTitle}')">
                            <img src="${thumbnail}" class="card-img-top" alt="${safeTitle}">
                            <span class="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 m-2 rounded fs-6" style="font-size: 0.8rem; opacity: 0.9;">
                                ${formattedDuration}
                            </span>
                            <div class="position-absolute top-50 start-50 translate-middle text-white" style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%;">
                                <i class="bi bi-play-fill h3 m-0"></i>
                            </div>
                        </div>

                        <div class="card-body d-flex flex-column">
                            <h6 class="card-title card-title-clamp mb-2" title="${safeTitle}">
                                ${title}
                            </h6>
                            
                            <div class="small text-muted mb-3 d-flex justify-content-between">
                                <span><i class="bi bi-eye-fill"></i> ${formattedViews} views</span>
                                <span><i class="bi bi-clock"></i> ${formattedDuration}</span>
                            </div>
                            
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- 6. Helper Functions ---

    function updateUserStorage(updatedUser) {
        // 1. Update Session (Immediate UI)
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // 2. Update LocalStorage (Permanent DB)
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.username === updatedUser.username);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // Flattens all playlists to find if video ID exists anywhere
    function getAllSavedVideoIds() {
        let ids = [];
        if (currentUser.playlists) {
            Object.values(currentUser.playlists).forEach(list => {
                list.forEach(video => ids.push(video.id));
            });
        }
        return ids;
    }

    function addVideoToPlaylist(playlistName, videoData) {
        if (!currentUser.playlists[playlistName]) {
            currentUser.playlists[playlistName] = [];
        }

        // Double check specifically for this list
        const exists = currentUser.playlists[playlistName].some(v => v.id === videoData.id);
        if (exists) {
            alert("Video is already in this playlist!");
            return;
        }

        // Add to array
        currentUser.playlists[playlistName].push(videoData);
        
        // Save to Storage
        updateUserStorage(currentUser);

        // ** Requirement: Toast with Link **
        // Update Toast Content
        toastBody.innerHTML = `
            Video saved to <strong>${playlistName}</strong>.<br>
            <a href="playlist.html" class="text-success fw-bold text-decoration-underline">Go to My Playlists</a>
        `;
        toast.show();

        // Re-render videos to update the specific button to "Saved" (Gray checkmark)
        const currentSearchTerm = searchInput.value;
        if(currentSearchTerm) performSearch(currentSearchTerm);
    }

    // Populate dropdown with existing playlist names
    function updatePlaylistDropdown() {
        existingPlaylistSelect.innerHTML = '<option value="" selected>-- Choose a playlist --</option>';
        if (currentUser.playlists) {
            Object.keys(currentUser.playlists).forEach(listName => {
                const option = document.createElement('option');
                option.value = listName;
                option.textContent = listName;
                existingPlaylistSelect.appendChild(option);
            });
        }
    }

    // Formatter Utilities
    function formatDuration(isoDuration) {
        if (!isoDuration) return "00:00";
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        let result = "";
        if (hours > 0) result += hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":";
        else result += minutes + ":";
        result += (seconds < 10 ? "0" : "") + seconds;
        return result;
    }

    function formatViews(views) {
        return Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(views);
    }

    // --- Global Functions (exposed for HTML onclick) ---
    
    window.openVideo = (videoId, title) => {
        videoModalLabel.textContent = title;
        videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoModal.show();
    };

    window.openPlaylistModal = (videoDataString) => {
        currentVideoToAdd = JSON.parse(decodeURIComponent(videoDataString));
        updatePlaylistDropdown(); // Refresh list before showing
        playlistModal.show();
    };
});