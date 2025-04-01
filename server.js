const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { log } = require('console');

// Express
const app = express();
const server = http.createServer(app);

// Websocket
const wss = new WebSocket.Server({ server });

// Parser JSON
app.use(bodyParser.json());

// Przechowywanie lobby
const lobbies = {};

// Endpointy główne
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/start.js', (req, res) => {
    res.sendFile(__dirname + '/start.js');
}
);

// Endpoint do obsługi tworzenia/dołączania do lobby
app.post('/lobby', (req, res) => {
    const { action, lobbyId } = req.body;

    if (action === 'create') {
        const newLobbyId = Math.random().toString(36).substring(2, 7).toLocaleUpperCase(); // Generowanie ID lobby

        while (lobbies[newLobbyId]) { // Sprawdzenie, czy lobby już istnieje
            newLobbyId = Math.random().toString(36).substring(2, 7).toLocaleUpperCase();
        }
        lobbies[newLobbyId] = { players: [] };
        res.json({ lobbyId: newLobbyId, message: 'Lobby created' });
    } else if (action === 'join' && lobbies[lobbyId]) {
        res.json({ lobbyId, message: 'Joined lobby' });
    } else {
        res.status(400).json({ error: 'Invalid action or lobby ID' });
    }
});

// Endpoint do obsługi lobby.html
app.get('/lobby.html', (req, res) => {
    res.sendFile(__dirname + '/lobby.html');
});

app.get('/lobby.js', (req, res) => {
    res.sendFile(__dirname + '/lobby.js');
});

app.get('/copy.png', (req, res) => {
    res.sendFile(__dirname + '/copy.png');
});

app.get('/incorrect.png', (req, res) => {
    res.sendFile(__dirname + '/incorrect.png');
});

app.get('/correct.png', (req, res) => {
    res.sendFile(__dirname + '/correct.png');
});

// Komunikacja websocket
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { action, lobbyId, playerName, settings } = data; // Dane odbierane od klienta

        if (action === 'join') { // Dołączenie do lobby
            if (lobbies[lobbyId]) {
                if (!lobbies[lobbyId].players.includes(playerName)) {
                    lobbies[lobbyId].players.push(playerName);
                }
                if (!lobbies[lobbyId].creator) {
                    lobbies[lobbyId].creator = playerName;
                }
                ws.lobbyId = lobbyId;
                broadcastLobbyUpdate(lobbyId);
            }
        } else if (action === 'updateSettings') { // Aktualizacja ustawień lobby
            if (lobbies[lobbyId] && lobbies[lobbyId].creator === playerName) {
                lobbies[lobbyId].settings = settings;
                broadcastLobbyUpdate(lobbyId);
            }
        } else if (action === 'leave') { // Opuszczenie lobby
            if (lobbies[lobbyId]) {
                lobbies[lobbyId].players = lobbies[lobbyId].players.filter((player) => player !== playerName);
                if (lobbies[lobbyId].creator === playerName) {
                    lobbies[lobbyId].creator = lobbies[lobbyId].players[0] || null;
                }
                if (lobbies[lobbyId].players.length === 0) {
                    delete lobbies[lobbyId];
                } else {
                    broadcastLobbyUpdate(lobbyId);
                }
            }
        }
    });

    ws.on('close', () => { // Zamknięcie połączenia
        const lobbyId = ws.lobbyId;
        const playerName = ws.playerName;
        if (lobbyId && lobbies[lobbyId]) {
            lobbies[lobbyId].players = lobbies[lobbyId].players.filter((player) => player !== playerName);
            if (lobbies[lobbyId].creator === playerName) {
                lobbies[lobbyId].creator = lobbies[lobbyId].players[0] || null;
            }
            if (lobbies[lobbyId].players.length === 0) {
                delete lobbies[lobbyId];
            } else {
                broadcastLobbyUpdate(lobbyId);
            }
        }
        ws.send(JSON.stringify({ action: 'redirect', url: '/' }));
    });
});

// Wysyłanie aktualizacji lobby
function broadcastLobbyUpdate(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (lobby) {
        const message = JSON.stringify({
            action: 'lobbyUpdate',
            lobbyId,
            players: lobby.players,
            settings: lobby.settings || { wildDice: false, mode: 'standard' },
        });
        wss.clients.forEach((client) => { // Wysyłanie wiadomości do wszystkich klientów
            if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) {
                client.send(message);
            }
        });
    }
}

server.listen(3000, () => {
    console.log('Serwer działa na porcie 3000');
});
