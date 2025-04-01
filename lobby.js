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
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobbyId');
if (sessionStorage.getItem("reloaded")) { // Sprawdzenie, czy strona została odświeżona
    sessionStorage.removeItem("reloaded");
    window.location.href = "/";
}
else {
    sessionStorage.setItem("reloaded", "true");
}
const playerName = prompt('Enter your name:');
if (!lobbyId || !playerName) {
    window.location.href = '/';
    throw new Error('Missing lobbyId or playerName, redirecting to homepage.');
}
const ws = new WebSocket('ws://' + window.location.host);
const copyImg = document.getElementById('copy');
document.getElementById('idLobby').innerText = `${lobbyId}`;
ws.onopen = () => {
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'join', lobbyId, playerName })); // Wysłanie prośby dołączenia do lobby
    }
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.action === 'lobbyUpdate' && data.lobbyId === lobbyId) {
        updateLobby(data); // Aktualizacja lobby
        // Update Start Game button based on host status
        if (data.players[0] === playerName) { // Gracz jest gospodarzem
            startGameButton.disabled = false;
            startGameButton.style.cursor = 'pointer';
        }
        else { // Gracz nie jest gospodarzem
            startGameButton.disabled = true;
            startGameButton.style.cursor = 'not-allowed';
        }
    }
};
copyImg.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    if (lobbyId) {
        try {
            yield navigator.clipboard.writeText(lobbyId);
        }
        catch (error) {
            console.error('Error copying lobby link:', error);
        }
    }
}));
const startGameButton = document.getElementById('startGame');
const leaveLobbyButton = document.getElementById('leaveLobby');
startGameButton === null || startGameButton === void 0 ? void 0 : startGameButton.addEventListener('click', () => {
    if (lobbyId && playerName && !startGameButton.disabled) {
        ws.send(JSON.stringify({ action: 'startGame', lobbyId, playerName })); // Wysłanie prośby o rozpoczęcie gry
    }
});
leaveLobbyButton === null || leaveLobbyButton === void 0 ? void 0 : leaveLobbyButton.addEventListener('click', () => {
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'leave', lobbyId, playerName })); // Wysłanie prośby o opuszczenie lobby
        window.location.href = '/';
    }
});
window.addEventListener('beforeunload', () => {
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'leave', lobbyId, playerName })); // Wysłanie prośby o opuszczenie lobby
        window.location.href = '/';
    }
});
function updateLobby(data) {
    const playerList = document.getElementById('playerList');
    if (!playerList)
        return;
    playerList.innerHTML = '';
    if (data.players.length === 0) { // Sprawdzenie, czy są gracze w lobby
        window.location.href = '/';
    }
    data.players.forEach((player) => {
        const li = document.createElement('li');
        li.textContent = player;
        playerList.appendChild(li);
    });
    const wildDiceImg = document.getElementById('wildDiceImg');
    const modeSwitch = document.getElementById('modeSwitch');
    const slider = document.querySelector('.slider');
    if (!wildDiceImg || !modeSwitch || !slider)
        return;
    wildDiceImg.src = data.settings.wildDice ? 'correct.png' : 'incorrect.png';
    modeSwitch.checked = data.settings.mode === 'elimination';
    slider.setAttribute('data-mode', data.settings.mode === 'elimination' ? 'Elimination' : 'Standard');
    if (data.players[0] === playerName) { // Sprawdzenie, czy gracz jest gospodarzem
        wildDiceImg.style.cursor = 'pointer';
        modeSwitch.disabled = false;
        slider.classList.remove('disabled');
        wildDiceImg.onclick = () => {
            const newWildDiceState = !data.settings.wildDice; // Zmiana stanu wildDice
            sendSettingsUpdate(newWildDiceState, modeSwitch.checked ? 'elimination' : 'standard'); // Wysyłanie aktualizacji ustawień
        };
        modeSwitch.onchange = () => {
            const newMode = modeSwitch.checked ? 'elimination' : 'standard';
            slider.setAttribute('data-mode', modeSwitch.checked ? 'Elimination' : 'Standard');
            sendSettingsUpdate(data.settings.wildDice, newMode); // Wysyłanie aktualizacji ustawień
        };
    }
    else {
        wildDiceImg.style.cursor = 'not-allowed';
        modeSwitch.disabled = true;
        slider.classList.add('disabled');
    }
}
function sendSettingsUpdate(wildDice, mode) {
    if (!lobbyId || !playerName)
        return;
    ws.send(JSON.stringify({
        action: 'updateSettings',
        lobbyId,
        playerName,
        settings: { wildDice, mode },
    }));
}
