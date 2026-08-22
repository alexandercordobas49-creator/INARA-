import React, { useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import "./AtlasDashboard.css";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";

const inspiringQuotes = [
  "Hoy es un buen día para aprender algo nuevo.",
  "Cada pequeño avance te acerca a tu meta.",
  "El aprendizaje es un camino de crecimiento.",
  "Tu esfuerzo de hoy construye tu futuro.",
  "La excelencia nace de la constancia.",
];

export default function AtlasDashboard({
  question,
  setQuestion,
  result,
  loading,
  ask,
}) {
  const [dailyQuote, setDailyQuote] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, author: "Atlas", role: "assistant", text: "Hola — soy Atlas, tu Centro Inteligente de Aprendizaje. ¿En qué puedo ayudarte hoy?" },
  ]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const today = new Date().getDate();
    setDailyQuote(
      inspiringQuotes[today % inspiringQuotes.length]
    );
  }, []);

  useEffect(() => {
    if (result) {
      setMessages((m) => [
        ...m,
        { id: Date.now(), author: "Atlas", role: "assistant", text: String(result) },
      ]);
    }
  }, [result]);

  const metrics = [
    {
      label: "XP",
      value: "2,450",
      icon: "⭐",
    },
    {
      label: "Nivel",
      value: "8",
      icon: "🏆",
    },
    {
      label: "Racha",
      value: "12 días",
      icon: "🔥",
    },
    {
      label: "Cursos",
      value: "5",
      icon: "📚",
    },
  ];

  // Handlers
  const handleContinue = () => {
    setModal({
      type: 'info',
      title: 'Reanudar Álgebra Lineal',
      message: 'Se abrirá la última lección donde dejaste: "Sistemas de ecuaciones lineales". Vas al 45% del progreso.',
      actions: [
        {
          label: 'Comenzar',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  const handleQuiz = () => {
    setModal({
      type: 'info',
      title: 'Quiz Rápido - 5 min',
      message: 'Demuestra lo que sabes sobre los temas de esta semana. Recibirás XP y multiplica tu racha.',
      actions: [
        {
          label: 'Comenzar Quiz',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  const handleExploreCourses = () => {
    setModal({
      type: 'info',
      title: 'Explorar Cursos',
      message: 'Tenemos 85 cursos disponibles en todas las áreas. Filtra por materia, dificultad o tiempo disponible.',
      actions: [
        {
          label: 'Ver Catálogo',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  const handleSuggestionCTA = () => {
    setModal({
      type: 'success',
      title: '¡Excelente decisión!',
      message: 'Comenzarás con Álgebra Lineal. Tendrás acceso a:\n\n📺 Video explicativo (8 min)\n📝 Apuntes descargables\n🎯 Ejercicios prácticos\n✅ Prueba de conocimiento',
      actions: [
        {
          label: 'Empezar ahora',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  return (
    <>
      <Modal
        isOpen={modal?.isOpen || false}
        title={modal?.title || ''}
        message={modal?.message || ''}
        type={modal?.type || 'info'}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      />
      <div className="atlas-dashboard">

      <div className="atlas-page-header">
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-3">Tu Compañero Digital</h1>
          <p className="text-lg text-slate-600 font-medium max-w-2xl">Atlas analiza tu ritmo y te propone las prioridades de estudio del día para avanzar con confianza.</p>
        </div>
      </div>

      <div className="atlas-top-grid">
        <Panel className="atlas-hero-card">
          <div className="atlas-hero-card-top">
            <div className="atlas-avatar-card">
              <div className="avatar-icon-large">🤖</div>
            </div>

            <div className="atlas-hero-copy">
              <div className="atlas-hero-pill">Plan recomendado</div>
              <p className="atlas-hero-label">Atlas</p>
              <h2 className="atlas-hero-title">Tu compañero inteligente de aprendizaje</h2>
              <p className="atlas-hero-description">¡Hola! Revisé tu progreso de ayer y creo que hoy sería perfecto repasar Álgebra Lineal. Estás muy cerca de completarlo.</p>

              <div className="atlas-hero-badges">
                <span>20 min</span>
                <span>Racha +12</span>
                <span>Nivel 8</span>
              </div>

              <p className="atlas-hero-quote">"{dailyQuote}"</p>
            </div>

            <span className="atlas-badge">En línea</span>
          </div>

          <div className="atlas-chat-hero">
            <div className="atlas-chat-card">
              <div className="atlas-chat-card-header">
                <div className="atlas-chat-card-avatar">🤖</div>
                <div>
                  <p className="atlas-chat-card-title">Atlas</p>
                  <p className="atlas-chat-card-subtitle">Tus recomendaciones personalizadas</p>
                </div>
              </div>

              <div className="atlas-chat-feed">
                {messages.map((message) => (
                  <div key={message.id} className={`atlas-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
                    <div className="atlas-message-bubble">
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="atlas-action-buttons">
              <button className="atlas-action-pill atlas-action-primary" onClick={handleContinue}>Continuar donde dejé</button>
              <button className="atlas-action-pill" onClick={handleQuiz}>Quiz rápido</button>
              <button className="atlas-action-pill" onClick={handleExploreCourses}>Explorar cursos</button>
            </div>
          </div>

          <div className="atlas-input-row">
            <input
              className="atlas-input"
              type="text"
              placeholder="Pregúntale a Atlas algo..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              className="atlas-input-button"
              onClick={() => {
                if (!question.trim()) return;
                setMessages((m) => [...m, { id: Date.now(), author: 'Tú', role: 'user', text: question }]);
                ask();
                setQuestion('');
              }}
              disabled={loading}
            >
              ➤
            </button>
          </div>
        </Panel>

        <Panel className="atlas-suggestions-panel">
          <div className="atlas-suggestions-header">
            <div>
              <p className="small-label">Atlas te sugiere hoy</p>
              <h3>Basado en tu ritmo de aprendizaje</h3>
            </div>
            <button className="atlas-link-button">Ver todas →</button>
          </div>

          <div className="atlas-suggestion-card highlight-card">
            <div>
              <p className="suggestion-label">Repasar Álgebra Lineal</p>
              <p className="suggestion-subtitle">20 min · Prioritario</p>
            </div>
            <div className="progress-pill">
              <span>45%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }} />
            </div>
            <button className="atlas-suggestion-cta" onClick={handleSuggestionCTA}>¡Empecemos! →</button>
          </div>

          <div className="atlas-suggestion-card">
            <div className="suggestion-chip">Física</div>
            <p className="suggestion-title">Cinemática</p>
            <p className="suggestion-meta">Práctica de 15 min</p>
          </div>

          <div className="atlas-suggestion-card">
            <div className="suggestion-chip suggestion-chip-alt">Programación</div>
            <p className="suggestion-title">Desafío de Programación</p>
            <p className="suggestion-meta">Desafío de 10 min</p>
          </div>

          <div className="atlas-advice-card">
            <div className="atlas-advice-header">
              <span className="atlas-advice-icon">💡</span>
              <div>
                <p className="small-label">CONSEJO DE ATLAS</p>
                <p className="atlas-advice-title">Multiplica tu racha</p>
              </div>
            </div>
            <p>Completar Álgebra Lineal ahora te da un multiplicador de racha de <strong>1.5x</strong> por el resto de la tarde. ¡Aprovéchalo!</p>
          </div>
        </Panel>
      </div>

      <div className="atlas-stats-grid">
        {metrics.map((m, i) => (
          <StatCard key={i} label={m.label} value={m.value} detail={m.icon} />
        ))}
      </div>

    </div>
    </>
  );
}