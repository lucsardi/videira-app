/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import logo from './assets/logo_vidapp.png';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  Bell, 
  Plus, 
  Search, 
  Heart, 
  Cake, 
  MessageCircle, 
  Mail, 
  Instagram, 
  LogOut, 
  User, 
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Power,
  Phone,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// --- Types ---

type ConnectionType = 'Célula' | 'Ministério' | 'Visitante' | 'Liderança';

interface Member {
  id: string;
  name: string;
  birthday?: string;
  weddingAnniversary?: string;
  connection: string;
  connectionType: ConnectionType;
  reminder: boolean;
  email?: string;
  phone?: string;
  photo?: string;
  jobTitle?: string;
  instagram?: string;
  whatsapp?: string;
  location?: string;
}

// --- Mock Data ---

const INITIAL_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Ana Silva',
    birthday: '2026-03-20',
    connection: 'Célula Vida Nova',
    connectionType: 'Célula',
    reminder: true,
    email: 'ana.silva@email.com',
    phone: '(11) 98765-4321'
  },
  {
    id: '2',
    name: 'Carlos & Maria Oliveira',
    weddingAnniversary: '2026-03-25',
    connection: 'Ministério de Casais',
    connectionType: 'Ministério',
    reminder: true,
    email: 'carlos.maria@email.com',
    phone: '(11) 91234-5678'
  },
  {
    id: '3',
    name: 'João Santos',
    birthday: '2026-03-18',
    connection: 'Ministério de Jovens',
    connectionType: 'Ministério',
    reminder: false,
    email: 'joao.santos@email.com',
    phone: '(11) 99887-7665'
  },
  {
    id: '4',
    name: 'Beatriz Lima',
    birthday: '2026-04-05',
    connection: 'Célula Esperança',
    connectionType: 'Célula',
    reminder: true,
    email: 'bia.lima@email.com'
  },
  {
    id: '5',
    name: 'Ricardo Souza',
    birthday: '2026-03-22',
    connection: 'Liderança Geral',
    connectionType: 'Liderança',
    reminder: true,
    phone: '(11) 97766-5544'
  }
];

// --- Components ---

