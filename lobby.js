"use strict";
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobbyId');
const playerName = prompt('Enter your name:');
const ws = new WebSocket('ws://' + window.location.host);
document.getElementById('lobbyInfo').innerText = `You are in lobby: ${lobbyId}`;
ws.onopen = () => {
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'join', lobbyId, playerName }));
    }
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.action === 'lobbyUpdate' && data.lobbyId === lobbyId) {
        updateLobby(data);
    }
};
window.addEventListener('beforeunload', () => {
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'leave', lobbyId, playerName }));
    }
});
function updateLobby(data) {
    const playerList = document.getElementById('playerList');
    if (!playerList)
        return;
    playerList.innerHTML = '';
    data.players.forEach((player) => {
        const li = document.createElement('li');
        li.textContent = player;
        playerList.appendChild(li);
    });
    const wildDiceCheckbox = document.getElementById('wildDice');
    const modeSelect = document.getElementById('mode');
    if (!wildDiceCheckbox || !modeSelect)
        return;
    wildDiceCheckbox.checked = data.settings.wildDice;
    modeSelect.value = data.settings.mode;
    if (data.players[0] === playerName) {
        wildDiceCheckbox.disabled = false;
        modeSelect.disabled = false;
        wildDiceCheckbox.onchange = () => {
            sendSettingsUpdate();
        };
        modeSelect.onchange = () => {
            sendSettingsUpdate();
        };
    }
    else {
        wildDiceCheckbox.disabled = true;
        modeSelect.disabled = true;
    }
}
function sendSettingsUpdate() {
    const wildDiceCheckbox = document.getElementById('wildDice');
    const modeSelect = document.getElementById('mode');
    if (!wildDiceCheckbox || !modeSelect || !lobbyId || !playerName)
        return;
    const wildDice = wildDiceCheckbox.checked;
    const mode = modeSelect.value;
    ws.send(JSON.stringify({
        action: 'updateSettings',
        lobbyId,
        playerName,
        settings: { wildDice, mode },
    }));
}
