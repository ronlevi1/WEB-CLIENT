document.addEventListener('DOMContentLoaded', () => {
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'login.html'; return; }
    if (!currentUser.playlists) currentUser.playlists = {};

    const playlistListEl = document.getElementById('playlistList');
    const videoContainer = document.getElementById('videoContainer');
    const currentTitle = document.getElementById('currentTitle');
    const header = document.getElementById('playlistHeader');
    const emptyState = document.getElementById('emptyState');
    const filterInput = document.getElementById('filterInput');
    
    let activeName = null;
    let currentVideos = [];

    // Init
    document.getElementById('userGreeting').innerHTML = `Hello, ${currentUser.username}`;
    renderSidebar();
    
    const urlParams = new URLSearchParams(window.location.search);
    const qName = urlParams.get('playlist');
    if(qName && currentUser.playlists[qName]) loadPlaylist(qName);
    else if(Object.keys(currentUser.playlists).length) loadPlaylist(Object.keys(currentUser.playlists)[0]);

    // Events
    document.getElementById('logoutBtn').addEventListener('click', ()=>{ sessionStorage.removeItem('currentUser'); window.location.href='login.html'; });
    
    document.getElementById('createBtn').addEventListener('click', ()=>{
        const name = document.getElementById('newListName').value.trim();
        if(!name || currentUser.playlists[name]) return alert("Invalid name");
        currentUser.playlists[name] = [];
        updateStorage();
        renderSidebar();
        loadPlaylist(name);
        bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
    });

    filterInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderVideos(currentVideos.filter(v => v.title.toLowerCase().includes(term)));
    });

    document.querySelectorAll('input[name="sort"]').forEach(r => r.addEventListener('change', applySort));
    document.getElementById('videoModal').addEventListener('hidden.bs.modal', ()=>document.getElementById('videoFrame').src='');

    // Functions
    function renderSidebar() {
        playlistListEl.innerHTML = '';
        Object.keys(currentUser.playlists).forEach(name => {
            const div = document.createElement('div');
            div.className = `playlist-item p-2 mb-1 ${name===activeName ? 'active':''}`;
            div.textContent = name;
            div.onclick = () => loadPlaylist(name);
            playlistListEl.appendChild(div);
        });
    }

    function loadPlaylist(name) {
        activeName = name;
        if(!currentUser.playlists[name]) { renderSidebar(); header.classList.add('d-none'); emptyState.classList.remove('d-none'); return; }

        header.classList.remove('d-none');
        emptyState.classList.add('d-none');
        currentTitle.textContent = name;
        document.getElementById('videoCount').textContent = `${currentUser.playlists[name].length} videos`;
        
        const newUrl = `${window.location.pathname}?playlist=${encodeURIComponent(name)}`;
        history.pushState({path:newUrl},'',newUrl);
        
        currentVideos = currentUser.playlists[name];
        renderSidebar();
        applySort();
    }

    function applySort() {
        let sorted = [...currentVideos];
        if(document.getElementById('sortName').checked) sorted.sort((a,b)=>a.title.localeCompare(b.title));
        else sorted.sort((a,b)=>(b.rating||0)-(a.rating||0));
        renderVideos(sorted);
    }

    function renderVideos(videos) {
        videoContainer.innerHTML = '';
        if(!videos.length) return videoContainer.innerHTML = '<div class="col-12 text-center py-5">No videos</div>';

        videos.forEach(v => {
            let stars = '';
            for(let i=1;i<=5;i++) {
                const cls = i <= (v.rating||0) ? 'text-warning' : 'text-secondary';
                stars += `<i class="bi bi-star-fill ${cls}" onclick="rateVideo('${v.id}', ${i})"></i> `;
            }

            const div = document.createElement('div');
            div.className = 'col';
            div.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                    <div onclick="openVideo('${v.id}')" style="cursor:pointer">
                        <img src="${v.thumbnail}" class="card-img-top">
                    </div>
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${v.title}</h6>
                        <div class="mb-2">${stars}</div>
                        <button class="btn btn-outline-danger btn-sm w-100" onclick="deleteVideo('${v.id}')">Remove</button>
                    </div>
                </div>`;
            videoContainer.appendChild(div);
        });
    }

    function updateStorage() {
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        let users = JSON.parse(localStorage.getItem('users'));
        users[users.findIndex(u=>u.username===currentUser.username)] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Global
    window.rateVideo = (id, rating) => {
        const video = currentUser.playlists[activeName].find(v=>v.id===id);
        if(video) { video.rating = rating; updateStorage(); applySort(); }
    };
    window.deleteVideo = (id) => {
        if(!confirm("Remove?")) return;
        currentUser.playlists[activeName] = currentUser.playlists[activeName].filter(v=>v.id!==id);
        updateStorage(); loadPlaylist(activeName);
    };
    window.deletePlaylist = () => {
        if(!confirm("Delete List?")) return;
        delete currentUser.playlists[activeName];
        updateStorage(); activeName=null; renderSidebar(); 
        const next = Object.keys(currentUser.playlists)[0];
        next ? loadPlaylist(next) : location.reload();
    };
    window.playAll = () => {
        if(currentVideos.length) window.openVideo(currentVideos[0].id);
    };
    window.openVideo = (id) => {
        document.getElementById('videoFrame').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
        new bootstrap.Modal(document.getElementById('videoModal')).show();
    };
});