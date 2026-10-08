const API_URL = '/api';
let currentUser = localStorage.getItem('username') || null;
let currentRole = localStorage.getItem('role') || 'user';

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    fetchNews('Tümü');
    fetchTrending();
    setupEvents();
});

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'info') icon = 'fa-circle-info';

    toast.innerHTML = `
        <i class="fa-solid ${icon} fa-xl"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-msg">${message}</span>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.35s ease forwards';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('logged-out-view').style.display = 'none';
        document.getElementById('logged-in-view').style.display = 'flex';
        document.getElementById('user-name').innerText = currentUser;
        document.getElementById('add-news-btn').style.display = 'inline-block';

        if (currentRole === 'admin') {
            document.getElementById('admin-panel-btn').style.display = 'inline-block';
        } else {
            document.getElementById('admin-panel-btn').style.display = 'none';
        }
    } else {
        document.getElementById('logged-out-view').style.display = 'flex';
        document.getElementById('logged-in-view').style.display = 'none';
        document.getElementById('add-news-btn').style.display = 'none';
        document.getElementById('admin-panel-btn').style.display = 'none';
    }
}

async function fetchNews(category = 'Tümü', search = '') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '<p class="loading">Akış yükleniyor...</p>';

    let url = `${API_URL}/news`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    else if (category !== 'Tümü') url += `?category=${encodeURIComponent(category)}`;

    const res = await fetch(url);
    const data = await res.json();
    renderNews(data);
}

async function fetchTrending() {
    const list = document.getElementById('trending-list');
    const res = await fetch(`${API_URL}/news/trending`);
    const data = await res.json();

    list.innerHTML = '';
    data.forEach(item => {
        const el = document.createElement('div');
        el.className = 'trending-item';
        el.onclick = () => openNewsDetail(item.id);
        el.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
            <div class="trending-info">
                <h4>${item.title.substring(0, 42)}...</h4>
                <span><i class="fa-regular fa-eye"></i> ${item.views} okunma</span>
            </div>
        `;
        list.appendChild(el);
    });
}

function renderNews(newsList) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';

    if (newsList.length === 0) {
        grid.innerHTML = '<p>İçerik bulunamadı.</p>';
        return;
    }

    newsList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-img" onclick="openNewsDetail(${item.id})">
                <img src="${item.image}" alt="${item.title}">
                <span class="card-category">${item.category}</span>
            </div>
            <div class="card-body">
                <h3 onclick="openNewsDetail(${item.id})">${item.title}</h3>
                <p onclick="openNewsDetail(${item.id})">${item.summary}</p>
                <div class="card-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${item.date}</span>
                    <span><i class="fa-regular fa-heart"></i> ${item.likes || 0}</span>
                    <span><i class="fa-regular fa-eye"></i> ${item.views || 0}</span>
                    ${currentRole === 'admin' ? `<span style="color:#f43f5e; cursor:pointer;" onclick="deleteNews(${item.id})"><i class="fa-solid fa-trash"></i> Sil</span>` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function deleteNews(id) {
    if (confirm('Bu haberi silmek istediğinize emin misiniz?')) {
        await fetch(`${API_URL}/news/${id}`, { method: 'DELETE' });
        showToast('Silindi', 'Haber sistemden kaldırıldı.', 'info');
        fetchNews('Tümü');
        fetchTrending();
    }
}

async function openNewsDetail(newsId) {
    const modal = document.getElementById('news-modal');
    const content = document.getElementById('news-detail-content');
    const commentsList = document.getElementById('comments-list');

    const res = await fetch(`${API_URL}/news/${newsId}`);
    const data = await res.json();

    content.innerHTML = `
        <span class="tag-glow">${data.news.category}</span>
        <h1 style="margin: 15px 0; color:#fff; font-size:2rem;">${data.news.title}</h1>
        <div style="display:flex; gap:15px; color:#9ca3af; font-size:0.85rem; margin-bottom:20px;">
            <span><i class="fa-regular fa-user"></i> ${data.news.author || 'Editör'}</span>
            <span><i class="fa-regular fa-calendar"></i> ${data.news.date}</span>
            <span><i class="fa-regular fa-eye"></i> ${data.news.views} Okunma</span>
        </div>
        <img src="${data.news.image}" style="width:100%; height:340px; object-fit:cover; border-radius:20px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.1);">
        <p style="font-size:1.08rem; line-height:1.8; color:#d1d5db;">${data.news.content}</p>
        
        <button id="like-btn" class="btn-like"><i class="fa-solid fa-heart"></i> Beğen (${data.news.likes || 0})</button>
        <button id="bookmark-btn" class="btn-bookmark"><i class="fa-solid fa-bookmark"></i> Kaydet</button>
    `;

    document.getElementById('share-twitter').onclick = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(data.news.title)}`, '_blank');
    };
    document.getElementById('share-whatsapp').onclick = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(data.news.title)}`, '_blank');
    };

    document.getElementById('like-btn').onclick = async () => {
        await fetch(`${API_URL}/news/${newsId}/like`, { method: 'POST' });
        showToast('Beğenildi!', 'Teşekkürler.', 'info');
        openNewsDetail(newsId);
    };

    document.getElementById('bookmark-btn').onclick = async () => {
        if (!currentUser) { showToast('Hata', 'Giriş yapmalısınız.', 'error'); return; }
        const r = await fetch(`${API_URL}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, newsId })
        });
        if (r.ok) showToast('Kaydedildi', 'Haber favorilerinize eklendi.', 'success');
        else showToast('Bilgi', 'Bu haber zaten kayıtlı.', 'info');
    };

    commentsList.innerHTML = data.comments.length ? '' : '<p style="color:#6b7280;">İlk yorumu sen yap!</p>';
    data.comments.forEach(c => {
        commentsList.innerHTML += `<div class="comment-item"><strong>@${c.username}</strong><p>${c.comment}</p></div>`;
    });

    const commentBox = document.getElementById('add-comment-box');
    if (!currentUser) {
        commentBox.innerHTML = '<p style="color:#9ca3af; font-size:0.9rem;">Yorum yapabilmek için giriş yapmalısınız.</p>';
    } else {
        commentBox.innerHTML = `
            <textarea id="comment-text" rows="3" placeholder="Düşüncelerini paylaş..."></textarea>
            <button id="send-comment-btn" class="btn-glow" style="margin-top: 10px;">Yorum Gönder</button>
        `;
        document.getElementById('send-comment-btn').onclick = () => addComment(newsId);
    }

    modal.style.display = 'flex';
}

async function addComment(newsId) {
    const text = document.getElementById('comment-text').value;
    if (!text) return;

    await fetch(`${API_URL}/news/${newsId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, comment: text })
    });

    showToast('Yorum Yayınlandı', 'Yorumunuz eklendi.', 'success');
    openNewsDetail(newsId);
}

