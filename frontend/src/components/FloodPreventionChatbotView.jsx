import React, { useState, useEffect, useRef } from 'react';
import { queryFloodAssistant } from '../services/api';

/**
 * Lightweight, high-performance Markdown formatter for conversational chatbot output.
 * Renders headings, bold text, bullet points, numbers, and emergency highlight boxes.
 */
function MarkdownChatContent({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ margin: '6px 0 10px 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {currentList.map((item, idx) => (
            <li key={idx} style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55 }}>
              {renderInlineStyles(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInlineStyles = (text) => {
    // Replace **bold** with <strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#38bdf8', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} style={{ background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', padding: '1px 5px', borderRadius: '4px', fontSize: '0.84em' }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentList.push(trimmed.substring(2));
      return;
    }

    flushList(index);

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={index} style={{ margin: '14px 0 6px', fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(56,189,248,0.2)', paddingBottom: '4px' }}>
          {renderInlineStyles(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={index} style={{ margin: '16px 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
          {renderInlineStyles(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={index} style={{ margin: '18px 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
          {renderInlineStyles(trimmed.substring(2))}
        </h2>
      );
    } else if (trimmed.startsWith('---')) {
      elements.push(<hr key={index} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />);
    } else if (trimmed.startsWith('⚠️') || trimmed.startsWith('🚨') || trimmed.startsWith('📍') || trimmed.startsWith('**⚠️')) {
      elements.push(
        <div key={index} style={{
          background: 'rgba(239, 68, 68, 0.12)',
          borderLeft: '3px solid #ef4444',
          borderRadius: '4px 8px 8px 4px',
          padding: '8px 12px',
          margin: '10px 0',
          fontSize: '0.86rem',
          color: '#fecaca',
          lineHeight: 1.5
        }}>
          {renderInlineStyles(trimmed)}
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={index} style={{ display: 'flex', gap: '8px', margin: '6px 0', alignItems: 'flex-start' }}>
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: '50%',
              minWidth: '20px',
              height: '20px',
              fontSize: '0.74rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2px'
            }}>
              {match[1]}
            </span>
            <div style={{ flex: 1, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55 }}>
              {renderInlineStyles(match[2])}
            </div>
          </div>
        );
      }
    } else if (trimmed) {
      elements.push(
        <p key={index} style={{ margin: '6px 0', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.6 }}>
          {renderInlineStyles(trimmed)}
        </p>
      );
    }
  });

  flushList('final');
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
}

export default function FloodPreventionChatbotView({
  currentLocation,
  params,
  prediction,
  onBackToDashboard,
  onOpenPredict,
  onOpenMap
}) {
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem('floodrisk_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    } catch {
      return '';
    }
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [autoVoice, setAutoVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningDuration, setListeningDuration] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState(null);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState(null);
  const [speechSynth, setSpeechSynth] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(geminiApiKey);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const accumulatedSpeechRef = useRef('');
  const silenceTimerRef = useRef(null);
  const listeningIntervalRef = useRef(null);

  const [activeTelemetry, setActiveTelemetry] = useState(() => {
    const prob = prediction?.probability !== undefined && prediction?.probability !== null ? Number(prediction.probability) : 0;
    return {
      location: params?.location || currentLocation?.name || 'Live Monitored Location',
      rainfall24h: params?.rainfall24h ?? 0,
      rainfall72h: params?.rainfall72h ?? 0,
      elevation: params?.elevation ?? (currentLocation?.elev || 0),
      probability: prob,
      riskLevel: prediction?.riskLevel || (prob >= 50 ? 'HIGH' : 'LOW'),
      temperature: params?.temperature ?? 25,
      weatherCondition: params?.weatherCondition || 'Monitored',
      isLocationSwitch: false
    };
  });

  useEffect(() => {
    setActiveTelemetry(prev => {
      if (prev.isLocationSwitch) return prev;
      const prob = prediction?.probability !== undefined && prediction?.probability !== null ? Number(prediction.probability) : 0;
      return {
        ...prev,
        location: params?.location || currentLocation?.name || 'Live Monitored Location',
        rainfall24h: params?.rainfall24h ?? prev.rainfall24h,
        rainfall72h: params?.rainfall72h ?? prev.rainfall72h,
        elevation: params?.elevation ?? (currentLocation?.elev || prev.elevation),
        probability: prob,
        riskLevel: prediction?.riskLevel || (prob >= 50 ? 'HIGH' : 'LOW')
      };
    });
  }, [params, currentLocation, prediction]);

  // Initial welcome message with active telemetry grounding
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'FloodGuard Gemini AI',
      text: `Hello! I am **FloodGuard AI**, your dedicated real-time **Flood Prevention & Life-Safety Assistant** powered by Google Gemini and live hydrological physics.

📍 **Active Station Telemetry [${params?.location || currentLocation?.name || 'Live Location'}]**:
• **24h Rainfall**: ${params?.rainfall24h ?? 0} mm | **72h Accumulation**: ${params?.rainfall72h ?? 0} mm
• **Inundation Probability**: ${prediction?.probability !== undefined && prediction?.probability !== null ? prediction.probability : 0}% | **Flood Risk**: ${prediction?.riskLevel || ((prediction?.probability ?? 0) >= 50 ? 'HIGH' : 'LOW')}
• **Elevation**: ${params?.elevation ?? 800} m

How can I help you protect your home, family, or livestock today? Click any quick topic on the left or type your flood prevention question below!`
    }
  ]);

  // Keep initial welcome message live and updated with current location telemetry
  useEffect(() => {
    setMessages(prev => {
      if (prev.length <= 1 && prev[0]?.id === 'msg-init') {
        const liveProb = prediction?.probability !== undefined && prediction?.probability !== null ? prediction.probability : 0;
        const liveRisk = prediction?.riskLevel || (liveProb >= 50 ? 'HIGH' : 'LOW');
        return [
          {
            id: 'msg-init',
            sender: 'assistant',
            time: prev[0].time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: 'FloodGuard Gemini AI',
            text: `Hello! I am **FloodGuard AI**, your dedicated real-time **Flood Prevention & Life-Safety Assistant** powered by Google Gemini and live hydrological physics.

📍 **Active Station Telemetry [${params?.location || currentLocation?.name || 'Live Location'}]**:
• **24h Rainfall**: ${params?.rainfall24h ?? 0} mm | **72h Accumulation**: ${params?.rainfall72h ?? 0} mm
• **Inundation Probability**: ${liveProb}% | **Flood Risk**: ${liveRisk}
• **Elevation**: ${params?.elevation ?? (currentLocation?.elev || 0)} m

How can I help you protect your home, family, or livestock today? Click any quick topic on the left or type your flood prevention question below!`
          }
        ];
      }
      return prev;
    });
  }, [params?.location, params?.rainfall24h, params?.rainfall72h, params?.elevation, prediction?.probability, prediction?.riskLevel, currentLocation?.name, currentLocation?.elev]);

  // Setup Web Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynth(window.speechSynthesis);
    }
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const handleSendMessageRef = useRef(null);

  const cleanupVoiceRecording = () => {
    if (listeningIntervalRef.current) {
      clearInterval(listeningIntervalRef.current);
      listeningIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setListeningDuration(0);
  };

  const cancelVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    cleanupVoiceRecording();
    setIsListening(false);
    setInputQuery('');
    accumulatedSpeechRef.current = '';
  };

  const finishAndSendVoice = (textToSend = null) => {
    const finalQuery = (textToSend !== null ? textToSend : (accumulatedSpeechRef.current || inputQuery)).trim();
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    cleanupVoiceRecording();
    setIsListening(false);
    accumulatedSpeechRef.current = '';
    if (finalQuery && handleSendMessageRef.current) {
      handleSendMessageRef.current(finalQuery);
    }
  };

  // Setup Web Speech Recognition with live streaming interim results
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const piece = event.results[i][0].transcript.trim();
              if (piece) {
                accumulatedSpeechRef.current = (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + ' ' : '') + piece;
              }
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const liveTranscript = (accumulatedSpeechRef.current + (interim ? ' ' + interim : '')).trim();
          if (liveTranscript) {
            setInputQuery(liveTranscript);

            // Auto-send after 2 seconds of silence
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              finishAndSendVoice(liveTranscript);
            }, 2000);
          }
        };

        recog.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setVoiceNotice('Microphone permission blocked. Please enable microphone permissions in your browser URL bar.');
          } else if (event.error !== 'no-speech') {
            setVoiceNotice(`Voice recognition error: ${event.error}`);
          }
          cleanupVoiceRecording();
          setIsListening(false);
        };

        recog.onend = () => {
          cleanupVoiceRecording();
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }

    return () => {
      cleanupVoiceRecording();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      setVoiceNotice('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }
    if (isListening) {
      finishAndSendVoice();
    } else {
      setVoiceNotice(null);
      if (speechSynth) speechSynth.cancel();
      setIsSpeaking(false);
      accumulatedSpeechRef.current = '';
      setInputQuery('');
      setListeningDuration(0);

      try {
        recognitionRef.current.start();
        setIsListening(true);

        if (listeningIntervalRef.current) clearInterval(listeningIntervalRef.current);
        listeningIntervalRef.current = setInterval(() => {
          setListeningDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Recognition start error:', err);
        setVoiceNotice('Could not access microphone. Please check browser microphone permissions.');
        cleanupVoiceRecording();
        setIsListening(false);
      }
    }
  };

  const speakText = (text, msgId) => {
    if (!speechSynth) return;
    if (isSpeaking && activeSpeakingMsgId === msgId) {
      speechSynth.cancel();
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
      return;
    }

    speechSynth.cancel();
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    };

    setIsSpeaking(true);
    setActiveSpeakingMsgId(msgId);
    speechSynth.speak(utterance);
  };

  const handleSendMessage = async (textOverride = null) => {
    const text = (textOverride !== null ? textOverride : inputQuery).trim();
    if (!text || isGenerating) return;

    setInputQuery('');
    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `asst-${Date.now()}`;

    const newHistory = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text
      }
    ];

    setMessages(newHistory);
    setIsGenerating(true);

    // Placeholder message for typewriter streaming
    setMessages(prev => [
      ...prev,
      {
        id: botMsgId,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'Google Gemini 3.5 Flash-Lite (Live)',
        text: '',
        isStreaming: true
      }
    ]);

    const telemetryContext = {
      location: activeTelemetry.location,
      rainfall24h: activeTelemetry.rainfall24h,
      rainfall72h: activeTelemetry.rainfall72h,
      riskLevel: activeTelemetry.riskLevel,
      probability: activeTelemetry.probability,
      elevation: activeTelemetry.elevation,
      temperature: activeTelemetry.temperature,
      weatherCondition: activeTelemetry.weatherCondition
    };

    try {
      const res = await queryFloodAssistant({
        prompt: text,
        telemetry: telemetryContext,
        history: newHistory,
        apiKey: geminiApiKey
      });

      if (res?.telemetry) {
        setActiveTelemetry(prev => ({
          ...prev,
          ...res.telemetry,
          isLocationSwitch: true
        }));
      }

      const fullResponse = res?.response || `### 🌊 Emergency Flood Guidance\n\n1. Move to higher ground immediately.\n2. Turn off the main electrical breaker (MCB).\n3. Avoid driving into floodwaters.\n4. Call emergency services at 112 if trapped.`;
      const modelName = res?.model || 'Google Gemini 3.5 Flash-Lite (Live)';

      // Typewriter streaming effect
      let charIndex = 0;
      const chunkSize = Math.max(4, Math.floor(fullResponse.length / 35));
      const interval = setInterval(() => {
        charIndex += chunkSize;
        if (charIndex >= fullResponse.length) {
          clearInterval(interval);
          setMessages(prev =>
            prev.map(m =>
              m.id === botMsgId
                ? { ...m, text: fullResponse, isStreaming: false, model: modelName }
                : m
            )
          );
          setIsGenerating(false);
          if (autoVoice) {
            setTimeout(() => speakText(fullResponse, botMsgId), 250);
          }
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === botMsgId
                ? { ...m, text: fullResponse.slice(0, charIndex), isStreaming: true, model: modelName }
                : m
            )
          );
        }
      }, 20);
    } catch (err) {
      console.error('Chatbot error:', err);
      const fallback = `⚠️ **Emergency Notice**: Rapid inundation detected. Elevate valuables, shut off main electrical breaker (MCB), and contact NDRF/Civil Defense at 112.`;
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId
            ? { ...m, text: fallback, isStreaming: false }
            : m
        )
      );
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const handleSaveKey = () => {
    const k = customKeyInput.trim();
    if (k) {
      setGeminiApiKey(k);
      try {
        localStorage.setItem('floodrisk_gemini_key', k);
      } catch (e) {}
    }
    setShowKeyModal(false);
  };

  const handleExportChat = () => {
    const transcript = messages.map(m => `[${m.time}] ${m.sender === 'user' ? 'YOU' : m.model || 'ASSISTANT'}:\n${m.text}\n`).join('\n---\n\n');
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FloodGuard_Chat_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const floodPreventionPrompts = [
    {
      category: 'Home & Barrier Defense',
      icon: '🚧',
      title: 'Sandbag Pyramid Formula',
      query: 'What is the exact sandbag pyramid formula and temporary barrier steps to stop water from entering through doors and gates?'
    },
    {
      category: 'Electrical Safety',
      icon: '⚡',
      title: 'MCB Breaker Shutoff',
      query: 'When and how do I shut off the main circuit breaker (MCB) before floodwaters reach lower wall sockets?'
    },
    {
      category: 'Plumbing & Drainage',
      icon: '🚽',
      title: 'Sewer Backflow Prevention',
      query: 'How do I mechanically seal ground floor drains and toilets to stop toxic municipal sewer backflow?'
    },
    {
      category: 'Drinking Water & Health',
      icon: '🚰',
      title: 'Well Disinfection & Boiling',
      query: 'How do I safely purify flood-contaminated drinking water and decontaminate open borewells?'
    },
    {
      category: 'Vehicle Egress',
      icon: '🚗',
      title: 'Car Stalled in Floodwater',
      query: 'My car stalled in rising floodwater, what is the step-by-step egress protocol to escape safely?'
    },
    {
      category: 'Vulnerable Care',
      icon: '👨‍👩‍👧',
      title: 'Elderly & Medical Oxygen',
      query: 'How do I safely evacuate bedridden elderly relatives and medical oxygen equipment before water levels peak?'
    },
    {
      category: 'Farm & Pets',
      icon: '🐄',
      title: 'Livestock Unchaining SOP',
      query: 'Why must livestock be unchained immediately during rising floodwaters, and where should they go?'
    },
    {
      category: 'Emergency Rescue',
      icon: '🆘',
      title: 'Rooftop Trapped & Signaling',
      query: 'We are trapped on the rooftop surrounded by deep floodwater, how should we signal rescue teams and helicopters?'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      height: '100%',
      background: '#070d19',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>

      {/* TOP HEADER BAR */}
      <div style={{
        background: 'rgba(11, 17, 32, 0.95)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBackToDashboard}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 0 12px rgba(2, 132, 199, 0.5)'
            }}>
              🛡️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  FloodGuard AI Prevention Chatbot
                </h1>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid #10b981',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  Google Gemini 3.5 Flash-Lite (Live)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Interactive Conversational AI grounded in Hydrodynamic Survival Physics & Basin Telemetry
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* ENGLISH VOICE BADGE */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🌐</span> English Voice
          </div>

          {/* AUTO-VOICE TOGGLE */}
          <button
            onClick={() => setAutoVoice(!autoVoice)}
            style={{
              background: autoVoice ? 'rgba(2, 132, 199, 0.2)' : '#0f172a',
              border: `1px solid ${autoVoice ? '#0284c7' : '#1e293b'}`,
              color: autoVoice ? '#38bdf8' : '#64748b',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {autoVoice ? '🔊 Auto-Voice: ON' : '🔈 Auto-Voice: OFF'}
          </button>

          {/* EXPORT TRANSCRIPT */}
          <button
            onClick={handleExportChat}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Export chat transcript as Markdown"
          >
            📥 Export
          </button>


          {/* NEW CHAT */}
          <button
            onClick={() => {
              if (speechSynth) speechSynth.cancel();
              const prob = prediction?.probability !== undefined && prediction?.probability !== null ? Number(prediction.probability) : 0;
              setActiveTelemetry({
                location: params?.location || currentLocation?.name || 'Live Monitored Location',
                rainfall24h: params?.rainfall24h ?? 0,
                rainfall72h: params?.rainfall72h ?? 0,
                elevation: params?.elevation ?? (currentLocation?.elev || 0),
                probability: prob,
                riskLevel: prediction?.riskLevel || (prob >= 50 ? 'HIGH' : 'LOW'),
                temperature: params?.temperature ?? 25,
                weatherCondition: params?.weatherCondition || 'Monitored',
                isLocationSwitch: false
              });
              setMessages([
                {
                  id: `msg-${Date.now()}`,
                  sender: 'assistant',
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  model: 'FloodGuard Gemini AI',
                  text: 'New chat session started. Ready for your flood prevention questions or city status queries.'
                }
              ]);
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* BODY SPLIT: SIDEBAR PROMPTS + CHAT CONTAINER */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PROMPTS & TELEMETRY SIDEBAR */}
        <div 
          className="chatgpt-scrollbar"
          style={{
            width: '320px',
            background: '#0b1120',
            borderRight: '1px solid rgba(56, 189, 248, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px',
            gap: '16px'
          }}>
          {/* LIVE TELEMETRY PILL */}
          {(() => {
            const prob = activeTelemetry.probability !== undefined && activeTelemetry.probability !== null ? Number(activeTelemetry.probability) : 0;
            const risk = activeTelemetry.riskLevel || (prob >= 50 ? 'HIGH' : 'LOW');
            const riskColor = prob >= 70 || risk === 'HIGH' || risk === 'CRITICAL' ? '#ef4444' : (prob >= 35 || risk === 'MODERATE' ? '#eab308' : '#10b981');
            const rain24 = activeTelemetry.rainfall24h ?? 0;
            const elev = activeTelemetry.elevation ?? 0;
            const locName = activeTelemetry.location || 'Live Monitored Location';

            return (
              <div style={{
                background: '#070d19',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '12px',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-pulsing-dot" style={{ width: '6px', height: '6px', background: '#38bdf8' }} />
                    Live Ingested Telemetry
                  </div>
                  {activeTelemetry.isLocationSwitch && (
                    <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      ✓ Geo-Linked
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  📍 {locName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
                  <div>24h Rain: <strong style={{ color: '#f8fafc' }}>{rain24} mm</strong></div>
                  <div>Elevation: <strong style={{ color: '#f8fafc' }}>{elev} m</strong></div>
                  <div>Probability: <strong style={{ color: riskColor }}>{prob}%</strong></div>
                  <div>Risk Level: <strong style={{ color: riskColor }}>{risk}</strong></div>
                </div>
              </div>
            );
          })()}

          {/* FLOOD PREPAREDNESS TOPICS */}
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
              ⚡ Flood Prevention Dilemmas:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {floodPreventionPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  disabled={isGenerating}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: isGenerating ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isGenerating) {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.background = '#1e293b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGenerating) {
                      e.currentTarget.style.borderColor = '#1e293b';
                      e.currentTarget.style.background = '#0f172a';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>{p.title}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* HELPLINE CARDS */}
          <div style={{
            marginTop: 'auto',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.76rem'
          }}>
            <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>🚨 Emergency SOS Numbers</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginTop: '4px' }}>
              <span>National Disaster:</span>
              <strong style={{ color: '#38bdf8' }}>112</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginTop: '2px' }}>
              <span>NDRF Control:</span>
              <strong style={{ color: '#38bdf8' }}>1078</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginTop: '2px' }}>
              <span>State Disaster:</span>
              <strong style={{ color: '#38bdf8' }}>1070</strong>
            </div>
          </div>
        </div>

        {/* MAIN CHAT STREAM & INPUT */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#070d19',
          position: 'relative'
        }}>

          {/* ACTIVE SPEAKING BANNER */}
          {isSpeaking && (
            <div style={{
              background: 'rgba(2, 132, 199, 0.2)',
              borderBottom: '1px solid #0284c7',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#38bdf8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔊</span>
                <span>Reading AI flood response out loud...</span>
              </div>
              <button
                onClick={() => {
                  if (speechSynth) speechSynth.cancel();
                  setIsSpeaking(false);
                }}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Stop Audio
              </button>
            </div>
          )}

          {/* MESSAGES SCROLL AREA */}
          <div 
            className="chatgpt-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  {/* BUBBLE HEADER */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    fontSize: '0.74rem',
                    color: '#64748b'
                  }}>
                    {!isUser ? (
                      <>
                        <span style={{ fontSize: '0.9rem' }}>🛡️</span>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>FloodGuard AI</span>
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}>
                          {msg.model || 'Google Gemini'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>You</span>
                        <span>👤</span>
                      </>
                    )}
                    <span>{msg.time}</span>
                  </div>

                  {/* BUBBLE BODY */}
                  <div style={{
                    background: isUser ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#0b1120',
                    color: isUser ? '#ffffff' : '#f1f5f9',
                    border: isUser ? 'none' : '1px solid rgba(56, 189, 248, 0.22)',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: isUser ? '12px 18px' : '16px 20px',
                    maxWidth: isUser ? '75%' : '88%',
                    lineHeight: 1.6,
                    fontSize: '0.88rem',
                    boxShadow: isUser ? '0 4px 14px rgba(2, 132, 199, 0.3)' : '0 4px 16px rgba(0,0,0,0.35)',
                    wordBreak: 'break-word'
                  }}>
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    ) : (
                      <>
                        <MarkdownChatContent content={msg.text} />
                        {msg.isStreaming && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '14px',
                            background: '#38bdf8',
                            marginLeft: '4px',
                            verticalAlign: 'middle',
                            animation: 'pulse 1s infinite'
                          }} />
                        )}
                      </>
                    )}

                    {/* ACTION CONTROLS */}
                    {!isUser && !msg.isStreaming && msg.text && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <button
                          onClick={() => speakText(msg.text, msg.id)}
                          style={{
                            background: activeSpeakingMsgId === msg.id ? '#ef4444' : '#070d19',
                            border: `1px solid ${activeSpeakingMsgId === msg.id ? '#ef4444' : '#1e293b'}`,
                            color: activeSpeakingMsgId === msg.id ? '#ffffff' : '#38bdf8',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{activeSpeakingMsgId === msg.id ? '⏹️ Stop' : '🔊 Listen'}</span>
                        </button>

                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(msg.text);
                              alert('Copied flood prevention advisory to clipboard!');
                            } catch (e) {}
                          }}
                          style={{
                            background: '#070d19',
                            border: '1px solid #1e293b',
                            color: '#94a3b8',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* BOTTOM COMPOSER */}
          <div style={{
            padding: '16px 24px',
            background: '#0b1120',
            borderTop: '1px solid rgba(56, 189, 248, 0.2)',
            position: 'relative'
          }}>
            {/* VOICE NOTICE BANNER */}
            {voiceNotice && (
              <div style={{
                marginBottom: '10px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                animation: 'fadeIn 0.2s ease'
              }}>
                <span>🎙️ {voiceNotice}</span>
                <button
                  onClick={() => setVoiceNotice(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: isListening ? '#0f172a' : '#070d19',
              border: `1px solid ${isListening ? 'rgba(239, 68, 68, 0.6)' : 'rgba(56, 189, 248, 0.3)'}`,
              borderRadius: '14px',
              padding: '6px 12px',
              boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.25s ease'
            }}>
              {/* MICROPHONE BUTTON WITH PULSE */}
              <button
                onClick={toggleMicListening}
                style={{
                  background: isListening ? '#ef4444' : '#0f172a',
                  border: `1px solid ${isListening ? '#ef4444' : '#1e293b'}`,
                  color: '#ffffff',
                  borderRadius: '10px',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem',
                  cursor: 'pointer',
                  animation: isListening ? 'voiceMicPulse 1.2s infinite' : 'none',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title={isListening ? 'Listening... click to send now' : 'Click to speak emergency question'}
              >
                {isListening ? '🛑' : '🎤'}
              </button>

              {/* ACTIVE AUDIO WAVEFORM & DURATION INDICATOR */}
              {isListening && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderRadius: '20px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  flexShrink: 0
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444'
                  }} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f87171', fontFamily: 'monospace' }}>
                    {String(Math.floor(listeningDuration / 60)).padStart(2, '0')}:{String(listeningDuration % 60).padStart(2, '0')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px', paddingLeft: '4px' }}>
                    <span className="voice-wave-bar" style={{ animationDelay: '0s' }} />
                    <span className="voice-wave-bar" style={{ animationDelay: '0.2s' }} />
                    <span className="voice-wave-bar" style={{ animationDelay: '0.4s' }} />
                    <span className="voice-wave-bar" style={{ animationDelay: '0.1s' }} />
                    <span className="voice-wave-bar" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}

              {/* INPUT FIELD WITH LIVE REAL-TIME SPEECH STREAMING */}
              <input
                type="text"
                placeholder={
                  isListening
                    ? (inputQuery ? inputQuery : '🎙️ Listening... speak clearly into microphone...')
                    : "Ask FloodGuard AI (e.g. 'How do I prevent flood water from entering my door?')..."
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isListening) finishAndSendVoice();
                    else handleSendMessage();
                  }
                }}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: isListening ? '#38bdf8' : '#f8fafc',
                  fontSize: '0.92rem',
                  padding: '8px 4px',
                  fontWeight: isListening ? 600 : 400
                }}
              />

              {/* CANCEL VOICE RECORDING BUTTON */}
              {isListening && (
                <button
                  onClick={cancelVoiceInput}
                  style={{
                    background: 'rgba(100, 116, 139, 0.2)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                  title="Cancel voice input"
                >
                  ✕ Cancel
                </button>
              )}

              {/* SEND BUTTON */}
              <button
                onClick={() => {
                  if (isListening) finishAndSendVoice();
                  else handleSendMessage();
                }}
                disabled={isGenerating || (!inputQuery.trim() && !isListening)}
                style={{
                  background: isGenerating || (!inputQuery.trim() && !isListening)
                    ? '#1e293b'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: isGenerating || (!inputQuery.trim() && !isListening) ? '#64748b' : '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isGenerating || (!inputQuery.trim() && !isListening) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: (inputQuery.trim() || isListening) && !isGenerating ? '0 0 12px rgba(2, 132, 199, 0.5)' : 'none',
                  flexShrink: 0
                }}
              >
                <span>{isGenerating ? 'Thinking...' : (isListening ? 'Send Voice' : 'Ask AI')}</span>
                <span>➤</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* GEMINI KEY MODAL */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#0b1120',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            width: '460px',
            maxWidth: '90%',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>
              Google Gemini API Configuration
            </h3>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.5 }}>
              Your Google Gemini API key powers the live flood prevention reasoning engine. Free tier provides 15 requests/minute at ₹0 cost.
            </p>
            <input
              type="text"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... or AQ.Ab8... key"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                background: '#070d19',
                color: '#38bdf8',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
