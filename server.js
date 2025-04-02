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

app.get('/game.html', (req, res) => {
    res.sendFile(__dirname + '/game.html');
});

app.get('/game.js', (req, res) => {
    res.sendFile(__dirname + '/game.js');
});

// Endpoint do obsługi tworzenia/dołączania do lobby
app.post('/lobby', (req, res) => {
    const { action, lobbyId } = req.body;

    if (action === 'create') {
        let newLobbyId = Math.random().toString(36).substring(2, 7).toLocaleUpperCase(); // Generowanie ID lobby

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



app.get('/dice1.png', (req, res) => {
    res.sendFile(__dirname + '/dice1.png');
});
app.get('/dice2.png', (req, res) => {
    res.sendFile(__dirname + '/dice2.png');
});
app.get('/dice3.png', (req, res) => {
    res.sendFile(__dirname + '/dice3.png');
});
app.get('/dice4.png', (req, res) => {
    res.sendFile(__dirname + '/dice4.png');
});
app.get('/dice5.png', (req, res) => {
    res.sendFile(__dirname + '/dice5.png');
});
app.get('/dice6.png', (req, res) => {
    res.sendFile(__dirname + '/dice6.png');
});
app.get('/dice0.png', (req, res) => {
    res.sendFile(__dirname + '/dice0.png');
});

// Komunikacja websocket
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { action, lobbyId, playerName, settings, bet } = data; // Dane odbierane od klienta

        if (action === 'join') { // Dołączenie do lobby
            if (!lobbies[lobbyId]) {
                lobbies[lobbyId] = { players: [], settings: {}, gameStarted: false };
            }
            if (lobbies[lobbyId] && !lobbies[lobbyId].gameStarted) { // Sprawdzenie, czy lobby istnieje i gra nie została rozpoczęta
                if (!lobbies[lobbyId].players.includes(playerName)) {
                    lobbies[lobbyId].players.push(playerName);
                }
                if (!lobbies[lobbyId].creator) {
                    lobbies[lobbyId].creator = playerName;
                }
                ws.lobbyId = lobbyId;
                broadcastLobbyUpdate(lobbyId);
            }
            else {
                ws.send(JSON.stringify({ action: 'redirect', url: '/' }));
            }
        } else if (action === 'startGame') { // Rozpoczęcie gry
            if (lobbies[lobbyId] && lobbies[lobbyId].creator === playerName && lobbies[lobbyId].players.length >= 2) {
                // Ustawienie domyślnego trybu na "standard", jeśli nie został wybrany
                if (!lobbies[lobbyId].settings?.mode) {
                    lobbies[lobbyId].settings = { ...lobbies[lobbyId].settings, mode: 'standard' };
                }
                lobbies[lobbyId].gameStarted = true; // Ustawienie flagi rozpoczęcia gry
                lobbies[lobbyId].gameState = {
                    players: lobbies[lobbyId].players.map(name => ({ name, dice: rollDice(5) })),
                    currentTurn: lobbies[lobbyId].players[0],
                };
                broadcastLobbyUpdate(lobbyId, true); // Poinformowanie wszystkich graczy o rozpoczęciu gry
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
                if (lobbies[lobbyId].players.length === 0 && !lobbies[lobbyId].gameStarted) {
                    delete lobbies[lobbyId];
                } else {
                    broadcastLobbyUpdate(lobbyId);
                }
            }
        } else if (action === 'joinGame') { // Dołączenie do gry
            ws.lobbyId = lobbyId;
            broadcastGameUpdate(lobbyId);
        } else if (action === 'placeBet') { // Obsługa zakładów
            const lobby = lobbies[lobbyId];
            if (lobby && lobby.gameState.currentTurn === playerName) {
                const [count, value] = bet.split('x').map(Number); // Przekonwertowanie zakładu na liczbę i wartość
                lobby.gameState.currentBet = { count, value }; // Ustawienie zakładu w stanie gry
                lobby.gameState.currentTurn = getNextPlayer(lobbyId);
                broadcastGameUpdate(lobbyId);
            }
        } else if (action === 'challenge') { // Obsługa wyzwań
            const lobby = lobbies[lobbyId];
            if (lobby && lobby.gameState.currentBet) {
                const { count, value } = lobby.gameState.currentBet;
                const wildDiceEnabled = lobby.settings?.wildDice || false;

                const totalDice = lobby.gameState.players.reduce((sum, player) => {
                    return sum + player.dice.filter(die => die === value || (wildDiceEnabled && die === 1)).length;
                }, 0);

                const challengerWins = totalDice < count;
                const previousTurnPlayer = getPreviousPlayer(lobbyId); // Wzięcie poprzedniego gracza
                const winner = challengerWins ? playerName : previousTurnPlayer;
                const loser = challengerWins ? previousTurnPlayer : playerName;

                // // Tryb standardowy
                // if (lobby.settings?.mode === 'standard') {
                //     const winnerPlayer = lobby.gameState.players.find(player => player.name === winner);
                //     if (winnerPlayer) {
                //         winnerPlayer.dice.pop(); // Zwycięzca traci jedną kość
                //     }
                // }

                // // Tryb eliminacji
                // if (lobby.settings?.mode === 'elimination') {
                //     lobby.gameState.players = lobby.gameState.players.filter(player => player.name !== loser); // Usunięcie przegranego
                // }

                // // Przerzucenie wszystkich kości
                // lobby.gameState.players.forEach(player => {
                //     player.dice = rollDice(player.dice.length);
                // });

                // Pokazanie wyników wyzwania
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) {
                        client.send(JSON.stringify({
                            action: 'challengeResult',
                            winner,
                            totalDice,
                            bet: { count, value },
                            wildDice: wildDiceEnabled
                        }));
                    }
                });

                // Aktualizacja stanu gry
                broadcastGameUpdate(lobbyId);
            }
        } else if (action === 'closePopup') { // Obsługa zamknięcia popupa przez gospodarza

            const lobby = lobbies[lobbyId];

            if (lobby && lobby.gameState.currentTurn === playerName) {

                const { currentBet } = lobby.gameState;
                if (currentBet) {
                    console.log(`Gracz ${playerName} wyzwał zakład: ${currentBet.count}x${currentBet.value}`);

                    const { count, value } = currentBet;
                    const wildDiceEnabled = lobby.settings?.wildDice || false;

                    const totalDice = lobby.gameState.players.reduce((sum, player) => {
                        return sum + player.dice.filter(die => die === value || (wildDiceEnabled && die === 1)).length;
                    }, 0);

                    const challengerWins = totalDice < count;
                    const previousTurnPlayer = getPreviousPlayer(lobbyId);
                    const winner = challengerWins ? playerName : previousTurnPlayer;
                    const loser = challengerWins ? previousTurnPlayer : playerName;

                    // Tryb standardowy

                    if (lobby.settings?.mode === 'standard') {
                        const winnerPlayer = lobby.gameState.players.find(player => player.name === winner);

                        if (winnerPlayer) {

                            winnerPlayer.dice.pop(); // Zwycięzca traci jedną kość
                        }
                    }

                    // Tryb eliminacji
                    if (lobby.settings?.mode === 'elimination') {
                        lobby.gameState.players = lobby.gameState.players.filter(player => player.name !== loser); // Usunięcie przegranego
                    }

                    // Przerzucenie wszystkich kości
                    lobby.gameState.players.forEach(player => {
                        player.dice = rollDice(player.dice.length);
                    });

                    lobby.gameState.currentTurn = getNextPlayer(lobbyId); // Ustawienie następnego gracza

                    // Resetowanie zakładu po wyzwaniu
                    delete lobby.gameState.currentBet;
                }


                // Wysłanie wiadomości o zamknięciu popupa
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) {
                        client.send(JSON.stringify({ action: 'closePopup' }));
                    }
                });


                // Aktualizacja stanu gry
                lobby.gameState.currentTurn = getNextPlayer(lobbyId);
                broadcastGameUpdate(lobbyId);

            }
        } else if (action === 'rollDice') { // Obsługa losowania nowych kości
            const lobby = lobbies[lobbyId];
            if (lobby) {
                lobby.gameState.players.forEach(player => {
                    player.dice = rollDice(player.dice.length);
                });
                broadcastGameUpdate(lobbyId);
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
            if (lobbies[lobbyId].players.length === 0 && !lobbies[lobbyId].gameStarted) {
                delete lobbies[lobbyId];
            } else {
                broadcastLobbyUpdate(lobbyId);
            }
        }
        ws.send(JSON.stringify({ action: 'redirect', url: '/' }));
    });
});

