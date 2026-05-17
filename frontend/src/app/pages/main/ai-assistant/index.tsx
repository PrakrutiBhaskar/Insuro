import { motion } from "motion/react";
import { useState } from "react";
import { useAppStore } from "../../../../store";
import { api } from "../../../../api/client";

export default function AIAssistant() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your INSURO AI guide. How can I help you with your coverage today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);

    try {
      const data = await api.ai.chat(query);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now, but I'm still here to help!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reco-wrap" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '24px' }}>AI Coverage Assistant</h2>
      
      <div style={{ flex: 1, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                padding: '16px 20px',
                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--primary-bright))' : 'var(--navy3)',
                border: '1px solid var(--border)',
                fontSize: '0.94rem',
                lineHeight: 1.6,
                boxShadow: m.role === 'user' ? '0 8px 24px var(--primary-glow)' : 'none',
                color: 'white'
              }}
            >
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', opacity: 0.6, fontWeight: 700 }}>
                {m.role === 'user' ? 'You' : 'INSURO Guide'}
              </div>
              {m.content}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', padding: '16px 20px', background: 'var(--navy3)', borderRadius: '20px 20px 20px 4px', border: '1px solid var(--border)' }}
            >
              <span className="live-dot" style={{ width: '4px', height: '4px' }}></span>
              <span className="live-dot" style={{ width: '4px', height: '4px', animationDelay: '0.2s' }}></span>
              <span className="live-dot" style={{ width: '4px', height: '4px', animationDelay: '0.4s' }}></span>
            </motion.div>
          )}
        </div>
        
        <form onSubmit={handleSend} style={{ padding: '24px', background: 'rgba(2,13,26,0.6)', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', backdropFilter: 'blur(10px)' }}>
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about plan benefits, risk factors, or IRDAI regulations..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 20px', color: 'white', outline: 'none', fontSize: '0.92rem' }}
          />
          <button className="btn btn-em btn-lg" disabled={isLoading} style={{ padding: '10px 24px' }}>
            {isLoading ? '...' : 'Send →'}
          </button>
        </form>
      </div>
    </div>
  );
}
