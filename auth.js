/* Aurea Academy - Auth & Community (localStorage) */
const AureaAuth = {
  STORAGE_USERS: 'aurea_users',
  STORAGE_SESSION: 'aurea_session',
  STORAGE_POSTS: 'aurea_posts',

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_USERS) || '[]');
    } catch {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(users));
  },

  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_SESSION) || 'null');
    } catch {
      return null;
    }
  },

  setSession(user) {
    if (!user) {
      localStorage.removeItem(this.STORAGE_SESSION);
      return;
    }
    const safe = { id: user.id, name: user.name, email: user.email, bio: user.bio || '', avatar: user.avatar || '', createdAt: user.createdAt };
    localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(safe));
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  currentUser() {
    return this.getSession();
  },

  register({ name, email, password }) {
    const users = this.getUsers();
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { ok: false, error: 'Este e-mail já está cadastrado.' };
    }
    if (!name || name.trim().length < 2) {
      return { ok: false, error: 'Nome deve ter pelo menos 2 caracteres.' };
    }
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'E-mail inválido.' };
    }
    if (!password || password.length < 4) {
      return { ok: false, error: 'Senha deve ter pelo menos 4 caracteres.' };
    }
    const user = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password, // demo only - never store plain passwords in production
      bio: '',
      avatar: '',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    this.saveUsers(users);
    this.setSession(user);
    return { ok: true, user };
  },

  login({ email, password }) {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return { ok: false, error: 'E-mail ou senha incorretos.' };
    }
    this.setSession(user);
    return { ok: true, user };
  },

  logout() {
    this.setSession(null);
  },

  updateProfile({ name, bio, avatar }) {
    const session = this.getSession();
    if (!session) return { ok: false, error: 'Não autenticado.' };
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === session.id);
    if (idx === -1) return { ok: false, error: 'Usuário não encontrado.' };
    if (name) users[idx].name = name.trim();
    if (typeof bio === 'string') users[idx].bio = bio.trim();
    if (typeof avatar === 'string') users[idx].avatar = avatar;
    this.saveUsers(users);
    this.setSession(users[idx]);
    return { ok: true, user: users[idx] };
  },

  // Posts
  getPosts() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_POSTS) || '[]');
    } catch {
      return [];
    }
  },

  savePosts(posts) {
    localStorage.setItem(this.STORAGE_POSTS, JSON.stringify(posts));
  },

  createPost({ content, type = 'comment' }) {
    const session = this.getSession();
    if (!session) return { ok: false, error: 'Faça login para publicar.' };
    if (!content || content.trim().length < 3) {
      return { ok: false, error: 'Escreva pelo menos 3 caracteres.' };
    }
    const post = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      userId: session.id,
      userName: session.name,
      userAvatar: session.avatar || '',
      content: content.trim(),
      type: type, // 'comment' | 'request'
      createdAt: new Date().toISOString(),
      likes: [],
      replies: []
    };
    const posts = this.getPosts();
    posts.unshift(post);
    this.savePosts(posts);
    return { ok: true, post };
  },

  addReply(postId, content) {
    const session = this.getSession();
    if (!session) return { ok: false, error: 'Faça login para comentar.' };
    if (!content || content.trim().length < 1) {
      return { ok: false, error: 'Comentário vazio.' };
    }
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return { ok: false, error: 'Post não encontrado.' };
    post.replies.push({
      id: 'r_' + Date.now(),
      userId: session.id,
      userName: session.name,
      content: content.trim(),
      createdAt: new Date().toISOString()
    });
    this.savePosts(posts);
    return { ok: true };
  },

  toggleLike(postId) {
    const session = this.getSession();
    if (!session) return { ok: false, error: 'Faça login.' };
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return { ok: false, error: 'Post não encontrado.' };
    const i = post.likes.indexOf(session.id);
    if (i >= 0) post.likes.splice(i, 1);
    else post.likes.push(session.id);
    this.savePosts(posts);
    return { ok: true, likes: post.likes.length, liked: i < 0 };
  },

  deletePost(postId) {
    const session = this.getSession();
    if (!session) return { ok: false };
    let posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post || post.userId !== session.id) return { ok: false, error: 'Sem permissão.' };
    posts = posts.filter(p => p.id !== postId);
    this.savePosts(posts);
    return { ok: true };
  },

  formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return Math.floor(diff / 60) + ' min';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h';
    if (diff < 604800) return Math.floor(diff / 86400) + ' d';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  },

  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  // Base path: '' on root pages, '../' inside lessons/
  basePath() {
    const path = window.location.pathname || '';
    return path.includes('/lessons/') ? '../' : '';
  },

  // Update nav UI
  updateNav() {
    const session = this.getSession();
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;
    const base = this.basePath();
    if (session) {
      navAuth.innerHTML = `
        <a href="${base}perfil.html" class="nav-profile">
          <span class="nav-avatar">${this.getInitials(session.name)}</span>
          ${session.name.split(' ')[0]}
        </a>
        <button type="button" class="btn btn-outline btn-sm" id="btnLogout">Sair</button>
      `;
      document.getElementById('btnLogout')?.addEventListener('click', () => {
        this.logout();
        window.location.href = base + 'index.html';
      });
    } else {
      navAuth.innerHTML = `
        <a href="${base}login.html">Entrar</a>
        <a href="${base}login.html?mode=register" class="btn btn-primary">Criar conta</a>
      `;
    }
  }
};

// Auto-update nav when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AureaAuth.updateNav();
});
