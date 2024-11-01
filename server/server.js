const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let drawingData = []; // Store drawing data in memory

app.use(cors());
// Middleware for parsing JSON data
app.use(express.json());

// Serve static files if needed (optional)
app.use(express.static('public'));

// WebSocket logic
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send existing drawing data to new clients
    ws.send(JSON.stringify({ type: 'INIT', data: drawingData }));

    // Handle incoming WebSocket messages
    ws.on('message', (message) => {
        const { type, data } = JSON.parse(message);
        if (type === 'DRAW') {
            drawingData.push(data);
            broadcastToWebSocketClients({ type: 'DRAW', data });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Helper function to broadcast data to all WebSocket clients
function broadcastToWebSocketClients(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Long Polling endpoint
app.get('/long-poll', (req, res) => {
    const lastUpdate = req.query.lastUpdate || 0;

    const sendData = () => {
        const newDrawings = drawingData.slice(lastUpdate);
        res.json({ data: newDrawings, lastUpdate: drawingData.length });
    };

    // Check if there is new data; if not, delay response
    if (drawingData.length > lastUpdate) {
        sendData();
    } else {
        setTimeout(sendData, 3000); // Poll every 3 seconds if no new data
    }
});

// Adaptive Polling endpoint
app.get('/adaptive-poll', (req, res) => {
    const lastUpdate = req.query.lastUpdate || 0;
    const recentDrawings = drawingData.slice(lastUpdate);

    // Adjust polling interval based on recent activity
    const interval = recentDrawings.length > 0 ? 1000 : 5000;

    setTimeout(() => {
        res.json({ data: recentDrawings, lastUpdate: drawingData.length });
    }, interval);
});

app.post('/draw', (req, res) => {
    const { data } = req.body;
    const serverTime = Date.now(); 
    const responseTime = serverTime - data.timestamp; 

    drawingData.push(data);

    
    console.log(`Response time: ${responseTime} ms`);

    // Respond and update clients
    res.status(200).json({ status: 'success', responseTime });
    broadcastToWebSocketClients({ type: 'DRAW', data });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
