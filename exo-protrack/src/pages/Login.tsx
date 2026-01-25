import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TEST_USERS = [
  { role: 'Admin', email: 'admin@exoprotrack.test', password: 'Admin123!', color: 'bg-red-500' },
  { role: 'Production', email: 'production@exoprotrack.test', password: 'Test123!', color: 'bg-blue-500' },
  { role: 'QC', email: 'qc@exoprotrack.test', password: 'Test123!', color: 'bg-purple-500' },
  { role: 'QA', email: 'qa@exoprotrack.test', password: 'Test123!', color: 'bg-green-500' },
  { role: 'Manager', email: 'manager@exoprotrack.test', password: 'Test123!', color: 'bg-amber-500' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
        setSuccess('Регистрация успешна! Проверьте email для подтверждения.');
        setIsRegister(false);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <FlaskConical className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EXO ProTrack</h1>
          <p className="text-slate-500 text-sm">Система мониторинга производства и прослеживаемости</p>
        </div>

        <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              !isRegister ? 'bg-white shadow text-slate-900' : 'text-slate-500'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              isRegister ? 'bg-white shadow text-slate-900' : 'text-slate-500'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ФИО
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={isRegister}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        {isRegister && (
          <p className="mt-4 text-xs text-slate-500 text-center">
            При регистрации вам будет присвоена роль "Production". 
            Для изменения роли обратитесь к администратору.
          </p>
        )}

        {/* Quick Login Section */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm text-slate-500">Быстрый вход для тестирования</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {TEST_USERS.map((testUser) => (
              <button
                key={testUser.role}
                type="button"
                onClick={() => {
                  setEmail(testUser.email);
                  setPassword(testUser.password);
                  setIsRegister(false);
                  setError('');
                }}
                className={`${testUser.color} text-white text-xs py-2 px-1 rounded-lg hover:opacity-90 transition font-medium`}
              >
                {testUser.role}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400 text-center">
            Нажмите кнопку, затем "Войти"
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          LLC Inbiopharm | EXO ProTrack v3.4.0 | 24.01.2026
        </p>
      </div>
    </div>
  );
}
