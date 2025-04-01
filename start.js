"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
(_a = document.getElementById('createLobby')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch('/lobby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' })
        });
        const data = yield response.json(); // Oczekiwanie na odpowiedź z serwera
        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`; // Przekierowanie do lobby
        }
    }
    catch (error) {
        console.error('Error creating lobby:', error);
    }
}));
const joinLobbyButton = document.getElementById('joinLobby');
const lobbyIdInput = document.getElementById('lobbyId');
const submitJoinButton = document.getElementById('submitJoin');
const lobbyInput = document.getElementById('lobbyInput');
joinLobbyButton === null || joinLobbyButton === void 0 ? void 0 : joinLobbyButton.addEventListener('click', () => {
    if (lobbyIdInput && submitJoinButton) {
        lobbyIdInput.style.display = 'inline';
        submitJoinButton.style.display = 'inline';
        if (lobbyInput) {
            lobbyInput.style.display = 'flex';
        }
    }
});
submitJoinButton === null || submitJoinButton === void 0 ? void 0 : submitJoinButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    if (!lobbyIdInput)
        return;
    const lobbyId = lobbyIdInput.value;
    try {
        const response = yield fetch('/lobby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join', lobbyId })
        });
        const data = yield response.json(); // Oczekiwanie na odpowiedź z serwera
        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`; // Przekierowanie do lobby
        }
        else {
            alert('Invalid Lobby ID');
        }
    }
    catch (error) {
        console.error('Error joining lobby:', error);
    }
}));
