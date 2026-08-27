'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
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

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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

              setMessages((prev) => {
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Erreur de connexion au backend. Vérifie que le serveur Hermes tourne.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const renderCodeBlock = (code: string, lang: string, key: string | number) => (
    <div key={key} style={{ margin: '8px 0' }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '8px 8px 0 0',
        padding: '6px 12px',
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{lang}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Copier
        </button>
      </div>
      <pre style={{
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '12px',
        borderRadius: '0 0 8px 8px',
        overflowX: 'auto',
        fontSize: '13px',
        margin: 0,
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        lineHeight: '1.5'
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );

  const renderContent = (content: string) => {
    // Split sur les blocs markdown ``` d'abord
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        const lang = match?.[1] || '';
        const code = match?.[2] || part.replace(/```/g, '');
        return renderCodeBlock(code.trim(), lang || 'code', i);
      }
      
      // Cherche les JSON bruts (non entourés de ```)
      // Regex qui capture les blocs { ... } de plus de 50 caractères (pour éviter les faux positifs)
      const jsonRegex = /(\{[\s\S]{50,?\})/g;
      const textParts = part.split(jsonRegex);
      
      return textParts.map((textPart, j) => {
        const key = `${i}-${j}`;
        const trimmed = textPart.trim();
        
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            JSON.parse(trimmed);
            return renderCodeBlock(trimmed, 'json', key);
          } catch {
            return <span key={key} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{textPart}</span>;
          }
        }
        return <span key={key} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{textPart}</span>;
      });
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        padding: '14px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        zIndex: 10
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}>
            🤖
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' }}>
              Hermes n8n Workflows
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Génère des workflows n8n avec l'IA · Modèle: auto/best-coding
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginTop: '100px',
            padding: '48px 32px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '20px',
            border: '1px dashed #cbd5e1',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{ fontSize: '52px', marginBottom: '20px' }}>⚡</div>
            <h3 style={{ margin: '0 0 10px', color: '#475569', fontSize: '20px', fontWeight: 600 }}>
              Prêt à créer des workflows !
            </h3>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Décris ce que tu veux automatiser avec n8n.<br/>
              <em style={{ color: '#64748b' }}>"Crée un workflow qui reçoit un webhook, envoie un email et poste sur Slack"</em>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '20px',
            animation: 'fadeInUp 0.35s ease-out'
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                : '#ffffff',
              color: msg.role === 'user' ? '#ffffff' : '#1e293b',
              boxShadow: msg.role === 'user'
                ? '0 4px 12px rgba(59, 130, 246, 0.2)'
                : '0 2px 8px rgba(0, 0, 0, 0.06)',
              fontSize: '14.5px',
              lineHeight: '1.65',
              border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                marginBottom: '6px',
                opacity: 0.75,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {msg.role === 'user' ? '👤 Toi' : '🤖 Hermes'}
              </div>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px 18px 18px 4px',
              padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'bounce 1.4s infinite ease-in-out both'
                }} />
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.16s'
                }} />
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.32s'
                }} />
              </div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Hermes réfléchit...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #e2e8f0',
        padding: '16px 24px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Crée un workflow n8n qui..."
            rows={1}
            style={{
              flex: 1,
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              fontSize: '14.5px',
              outline: 'none',
              transition: 'all 0.2s',
              background: '#f8fafc',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#ffffff',
              padding: '12px 22px',
              borderRadius: '14px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || !input.trim() ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
            }}
          >
            {loading ? '...' : 'Envoyer'}
          </button>
        </div>
        <div style={{ maxWidth: '800px', margin: '8px auto 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
            Hermes peut générer des workflows n8n complets en JSON. Appuie sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
