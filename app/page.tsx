'use client';

import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const newMessages = [...messages, userMsg];
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error('Erreur API');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              assistantContent += delta;
              
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return updated;
              });
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur de connexion' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '768px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>🤖 Hermes n8n Workflows</h1>
      
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
        {messages.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center' }}>Pose une question pour générer un workflow n8n...</p>}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
            <div style={{ maxWidth: '80%', borderRadius: '8px', padding: '8px 16px', backgroundColor: msg.role === 'user' ? '#3b82f6' : '#ffffff', color: msg.role === 'user' ? '#ffffff' : '#000000', border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '14px', margin: 0 }}>{msg.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}>
              <span>⏳ Hermes réfléchit...</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ex: Crée un workflow n8n qui..."
          style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ backgroundColor: '#3b82f6', color: '#ffffff', padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
