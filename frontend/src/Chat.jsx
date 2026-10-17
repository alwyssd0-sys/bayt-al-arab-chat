import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function Chat(){
  const [room, setRoom] = useState('general')
  const [username, setUsername] = useState('guest')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const socketRef = useRef(null)
  const listRef = useRef(null)

  useEffect(()=>{
    // fetch recent messages
    fetch(`${BACKEND}/rooms/${room}/messages?limit=100`).then(r=>r.json()).then(data=>setMessages(data)).catch(()=>{});

    socketRef.current = io(BACKEND);
    socketRef.current.on('connect', ()=>{
      socketRef.current.emit('join', room);
    });
    socketRef.current.on('message', (msg)=>{
      setMessages(prev=>[...prev, msg]);
    });
    socketRef.current.on('system', (s)=>{
      setMessages(prev=>[...prev, { username: 'system', text: s.text, createdAt: new Date() }]);
    });

    return ()=>{
      socketRef.current.disconnect();
    }
  }, [room]);

  useEffect(()=>{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [messages])

  const send = (e)=>{
    e.preventDefault();
    if(!text) return;
    const payload = { room, username, text };
    socketRef.current.emit('message', payload);
    setText('');
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label>Room<input value={room} onChange={e=>setRoom(e.target.value)} /></label>
      </div>
      <div className="chat">
        <div className="messages" ref={listRef}>
          {messages.map((m, i)=> (
            <div key={i} className={`message ${m.username==='system'?'system':''}`}>
              <span className="meta">{m.username} <small>{new Date(m.createdAt).toLocaleTimeString()}</small></span>
              <div className="text">{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="composer">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="أرسل رسالة..." />
          <button type="submit">إرسال</button>
        </form>
      </div>
    </div>
  )
}
