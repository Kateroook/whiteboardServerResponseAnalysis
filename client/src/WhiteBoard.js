import React, { useRef, useState, useEffect } from 'react';
import './WhiteBoard.css';

const SERVER_URL = 'http://localhost:3000';

function WhiteBoard({ mode }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawData, setDrawData] = useState([]);
    const [socket, setSocket] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(0);
    

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        contextRef.current = context;
        
        if (mode === 'WebSocket') {
            const ws = new WebSocket('ws://localhost:3000');
            ws.onopen = () => console.log('WebSocket connection established');
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'DRAW') drawOnCanvas(message.data);
            };
            setSocket(ws);
        }

        return () => {
            if (socket) socket.close();
        };
    }, [mode]);

    useEffect(() => {
        if (mode === 'Long Polling' || mode === 'Adaptive Polling') {
            const interval = setInterval(fetchDrawData, mode === 'Long Polling' ? 3000 : 1000);
            return () => clearInterval(interval);
        }
    }, [mode, lastUpdate]);

    const fetchDrawData = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/${mode.toLowerCase()}?lastUpdate=${lastUpdate}`);
            const data = await response.json();
            if (data.data) data.data.forEach(drawOnCanvas);
            setLastUpdate(data.lastUpdate);
        } catch (error) {
            console.error('Error fetching draw data:', error);
        }
    };

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = async ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    
        const data = { x: offsetX, y: offsetY, timestamp: Date.now() }; 
    
        if (mode === 'WebSocket' && socket) {
            socket.send(JSON.stringify({ type: 'DRAW', data }));
        } else if (mode === 'Long Polling' || mode === 'Adaptive Polling') {
            const response = await fetch(`${SERVER_URL}/draw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });
    
            const result = await response.json();
            console.log(`Response time from server: ${result.responseTime} ms`); 
        }
    };

    const finishDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const drawOnCanvas = (data) => {
        contextRef.current.lineTo(data.x, data.y);
        contextRef.current.stroke();
    };

    return (
        <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={finishDrawing}
            onMouseLeave={finishDrawing}
        />
    );
}

export default WhiteBoard;
