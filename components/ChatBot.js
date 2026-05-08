'use client';
import { useState, useEffect, useRef } from 'react';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your EduVantage assistant. How can I help you today? 🎓' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const responses = {
    'features': 'EduVantage offers a unified ecosystem that outperforms alternatives! Modules include CBC Analytics, Auto-Fee Reconciliation via M-Pesa, Bulk SMS, Smart Timetable generation, and an intuitive Parent Portal. 🚀',
    'analytics': 'Our Analytics engine is fully CBC & 8-4-4 compliant. It instantly generates report cards, automated merit lists, and provides subject-level trend analysis! 📊',
    'finance': 'Say goodbye to manual ledgers! EduVantage Finance features instant M-Pesa auto-reconciliation, digital parent e-receipts, and bulk staff payroll sync. 💰',
    'timetable': 'Our AI Timetable engine automatically resolves scheduling conflicts and optimizes teacher workload to instantly generate digital class and exam routines. 📅',
    'communication': 'Bridge the gap between school and home with targeted bulk SMS campaigns, automated absence alerts, and direct parent-teacher messaging! 📲',
    'price': 'Simple, transparent pricing! Basic Plan is KES 150/student per term. Premium (with M-Pesa & bulk payroll) is KES 300/student. Start with a 30-day Free Trial! 💎',
    'trial': 'You can start your 30-day free trial instantly. No credit card required! Just click "Get Started" on the homepage to set up your school in 60 seconds. ✨',
    'contact': 'Our support team is ready to help! 📞 Call us at +254 700 111 222 or email hello@eduvantage.app',
    'demo': 'I can definitely show you around! Start your free trial to instantly access the Admin Dashboard, or reach out to our team for a guided tour! 📺',
    'default': 'That is a great question! I am still learning, but I can tell you about our Features, Pricing, Analytics, M-Pesa integration, or help you start a Free Trial. 🌟'
  };

  const handleSend = (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let botResponse = responses.default;
      const q = userMsg.toLowerCase();
      
      if (q.includes('feature') || q.includes('what can you do')) botResponse = responses.features;
      else if (q.includes('analytic') || q.includes('report') || q.includes('mark') || q.includes('cbc') || q.includes('grade')) botResponse = responses.analytics;
      else if (q.includes('finance') || q.includes('fee') || q.includes('m-pesa') || q.includes('mpesa') || q.includes('pay') || q.includes('receipt')) botResponse = responses.finance;
      else if (q.includes('timetable') || q.includes('schedule') || q.includes('conflict')) botResponse = responses.timetable;
      else if (q.includes('sms') || q.includes('message') || q.includes('parent') || q.includes('communicate')) botResponse = responses.communication;
      else if (q.includes('price') || q.includes('cost') || q.includes('how much')) botResponse = responses.price;
      else if (q.includes('trial') || q.includes('free') || q.includes('register')) botResponse = responses.trial;
      else if (q.includes('contact') || q.includes('help') || q.includes('support')) botResponse = responses.contact;
      else if (q.includes('demo') || q.includes('show me')) botResponse = responses.demo;

      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    }, 1000);
  };

  const quickReplies = [
    { label: '📊 Analytics & CBC', val: 'analytics' },
    { label: '💰 M-Pesa & Fees', val: 'finance' },
    { label: '📅 Smart Timetable', val: 'timetable' },
    { label: '📲 Parent SMS', val: 'communication' },
    { label: '✨ Pricing & Trial', val: 'price' }
  ];

  return (
    <div className="chatbot-root">
      {!isOpen && (
        <button className="chat-trigger" onClick={() => setIsOpen(true)}>
          <div className="trigger-pulse"></div>
          <span className="icon">💬</span>
          <span className="label">Chat with EduBot</span>
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-hdr">
            <div className="bot-info">
              <div className="avatar">🤖</div>
              <div>
                <div className="name">EduBot AI</div>
                <div className="status">Always Active</div>
              </div>
            </div>
            <button className="close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-wrap ${m.role}`}>
                <div className="msg-bubble">{m.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="msg-wrap bot">
                <div className="msg-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-quick-replies">
            {quickReplies.map(r => (
              <button key={r.val} onClick={() => handleSend(r.label)}>{r.label}</button>
            ))}
          </div>

          <div className="chat-input">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
            />
            <button onClick={() => handleSend()} className="send-btn">➔</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .chatbot-root { position: fixed; bottom: 30px; right: 30px; z-index: 2000; }
        
        .chat-trigger { 
          display: flex; align-items: center; gap: 12px; padding: 14px 28px;
          background: #4F46E5; color: #fff; border-radius: 99px; border: none;
          cursor: pointer; font-weight: 800; box-shadow: 0 20px 40px rgba(79, 70, 229, 0.4);
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
        }
        .chat-trigger:hover { transform: scale(1.05) translateY(-5px); box-shadow: 0 30px 60px rgba(79, 70, 229, 0.5); }
        .trigger-pulse { position: absolute; inset: 0; border-radius: 99px; background: #4F46E5; z-index: -1; animation: pulse 2s infinite; opacity: 0.5; }
        @keyframes pulse { from { transform: scale(1); opacity: 0.5; } to { transform: scale(1.4); opacity: 0; } }

        .chat-window {
          width: 400px; height: 580px; background: #fff; border-radius: 30px;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 40px 100px rgba(15, 23, 42, 0.2); border: 1px solid rgba(0,0,0,0.08);
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } }

        .chat-hdr { 
          padding: 24px; background: linear-gradient(135deg, #4F46E5, #3730A3); color: #fff; 
          display: flex; justify-content: space-between; align-items: center;
        }
        .bot-info { display: flex; gap: 14px; align-items: center; }
        .bot-info .avatar { width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; backdrop-filter: blur(10px); }
        .name { font-weight: 800; font-size: 16px; letter-spacing: -0.01em; }
        .status { font-size: 11px; opacity: 0.8; display: flex; align-items: center; gap: 6px; font-weight: 600; }
        .status::before { content: ''; width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; }
        .close { background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s; }
        .close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

        .chat-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; background: #F8FAFC; scroll-behavior: smooth; }
        .msg-wrap { display: flex; width: 100%; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } }
        .msg-wrap.bot { justify-content: flex-start; }
        .msg-wrap.user { justify-content: flex-end; }
        .msg-bubble { 
          max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14.5px; line-height: 1.6; font-weight: 500;
        }
        .bot .msg-bubble { background: #fff; color: #1E293B; border-bottom-left-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02); }
        .user .msg-bubble { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); }

        .typing { display: flex; gap: 4px; padding: 12px 16px !important; }
        .typing span { width: 6px; height: 6px; background: #94A3B8; border-radius: 50%; animation: blink 1.4s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

        .chat-quick-replies { padding: 12px 20px; display: flex; gap: 8px; flex-wrap: wrap; background: #fff; border-top: 1px solid #F1F5F9; }
        .chat-quick-replies button { 
          padding: 8px 14px; background: #F1F5F9; border: 1.5px solid #E2E8F0; border-radius: 12px; 
          font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; transition: 0.2s;
        }
        .chat-quick-replies button:hover { background: #EEF2FF; border-color: #4F46E5; color: #4F46E5; transform: translateY(-2px); }

        .chat-input { padding: 18px 24px; background: #fff; display: flex; gap: 14px; align-items: center; }
        .chat-input input { flex: 1; border: none; background: #F1F5F9; padding: 14px 20px; border-radius: 16px; font-size: 14px; outline: none; font-weight: 500; }
        .send-btn { width: 48px; height: 48px; background: #4F46E5; color: #fff; border: none; border-radius: 14px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: 0.3s; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
        .send-btn:hover { transform: scale(1.1) rotate(-10deg); background: #3730A3; }

        @media (max-width: 450px) {
          .chatbot-root { bottom: 15px; right: 15px; }
          .chat-window { 
            width: calc(100vw - 30px); 
            height: calc(100vh - 100px); 
            max-height: 600px;
            bottom: 0; 
            right: 0; 
            border-radius: 20px; 
          }
          .chat-trigger { padding: 12px 20px; font-size: 13px; }
          .chat-trigger .label { display: none; }
          .chat-hdr { padding: 16px; }
          .chat-body { padding: 16px; }
          .chat-input { padding: 12px 16px; }
          .msg-bubble { max-width: 90%; }
        }
      `}</style>
    </div>
  );
}
