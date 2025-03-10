const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();

// In-memory storage for OTPs
const otpData = {};

// WebSocket setup
const wss = new WebSocketServer({ noServer: true });
const clients = [];
wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    clients.push(ws);

    ws.on('close', () => {
        console.log('WebSocket disconnected');
        const index = clients.indexOf(ws);
        if (index > -1) {
            clients.splice(index, 1);
        }
    });
});

// Handle OTP submission or fetching
app.get('/', (req, res) => {
    const phone = req.query.phone;
    const otp = req.query.otp;

    if (phone && otp) {
        // Save OTP in memory
        otpData[phone] = otp;

        // Notify all WebSocket clients
        const message = JSON.stringify({ phone, otp });
        clients.forEach((ws) => ws.send(message));

        return res.status(200).json({
            message: `OTP ${otp} received for phone ${phone}`,
            status: 'success',
        });
    }

    if (phone && !otp) {
        // Fetch the latest OTP for the given phone number
        const latestOtp = otpData[phone];
        if (latestOtp) {
            return res.status(200).json({
                phone,
                otp: latestOtp,
            });
        } else {
            return res.status(404).json({
                message: `No OTP found for phone ${phone}`,
                status: 'error',
            });
        }
    }

    // Serve frontend if no query parameters are provided
    if (!phone && !otp) {
        res.sendFile(__dirname + '/public/index.html');
    } else {
        res.status(400).json({
            message: 'Invalid request. Please provide phone and/or OTP.',
            status: 'error',
        });
    }
});

// Fetch all OTP data for debugging purposes
app.get('/fetch-otp-data', (req, res) => {
    res.json(otpData);
});

// Start server and WebSocket
const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});

server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});