function setupEvents() {
    const authModal = document.getElementById('auth-modal');
    document.getElementById('open-login-btn').onclick = () => { authModal.style.display = 'flex'; switchTab('login'); };
    document.getElementById('open-register-btn').onclick = () => { authModal.style.display = 'flex'; switchTab('register'); };

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('tab-login').onclick = () => switchTab('login');
    document.getElementById('tab-register').onclick = () => switchTab('register');

    document.getElementById('admin-panel-btn').onclick = async () => {
        const res = await fetch(`${API_URL}/admin/stats`);
        const stats = await res.json();
        document.getElementById('stat-news').innerText = stats.totalNews;
        document.getElementById('stat-users').innerText = stats.totalUsers;
        document.getElementById('stat-comments').innerText = stats.totalComments;
        document.getElementById('stat-views').innerText = stats.totalViews;
        document.getElementById('admin-modal').style.display = 'flex';
    };

    document.getElementById('bookmarks-btn').onclick = async () => {
        const res = await fetch(`${API_URL}/bookmarks/${currentUser}`);
        const data = await res.json();
        document.getElementById('section-heading').innerText = "Kaydettiğiniz Haberler";
        renderNews(data);
    };

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            currentUser = data.username;
            currentRole = data.role;
            updateAuthUI();
            authModal.style.display = 'none';
            showToast('Giriş Başarılı', `Hoş geldin @${data.username}! (${data.role.toUpperCase()})`, 'success');
        } else {
            showToast('Hata', data.error, 'error');
        }
    };

    document.getElementById('register-form').onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Kayıt Başarılı', 'Giriş yapabilirsiniz.', 'success');
            switchTab('login');
        } else {
            showToast('Kayıt Başarısız', data.error, 'error');
        }
    };

    document.getElementById('logout-btn').onclick = () => {
        localStorage.clear();
        currentUser = null;
        currentRole = 'user';
        updateAuthUI();
        showToast('Oturum Kapatıldı', 'Çıkış yapıldı.', 'info');
        fetchNews('Tümü');
    };

    document.getElementById('newsletter-btn').onclick = () => {
        const emailInput = document.getElementById('newsletter-email');
        if (!emailInput.value || !emailInput.value.includes('@')) {
            showToast('Geçersiz E-posta', 'Lütfen geçerli bir adres girin.', 'error');
            return;
        }
        showToast('Abone Oldunuz!', 'Bültene eklendiniz.', 'success');
        emailInput.value = '';
    };

    document.querySelectorAll('.filter-chip, .nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const cat = btn.getAttribute('data-category');
            document.querySelectorAll('.filter-chip, .nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('section-heading').innerText = cat === 'Tümü' ? "Gündemdeki İçerikler" : `${cat} Haberleri`;
            fetchNews(cat);
        };
    });

    document.getElementById('search-input').onkeyup = (e) => {
        if (e.key === 'Enter') fetchNews('Tümü', e.target.value);
    };

    const addNewsModal = document.getElementById('add-news-modal');
    document.getElementById('add-news-btn').onclick = () => addNewsModal.style.display = 'flex';
    document.getElementById('add-news-form').onsubmit = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('news-title').value,
                category: document.getElementById('news-category').value,
                image: document.getElementById('news-image').value,
                summary: document.getElementById('news-summary').value,
                content: document.getElementById('news-content').value
            })
        });
        addNewsModal.style.display = 'none';
        showToast('Haber Yayınlandı', 'İçerik eklendi.', 'success');
        fetchNews('Tümü');
        fetchTrending();
    };
}

function switchTab(tab) {
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-register').classList.remove('active');
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('tab-login').classList.remove('active');
    }
}