const LoginScreen = ({ onLogin }: { onLogin: (role: 'admin' | 'user', member: Member | null) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();
    
    if (!emailTrimmed || !passwordTrimmed) {
      setError("Por favor, preencha os dois campos.");
      return;
    }

    setLoading(true);
    try {
      console.log("=== Iniciando Login Firebase ===");
      console.log("Email enviado:", emailTrimmed);
      console.log("Comprimento da senha:", passwordTrimmed.length);
      console.log("Projeto Firebase:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
      console.log("Auth configurado:", !!auth);
      
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
      const user = userCredential.user;
      
      console.log("✅ Login bem-sucedido!");
      console.log("UID:", user.uid);
      console.log("Email verificado:", user.emailVerified);

      // Buscar role no Firestore
      try {
        const userDoc = await getDoc(doc(db, "members", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const role = data?.role;
          console.log("Role encontrado:", role);

          const loggedMember: Member = {
            id: user.uid,
            name: data?.name || user.email || 'Usuário',
            connection: data?.connection || 'Não definida',
            connectionType: data?.connectionType || 'Visitante',
            reminder: data?.reminder ?? false,
            email: data?.email || user.email || '',
            phone: data?.phone || '',
            photo: data?.photo || '',
            jobTitle: data?.jobTitle || '',
            instagram: data?.instagram || '',
            whatsapp: data?.whatsapp || '',
            location: data?.location || ''
          };

          if (role === "admin") {
            onLogin("admin", loggedMember);
          } else {
            onLogin("user", loggedMember);
          }
        } else {
          console.warn("Documento do usuário não encontrado no Firestore. Fazendo login como user.");
          onLogin("user", {
            id: user.uid,
            name: user.email || 'Usuário',
            connection: 'Não definida',
            connectionType: 'Visitante',
            reminder: false,
            email: user.email || '',
          });
        }
      } catch (firestoreError) {
        console.warn("Erro ao buscar role no Firestore:", firestoreError);
        onLogin("user", {
          id: user.uid,
          name: user.email || 'Usuário',
          connection: 'Não definida',
          connectionType: 'Visitante',
          reminder: false,
          email: user.email || '',
        });
      }
    } catch (err: any) {
      console.error("❌ Erro do Firebase:", err.code, err.message);
      console.error("Detalhes completos:", err);
      
      // Mapeamento de erros mais específico
      const errorMap: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado. Crie uma conta no Firebase Console > Authentication > Create user',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido. Use o formato: email@exemplo.com',
        'auth/invalid-credential': 'Credencial inválida. Verifique email e senha. Se tiver espaços, remova-os.',
        'auth/user-disabled': 'Usuário foi desabilitado no Firebase',
        'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente depois de alguns minutos.',
        'auth/network-request-failed': 'Erro de conexão com Firebase. Verifique sua internet e configuração.',
      };
      
      const mensagemErro = errorMap[err.code] || `Erro: ${err.message}`;
      setError(mensagemErro);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <img 
          src={logo} 
          alt="Comunidade Videira Logo" 
          className="w-64 h-auto mx-auto logo"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-pastel w-full max-w-md p-8"
      >
        <div className="text-center mb-8">        
          <p className="text-soft-gray">Gerencie os laços da nossa igreja</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-soft-dark mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="admin@igreja.com"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soft-dark mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-brand-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center mt-4">
            <button className="text-sm text-brand-primary font-medium hover:underline">
              Esqueci minha senha
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ members, onNavigate }: { members: Member[], onNavigate: (tab: any) => void }) => {
  const upcomingCount = useMemo(() => {
    const today = new Date();
    return members.filter(m => {
      const date = m.birthday ? new Date(m.birthday) : new Date(m.weddingAnniversary!);
      return date.getMonth() === today.getMonth() && date.getDate() >= today.getDate();
    }).length;
  }, [members]);

  const reminderCount = members.filter(m => m.reminder).length;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-bold text-soft-dark">Menu Principal</h2>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="card-pastel p-6 flex flex-col items-center justify-center gap-3 hover:bg-mint-green transition-colors"
        >
          <div className="w-12 h-12 bg-pastel-pink/20 rounded-full flex items-center justify-center text-pastel-pink">
            <Cake size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">Próximos Aniversários</p>
            <p className="text-xs text-soft-gray">{upcomingCount} este mês</p>
          </div>
        </button>

        <button 
          onClick={() => onNavigate('dashboard')}
          className="card-pastel p-6 flex flex-col items-center justify-center gap-3 hover:bg-mint-green transition-colors"
        >
          <div className="w-12 h-12 bg-pastel-yellow/20 rounded-full flex items-center justify-center text-pastel-yellow">
            <Bell size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">Lembretes ou Alarme</p>
            <p className="text-xs text-soft-gray">{reminderCount} ativos</p>
          </div>
        </button>

        <button 
          onClick={() => onNavigate('members')}
          className="card-pastel p-6 flex flex-col items-center justify-center gap-3 hover:bg-mint-green transition-colors col-span-2"
        >
          <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
            <Users size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">Painel de Pessoas</p>
            <p className="text-xs text-soft-gray">{members.length} cadastrados</p>
          </div>
        </button>
      </div>

      <div className="card-pastel p-6 bg-brand-primary text-white">
        <h3 className="font-bold text-lg mb-2">Resumo da Comunidade</h3>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-4xl font-bold">{members.length}</p>
            <p className="text-xs opacity-80 uppercase tracking-wider">Membros Totais</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Células: {members.filter(m => m.connectionType === 'Célula').length}</p>
            <p className="text-sm font-medium">Ministérios: {members.filter(m => m.connectionType === 'Ministério').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = ({ member, onBack, onPhotoChange }: { member: Member | null; onBack: () => void; onPhotoChange: (url: string) => void }) => {
  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">Nenhum usuário logado.</p>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getWhatsappUrl = () => {
    const phone = (member.whatsapp || member.phone || '').replace(/\D/g, '');
    if (!phone) return '#';
    const formatted = phone.startsWith('55') ? phone : `55${phone}`;
    return `https://wa.me/${formatted}`;
  };

  const getInstagramUrl = () => {
    if (member.instagram) {
      const handle = member.instagram.replace(/^@/, '');
      return `https://instagram.com/${handle}`;
    }
    return '#';
  };

  const getLocationUrl = () => {
    if (member.location) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.location)}`;
    }
    return 'https://www.google.com/maps';
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-brand-primary p-4 pt-12 text-white flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:opacity-80 transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Perfil</h1>
      </div>

      <div className="p-6 flex flex-col items-center gap-4">
        <div className="relative w-36 h-36">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-brand-primary">
            {member.photo ? (
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl text-gray-400">{member.name[0]?.toUpperCase() || '?'}</div>
            )}
          </div>
          <button 
            onClick={() => document.getElementById('photo-input')?.click()}
            className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-3 rounded-full hover:bg-brand-dark transition shadow-lg z-10"
          >
            <Plus size={16} />
          </button>
          <input 
            id="photo-input"
            type="file" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
            className="hidden"
          />
        </div>

        <h2 className="text-2xl font-bold text-center">{member.name}</h2>

        <div className="flex gap-3">
          <a href={getWhatsappUrl()} target="_blank" rel="noreferrer" className="px-4 py-2 border border-brand-primary text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition inline-flex items-center gap-2">
            <Phone size={16} />
            WhatsApp
          </a>
          <a href={getInstagramUrl()} target="_blank" rel="noreferrer" className="px-4 py-2 border border-brand-primary text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition inline-flex items-center gap-2">
            <Instagram size={16} />
            Instagram
          </a>
        </div>

        <div className="w-full mt-4 p-4 rounded-xl border border-gray-200 text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Conexão</p>
          <h3 className="text-xl font-bold text-gray-900">{member.connection}</h3>
          <div className="mt-3 flex justify-center">
            <a href={getLocationUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary text-white hover:bg-brand-dark transition">
              <MapPin size={16} />
              Localização
            </a>
          </div>
        </div>

        <div className="w-full mt-4 p-4 rounded-xl border border-gray-200">
          <h3 className="font-bold mb-2">Mais Informações</h3>
          <div className="space-y-2">
            <p><span className="font-semibold">Email:</span> {member.email || 'Não informado'}</p>
            <p><span className="font-semibold">Telefone:</span> {member.phone || 'Não informado'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemberDetail = ({ member, onBack, onUpdate }: { member: Member, onBack: () => void, onUpdate: (m: Member) => void }) => {
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ ...member, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-brand-primary p-6 pt-12 text-white relative">
        <button onClick={onBack} className="absolute left-4 top-12 p-2">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="flex flex-col items-center mt-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-gray-100 flex items-center justify-center">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-gray-300" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white text-brand-primary p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
              <Plus size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <h2 className="text-2xl font-bold mt-4">{member.name}</h2>
          <p className="text-sm opacity-80">{member.connection}</p>
          
          <div className="flex gap-4 mt-6">
            <button className="btn-pastel bg-white text-brand-primary px-6 py-2 rounded-full flex items-center gap-2">
              <MessageCircle size={18} /> Call
            </button>
            <button className="btn-pastel bg-white/20 text-white border border-white/30 px-6 py-2 rounded-full flex items-center gap-2">
              <Mail size={18} /> Email
            </button>
            <button className="p-2 bg-white/10 rounded-full">
              <Filter size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="card-pastel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Conexão</p>
              <h3 className="text-xl font-bold text-soft-dark">{member.connection}</h3>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
              <Users size={24} />
            </div>
          </div>
          <button className="w-full btn-pastel bg-brand-primary text-white py-2 rounded-lg text-sm">
            View details
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-soft-dark">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-soft-gray">Email</span>
              <span className="text-sm font-medium text-brand-primary">{member.email || 'Não informado'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-soft-gray">Job Title</span>
              <span className="text-sm font-medium">{member.jobTitle || 'Membro'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-soft-gray">Phone</span>
              <span className="text-sm font-medium">{member.phone || 'Não informado'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ onSearch, searchTerm, onAdd, onLogout }: { onSearch: (val: string) => void, searchTerm: string, onAdd: () => void, onLogout: () => void }) => {
  return (
    <header className="header-fixed p-4 pt-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Comunidade Videira</h1>
        <div className="flex items-center gap-3">
          <button onClick={onAdd} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <Plus size={24} />
          </button>
          <button onClick={() => {
            if (window.confirm('Tem certeza que deseja sair?')) {
              onLogout();
            }
          }} className="px-3 py-2 bg-brand-primary text-white rounded-full hover:bg-brand-dark transition-colors text-sm font-semibold inline-flex items-center gap-1">
            <Power size={14} />
            sair
          </button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={18} />
        <input 
          type="text" 
          placeholder="Search"
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
          className="search-bar"
        />
      </div>
    </header>
  );
};

const BottomNavbar = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: any) => void }) => {
  return (
    <nav className="bottom-nav">
      <button 
        onClick={() => onTabChange('dashboard')}
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
      >
        <Calendar size={24} />
        <span>Início</span>
      </button>
      <button 
        onClick={() => onTabChange('members')}
        className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
      >
        <Users size={24} />
        <span>Pessoas</span>
      </button>
      <button 
        onClick={() => onTabChange('ai')}
        className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
      >
        <Sparkles size={24} />
        <span>IA</span>
      </button>
      <button 
        onClick={() => onTabChange('profile')}
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
      >
        <User size={24} />
        <span>Perfil</span>
      </button>
    </nav>
  );
};

const MemberForm = ({ onAdd }: { onAdd: (m: Member) => void }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'birthday' | 'wedding'>('birthday');
  const [date, setDate] = useState('');
  const [connection, setConnection] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>('Célula');
  const [reminder, setReminder] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name,
      [type === 'birthday' ? 'birthday' : 'weddingAnniversary']: date,
      connection,
      connectionType,
      reminder,
      email,
      phone,
      jobTitle
    });
    setName('');
    setDate('');
    setConnection('');
    setEmail('');
    setPhone('');
    setJobTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="card-pastel p-8 space-y-4">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Plus className="text-brand-primary" /> Novo Cadastro
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome Completo</label>
          <input 
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
            placeholder="Ex: Maria Souza"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cargo / Função</label>
          <input 
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
            placeholder="Ex: Diácono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input 
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
            placeholder="Ex: maria@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefone</label>
          <input 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
            placeholder="Ex: (11) 99999-9999"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Celebração</label>
          <select 
            value={type}
            onChange={e => setType(e.target.value as any)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none"
          >
            <option value="birthday">Aniversário de Nascimento</option>
            <option value="wedding">Aniversário de Casamento</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input 
            required
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome da Conexão</label>
          <input 
            required
            value={connection}
            onChange={e => setConnection(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none" 
            placeholder="Ex: Célula Esperança"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Conexão</label>
          <select 
            value={connectionType}
            onChange={e => setConnectionType(e.target.value as any)}
            className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-brand-primary outline-none"
          >
            <option value="Célula">Célula</option>
            <option value="Ministério">Ministério</option>
            <option value="Visitante">Visitante</option>
            <option value="Liderança">Liderança</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input 
            type="checkbox" 
            checked={reminder}
            onChange={e => setReminder(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <label className="text-sm font-medium">Ativar Lembrete/Alarme</label>
        </div>
      </div>
      <button type="submit" className="w-full btn-pastel bg-brand-primary text-white mt-4">
        Cadastrar Pessoa
      </button>
    </form>
  );
};

const AISimulator = ({ member }: { member: Member | null }) => {
  const [isThinking, setIsThinking] = useState(false);
  const [result, setResult] = useState<{ copy: string, email: string, caption: string } | null>(null);

  const generate = () => {
    if (!member) return;
    setIsThinking(true);
    setResult(null);
    
    setTimeout(() => {
      const isWedding = !!member.weddingAnniversary;
      const type = isWedding ? 'aniversário de casamento' : 'aniversário';
      
      setResult({
        copy: `Olá ${member.name}! Passando para desejar um feliz ${type}! Que sua caminhada na ${member.connection} continue sendo uma benção para todos nós. Parabéns!`,
        email: `Assunto: Feliz ${type}, ${member.name}!\n\nQuerido(a) ${member.name},\n\nEm nome de toda a igreja e especialmente da sua conexão (${member.connection}), queremos celebrar sua vida hoje. Que este novo ciclo seja repleto da graça de Deus.\n\nCom carinho,\nEquipe de Conexões`,
        caption: `Hoje é dia de celebrar a vida de ${member.name}! 🎉 Uma peça fundamental na nossa ${member.connection}. Que Deus te abençoe grandemente! #Aniversário #IgrejaDeConexões #Gratidão`
      });
      setIsThinking(false);
    }, 3000);
  };

  return (
    <div className="card-pastel p-8 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="text-pastel-blue" /> Gerador de Mensagens IA
        </h2>
        {member && (
          <button 
            onClick={generate}
            disabled={isThinking}
            className="btn-pastel bg-pastel-blue text-white text-sm disabled:opacity-50"
          >
            {isThinking ? 'Gerando...' : 'Gerar Mensagem'}
          </button>
        )}
      </div>

      {!member && (
        <div className="text-center py-12 text-soft-gray">
          <MessageCircle className="mx-auto mb-4 opacity-20" size={48} />
          <p>Selecione uma pessoa na lista para gerar uma mensagem personalizada.</p>
        </div>
      )}

      {isThinking && (
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-pastel-blue border-t-transparent rounded-full mb-4"
          />
          <p className="text-pastel-blue font-medium animate-pulse">A IA está preparando algo especial...</p>
        </div>
      )}

      {result && !isThinking && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="p-4 bg-pastel-cream rounded-2xl">
            <h4 className="text-xs font-bold text-soft-gray uppercase tracking-wider mb-2 flex items-center gap-1">
              <MessageCircle size={14} /> WhatsApp / Copy
            </h4>
            <p className="text-sm">{result.copy}</p>
          </div>
          <div className="p-4 bg-pastel-cream rounded-2xl">
            <h4 className="text-xs font-bold text-soft-gray uppercase tracking-wider mb-2 flex items-center gap-1">
              <Mail size={14} /> E-mail
            </h4>
            <pre className="text-sm whitespace-pre-wrap font-sans">{result.email}</pre>
          </div>
          <div className="p-4 bg-pastel-cream rounded-2xl">
            <h4 className="text-xs font-bold text-soft-gray uppercase tracking-wider mb-2 flex items-center gap-1">
              <Instagram size={14} /> Legenda Redes Sociais
            </h4>
            <p className="text-sm">{result.caption}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loggedMember, setLoggedMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'ai' | 'add' | 'profile'>('dashboard');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUserRole(null);
      setLoggedMember(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Erro durante logout:', err);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.connection.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  const handleUpdateMember = (updatedMember: Member) => {
    setMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m));
    setSelectedMember(updatedMember);
  };

  if (!isLoggedIn) {
    return (
      <LoginScreen onLogin={(role, member) => {
        setIsLoggedIn(true);
        setUserRole(role);
        setLoggedMember(member);
        setActiveTab('dashboard');
      }} />
    );
  }

  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        member={loggedMember}
        onBack={() => setActiveTab('dashboard')}
        onPhotoChange={(newPhoto) => {
          if (!loggedMember) return;
          const updated = { ...loggedMember, photo: newPhoto };
          setLoggedMember(updated);
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />
    );
  }

  if (selectedMember && activeTab === 'members') {
    return (
      <MemberDetail 
        member={selectedMember} 
        onBack={() => setSelectedMember(null)} 
        onUpdate={handleUpdateMember}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header 
        searchTerm={searchTerm} 
        onSearch={setSearchTerm} 
        onAdd={() => setActiveTab('add')} 
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard members={members} onNavigate={setActiveTab} />
            )}

            {activeTab === 'members' && (
              <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-soft-dark">Lista de Contatos</h2>
                <div className="grid grid-cols-1 gap-4">
                  {filteredMembers.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => setSelectedMember(m)}
                      className="card-pastel p-4 flex items-center gap-4 hover:bg-mint-green transition-colors text-left w-full"
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                        {m.photo ? (
                          <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-soft-dark">{m.name}</h3>
                        <p className="text-xs text-soft-gray">{m.connection}</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-4">
                <AISimulator member={selectedMember} />
              </div>
            )}

            {activeTab === 'add' && (
              <div className="p-4">
                <MemberForm onAdd={(m) => {
                  setMembers([...members, m]);
                  setActiveTab('members');
                }} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
