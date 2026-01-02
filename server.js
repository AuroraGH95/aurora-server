const WebSocket = require('ws');
const http = require('http');

// Configuration: Render automatically assigns a PORT environment variable
const PORT = process.env.PORT || 41234;

// Server State
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = [];

console.log(`\n🎸 PROJECT AURORA: MASTER SERVER 🎸`);

wss.on('connection', (ws, req) => {
    const id = Math.random().toString(36).substr(2, 9);
    console.log(`[+] New Player Joined: ${id}`);

    const player = {
        id,
        ws,
        name: `Player ${players.length + 1}`,
        isHost: players.length === 0,
        ready: false,
        score: 0,
        combo: 0
    };
    players.push(player);

    // Simplified Welcome Message
    ws.send(JSON.stringify({
        type: 'CHAT',
        message: {
            id: Date.now().toString(),
            sender: 'System',
            text: `Connected to Master Server. You are ${player.isHost ? 'HOST' : 'GUEST'}.`,
            timestamp: Date.now(),
            isSystem: true
        }
    }));

    broadcastLobbyUpdate();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'UPDATE_NAME':
                    player.name = data.name.substring(0, 15);
                    broadcastLobbyUpdate();
                    break;
                case 'CHAT':
                    broadcast({
                        type: 'CHAT',
                        message: {
                            id: Date.now().toString(),
                            sender: player.name,
                            text: data.text,
                            timestamp: Date.now()
                        }
                    });
                    break;
                case 'SCORE_UPDATE':
                    player.score = data.score;
                    player.combo = data.combo;
                    // For performance, we don't broadcast every single note hit 
                    // unless you want a live scoreboard.
                    break;
            }
        } catch (e) {
            console.error("Error parsing message", e);
        }
    });

    ws.on('close', () => {
        console.log(`[-] Player Left: ${id}`);
        players = players.filter(p => p.id !== id);
        
        if (player.isHost && players.length > 0) {
            players[0].isHost = true;
        }
        broadcastLobbyUpdate();
    });
});

function broadcastLobbyUpdate() {
    const safeList = players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        score: p.score
    }));

    broadcast({
        type: 'LOBBY_UPDATE',
        players: safeList
    });
}

function broadcast(data) {
    const msg = JSON.stringify(data);
    players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(msg);
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Master Server is officially rocking on port ${PORT}`);
});