// Wysyłanie aktualizacji lobby
function broadcastLobbyUpdate(lobbyId, gameStarted = false) {
    const lobby = lobbies[lobbyId];
    if (lobby) {
        const message = JSON.stringify({
            action: 'lobbyUpdate',
            lobbyId,
            players: lobby.players,
            settings: lobby.settings || { wildDice: false, mode: 'standard' },
            gameStarted, // Branie pod uwagę stanu gry
        });
        wss.clients.forEach((client) => { // Wysyłanie wiadomości do wszystkich klientów
            if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) {
                client.send(message);
            }
        });
    }
}

// Wysyłanie aktualizacji gry
function broadcastGameUpdate(lobbyId) {
    const gameState = lobbies[lobbyId].gameState;

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.lobbyId === lobbyId) {
            client.send(JSON.stringify({
                action: 'gameUpdate',
                players: gameState.players,
                currentTurn: gameState.currentTurn,
                currentBet: gameState.currentBet // Wysłanie aktualnego zakładu
            }));
        }
    });
}

// Funkcja do rzucania kośćmi
function rollDice(count) {
    return Array.from({ length: count }, () => Math.ceil(Math.random() * 6));
}

// Funkcja do uzyskania następnego gracza
function getNextPlayer(lobbyId) {
    const players = lobbies[lobbyId].gameState.players;
    const currentIndex = players.findIndex(p => p.name === lobbies[lobbyId].gameState.currentTurn);
    return players[(currentIndex + 1) % players.length].name;
}

// Funkcja do uzyskania poprzedniego gracza
function getPreviousPlayer(lobbyId) {
    const players = lobbies[lobbyId].gameState.players;
    const currentIndex = players.findIndex(p => p.name === lobbies[lobbyId].gameState.currentTurn);
    return players[(currentIndex - 1 + players.length) % players.length].name;
}

server.listen(3000, () => {
    console.log('Serwer działa na porcie 3000');
});
