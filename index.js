const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 5000;
const axios = require("axios")
const { default: makeWaSocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { setTimeout: sleep } = require('timers/promises');




const {
  convertCRC16,
  generateTransactionId,
  generateExpirationTime,
  elxyzFile,
  generateQRIS,
  createQRIS,
  checkQRISStatus
} = require('./public/orkut.js') 

// Middleware
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Fungsi Database
const databasePath = path.join(__dirname, "public", "database.json");

const readDatabase = () => {
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({ users: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(databasePath));
};

// Middleware untuk memvalidasi API key
const validateApiKey = (req, res, next) => {
  const { apikey } = req.query;

  if (!apikey) {
    return res.status(403).json({ error: 'Buy Nyet Murah Aje.' });
  }

  const db = readDatabase();
  const user = db.users.find((user) => user.apikey === apikey);

  if (!user) {
    return res.status(403).json({ error: 'Invalid API key.' });
  }

  req.user = user; // Simpan data pengguna untuk digunakan di endpoint
  next();
};



app.get('/api/orkut/createpayment', validateApiKey, async (req, res) => {
    const { amount } = req.query;
    if (!amount) {
    return res.json("Isi Parameter Amount.");
    }
    const { codeqr } = req.query;
    if (!codeqr) {
    return res.json("Isi Parameter CodeQr menggunakan qris code kalian.");
    }
    try {
        const qrData = await createQRIS(amount, codeqr);
        res.json({ status: true, creator: "Ibzz - Official", result: qrData });        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get('/api/orkut/cekstatus', async (req, res) => {
    const { merchant, keyorkut } = req.query;
        if (!merchant) {
        return res.json({ error: "Isi Parameter Merchant." });
    }
    if (!keyorkut) {
        return res.json({ error: "Isi Parameter Token menggunakan token kalian." });
    }
    try {
        const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
        const response = await axios.get(apiUrl);
        const result = response.data;
                // Check if data exists and get the latest transaction
        const latestTransaction = result.data && result.data.length > 0 ? result.data[0] : null;
                if (latestTransaction) {
            res.json(latestTransaction);
        } else {
            res.json({ message: "No transactions found." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Endpoint untuk servis dokumen HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/api', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get("/api/downloader/tiktokdl", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required." });

  try {
    const { tiktokdl } = require("tiktokdl");
    const data = await tiktokdl(url);
    if (!data) return res.status(404).json({ error: "No data found." });
    res.json({ status: true, creator: "Ibzz - Official", result: data });
  } catch (e) {
    res.status(500).json({ error: "Internal server error." });
  }
});


app.get("/api/orkut/create", validateApiKey, async (req, res) => {
  const { amount, codeqr, merchant, keyorkut } = req.query;

  // Validasi parameter yang dibutuhkan
  if (!amount) return res.status(400).json({ error: "Amount parameter is required." });
  if (!codeqr) return res.status(400).json({ error: "CodeQr parameter is required." });
  if (!merchant) return res.status(400).json({ error: "Merchant parameter is required." });
  if (!keyorkut) return res.status(400).json({ error: "KeyOrkut parameter is required." });

  try {
    // Buat data QRIS menggunakan fungsi createQRIS
    const qrData = await createQRIS(amount, codeqr, merchant, keyorkut);
    res.json({ status: true, creator: "Ibzz - Official", result: { data: qrData } });
  } catch (error) {
    // Tangani kesalahan dan kirimkan respons dengan status 500
    res.status(500).json({ error: error.message });
  }
});


app.get("/api/tools/translate", async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: "Text is required." });

  try {
    const response = await axios.get(`https://api.siputzx.my.id/api/tools/translate`, {
      params: { text: text, source: "auto", target: "id" }
    });
    res.json({ status: true, creator: "Rafael", result: response.data.translatedText });
  } catch {
    res.status(500).json({ error: "An error occurred while processing the translation." });
  }
});

app.get("/api/downloader/spotify", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Url is required." });
    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/spotify?url=${url}`);
        const data = response.data;
        if (!data.metadata || !data.download) {
            return res.status(500).json({ error: "Invalid response from the external API." });
        }
        res.json({
            status: true,
            creator: "Ibzz - Official",
            result: {
                artis: data.metadata.artist,
                judul: data.metadata.name,
                rilis: data.metadata.releaseDate,
                thumbnail: data.metadata.cover_url,
                download_url: data.download
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch data from the external API." });
    }
});
app.get("/api/downloader/ytmp3", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Url is required." });

    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/youtube?q=${url}`);
        const data = response.data;

        res.json({
            status: true,
            creator: "Rafael",
            result: {
                Judul: data.data.title,
                thumbnail: data.data.thumbnailUrl,
                durasi: data.data.duration,
                UrlDownload: data.data.sounds
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});

app.get("/api/downloader/ytmp4", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Url is required." });

    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/youtube?q=${url}`);
        const data = response.data;

        res.json({
            status: true,
            creator: "Rafael",
            result: {
                Judul: data.data.title,
                thumbnail: data.data.thumbnailUrl,
                durasi: data.data.duration,
                UrlDownload: data.data.video
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});



app.get("/api/downloader/spotifys", async (req, res) => {
    try {
        const { judul } = req.query;
        if (!judul) {
            return res.status(400).json({ error: "Masukkan judul lagu." });
        }
        const response = await axios.get(`https://api.siputzx.my.id/api/s/spotify?query=${encodeURIComponent(judul)}`);
        const resultData = response.data.data[0];
        if (!resultData) {
            return res.status(404).json({ error: "Lagu tidak ditemukan." });
        }
        res.json({
            status: true,
            creator: "Rafael",
            result: {
                judul: resultData.title,
                artis: resultData.artist.name,
                thumbnail: resultData.thumbnail,
                url: resultData.artist.external_urls.spotify
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Terjadi kesalahan pada server." });
    }
});

app.get("/api/tools/gemini", async (req, res) => {
    try {
        const { text } = req.query;
        if (!text) {
            return res.status(400).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "Please provide the 'text' parameter!"
            });
        }

        const response = await axios.get(`https://api.simplebot.my.id/api/tools/gemini?text=${encodeURIComponent(text)}`);
        
        if (!response.data) {
            return res.status(404).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "No data found."
            });
        }

        res.json({
            status: true,
            creator: "Ibzz - Official",
            result: response.data.result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: false,
            creator: "Ibzz - Official",
            error: "Internal server error."
        });
    }
});

app.get("/api/tools/gemini", async (req, res) => {
    try {
        const { text } = req.query;
        if (!text) {
            return res.status(400).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "Please provide the 'text' parameter!"
            });
        }

        const response = await axios.get(`https://api.simplebot.my.id/api/tools/gemini?text=${encodeURIComponent(text)}`);
        
        if (!response.data) {
            return res.status(404).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "No data found."
            });
        }

        res.json({
            status: true,
            creator: "Ibzz - Official",
            result: response.data.result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: false,
            creator: "Ibzz - Official",
            error: "Internal server error."
        });
    }
});

