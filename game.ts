const urlParamsG = new URLSearchParams(window.location.search);
const lobbyIdG: string | null = urlParamsG.get('lobbyId');

if (!lobbyIdG) {
    window.location.href = '/';
    throw new Error('Missing lobbyId, redirecting to homepage.');
}

const wsG = new WebSocket('ws://' + window.location.host);
const playersList = document.getElementById('playersList')!;
const actionContainer = document.getElementById('actionContainer')!;
let currentPlayer: string | null = null;
let gameState: { players: { name: string; dice: number[] }[]; currentTurn: string; currentBet?: { count: number; value: number }; wildDice?: boolean } | null = null;

let playerNameG: string | null = sessionStorage.getItem('playerName');

wsG.onopen = () => { // Otwarcie połączenia Websocket
    wsG.send(JSON.stringify({ action: 'joinGame', lobbyId: lobbyIdG }));
};

wsG.onmessage = (event: MessageEvent) => { // Obsługa wiadomości przychodzących
    const data = JSON.parse(event.data);

    if (data.action === 'gameUpdate') {
        updateGame(data); // Aktualizacja stanu gry
    } else if (data.action === 'challengeResult') {
        showChallengeResult(data.winner, data.totalDice, data.bet, data.wildDice); // Pokazanie wyniku wyzwania
    } else if (data.action === 'closePopup') {
        const popup = document.querySelector('div[style*="z-index: 1000"]');
        if (popup) document.body.removeChild(popup);

        // Zakrycie kostek
        Array.from(document.getElementsByClassName('dice-img')).forEach((element) => {
            const img = element as HTMLImageElement;
            img.src = 'dice0.png';
            img.alt = 'Hidden Dice';
        });

        // Losowanie nowych kości
        wsG.send(JSON.stringify({ action: 'rollDice', lobbyId: lobbyIdG }));
    }
};

function updateGame(data: { players: { name: string; dice: number[] }[]; currentTurn: string; currentBet?: { count: number; value: number }; wildDice?: boolean }) {
    gameState = data;
    playersList.innerHTML = '';

    const infoH2 = document.createElement('h2');
    infoH2.textContent = `Players`;
    playersList.appendChild(infoH2);

    data.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player');
        if (player.name === data.currentTurn) playerDiv.classList.add('current');

        const playerName = document.createElement('p');
        playerName.textContent = player.name;

        const showDice = player.name === playerNameG ? true : false;

        const diceDiv = document.createElement('div');
        diceDiv.classList.add('dice');
        player.dice.forEach(die => {
            const diceImg = document.createElement('img');
            diceImg.src = showDice ? `dice${die}.png` : 'dice0.png';
            diceImg.alt = showDice ? `Dice ${die}` : `Hidden Dice`;
            diceImg.id = `dice${die}`;
            diceImg.classList.add('dice-img');
            diceDiv.appendChild(diceImg);
        });

        playerDiv.appendChild(playerName);
        playerDiv.appendChild(diceDiv);
        playersList.appendChild(playerDiv);
    });

    currentPlayer = data.currentTurn;

    // Aktualizacja tury
    const lastBetDetails = document.getElementById('lastBetDetails')!;
    lastBetDetails.innerHTML = '';
    if (data.currentBet) {
        const { count, value } = data.currentBet;
        lastBetDetails.innerHTML = `Bet: ${count} <img src="dice${value}.png" alt="Dice ${value}" style="width: 20px; height: 20px;" style="filter: invert(0.8);">`;
    } else {
        lastBetDetails.textContent = 'No bets yet.';
    }

    updateActions(data.currentBet ? `${data.currentBet.count}x${data.currentBet.value}` : undefined);
}

