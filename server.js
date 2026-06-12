const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let instansiDatabase = {
    "Puskesmas Kebon Jeruk": { nomorSekarang: 24, totalDilayani: 87, listMenunggu: [{id:"A-25", waktu:"10:00 AM"}, {id:"A-26", waktu:"10:05 AM"}, {id:"A-27", waktu:"10:10 AM"}] },
    "Kelurahan Kemanggisan": { nomorSekarang: 12, totalDilayani: 45, listMenunggu: [{id:"A-13", waktu:"09:12 AM"}] },
    "Dinas Dukcapil": { nomorSekarang: 5, totalDilayani: 22, listMenunggu: [{id:"A-6", waktu:"08:30 AM"}, {id:"A-7", waktu:"08:42 AM"}, {id:"A-8", waktu:"08:50 AM"}] },
    "Puskesmas Kebayoran Baru": { nomorSekarang: 4, totalDilayani: 12, listMenunggu: [] },
    "Dukcapil Jakarta Selatan": { nomorSekarang: 33, totalDilayani: 112, listMenunggu: [{id:"A-34", waktu:"11:15 AM"}] }
};

io.on('connection', (socket) => {
    console.log('User terhubung dengan ID:', socket.id);

    socket.emit('updateData', instansiDatabase);

    socket.on('ambilAntrean', (data) => {
        let db = instansiDatabase[data.instansi];
        let nextIdNum = db.nomorSekarang + 1 + db.listMenunggu.length;
        let formattedId = "A-" + nextIdNum;
        
        db.listMenunggu.push({ id: formattedId, waktu: data.waktuSkrg });
        
        io.emit('updateData', instansiDatabase);
        
        socket.emit('tiketDikonfirmasi', { instansi: data.instansi, idNum: nextIdNum, formattedId: formattedId });
    });

    socket.on('panggilBerikutnya', (instansiAdmin) => {
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
        let db = instansiDatabase[data.instansi];
        db.listMenunggu = db.listMenunggu.filter(item => item.id !== data.formattedId);
        
        io.emit('updateData', instansiDatabase);
    });
});

server.listen(3000, () => {
    console.log('✅ Server Backend Menyala di http://localhost:3000');
});