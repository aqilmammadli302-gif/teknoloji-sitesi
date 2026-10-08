const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'techverse_super_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Veritabanı hatası:', err.message);
    else console.log('SQLite Veritabanı başarıyla bağlandı.');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            author TEXT DEFAULT 'TechVerse Editör',
            date TEXT NOT NULL,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            comment TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (news_id) REFERENCES news(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            news_id INTEGER NOT NULL,
            UNIQUE(username, news_id)
        )
    `);

    db.get("SELECT * FROM users WHERE email = 'admin@techverse.com'", async (err, row) => {
        if (!row) {
            const hash = await bcrypt.hash('admin123', 10);
            db.run("INSERT INTO users (username, email, password, role) VALUES ('Admin', 'admin@techverse.com', ?, 'admin')", [hash]);
        }
    });

    db.get("SELECT COUNT(*) AS count FROM news", (err, row) => {
        if (row && row.count === 0) {
            const initialNews = [
                {
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
                    title: "GPT-5 ve Otonom Yapay Zeka Ajanları Çağı",
                    category: "Yapay Zeka",
                    summary: "Yeni nesil yapay zeka mimarileri sadece komut almıyor, kendi başına görev planlayıp karmaşık projeleri tamamlıyor.",
                    content: "OpenAI ve lider yapay zeka laboratuvarlarının duyurduğu son otonom ajanlar; kod yazma, test etme, veritabanı yönetimi ve tasarım süreçlerini insan müdahalesi olmadan uçtan uca yönetebiliyor.",
                    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
                    date: "8 Ekim 2026",
                    likes: 142,
                    views: 980
                },
                {
                    title: "Kuantum İşlemcilerde Sıvı Helyum Soğutma Atılımı",
                    category: "Donanım",
                    summary: "Kuantum bilgisayarların stabil kalmasını sağlayan -273 derecelik yeni nesil mikro-soğutma blokları tanıtıldı.",
                    content: "Donanım mimarlarının yıllardır çözmeye çalıştığı kubit kararsızlığı sorunu, odaklanmış oda-soğutmalı kriyo-çip entegrasyonu sayesinde %80 oranında azaltıldı.",
                    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
                    date: "7 Ekim 2026",
                    likes: 89,
                    views: 650
                },
                {
                    title: "WebAssembly ve WebGPU ile Web'de Konsol Kalitesinde Oyun",
                    category: "Yazılım",
                    summary: "Modern tarayıcılar artık ekran kartına doğrudan erişerek masaüstü yazılımları aratmayan performans veriyor.",
                    content: "WebGPU standardının geniş kitlelerce kabul görmesiyle birlikte tarayıcı üzerinden Unreal Engine 5 kalitesinde 3D oyunlar ve çizim programları indirimsiz ve gecikmesiz çalışıyor.",
                    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
                    date: "6 Ekim 2026",
                    likes: 112,
                    views: 820
                }
            ];

            const stmt = db.prepare("INSERT INTO news (title, category, summary, content, image, date, likes, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            initialNews.forEach(item => stmt.run(item.title, item.category, item.summary, item.content, item.image, item.date, item.likes, item.views));
            stmt.finalize();
        }
    });
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Tüm alanları doldurun." });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Kullanıcı adı veya e-posta zaten kullanımda." });
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Kayıt başarılı! Giriş yapabilirsiniz." });
        });
    } catch (e) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-posta ve şifre gereklidir." });

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: "Giriş başarılı", token, username: user.username, role: user.role });
    });
});

app.get('/api/admin/stats', (req, res) => {
    db.get("SELECT COUNT(*) as totalNews FROM news", [], (err, newsRow) => {
        db.get("SELECT COUNT(*) as totalUsers FROM users", [], (err, userRow) => {
            db.get("SELECT COUNT(*) as totalComments FROM comments", [], (err, commentRow) => {
                db.get("SELECT SUM(views) as totalViews FROM news", [], (err, viewsRow) => {
                    res.json({
                        totalNews: newsRow.totalNews || 0,
                        totalUsers: userRow.totalUsers || 0,
                        totalComments: commentRow.totalComments || 0,
                        totalViews: viewsRow.totalViews || 0
                    });
                });
            });
        });
    });
});

app.get('/api/news', (req, res) => {
    const { category, search } = req.query;
    let sql = "SELECT * FROM news";
    let params = [];

    if (category && category !== 'Tümü') {
        sql += " WHERE category = ?";
        params.push(category);
    } else if (search) {
        sql += " WHERE title LIKE ? OR summary LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY id DESC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/news/trending', (req, res) => {
    db.all("SELECT * FROM news ORDER BY views DESC LIMIT 4", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/news/:id', (req, res) => {
    const id = req.params.id;
    db.run("UPDATE news SET views = views + 1 WHERE id = ?", [id]);

    db.get("SELECT * FROM news WHERE id = ?", [id], (err, news) => {
        if (err || !news) return res.status(404).json({ error: "Haber bulunamadı." });

        db.all("SELECT * FROM comments WHERE news_id = ? ORDER BY id DESC", [id], (err, comments) => {
            res.json({ news, comments: comments || [] });
        });
    });
});

app.delete('/api/news/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM news WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Haber silindi." });
    });
});

app.post('/api/news/:id/like', (req, res) => {
    const id = req.params.id;
    db.run("UPDATE news SET likes = likes + 1 WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Beğenildi" });
    });
});

app.post('/api/bookmarks', (req, res) => {
    const { username, newsId } = req.body;
    db.run("INSERT INTO bookmarks (username, news_id) VALUES (?, ?)", [username, newsId], function(err) {
        if (err) return res.status(400).json({ error: "Zaten kaydedilmiş." });
        res.json({ message: "Kaydedildi" });
    });
});

app.get('/api/bookmarks/:username', (req, res) => {
    const username = req.params.username;
    const sql = `
        SELECT news.* FROM news 
        JOIN bookmarks ON news.id = bookmarks.news_id 
        WHERE bookmarks.username = ?
    `;
    db.all(sql, [username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/news/:id/comments', (req, res) => {
    const newsId = req.params.id;
    const { username, comment } = req.body;
    if (!comment || !username) return res.status(400).json({ error: "Yorum içeriği boş olamaz." });

    db.run("INSERT INTO comments (news_id, username, comment) VALUES (?, ?, ?)", [newsId, username, comment], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Yorum eklendi", commentId: this.lastID });
    });
});

app.post('/api/news', (req, res) => {
    const { title, category, summary, content, image } = req.body;
    if (!title || !category || !summary || !content) return res.status(400).json({ error: "Gerekli alanları doldurun." });

    const today = new Date();
    const dateStr = `${today.getDate()} Ekim ${today.getFullYear()}`;
    const imgUrl = image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800";

    db.run("INSERT INTO news (title, category, summary, content, image, date) VALUES (?, ?, ?, ?, ?, ?)", 
        [title, category, summary, content, imgUrl, dateStr], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Haber eklendi", newsId: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Pro CMS TechVerse Portal: http://localhost:${PORT}`);
});