function updateActions(currentBet?: string) {
    const diceDropdown = document.getElementById('diceDropdown')!;
    const betDropdown = document.getElementById('betDropdown')!;
    const betButton = document.getElementById('betButton')!;
    const challengeButton = document.getElementById('challengeButton')!;

    diceDropdown.innerHTML = '';
    betDropdown.innerHTML = '';

    const maxDiceValue = 6; // Wartość maksymalna dla kości
    const maxDiceCount = gameState?.players.reduce((sum, player) => sum + player.dice.length, 0) || 0;

    let selectedDiceValue: string | null = null;
    let selectedBetValue: string | null = null;

    const diceOptionsContainer = document.createElement('div');
    diceOptionsContainer.classList.add('custom-dropdown-options');
    for (let diceValue = 1; diceValue <= maxDiceValue; diceValue++) {
        const diceOption = document.createElement('div');
        diceOption.innerHTML = `<img src="dice${diceValue}.png" alt="Dice ${diceValue}" style="filter: invert(0.8);">`;
        diceOption.dataset.value = diceValue.toString();
        diceOption.onclick = () => {
            selectedDiceValue = diceValue.toString();
            diceDropdown.innerHTML = `<img src="dice${diceValue}.png" alt="Dice ${diceValue}" style="filter: invert(0.8);">`;
            diceDropdown.appendChild(diceOptionsContainer);
        };
        diceOptionsContainer.appendChild(diceOption);

        // Ustaw pierwszą wartość jako domyślną
        if (!selectedDiceValue) {
            selectedDiceValue = diceValue.toString();
            diceDropdown.innerHTML = `<img src="dice${diceValue}.png" alt="Dice ${diceValue}" style="filter: invert(0.8);">`;
        }
    }
    diceDropdown.appendChild(diceOptionsContainer);

    const betOptionsContainer = document.createElement('div');
    betOptionsContainer.classList.add('custom-dropdown-options');
    const [currentCount] = currentBet ? currentBet.split('x').map(Number) : [0];
    for (let count = currentCount + 1; count <= maxDiceCount; count++) {
        const betOption = document.createElement('div');
        betOption.textContent = `${count} Dice`;
        betOption.dataset.value = count.toString();
        betOption.onclick = () => {
            selectedBetValue = count.toString();
            betDropdown.textContent = `${count} Dice`;
            betDropdown.appendChild(betOptionsContainer);
        };
        betOptionsContainer.appendChild(betOption);

        // Ustaw pierwszą wartość jako domyślną
        if (!selectedBetValue) {
            selectedBetValue = count.toString();
            betDropdown.textContent = `${count} Dice`;
        }
    }
    betDropdown.appendChild(betOptionsContainer);

    betButton.onclick = () => {
        if (selectedDiceValue && selectedBetValue) {
            const bet = `${selectedBetValue}x${selectedDiceValue}`;
            wsG.send(JSON.stringify({ action: 'placeBet', lobbyId: lobbyIdG, playerName: playerNameG, bet }));
        } else {
            alert('Please select both dice value and bet count.');
        }
    };

    challengeButton.onclick = () => {
        if (currentPlayer != playerNameG) {
            return;
        }
        if (currentBet) {
            const bet = currentBet.split('x').map(Number);
            wsG.send(JSON.stringify({ action: 'challenge', lobbyId: lobbyIdG, playerName: playerNameG, bet }));
        } else {
            alert('No bet to challenge!');
        }
    };
}

function showChallengeResult(winner: string, totalDice: number, bet: { count: number; value: number }, wildDice: boolean) {
    const betButton = document.getElementById('betButton')! as HTMLButtonElement;
    const challengeButton = document.getElementById('challengeButton')! as HTMLButtonElement;

    // Wyłączenie przycisków w momencie pokazania wyniku
    betButton.disabled = true;
    challengeButton.disabled = true;

    // Ukazanie kostek
    setTimeout(() => {
        Array.from(document.getElementsByClassName('dice-img')).forEach((element) => {
            const img = element as HTMLImageElement;
            img.src = img.src.replace('dice0.png', `dice${img.id.replace('dice', '')}.png`);
            img.alt = `Dice ${img.id.replace('dice', '')}`;
        });
    }, 200); // Opóźnienie

    // Pokazanie popupa z wynikiem
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    popup.style.color = 'white';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.textAlign = 'center';
    popup.style.zIndex = '1000';

    popup.innerHTML = `
        <h2>Challenge Result</h2>
        <p>Winner: ${winner}</p>
        <p>Total Dice Matching Bet: ${totalDice}${wildDice ? ' (including wild dice)' : ''}</p>
        <p>Bet: ${bet.count} x <img src="dice${bet.value}.png" alt="Dice ${bet.value}" style="width: 20px; height: 20px;"></p>
        ${playerNameG === currentPlayer ? '<button id="closePopup">Close</button>' : '<p>Waiting for host to close...</p>'}
    `;

    document.body.appendChild(popup);

    if (playerNameG === currentPlayer) {
        document.getElementById('closePopup')!.onclick = () => {
            wsG.send(JSON.stringify({ action: 'closePopup', lobbyId: lobbyIdG, playerName: playerNameG }));
        };
    }
}
