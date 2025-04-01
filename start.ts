document.getElementById('createLobby')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/lobby', { // Wysyłanie posta do serwera w celu utworzenia lobby
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' })
        });

        const data: { lobbyId?: string } = await response.json(); // Oczekiwanie na odpowiedź z serwera

        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`; // Przekierowanie do lobby
        }
    } catch (error) {
        console.error('Error creating lobby:', error);
    }
});

const joinLobbyButton = document.getElementById('joinLobby');
const lobbyIdInput = document.getElementById('lobbyId') as HTMLInputElement | null;
const submitJoinButton = document.getElementById('submitJoin');
const lobbyInput = document.getElementById('lobbyInput');

joinLobbyButton?.addEventListener('click', () => { // Obsługa przycisku dołączenia do lobby
    if (lobbyIdInput && submitJoinButton) {
        lobbyIdInput.style.display = 'inline';
        submitJoinButton.style.display = 'inline';
        if (lobbyInput) {
            lobbyInput.style.display = 'flex';
        }
    }
});

submitJoinButton?.addEventListener('click', async () => {
    if (!lobbyIdInput) return;

    const lobbyId = lobbyIdInput.value;

    try {
        const response = await fetch('/lobby', { // Wysyłanie posta do serwera w celu dołączenia do lobby
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join', lobbyId })
        });

        const data: { lobbyId?: string } = await response.json(); // Oczekiwanie na odpowiedź z serwera

        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`; // Przekierowanie do lobby
        } else {
            alert('Invalid Lobby ID');
        }
    } catch (error) {
        console.error('Error joining lobby:', error);
    }
});
