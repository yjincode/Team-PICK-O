import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('확인 중...');

  useEffect(() => {
    // 백엔드 API 연결 테스트
    fetch('/api/health')
      .then(response => response.ok ? '✅ 연결됨' : '❌ 연결 실패')
      .then(status => setApiStatus(status))
      .catch(() => setApiStatus('❌ 연결 실패'));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 Team-PICK-O</h1>
        <p>팀 프로젝트 관리 플랫폼</p>
        <div className="status-card">
          <h3>시스템 상태</h3>
          <p>프론트엔드: ✅ 정상</p>
          <p>백엔드 API: {apiStatus}</p>
        </div>
        <div className="info-card">
          <h3>개발 환경</h3>
          <p>React: {React.version}</p>
          <p>Node.js: {process.version}</p>
          <p>환경: {process.env.NODE_ENV}</p>
        </div>
      </header>
    </div>
  );
}

export default App;