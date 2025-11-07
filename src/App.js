import React, { useState } from "react";
import axios from "axios";

const API_BASE = "https://YOUR_BACKEND.onrender.com"; // غيّرها لاحقًا

function App() {
  const [log, setLog] = useState("");

  async function testAPI() {
    try {
      const res = await axios.get(`${API_BASE}/api/testdb`);
      setLog(JSON.stringify(res.data));
    } catch (err) {
      setLog(err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>لوحة التحكم (Admin UI)</h2>
      <button onClick={testAPI}>اختبار الاتصال بالسيرفر</button>
      <pre>{log}</pre>
    </div>
  );
}

export default App;