app.get("/api/tools/ai", async (req, res) => {
    try {
        const { prompt, msg } = req.query;
        
        if (!prompt || !msg) {
            return res.status(400).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "Please provide both 'prompt' and 'msg' parameters!"
            });
        }

        const response = await axios.get(`https://api.simplebot.my.id/api/tools/openai?prompt=${encodeURIComponent(prompt)}&msg=${encodeURIComponent(msg)}`);
        
        if (!response.data) {
            return res.status(404).json({ 
                status: false,
                creator: "Ibzz - Official",
                error: "No response from AI."
            });
        }

        res.json({
            status: true,
            creator: "Ibzz - Official",
            result: response.data.result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: false,
            creator: "Ibzz - Official",
            error: "Internal server error."
        });
    }
});
// Fungsi untuk menghapus file sesi
const deleteSessionFiles = (sessionDir) => {
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log('Session files deleted.');
    }
};


app.get('/spam-pairing', async (req, res) => {
    const target = req.query.target;
    const count = parseInt(req.query.count);

    if (!target) {
        return res.status(400).send({ message: 'Parameter target is required.' });
    }

    if (isNaN(count) || count <= 0) {
        return res.status(400).send({ message: 'Parameter count must be a valid positive number.' });
    }

    try {
        // In-memory storage untuk multi-file auth state
        const memoryStore = {};

        // Custom loader dan saver
        const loadCreds = async (file) => memoryStore[file] || null;
        const saveCreds = async (file, data) => {
            memoryStore[file] = data;
        };

        // Inisialisasi autentikasi menggunakan penyimpanan in-memory
        const { state, saveCreds: saveState } = await useMultiFileAuthState('public', { load: loadCreds, save: saveCreds });

        // Ambil versi terbaru Baileys
        const { version } = await fetchLatestBaileysVersion();

        // Membuat socket WhatsApp
        const sucked = makeWaSocket({
            auth: state,
            version,
            logger: pino({ level: 'fatal' }),
        });

        // Reconnect otomatis
        sucked.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
                console.log('Koneksi terputus, mencoba reconnect:', shouldReconnect);
                if (shouldReconnect) {
                    makeWaSocket({
                        auth: state,
                        version,
                        logger: pino({ level: 'fatal' }),
                    });
                } else {
                    console.log('Autentikasi kadaluarsa, harap login ulang.');
                }
            }
        });

        // Simpan hasil setiap percobaan
        const results = [];

        // Kirim kode pairing
        for (let i = 0; i < count; i++) {
            await sleep(1500); // Tingkatkan interval waktu untuk menghindari rate-limiting
            try {
                await sucked.requestPairingCode(target);
                results.push({ success: true, message: `Pairing code sent successfully on attempt ${i + 1}` });
            } catch (err) {
                results.push({ success: false, message: `Failed to send pairing code on attempt ${i + 1}: ${err.message}` });
                console.error(`# Failed to send pairing code - Number: ${target} - Error: ${err.message}`);
            }
        }

        res.send({ message: `Spam selesai. Total percobaan: ${count}`, results });
    } catch (err) {
        console.error(`Error: ${err.message}`);
        res.status(500).send({ message: 'Internal Server Error', error: err.message });
    }
});





// Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



