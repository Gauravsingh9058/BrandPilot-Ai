import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Card } from '../components/Card.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { SignupSchema } from '@vidsnapai/validation';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = SignupSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = String(err.path[0]);
        if (field === 'name') fieldErrors.name = err.message;
        if (field === 'email') fieldErrors.email = err.message;
        if (field === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ name, email, password });
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
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
      <div style={{ maxWidth: '440px', width: '100%' }}>
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Your Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Get started with your production BrandPilot AI workspace
          </p>
        </div>

        <Card>
          {errors.form && <ErrorBanner message={errors.form} />}

          <form onSubmit={handleSubmit}>
            <Input
              id="signup-name"
              label="Full Name"
              type="text"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
              required
            />

            <Input
              id="signup-email"
              label="Work Email"
              type="email"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />

            <Input
              id="signup-password"
              label="Password"
              type="password"
              placeholder="Minimum 8 characters (Uppercase, lowercase, number)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              required
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem'
              }}
            >
              <ShieldCheck size={14} color="var(--accent-primary)" />
              <span>Session-authenticated with encrypted credentials</span>
            </div>

            <Button
              id="signup-submit-button"
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              style={{ width: '100%' }}
            >
              Create Account
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
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
