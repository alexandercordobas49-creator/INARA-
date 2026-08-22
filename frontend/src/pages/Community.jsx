import { useState } from "react";
import Modal from "../components/Modal.jsx";
import "./Community.css";

export default function Community({ session, selectedStudent }) {
  const [modal, setModal] = useState(null);
  const [postContent, setPostContent] = useState("");
  const [joinedGroups, setJoinedGroups] = useState([1, 2]);

  const posts = [
    {
      id: 1,
      author: "Carlos M.",
      avatar: "👨",
      role: "Estudiante",
      content:
        "Acabo de completar la unidad de funciones cuadráticas. ¡Difícil pero satisfactorio!",
      timestamp: "Hace 2 horas",
      likes: 12,
      comments: 3,
      category: "📚 Académico"
    },
    {
      id: 2,
      author: "Dra. María García",
      avatar: "👩‍🏫",
      role: "Instructora",
      content:
        "Recordatorio: El examen de Química es el próximo viernes. Estudien los capítulos 5 y 6.",
      timestamp: "Hace 5 horas",
      likes: 24,
      comments: 8,
      category: "📢 Anuncio"
    },
    {
      id: 3,
      author: "Ana G.",
      avatar: "👩",
      role: "Estudiante",
      content:
        "¡Alguien necesita ayuda con Historia? Puedo formar un grupo de estudio esta noche.",
      timestamp: "Hace 8 horas",
      likes: 5,
      comments: 7,
      category: "🤝 Comunidad"
    }
  ];

  const groups = [
    {
      id: 1,
      name: "Club de Ciencias",
      icon: "🔬",
      members: 18,
      description: "Experimentos y reacciones",
      color: "from-green-500 to-teal-500"
    },
    {
      id: 2,
      name: "Club de Lectura",
      icon: "📖",
      members: 24,
      description: "Compartimos análisis de libros",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      name: "Grupo de Idiomas",
      icon: "🌐",
      members: 15,
      description: "Practicamos idiomas",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const events = [
    {
      id: 1,
      title: "Tutoría de Matemáticas",
      host: "Prof. Carlos López",
      date: "Hoy a las 5:00 PM",
      attendees: 8,
      icon: "∫"
    },
    {
      id: 2,
      title: "Sesión de Preguntas con Instructores",
      host: "Equipo de Docentes",
      date: "Mañana a las 3:30 PM",
      attendees: 34,
      icon: "💬"
    },
    {
      id: 3,
      title: "Concurso de Ciencias",
      host: "Dirección Académica",
      date: "25 de Julio, 10:00 AM",
      attendees: 42,
      icon: "🏆"
    }
  ];

  const handlePublishPost = () => {
    if (!postContent.trim()) {
      setModal({
        type: "warning",
        title: "Publicación vacía",
        message: "Por favor escribe algo antes de publicar.",
        isOpen: true
      });
      return;
    }

    setModal({
      type: "success",
      title: "¡Publicado!",
      message: `Tu publicación "${postContent.substring(
        0,
        30
      )}..." ha sido compartida con la comunidad.`,
      isOpen: true
    });

    setPostContent("");
  };

  const handleCancel = () => {
    if (!postContent.trim()) {
      return;
    }

    setModal({
      type: "warning",
      title: "¿Descartar publicación?",
      message: "Perderás el contenido que escribiste.",
      actions: [
        {
          label: "Descartar",
          primary: true,
          handler: () => {
            setPostContent("");
            setModal(null);
          }
        }
      ],
      isOpen: true
    });
  };

  const handleLikePost = (postId, likes) => {
    setModal({
      type: "success",
      title: "Te gusta este post",
      message: `Ahora a ${
        likes + 1
      } personas les gusta este post. ¡Gracias por tu apoyo!`,
      isOpen: true
    });
  };

  const handleCommentPost = (postId, author) => {
    setModal({
      type: "info",
      title: `Responder a ${author}`,
      message:
        "Próximamente podrás responder comentarios directamente en el feed.",
      actions: [
        {
          label: "Notificarme cuando esté disponible",
          primary: true,
          handler: () => setModal(null)
        }
      ],
      isOpen: true
    });
  };

  const handleSharePost = (postId) => {
    setModal({
      type: "info",
      title: "Compartir en redes sociales",
      message:
        `Copia el enlace: https://ina-track.edu/posts/${postId}\n\n` +
        "Puedes compartirlo en WhatsApp, Facebook, Twitter o enviar por email.",
      isOpen: true
    });
  };

  const handleViewAllEvents = () => {
    setModal({
      type: "info",
      title: "Próximos eventos",
      message:
        "📅 Tutoría de Matemáticas - Hoy 5:00 PM\n\n" +
        "💬 Sesión de Preguntas - Mañana 3:30 PM\n\n" +
        "🏆 Concurso de Ciencias - 25 Julio 10:00 AM\n\n" +
        "📚 Taller de Historia - 26 Julio 2:00 PM\n\n" +
        "🔬 Laboratorio Virtual - 27 Julio 4:00 PM",
      actions: [
        {
          label: "Ir al Calendario",
          primary: true,
          handler: () => setModal(null)
        }
      ],
      isOpen: true
    });
  };

  const handleJoinGroup = (groupId, groupName) => {
    setJoinedGroups((current) => {
      if (current.includes(groupId)) {
        return current;
      }

      return [...current, groupId];
    });

    setModal({
      type: "success",
      title: "¡Bienvenido!",
      message: `Te has unido a "${groupName}". Ahora recibirás notificaciones de este grupo.`,
      isOpen: true
    });
  };

  const handleLeaveGroup = (groupId, groupName) => {
    setJoinedGroups((current) =>
      current.filter((id) => id !== groupId)
    );

    setModal({
      type: "info",
      title: "Dejaste el grupo",
      message: `Ya no recibirás notificaciones de "${groupName}".`,
      isOpen: true
    });
  };

  return (
    <>
      <Modal
        isOpen={modal?.isOpen || false}
        title={modal?.title || ""}
        message={modal?.message || ""}
        type={modal?.type || "info"}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      />

      <div className="community-page">
        <div className="mb-6">
          <h1>Comunidad</h1>
          <p>Conecta con otros estudiantes e instructores</p>
        </div>

        {/* New Post */}
        <div className="community-post-creator">
          <div className="flex items-center gap-3 mb-4">
            <div className="community-avatar">VR</div>

            <input
              type="text"
              placeholder="¿Qué piensas? Comparte con la comunidad..."
              className="community-input flex-1"
              value={postContent}
              onChange={(event) =>
                setPostContent(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.ctrlKey) {
                  handlePublishPost();
                }
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="community-btn-cancel"
              onClick={handleCancel}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="community-btn-primary"
              onClick={handlePublishPost}
            >
              Publicar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="community-feed-section">
              <h2>Feed de Actividad</h2>

              <div className="space-y-4">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    className="community-post"
                    style={{
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {/* Header */}
                    <div className="community-post-header">
                      <div className="community-post-author">
                        <span className="community-post-avatar">
                          {post.avatar}
                        </span>

                        <div className="community-post-info">
                          <h4>{post.author}</h4>
                          <p>{post.role}</p>
                        </div>
                      </div>

                      <span className="community-post-timestamp">
                        {post.timestamp}
                      </span>
                    </div>

                    {/* Category */}
                    <span className="community-category-badge">
                      {post.category}
                    </span>

                    {/* Content */}
                    <p className="community-post-content">
                      {post.content}
                    </p>

                    {/* Actions */}
                    <div className="community-post-actions">
                      <button
                        type="button"
                        className="community-post-action-btn"
                        onClick={() =>
                          handleLikePost(post.id, post.likes)
                        }
                      >
                        👍 {post.likes}
                      </button>

                      <button
                        type="button"
                        className="community-post-action-btn"
                        onClick={() =>
                          handleCommentPost(
                            post.id,
                            post.author
                          )
                        }
                      >
                        💬 {post.comments}
                      </button>

                      <button
                        type="button"
                        className="community-post-action-btn"
                        onClick={() =>
                          handleSharePost(post.id)
                        }
                      >
                        ↗️ Compartir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="community-sidebar-card">
              <h3>📅 Próximos Eventos</h3>

              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="community-event-item"
                  >
                    <p>{event.title}</p>
                    <p className="community-event-host">
                      {event.host}
                    </p>
                    <p className="community-event-time">
                      {event.date}
                    </p>
                    <p className="community-event-attendees">
                      👥 {event.attendees} asistentes
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="community-event-btn"
                onClick={handleViewAllEvents}
              >
                Ver todos los eventos
              </button>
            </div>

            {/* My Groups */}
            <div className="community-sidebar-card">
              <h3>👥 Mis Grupos</h3>

              <div className="space-y-3">
                {groups
                  .filter((group) =>
                    joinedGroups.includes(group.id)
                  )
                  .map((group) => (
                    <div
                      key={group.id}
                      className="community-group-item"
                    >
                      <div className="community-group-item-header">
                        <span className="community-group-icon">
                          {group.icon}
                        </span>

                        <p className="community-group-name">
                          {group.name}
                        </p>
                      </div>

                      <p className="community-group-members">
                        👥 {group.members} miembros
                      </p>

                      <button
                        type="button"
                        className="community-btn-cancel mt-2"
                        onClick={() =>
                          handleLeaveGroup(
                            group.id,
                            group.name
                          )
                        }
                      >
                        Salir
                      </button>
                    </div>
                  ))}
              </div>

              <h4>Descubre más grupos</h4>

              <div className="space-y-2">
                {groups
                  .filter(
                    (group) =>
                      !joinedGroups.includes(group.id)
                  )
                  .map((group) => (
                    <div
                      key={group.id}
                      className="community-group-discover"
                    >
                      <div className="community-group-discover-info">
                        <span className="community-group-icon">
                          {group.icon}
                        </span>

                        <div className="community-group-discover-details">
                          <p className="community-group-discover-name">
                            {group.name}
                          </p>

                          <p className="community-group-discover-members">
                            {group.members} miembros
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="community-btn-join"
                        onClick={() =>
                          handleJoinGroup(
                            group.id,
                            group.name
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

