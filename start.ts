document.getElementById('createLobby')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/lobby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' })
        });

        const data: { lobbyId?: string } = await response.json();

        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`;
        }
    } catch (error) {
        console.error('Error creating lobby:', error);
    }
});

const joinLobbyButton = document.getElementById('joinLobby');
const lobbyIdInput = document.getElementById('lobbyId') as HTMLInputElement | null;
const submitJoinButton = document.getElementById('submitJoin');
const lobbyInput = document.getElementById('lobbyInput') as HTMLInputElement | null;

joinLobbyButton?.addEventListener('click', () => {
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
        const response = await fetch('/lobby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join', lobbyId })
        });

        const data: { lobbyId?: string } = await response.json();

        if (data.lobbyId) {
            window.location.href = `/lobby.html?lobbyId=${data.lobbyId}`;
        } else {
            alert('Invalid Lobby ID');
        }
    } catch (error) {
        console.error('Error joining lobby:', error);
    }
});
