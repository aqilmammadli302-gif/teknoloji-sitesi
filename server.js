const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'techverse_super_secret_key_2026';
const DB_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Veritabanı Yardımcı Fonksiyonları (JSON Tabanlı Saf JS)
function readData() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            news: [
                {
                    id: 1,
                    title: "NVIDIA RTX 5090 Blackwell Mimarisi ve AI Performansı",
                    category: "Donanım",
                    summary: "Amiral gemisi yeni ekran kartı 32GB GDDR7 belleği ve DLSS 4 desteğiyle oyun ve yapay zeka sınırlarını yeniden çiziyor.",
                    content: "NVIDIA'nın yeni nesil Blackwell mimarisi, Ray Tracing çekirdeklerindeki %50 artış ve yapay zeka tensör işlemcileriyle masaüstü performansında devrim yapıyor. Sadece oyunlarda değil, yerel AI model eğitimlerinde de rakipsiz bir güç sunuyor.",
                    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800",
                    date: "8 Ekim 2026",
                    likes: 184,
                    views: 1240
                },
                {
                    id: 2,
                    title: "GPT-5 ve Otonom Yapay Zeka Ajanları Çağı",
                    category: "Yapay Zeka",
                    summary: "Yeni nesil yapay zeka mimarileri sadece komut almıyor, kendi başına görev planlayıp karmaşık projeleri tamamlıyor.",
                    content: "OpenAI ve lider yapay zeka laboratuvarlarının duyurduğu son otonom ajanlar; kod yazma, test etme, veritabanı yönetimi ve tasarım süreçlerini insan müdahalesi olmadan uçtan uca yönetebiliyor.",
                    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
                    date: "8 Ekim 2026",
                    likes: 142,
                    views: 980
                }
            ],
            comments: [],
            bookmarks: []
        };
        const adminHash = bcrypt.hashSync('admin123', 10);
        initialData.users.push({
            id: 1,
            username: 'Admin',
            email: 'admin@techverse.com',
            password: adminHash,
            role: 'admin'
        });
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Rotalar
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Tüm alanları doldurun." });

    const db = readData();
    if (db.users.find(u => u.email === email || u.username === username)) {
        return res.status(400).json({ error: "Kullanıcı adı veya e-posta zaten kullanımda." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, email, password: hashedPassword, role: 'user' };
    db.users.push(newUser);
    saveData(db);

    res.json({ message: "Kayıt başarılı! Giriş yapabilirsiniz." });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-posta ve şifre gereklidir." });

    const db = readData();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: "Giriş başarılı", token, username: user.username, role: user.role });
});

app.get('/api/admin/stats', (req, res) => {
    const db = readData();
    const totalViews = db.news.reduce((acc, item) => acc + (item.views || 0), 0);
    res.json({
        totalNews: db.news.length,
        totalUsers: db.users.length,
        totalComments: db.comments.length,
        totalViews
    });
});

app.get('/api/news', (req, res) => {
    const { category, search } = req.query;
    const db = readData();
    let newsList = db.news;

    if (category && category !== 'Tümü') {
        newsList = newsList.filter(n => n.category === category);
    } else if (search) {
        newsList = newsList.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.summary.toLowerCase().includes(search.toLowerCase()));
    }

    res.json(newsList.reverse());
});

app.get('/api/news/trending', (req, res) => {
    const db = readData();
    const sorted = [...db.news].sort((a, b) => (b.views || 0) - (a.views || 0));
    res.json(sorted.slice(0, 4));
});

app.get('/api/news/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readData();
    const item = db.news.find(n => n.id === id);
    if (!item) return res.status(404).json({ error: "Haber bulunamadı." });

    item.views = (item.views || 0) + 1;
    saveData(db);

    const newsComments = db.comments.filter(c => c.news_id === id);
    res.json({ news: item, comments: newsComments.reverse() });
});

app.delete('/api/news/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readData();
    db.news = db.news.filter(n => n.id !== id);
    saveData(db);
    res.json({ message: "Haber silindi." });
});

app.post('/api/news/:id/like', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readData();
    const item = db.news.find(n => n.id === id);
    if (item) {
        item.likes = (item.likes || 0) + 1;
        saveData(db);
    }
    res.json({ message: "Beğenildi" });
});

app.post('/api/bookmarks', (req, res) => {
    const { username, newsId } = req.body;
    const db = readData();
    const exists = db.bookmarks.find(b => b.username === username && b.news_id === parseInt(newsId));
    if (exists) return res.status(400).json({ error: "Zaten kaydedilmiş." });

    db.bookmarks.push({ username, news_id: parseInt(newsId) });
    saveData(db);
    res.json({ message: "Kaydedildi" });
});

app.get('/api/bookmarks/:username', (req, res) => {
    const username = req.params.username;
    const db = readData();
    const userBookmarks = db.bookmarks.filter(b => b.username === username).map(b => b.news_id);
    const savedNews = db.news.filter(n => userBookmarks.includes(n.id));
    res.json(savedNews);
});

app.post('/api/news/:id/comments', (req, res) => {
    const newsId = parseInt(req.params.id);
    const { username, comment } = req.body;
    if (!comment || !username) return res.status(400).json({ error: "Yorum içeriği boş olamaz." });

    const db = readData();
    db.comments.push({ id: Date.now(), news_id: newsId, username, comment, date: new Date().toISOString() });
    saveData(db);
    res.json({ message: "Yorum eklendi" });
});

app.post('/api/news', (req, res) => {
    const { title, category, summary, content, image } = req.body;
    if (!title || !category || !summary || !content) return res.status(400).json({ error: "Gerekli alanları doldurun." });

    const db = readData();
    const today = new Date();
    const dateStr = `${today.getDate()} Ekim ${today.getFullYear()}`;
    const newNews = {
        id: Date.now(),
        title,
        category,
        summary,
        content,
        image: image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
        date: dateStr,
        views: 0,
        likes: 0
    };

    db.news.push(newNews);
    saveData(db);
    res.json({ message: "Haber eklendi", newsId: newNews.id });
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu aktif: http://localhost:${PORT}`);
});