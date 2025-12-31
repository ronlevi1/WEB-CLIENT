document.addEventListener('DOMContentLoaded', () => {
    // 1. הגדרות ומשתנים
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'login.html'; return; }
    
    if (!currentUser.playlists || !Array.isArray(currentUser.playlists)) {
        currentUser.playlists = []; 
    }

    // אלמנטים
    const playlistListEl = document.getElementById('playlistList');
    const videoContainer = document.getElementById('videoContainer');
    const currentTitle = document.getElementById('currentTitle');
    const header = document.getElementById('playlistHeader');
    const emptyState = document.getElementById('emptyState');
    const filterInput = document.getElementById('filterInput');
    const userGreeting = document.getElementById('userGreeting');
    
    // ניהול מצב
    let activePlaylistIndex = -1; 
    let currentVideos = [];

    // אתחול
    if(userGreeting) userGreeting.textContent = `Hello, ${currentUser.username}`;
    renderSidebar();

    const urlParams = new URLSearchParams(window.location.search);
    const qName = urlParams.get('playlist');
    if (qName) {
        const idx = currentUser.playlists.findIndex(p => p.name === qName);
        if (idx !== -1) loadPlaylist(idx);
    }

    // --- 2. Event Listeners ---

    // התנתקות
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
    
    // יצירת פלייליסט
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('newListName');
            const name = nameInput.value.trim();
            if (!name) return alert("Enter name");
            if (currentUser.playlists.some(p => p.name === name)) return alert("Exists");

            currentUser.playlists.push({ name: name, videos: [] });
            updateStorage();
            renderSidebar();
            loadPlaylist(currentUser.playlists.length - 1);
            
            nameInput.value = '';
            bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
        });
    }

    // סינון
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderVideos(currentVideos.filter(v => v.title.toLowerCase().includes(term)));
        });
    }

    // מיון
    document.querySelectorAll('input[name="sort"]').forEach(r => r.addEventListener('change', applySort));
    
    // ניקוי מודל (חשוב מאוד - עוצר את המוזיקה כשסוגרים)
    const videoModalEl = document.getElementById('videoModal');
    if (videoModalEl) {
        videoModalEl.addEventListener('hidden.bs.modal', () => {
            const frame = document.getElementById('videoFrame');
            const audio = document.getElementById('audioPlayer');
            
            // איפוס יוטיוב
            if(frame) frame.src = '';
            
            // איפוס MP3 (חובה כדי שהשיר לא ימשיך להתנגן ברקע)
            if(audio) { 
                audio.pause(); 
                audio.src = ''; 
            }
        });
    }

    // --- 3. Core Functions ---

    function renderSidebar() {
        if (!playlistListEl) return;
        playlistListEl.innerHTML = '';
        if (currentUser.playlists.length === 0) {
            playlistListEl.innerHTML = '<div class="text-muted small text-center p-2">No playlists yet</div>';
            return;
        }

        currentUser.playlists.forEach((pl, index) => {
            const btn = document.createElement('button');
            btn.className = `btn btn-outline-secondary w-100 text-start mb-1 sidebar-item ${index === activePlaylistIndex ? 'selected' : ''}`;
            btn.textContent = pl.name;
            btn.onclick = () => loadPlaylist(index);
            playlistListEl.appendChild(btn);
        });
    }

    function loadPlaylist(index) {
        activePlaylistIndex = index;
        const playlist = currentUser.playlists[index];
        if (!playlist) return;

        if(header) header.classList.remove('d-none');
        if(emptyState) emptyState.classList.add('d-none');
        if(currentTitle) currentTitle.textContent = playlist.name;
        
        const countEl = document.getElementById('videoCount');
        if(countEl) countEl.textContent = `${playlist.videos.length} videos`;
        
        // Update URL
        const newUrl = `${window.location.pathname}?playlist=${encodeURIComponent(playlist.name)}`;
        history.pushState({path: newUrl}, '', newUrl);

        renderSidebar();
        currentVideos = playlist.videos;
        applySort();
    }

    function applySort() {
        if (activePlaylistIndex === -1) return;
        let sorted = [...currentVideos];
        const sortName = document.getElementById('sortName');
        
        if (sortName && sortName.checked) {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        renderVideos(sorted);
    }

    function renderVideos(videos) {
        if (!videoContainer) return;
        videoContainer.innerHTML = '';
        
        if (!videos || !videos.length) {
            videoContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted">No videos found.</div>';
            return;
        }

        videos.forEach(v => {
            const realIndex = currentUser.playlists[activePlaylistIndex].videos.findIndex(item => item.id === v.id);

            // בדיקה האם זה MP3 לצורך התצוגה
            // (אם ה-ID מתחיל ב-local_ זה סימן שזה קובץ שהעלינו)
            const isMp3 = v.type === 'mp3' || (v.id && v.id.toString().startsWith('local_'));
            
            // תמונת ברירת מחדל אם אין תמונה (למשל בקבצי שמע)
            const imgUrl = v.thumbnail || 'https://cdn-icons-png.flaticon.com/512/461/461238.png';

            let stars = '';
            for (let i = 1; i <= 5; i++) {
                const cls = i <= (v.rating || 0) ? 'text-warning' : 'text-secondary';
                stars += `<i class="bi bi-star-fill ${cls}" style="cursor:pointer" onclick="window.rateVideo(${realIndex}, ${i})"></i> `;
            }

            const div = document.createElement('div');
            div.className = 'col';
            div.innerHTML = `
                <div class="card h-100 shadow-sm video-card-hover">
                    <div onclick="window.openVideo('${v.id}')" style="cursor:pointer; position: relative;">
                        <img src="${imgUrl}" class="card-img-top" style="height: 180px; object-fit: cover;">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="bi bi-play-circle-fill text-white fs-1 opacity-75"></i>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate" title="${v.title}">${v.title}</h6>
                        <small class="text-muted mb-2">${isMp3 ? 'Local MP3' : 'YouTube'}</small>
                        <div class="mb-2 fs-5">${stars}</div>
                        <div class="mt-auto">
                            <button class="btn btn-outline-danger btn-sm w-100" onclick="window.deleteVideo(${realIndex})">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>`;
            videoContainer.appendChild(div);
        });
    }

    function updateStorage() {
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const idx = users.findIndex(u => u.username === currentUser.username);
        if (idx !== -1) {
            users[idx] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // --- 4. Global Functions ---

    window.rateVideo = (videoIndex, rating) => {
        currentUser.playlists[activePlaylistIndex].videos[videoIndex].rating = rating;
        updateStorage();
        applySort(); 
    };

    window.deleteVideo = (videoIndex) => {
        if (!confirm("Remove this video?")) return;
        currentUser.playlists[activePlaylistIndex].videos.splice(videoIndex, 1);
        updateStorage();
        loadPlaylist(activePlaylistIndex); 
    };

    window.deletePlaylist = () => {
        if (!confirm("Delete playlist?")) return;
        currentUser.playlists.splice(activePlaylistIndex, 1);
        updateStorage();
        activePlaylistIndex = -1;
        if(header) header.classList.add('d-none');
        if(emptyState) emptyState.classList.remove('d-none');
        videoContainer.innerHTML = '';
        renderSidebar();
    };

    window.playAll = () => {
        if (currentVideos.length) window.openVideo(currentVideos[0].id);
        else alert("Playlist is empty");
    };

    // --- הפונקציה המתוקנת והחשובה ביותר ---
    window.openVideo = (id) => {
        // מציאת הוידאו ברשימה
        const video = currentUser.playlists[activePlaylistIndex].videos.find(v => v.id === id);
        if (!video) return;

        const frame = document.getElementById('videoFrame');
        const audio = document.getElementById('audioPlayer');
        const modalEl = document.getElementById('videoModal');
        const title = document.getElementById('videoModalLabel');
        
        if (title) title.textContent = video.title;

        // בדיקה חכמה: האם זה MP3?
        // התנאי בודק: או שכתוב MP3, או שהמזהה מתחיל ב-'local_'
        const isMp3 = video.type === 'mp3' || (video.id && video.id.toString().startsWith('local_'));

        if (isMp3) {
            // --- מצב MP3 ---
            if(frame) {
                frame.classList.add('d-none'); // הסתרת יוטיוב
                frame.src = '';
            }
            
            if(audio) {
                audio.classList.remove('d-none'); // הצגת אודיו
                audio.src = video.url; 
                audio.play();
            } else {
                console.error("Error: <audio> tag with id='audioPlayer' not found in HTML!");
            }
        } else {
            // --- מצב YouTube ---
            if(audio) {
                audio.classList.add('d-none'); // הסתרת אודיו
                audio.pause();
            }
            
            if(frame) {
                frame.classList.remove('d-none'); // הצגת יוטיוב
                frame.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
            }
        }

        new bootstrap.Modal(modalEl).show();
    };
});