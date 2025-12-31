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
    const mp3Input = document.getElementById('mp3Input'); // הכפתור החדש
    
    // Modal Elements
    const videoModalEl = document.getElementById('videoModal');
    const videoModal = new bootstrap.Modal(videoModalEl);
    const videoFrame = document.getElementById('videoFrame');
    const videoModalLabel = document.getElementById('videoModalLabel');

    // Playlist Modal Elements
    const playlistModalEl = document.getElementById('playlistModal');
    const existingPlaylistSelect = document.getElementById('existingPlaylistSelect');
    const newPlaylistNameInput = document.getElementById('newPlaylistName');
    const saveToPlaylistBtn = document.getElementById('saveToPlaylistBtn');
    
    // Toast Elements
    const liveToast = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastBody');
    const toast = new bootstrap.Toast(liveToast);

    // --- State Management ---
    let currentUser = null;
    let currentSelectedVideo = null; 

    // --- Initialization ---
    function init() {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (!sessionUser) { window.location.href = 'login.html'; return; }
        currentUser = JSON.parse(sessionUser);

        if(userGreeting) userGreeting.textContent = `Hello, ${currentUser.username}`;

        if (!currentUser.playlists || !Array.isArray(currentUser.playlists)) {
            currentUser.playlists = [];
            updateUserStorage(currentUser);
        }
    }
    init();

    // --- Event Listeners ---

    // Logout
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // Search
    if(searchBtn) searchBtn.addEventListener('click', performSearch);
    if(searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    // --- לוגיקה חדשה: העלאת MP3 ---
    if (mp3Input) {
        mp3Input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // בדיקת גודל (LocalStorage מוגבל)
            if (file.size > 4500000) { // בערך 4.5MB
                alert("File is too large for browser storage. Please use small files for testing (< 4.5MB).");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Data = event.target.result;
                
                // יצירת אובייקט שיר שמתחזה לוידאו של יוטיוב
                const mp3Song = {
                    id: 'local_' + Date.now(),
                    title: file.name.replace('.mp3', ''),
                    thumbnail: 'https://cdn-icons-png.flaticon.com/512/461/461238.png', // תמונה גנרית
                    channel: 'Uploaded File',
                    publishedAt: new Date().toISOString(),
                    type: 'mp3', // סימון שזה MP3
                    url: base64Data, // הקובץ עצמו
                    rating: 0
                };

                // פתיחה ישירה של המודל להוספה לפלייליסט
                openAddToPlaylistModal(mp3Song);
            };
            
            reader.readAsDataURL(file); // קריאת הקובץ
            e.target.value = ''; // איפוס
        });
    }

    // Modal Cleanup
    if(videoModalEl) {
        videoModalEl.addEventListener('hidden.bs.modal', () => {
            videoFrame.src = '';
        });
    }

    // Save to Playlist
    if(saveToPlaylistBtn) saveToPlaylistBtn.addEventListener('click', handleSaveToPlaylist);


    // --- Core Functions ---

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading(true);
        videoContainer.innerHTML = ''; 

        try {
            if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE' || YOUTUBE_API_KEY === '') {
                throw new Error('Missing YouTube API Key.');
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`);
            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);

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
            
            const col = document.createElement('div');
            col.className = 'col';
            
            col.innerHTML = `
                <div class="card h-100 shadow-sm video-card-hover">
                    <div onclick="window.openVideo('${videoId}', '${escapeHtml(snippet.title)}')" style="cursor:pointer; position: relative;">
                        <img src="${snippet.thumbnails.high.url}" class="card-img-top" alt="${snippet.title}" style="height: 180px; object-fit: cover;">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="bi bi-play-circle-fill text-white fs-1 opacity-75"></i>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate" title="${snippet.title}">${snippet.title}</h6>
                        <p class="card-text text-muted small mb-3">${snippet.channelTitle}</p>
                        <button class="btn btn-outline-primary btn-sm mt-auto w-100 add-playlist-btn">
                            <i class="bi bi-plus-lg"></i> Add to Playlist
                        </button>
                    </div>
                </div>
            `;

            const addBtn = col.querySelector('.add-playlist-btn');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openAddToPlaylistModal({
                    id: videoId,
                    title: snippet.title,
                    thumbnail: snippet.thumbnails.high.url,
                    channel: snippet.channelTitle,
                    publishedAt: snippet.publishedAt,
                    rating: 0,
                    type: 'youtube' // ברירת מחדל
                });
            });

            videoContainer.appendChild(col);
        });
    }

    // --- Modal Logic ---

    window.openVideo = function(videoId, title) {
        if(videoModalLabel) videoModalLabel.textContent = title;
        if(videoFrame) videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoModal.show();
    };

    function openAddToPlaylistModal(videoObj) {
        currentSelectedVideo = videoObj;
        
        newPlaylistNameInput.value = '';
        existingPlaylistSelect.innerHTML = '<option value="" selected>-- Choose a playlist --</option>';

        if (currentUser.playlists && Array.isArray(currentUser.playlists)) {
            currentUser.playlists.forEach(pl => {
                const option = document.createElement('option');
                option.value = pl.name;
                option.textContent = `${pl.name} (${pl.videos.length} videos)`;
                existingPlaylistSelect.appendChild(option);
            });
        }

        const modalInstance = bootstrap.Modal.getOrCreateInstance(playlistModalEl);
        modalInstance.show();
    }

    function handleSaveToPlaylist() {
        const selectedExisting = existingPlaylistSelect.value;
        const newPlaylistName = newPlaylistNameInput.value.trim();

        if (!selectedExisting && !newPlaylistName) {
            alert('Please select an existing playlist or enter a name for a new one.');
            return;
        }

        let userPlaylists = currentUser.playlists;
        let targetPlaylistName = '';

        if (newPlaylistName) {
            if (userPlaylists.some(p => p.name.toLowerCase() === newPlaylistName.toLowerCase())) {
                alert('A playlist with this name already exists.');
                return;
            }
            userPlaylists.push({
                name: newPlaylistName,
                createdAt: new Date().toISOString(),
                videos: [currentSelectedVideo]
            });
            targetPlaylistName = newPlaylistName;
        } else {
            const playlist = userPlaylists.find(p => p.name === selectedExisting);
            if (playlist) {
                if (playlist.videos.some(v => v.id === currentSelectedVideo.id)) {
                    alert('This video is already in the selected playlist.');
                    return;
                }
                playlist.videos.push(currentSelectedVideo);
                targetPlaylistName = selectedExisting;
            }
        }

        currentUser.playlists = userPlaylists;
        updateUserStorage(currentUser);

        const modalInstance = bootstrap.Modal.getOrCreateInstance(playlistModalEl);
        modalInstance.hide();

        showToast(`Added to "${targetPlaylistName}" successfully!`);
    }

    // --- Helpers ---

    function showLoading(isLoading) {
        if(!loadingSpinner) return;
        if (isLoading) loadingSpinner.classList.remove('d-none');
        else loadingSpinner.classList.add('d-none');
    }

    function showToast(message) {
        if(toastBody) toastBody.textContent = message;
        toast.show();
    }

    function updateUserStorage(userObj) {
        sessionStorage.setItem('currentUser', JSON.stringify(userObj));
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const idx = users.findIndex(u => u.username === userObj.username);
        if (idx !== -1) {
            users[idx] = userObj;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    function escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});