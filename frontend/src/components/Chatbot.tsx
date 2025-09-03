// src/components/Chatbot.jsx
import { useState } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);

    // ChatGPT API 호출 예시 (옵션)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_API_KEY`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [...messages, newMessage],
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? '응답 실패';

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setInput('');
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 10 }}>
      <div style={{ height: 200, overflowY: 'scroll' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role === 'user' ? 'You' : 'Bot'}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Chatbot;
