import React, { useState } from 'react';
import WhiteBoard from './WhiteBoard';
import './App.css';

function App() {
    const [mode, setMode] = useState('WebSocket');

    return (
        <div className="App">
            <h1>Real-Time Drawing Board</h1>
            <label>Select Mode:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="WebSocket">WebSocket</option>
                <option value="Long Polling">Long Polling</option>
                <option value="Adaptive Polling">Adaptive Polling</option>
            </select>
            <WhiteBoard mode={mode} />
        </div>
    );
}

export default App;