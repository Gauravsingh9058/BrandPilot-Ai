import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Card } from '../components/Card.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Sparkles } from 'lucide-react';
import { LoginSchema } from '@vidsnapai/validation';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '1rem'
            }}
          >
            <Sparkles size={24} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Log in to manage your BrandPilot AI workspace
          </p>
        </div>

        <Card>
          {errors.form && <ErrorBanner message={errors.form} />}

          <form onSubmit={handleSubmit}>
            <Input
              id="login-email"
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            <Button
              id="login-submit-button"
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Sign In
            </Button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)'
            }}
          >
            Don't have an account?{' '}
            <Link to="/signup" style={{ fontWeight: 600 }}>
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
