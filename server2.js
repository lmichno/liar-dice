const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
const lobbies = {};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Obsługa plików statycznych
app.get('/:filename', (req, res) => {
    res.sendFile(__dirname + '/' + req.params.filename);
});

app.post('/lobby', (req, res) => {
    const { action, lobbyId } = req.body;
    if (action === 'create') {
        let newLobbyId;
        do {
            newLobbyId = Math.random().toString(36).substring(2, 7).toUpperCase();
        } while (lobbies[newLobbyId]);
        lobbies[newLobbyId] = { players: [], settings: {}, gameStarted: false };
        res.json({ lobbyId: newLobbyId, message: 'Lobby created' });
    } else if (action === 'join' && lobbies[lobbyId]) {
        res.json({ lobbyId, message: 'Joined lobby' });
    } else {
        res.status(400).json({ error: 'Invalid action or lobby ID' });
    }
});

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { action, lobbyId, playerName, bet, settings } = data;
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        if (action === 'join') {
            if (!lobby.players.includes(playerName)) lobby.players.push(playerName);
            if (!lobby.creator) lobby.creator = playerName;
            ws.lobbyId = lobbyId;
            broadcastLobbyUpdate(lobbyId);
        } else if (action === 'startGame' && lobby.creator === playerName && lobby.players.length >= 2) {
            lobby.gameStarted = true;
            lobby.settings = settings;
            startGame(lobbyId);
        } else if (action === 'placeBet' && lobby.gameState.currentTurn === playerName) {
            lobby.gameState.currentBet = bet;
            nextTurn(lobbyId);
        } else if (action === 'challenge') {
            resolveChallenge(lobbyId);
        }
    });

    ws.on('close', () => {
        if (ws.lobbyId) removePlayerFromLobby(ws.lobbyId, ws);
    });
});

function startGame(lobbyId) {
    const lobby = lobbies[lobbyId];
    lobby.gameState = {
        players: lobby.players.map(name => ({ name, dice: rollDice(5) })),
        currentTurn: lobby.players[0],
        currentBet: null,
    };
    broadcastGameUpdate(lobbyId);
}

function nextTurn(lobbyId) {
    const lobby = lobbies[lobbyId];
    const players = lobby.gameState.players;
    const currentIndex = players.findIndex(p => p.name === lobby.gameState.currentTurn);
    lobby.gameState.currentTurn = players[(currentIndex + 1) % players.length].name;
    broadcastGameUpdate(lobbyId);
}

function resolveChallenge(lobbyId) {
    const lobby = lobbies[lobbyId];
    const { currentBet, players } = lobby.gameState;
    const totalCount = countDice(lobbyId, currentBet.value);
    const challenger = getPreviousPlayer(lobbyId);
    const loser = totalCount >= currentBet.count ? challenger : lobby.gameState.currentTurn;

    if (lobby.settings.mode === 'elimination') {
        lobby.gameState.players = players.filter(p => p.name !== loser);
        if (lobby.gameState.players.length === 1) {
            broadcastGameUpdate(lobbyId, { winner: lobby.gameState.players[0].name });
            return;
        }
    }
    startGame(lobbyId);
}

function countDice(lobbyId, value) {
    return lobbies[lobbyId].gameState.players.reduce((sum, player) => {
        return sum + player.dice.filter(d => d === value || (lobbies[lobbyId].settings.wildDice && d === 1)).length;
    }, 0);
}

function getPreviousPlayer(lobbyId) {
    const players = lobbies[lobbyId].gameState.players;
    const currentIndex = players.findIndex(p => p.name === lobbies[lobbyId].gameState.currentTurn);
    return players[(currentIndex - 1 + players.length) % players.length].name;
}

function removePlayerFromLobby(lobbyId, ws) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    lobby.players = lobby.players.filter(p => p !== ws.playerName);
    if (!lobby.players.length) delete lobbies[lobbyId];
    broadcastLobbyUpdate(lobbyId);
}

function broadcastLobbyUpdate(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const message = JSON.stringify({ action: 'lobbyUpdate', lobbyId, players: lobby.players, settings: lobby.settings, gameStarted: lobby.gameStarted });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) client.send(message);
    });
}

function broadcastGameUpdate(lobbyId, extraData = {}) {
    const gameState = { ...lobbies[lobbyId].gameState, ...extraData };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) client.send(JSON.stringify({ action: 'gameUpdate', ...gameState }));
    });
}

function rollDice(count) {
    return Array.from({ length: count }, () => Math.ceil(Math.random() * 6));
}

server.listen(3000, () => console.log('Serwer działa na porcie 3000'));
