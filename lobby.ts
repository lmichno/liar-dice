const urlParams = new URLSearchParams(window.location.search);
const lobbyId: string | null = urlParams.get('lobbyId');

// if (sessionStorage.getItem("reloaded")) { // Sprawdzenie, czy strona została odświeżona
//     sessionStorage.removeItem("reloaded");
//     window.location.href = "/";
// } else {
//     sessionStorage.setItem("reloaded", "true");
// }


const playerName: string | null = prompt('Enter your name:');


if (!lobbyId || !playerName) {
    window.location.href = '/';
    throw new Error('Missing lobbyId or playerName, redirecting to homepage.');
}

const ws = new WebSocket('ws://' + window.location.host);
const copyImg = document.getElementById('copy') as HTMLImageElement | null;

document.getElementById('idLobby')!.innerText = `${lobbyId}`;

ws.onopen = () => { // Otwarcie połączenia Websocket
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'join', lobbyId, playerName })); // Wysłanie prośby dołączenia do lobby
    }
};

ws.onmessage = (event: MessageEvent) => { // Obsługa wiadomości przychodzących
    const data: { action: string; lobbyId: string; players: string[]; settings: { wildDice: boolean; mode: string } } = JSON.parse(event.data);
    if (data.action === 'lobbyUpdate' && data.lobbyId === lobbyId) {
        updateLobby(data); // Aktualizacja lobby
    }
};

copyImg!.addEventListener('click', async () => { // Obsługa kliknięcia w ikonę kopiowania
    if (lobbyId) {
        try {
            await navigator.clipboard.writeText(lobbyId)
        } catch (error) {
            console.error('Error copying lobby link:', error);
        }
    }

});

window.addEventListener('beforeunload', () => { // Obsługa zamknięcia okna
    if (lobbyId && playerName) {
        ws.send(JSON.stringify({ action: 'leave', lobbyId, playerName })); // Wysłanie prośby o opuszczenie lobby
        window.location.href = '/';
    }
});

function updateLobby(data: { players: string[]; settings: { wildDice: boolean; mode: string } }) { // Aktualizowanie lobby
    const playerList = document.getElementById('playerList');
    if (!playerList) return;
    playerList.innerHTML = '';

    if (data.players.length === 0) { // Sprawdzenie, czy są gracze w lobby
        window.location.href = '/';
    }

    data.players.forEach((player) => { // Wyświetlenie listy graczy
        const li = document.createElement('li');
        li.textContent = player;
        playerList.appendChild(li);
    });

    const wildDiceImg = document.getElementById('wildDiceImg') as HTMLImageElement | null;
    const modeSwitch = document.getElementById('modeSwitch') as HTMLInputElement | null;
    const slider = document.querySelector('.slider') as HTMLSpanElement | null;
    if (!wildDiceImg || !modeSwitch || !slider) return;

    wildDiceImg.src = data.settings.wildDice ? 'correct.png' : 'incorrect.png';
    modeSwitch.checked = data.settings.mode === 'elimination';
    slider.setAttribute('data-mode', data.settings.mode === 'elimination' ? 'Elimination' : 'Standard');

    if (data.players[0] === playerName) { // Sprawdzenie, czy gracz jest gospodarzem
        wildDiceImg.style.cursor = 'pointer';
        modeSwitch.disabled = false;
        slider.classList.remove('disabled');

        wildDiceImg.onclick = () => {
            const newWildDiceState = !data.settings.wildDice; // Toggle wild dice state
            sendSettingsUpdate(newWildDiceState, modeSwitch.checked ? 'elimination' : 'standard'); // Send updated state to the server
        };

        modeSwitch.onchange = () => {
            const newMode = modeSwitch.checked ? 'elimination' : 'standard';
            slider.setAttribute('data-mode', modeSwitch.checked ? 'Elimination' : 'Standard');
            sendSettingsUpdate(data.settings.wildDice, newMode); // Send updated mode to the server
        };
    } else {
        wildDiceImg.style.cursor = 'not-allowed';
        modeSwitch.disabled = true;
        slider.classList.add('disabled');
    }
}

function sendSettingsUpdate(wildDice: boolean, mode: string) { // Wysyłanie aktualizacji ustawień
    if (!lobbyId || !playerName) return;

    ws.send(JSON.stringify({
        action: 'updateSettings',
        lobbyId,
        playerName,
        settings: { wildDice, mode },
    }));
}
