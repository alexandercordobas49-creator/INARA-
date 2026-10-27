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
  context,
  contextError,
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
        { id: Date.now(), author: "Atlas", role: "assistant", text: result.answer || 'Atlas no pudo generar una orientación.' },
      ]);
    }
  }, [result]);

  const dashboard = context?.dashboard;
  const risk = context?.risk?.risk;
  const recommendations = context?.risk?.recommendations || [];
  const metrics = [
    {
      label: "XP",
      value: dashboard?.xp?.total ?? 'Sin datos',
      icon: "⭐",
    },
    {
      label: "Nivel",
      value: dashboard?.xp?.currentLevel ?? 'Sin datos',
      icon: "🏆",
    },
    {
      label: "Racha",
      value: dashboard?.streak?.currentCount != null ? `${dashboard.streak.currentCount} días` : 'Sin datos',
      icon: "🔥",
    },
    {
      label: "Cursos",
      value: dashboard?.attendanceSummary?.total ?? 'Sin datos',
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
              <img src="/assets/ATLAS.png" alt="Atlas" className="avatar-icon-large" />
            </div>

            <div className="atlas-hero-copy">
              <div className="atlas-hero-pill">Plan recomendado</div>
              <p className="atlas-hero-label">Atlas</p>
              <h2 className="atlas-hero-title">Tu compañero inteligente de aprendizaje</h2>
              <p className="atlas-hero-description">{risk?.mainReason || 'Atlas está listo para acompañarte con tu progreso académico real.'}</p>

              <div className="atlas-hero-badges">
                <span>20 min</span>
                <span>Racha {dashboard?.streak?.currentCount ?? 'sin datos'}</span>
                <span>Nivel {dashboard?.xp?.currentLevel ?? 'sin datos'}</span>
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

          {contextError && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No se pudo cargar el contexto de Atlas: {contextError}</p>}

          {recommendations.length > 0 ? recommendations.slice(0, 3).map((recommendation) => <div key={recommendation.id} className="atlas-suggestion-card highlight-card">
            <div>
              <p className="suggestion-label">{recommendation.title}</p>
              <p className="suggestion-subtitle">Prioridad {recommendation.priority}</p>
            </div>
            <p className="mt-2 text-sm text-slate-700">{recommendation.message}</p>
          </div>) : <div className="atlas-suggestion-card"><p className="suggestion-title">Sin recomendaciones activas</p><p className="suggestion-meta">Atlas mostrará orientación cuando exista información suficiente.</p></div>}

          <div className="atlas-advice-card">
            <div className="atlas-advice-header">
              <span className="atlas-advice-icon">💡</span>
              <div>
                <p className="small-label">CONSEJO DE ATLAS</p>
                <p className="atlas-advice-title">Multiplica tu racha</p>
              </div>
            </div>
            <p>{risk ? `Señal actual: ${risk.mainReason}. Revisa la recomendación y conversa con tu docente si necesitas apoyo.` : 'Continúa registrando tu actividad para recibir orientación contextual.'}</p>
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