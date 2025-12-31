document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth & Data Structure Check
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'login.html'; return; }
    
    // Ensure playlists is an ARRAY to match search.js structure
    if (!currentUser.playlists || !Array.isArray(currentUser.playlists)) {
        currentUser.playlists = []; 
    }

    // 2. DOM Elements
    const playlistListEl = document.getElementById('playlistList');
    const videoContainer = document.getElementById('videoContainer');
    const currentTitle = document.getElementById('currentTitle');
    const header = document.getElementById('playlistHeader');
    const emptyState = document.getElementById('emptyState');
    const filterInput = document.getElementById('filterInput');
    const userGreeting = document.getElementById('userGreeting');
    
    // State
    let activePlaylistIndex = -1; // We use Index for arrays
    let currentVideos = [];

    // Init
    if(userGreeting) userGreeting.textContent = `Hello, ${currentUser.username}`;
    renderSidebar();

    // Check URL Params for deep linking (?playlist=Name)
    const urlParams = new URLSearchParams(window.location.search);
    const qName = urlParams.get('playlist');
    if (qName) {
        const idx = currentUser.playlists.findIndex(p => p.name === qName);
        if (idx !== -1) loadPlaylist(idx);
    }

    // 3. Event Listeners
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Create New Playlist
    document.getElementById('createBtn').addEventListener('click', () => {
        const nameInput = document.getElementById('newListName');
        const name = nameInput.value.trim();
        
        if (!name) return alert("Please enter a name");
        if (currentUser.playlists.some(p => p.name === name)) return alert("Playlist already exists");

        // Push to ARRAY
        currentUser.playlists.push({
            name: name,
            createdAt: new Date().toISOString(),
            videos: []
        });

        updateStorage();
        renderSidebar();
        loadPlaylist(currentUser.playlists.length - 1); // Load the new one
        
        // Close Modal
        nameInput.value = '';
        bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
    });

    // Filter
    filterInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderVideos(currentVideos.filter(v => v.title.toLowerCase().includes(term)));
    });

    // Sorting
    document.querySelectorAll('input[name="sort"]').forEach(r => r.addEventListener('change', applySort));
    
    // Modal Cleanup
    document.getElementById('videoModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('videoFrame').src = '';
    });

    // 4. Core Functions

    function renderSidebar() {
        playlistListEl.innerHTML = '';
        if (currentUser.playlists.length === 0) {
            playlistListEl.innerHTML = '<div class="text-muted small text-center p-2">No playlists yet</div>';
            return;
        }

        currentUser.playlists.forEach((pl, index) => {
            const div = document.createElement('button');
            div.className = `btn btn-outline-secondary w-100 text-start mb-1 ${index === activePlaylistIndex ? 'active' : ''}`;
            div.textContent = pl.name;
            div.onclick = () => loadPlaylist(index);
            playlistListEl.appendChild(div);
        });
    }

    function loadPlaylist(index) {
        activePlaylistIndex = index;
        const playlist = currentUser.playlists[index];

        if (!playlist) return;

        // UI Updates
        header.classList.remove('d-none');
        emptyState.classList.add('d-none');
        currentTitle.textContent = playlist.name;
        document.getElementById('videoCount').textContent = `${playlist.videos.length} videos`;
        
        // Update URL without reload
        const newUrl = `${window.location.pathname}?playlist=${encodeURIComponent(playlist.name)}`;
        history.pushState({path: newUrl}, '', newUrl);
        
        // Update Sidebar active state
        renderSidebar();

        // Set Data & Sort
        currentVideos = playlist.videos;
        applySort();
    }

    function applySort() {
        if (activePlaylistIndex === -1) return;
        
        let sorted = [...currentVideos]; // Copy array
        if (document.getElementById('sortName').checked) {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            // Sort by Rating (High to Low)
            sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        renderVideos(sorted);
    }

    function renderVideos(videos) {
        videoContainer.innerHTML = '';
        if (!videos || !videos.length) {
            videoContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted">No videos found in this playlist.</div>';
            return;
        }

        videos.forEach(v => {
            // Find actual index in the original array (needed for deletion/rating)
            const realIndex = currentUser.playlists[activePlaylistIndex].videos.findIndex(item => item.id === v.id);

            let stars = '';
            for (let i = 1; i <= 5; i++) {
                const cls = i <= (v.rating || 0) ? 'text-warning' : 'text-secondary';
                // Note: passing realIndex to rateVideo
                stars += `<i class="bi bi-star-fill ${cls}" style="cursor:pointer" onclick="window.rateVideo(${realIndex}, ${i})"></i> `;
            }

            const div = document.createElement('div');
            div.className = 'col';
            div.innerHTML = `
                <div class="card h-100 shadow-sm video-card-hover">
                    <div onclick="window.openVideo('${v.id}')" style="cursor:pointer; position: relative;">
                        <img src="${v.thumbnail}" class="card-img-top" style="height: 180px; object-fit: cover;">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="bi bi-play-circle-fill text-white fs-1 opacity-75"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title text-truncate" title="${v.title}">${v.title}</h6>
                        <div class="mb-2 fs-5">${stars}</div>
                        <button class="btn btn-outline-danger btn-sm w-100" onclick="window.deleteVideo(${realIndex})">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>`;
            videoContainer.appendChild(div);
        });
    }

    function updateStorage() {
        // Update Session
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update LocalStorage (Permanent)
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const idx = users.findIndex(u => u.username === currentUser.username);
        if (idx !== -1) {
            users[idx] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // 5. Global Window Functions (for HTML onclicks)

    window.rateVideo = (videoIndex, rating) => {
        // Direct access via Index
        currentUser.playlists[activePlaylistIndex].videos[videoIndex].rating = rating;
        updateStorage();
        applySort(); // Re-render to show new stars
    };

    window.deleteVideo = (videoIndex) => {
        if (!confirm("Remove this video?")) return;
        
        currentUser.playlists[activePlaylistIndex].videos.splice(videoIndex, 1);
        
        updateStorage();
        loadPlaylist(activePlaylistIndex); // Refresh UI
    };

    window.deletePlaylist = () => {
        if (!confirm("Delete this entire playlist?")) return;
        
        currentUser.playlists.splice(activePlaylistIndex, 1);
        updateStorage();
        
        // Reset State
        activePlaylistIndex = -1;
        header.classList.add('d-none');
        emptyState.classList.remove('d-none');
        videoContainer.innerHTML = '';
        renderSidebar();
        
        // Optional: Load first playlist if exists
        if(currentUser.playlists.length > 0) loadPlaylist(0);
    };

    window.playAll = () => {
        if (currentVideos.length) window.openVideo(currentVideos[0].id);
        else alert("Playlist is empty");
    };

    window.openVideo = (id) => {
        document.getElementById('videoFrame').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
        new bootstrap.Modal(document.getElementById('videoModal')).show();
    };
});