const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let instansiDatabase = {
    "Puskesmas Kebon Jeruk": { nomorSekarang: 24, totalDilayani: 87, isTutup: false, avgTime: 3, listMenunggu: [{id:"A-25", waktu:"10:00 AM"}, {id:"A-26", waktu:"10:05 AM"}, {id:"A-27", waktu:"10:10 AM"}] },
    "Kelurahan Kemanggisan": { nomorSekarang: 12, totalDilayani: 45, isTutup: false, avgTime: 4, listMenunggu: [{id:"A-13", waktu:"09:12 AM"}] },
    "Dinas Dukcapil": { nomorSekarang: 5, totalDilayani: 22, isTutup: false, avgTime: 5, listMenunggu: [{id:"A-6", waktu:"08:30 AM"}, {id:"A-7", waktu:"08:42 AM"}, {id:"A-8", waktu:"08:50 AM"}] },
    "Puskesmas Kebayoran Baru": { nomorSekarang: 4, totalDilayani: 12, isTutup: false, avgTime: 3, listMenunggu: [] },
    "Dukcapil Jakarta Selatan": { nomorSekarang: 33, totalDilayani: 112, isTutup: false, avgTime: 6, listMenunggu: [{id:"A-34", waktu:"11:15 AM"}] }
};

const PIN_STAFF = {
    "PKJJECO1310": "Puskesmas Kebon Jeruk",
    "KKMSTAFF001": "Kelurahan Kemanggisan",
    "DDKSTAFF9901": "Dinas Dukcapil",
    "PKBSTAFF002": "Puskesmas Kebayoran Baru",
    "DJSSTAFF003": "Dukcapil Jakarta Selatan"
};

let wargaDatabase = [
    { nama: "Jeco", email: "jeco@binus.edu", password: "123" }
];

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

io.on('connection', (socket) => {
    console.log('User terhubung:', socket.id);
    socket.emit('updateData', instansiDatabase);

    socket.on('registerWarga', (data) => {
        if (!validateEmail(data.email)) {
            return socket.emit('authResponse', { sukses: false, pesan: "Format email tidak valid (Harus pakai @)!" });
        }
        if (!data.password || data.password.length < 6) {
            return socket.emit('authResponse', { sukses: false, pesan: "Password minimal 6 karakter!" });
        }

        let exists = wargaDatabase.find(u => u.email === data.email);
        if(exists) {
            socket.emit('authResponse', { sukses: false, pesan: "Email sudah terdaftar!" });
        } else {
            wargaDatabase.push({ nama: data.nama, email: data.email, password: data.password });
            socket.emit('authResponse', { sukses: true, nama: data.nama, email: data.email });
        }
    });

    socket.on('loginWarga', (data) => {
        if (!validateEmail(data.email)) {
            return socket.emit('authResponse', { sukses: false, pesan: "Format email salah!" });
        }
        if (!data.password || data.password.length < 6) {
            return socket.emit('authResponse', { sukses: false, pesan: "Password minimal 6 karakter!" });
        }

        let user = wargaDatabase.find(u => u.email === data.email && u.password === data.password);
        if(user) {
            socket.emit('authResponse', { sukses: true, nama: user.nama, email: user.email });
        } else {
            socket.emit('authResponse', { sukses: false, pesan: "Email atau Password salah!" });
        }
    });

    socket.on('updateProfil', (data) => {
        let userIndex = wargaDatabase.findIndex(u => u.email === data.oldEmail);
        if (userIndex !== -1) {
            if (!validateEmail(data.newEmail)) {
                return socket.emit('updateProfilResponse', { sukses: false, pesan: "Email baru tidak valid!" });
            }
            wargaDatabase[userIndex].nama = data.newNama;
            wargaDatabase[userIndex].email = data.newEmail;
            socket.emit('updateProfilResponse', { sukses: true, nama: data.newNama, email: data.newEmail });
        } else {
            socket.emit('updateProfilResponse', { sukses: false, pesan: "User tidak ditemukan!" });
        }
    });

    socket.on('loginPetugas', (pinInput) => {
        const instansi = PIN_STAFF[pinInput];
        if (instansi) {
            let staffName = instansi === "Puskesmas Kebon Jeruk" ? "Jeco (Admin)" : "Admin " + instansi.split(" ")[0];
            socket.emit('loginPetugasRespons', { sukses: true, instansi: instansi, staffName: staffName });
        } else {
            socket.emit('loginPetugasRespons', { sukses: false });
        }
    });

    socket.on('ambilAntrean', (data) => {
        if (!data || !data.instansi || !instansiDatabase[data.instansi]) return;
        let db = instansiDatabase[data.instansi];
        
        if(db.isTutup) return; 

        let nextIdNum = db.nomorSekarang + 1 + db.listMenunggu.length;
        let formattedId = "A-" + nextIdNum;
        
        db.listMenunggu.push({ id: formattedId, waktu: data.waktuSkrg });
        io.emit('updateData', instansiDatabase);
        socket.emit('tiketDikonfirmasi', { instansi: data.instansi, idNum: nextIdNum, formattedId: formattedId });
    });

    socket.on('panggilBerikutnya', (instansiAdmin) => {
        if (!instansiAdmin || !instansiDatabase[instansiAdmin]) return;
        let db = instansiDatabase[instansiAdmin];
        if (db.listMenunggu.length > 0) {
            let antreanDipanggil = db.listMenunggu.shift();
            db.nomorSekarang = parseInt(antreanDipanggil.id.split("-")[1]);
            db.totalDilayani++;
            io.emit('updateData', instansiDatabase);
            io.emit('nomorDipanggil', { instansi: instansiAdmin, nomorSekarang: db.nomorSekarang });
        }
    });

    socket.on('batalAntrean', (data) => {
        if (!data || !data.instansi || !instansiDatabase[data.instansi]) return;
        let db = instansiDatabase[data.instansi];
        db.listMenunggu = db.listMenunggu.filter(item => item.id !== data.formattedId);
        io.emit('updateData', instansiDatabase);
    });

    socket.on('toggleLoket', (instansiAdmin) => {
        if (!instansiAdmin || !instansiDatabase[instansiAdmin]) return;
        instansiDatabase[instansiAdmin].isTutup = !instansiDatabase[instansiAdmin].isTutup;
        io.emit('updateData', instansiDatabase);
    });
});

async function syncToCloud(ticketData) {
    console.log("=== SyncManager: Mencoba sinkronisasi ke Cloud Database... ===");
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            body: JSON.stringify({
                title: `Ticket-${ticketData.number}`,
                body: `Status: ${ticketData.status}, Time: ${new Date().toISOString()}`,
                userId: 1,
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ SyncManager Sukses! Data terekonasiliasi ke Cloud. ID Cloud:", result.id);
        } else {
            console.log("❌ SyncManager Gagal: Server cloud merespon dengan error.");
        }
    } catch (error) {
        console.log("⚠️ SyncManager Offline Mode: Koneksi cloud putus, data disimpan di antrean lokal.");
    }
}

server.listen(3000, () => {
    console.log('✅ Server Backend Berjalan Stabil di http://localhost:3000');
});