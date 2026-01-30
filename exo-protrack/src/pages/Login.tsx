import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <FlaskConical className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">EXO ProTrack</h1>
            <p className="text-muted-foreground text-sm">Система мониторинга производства и прослеживаемости</p>
          </div>

          <div className="flex mb-6 bg-slate-100 dark:bg-muted rounded-lg p-1">
            <Button
              type="button"
              variant={!isRegister ? 'default' : 'ghost'}
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              className="flex-1"
            >
              Вход
            </Button>
            <Button
              type="button"
              variant={isRegister ? 'default' : 'ghost'}
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              className="flex-1"
            >
              Регистрация
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 error-box rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 success-box rounded-lg text-sm">
                {success}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  ФИО
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Пароль
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </Button>
          </form>

          {isRegister && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              При регистрации вам будет присвоена роль "Production".
              Для изменения роли обратитесь к администратору.
            </p>
          )}

          {/* Quick Login Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Быстрый вход для тестирования</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {TEST_USERS.map((testUser) => (
                <Button
                  key={testUser.role}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(testUser.email);
                    setPassword(testUser.password);
                    setIsRegister(false);
                    setError('');
                  }}
                  className={`${testUser.color} text-white border-0 hover:opacity-90`}
                >
                  {testUser.role}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Нажмите кнопку, затем "Войти"
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            LLC Inbiopharm | EXO ProTrack v3.4.0 | 24.01.2026
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
