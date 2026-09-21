import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { Brand, BrandDNA, CreateProductInput } from '@vidsnapai/types';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Package,
  Plus,
  Trash2,
  Brain,
  Layers,
  Users,
  Palette,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

export const BrandWizardPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBrain, setIsGeneratingBrain] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('SaaS & Software');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Step 2: Audience
  const [targetAudience, setTargetAudience] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [desires, setDesires] = useState('');
  const [buyingMotivations, setBuyingMotivations] = useState('');

  // Step 3: Identity & Voice
  const [story, setStory] = useState('');
  const [brandVoice, setBrandVoice] = useState('Confident, authoritative, approachable, innovative');
  const [brandPersonality, setBrandPersonality] = useState('Modern, bold, visionary');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');

  // Step 4: Products
  const [products, setProducts] = useState<CreateProductInput[]>([
    {
      name: '',
      description: '',
      category: 'Core Offering',
      price: 49,
      currency: 'USD',
      features: [],
      benefits: [],
      usps: [],
      cta: 'Start Free Trial'
    }
  ]);

  // Step 5: Marketing Rules
  const [contentPillars, setContentPillars] = useState('Industry Insights, Product How-Tos, Customer Transformation, AI Innovations');
  const [claimsToAvoid, setClaimsToAvoid] = useState('Guaranteed 1000x ROI, Overnight success without effort');
  const [brandRestrictions, setBrandRestrictions] = useState('Never criticize direct competitors by name');
  const [primaryCta, setPrimaryCta] = useState('Get Started with BrandPilot AI');

  // Step 6: Assets
  const [logoUrl, setLogoUrl] = useState('');

  // Step 7: Generated Brand Brain State
  const [createdBrand, setCreatedBrand] = useState<Brand | null>(null);
  const [generatedDna, setGeneratedDna] = useState<BrandDNA | null>(null);

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        name: '',
        description: '',
        category: 'Add-on',
        price: 29,
        currency: 'USD',
        features: [],
        benefits: [],
        usps: [],
        cta: 'Learn More'
      }
    ]);
  };

  const handleUpdateProduct = (index: number, field: keyof CreateProductInput, value: any) => {
    const updated = [...products];
    (updated[index] as any)[field] = value;
    setProducts(updated);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    setError('');

    // Step 1 Validation
    if (currentStep === 1) {
      if (!name.trim()) {
        setError('Brand name is required');
        return;
      }
      if (!description.trim() || description.trim().length < 10) {
        setError('Please provide a meaningful brand description (at least 10 characters)');
        return;
      }
    }

    // Move to step 6 -> step 7 triggers initial save of Brand & Products
    if (currentStep === 6 && !createdBrand) {
      setIsSaving(true);
      try {
        // Save Brand
        const validProducts = products.filter((p) => p.name.trim().length > 0);
        const pillarsArray = contentPillars.split(',').map((s) => s.trim()).filter(Boolean);
        const avoidArray = claimsToAvoid.split(',').map((s) => s.trim()).filter(Boolean);
        const restrictionsArray = brandRestrictions.split(',').map((s) => s.trim()).filter(Boolean);

        const brandData = await apiRequest<{ brand: Brand }>('/api/brands', {
          method: 'POST',
          headers: { 'x-workspace-id': currentWorkspace!.id },
          body: JSON.stringify({
            name,
            industry,
            description,
            websiteUrl: websiteUrl.trim() || null,
            story: story.trim() || null,
            targetAudience: targetAudience.trim() || null,
            brandVoice,
            brandPersonality,
            primaryCta,
            contentPillars: pillarsArray,
            brandColors: {
              primary: primaryColor,
              secondary: secondaryColor
            },
            marketingRules: {
              claimsToAvoid: avoidArray,
              brandRestrictions: restrictionsArray,
              complianceRules: []
            }
          })
        });

        const savedBrand = brandData.brand;
        setCreatedBrand(savedBrand);

        // Save Products
        for (const prod of validProducts) {
          await apiRequest(`/api/brands/${savedBrand.id}/products`, {
            method: 'POST',
            body: JSON.stringify(prod)
          });
        }

        // Save Logo Asset if provided
        if (logoUrl.trim()) {
          await apiRequest(`/api/brands/${savedBrand.id}/assets`, {
            method: 'POST',
            body: JSON.stringify({
              type: 'logo',
              name: `${savedBrand.name} Primary Logo`,
              storageKey: `logos/${savedBrand.id}/primary`,
              url: logoUrl.trim()
            })
          });
        }

        setCurrentStep(7);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save brand profile');
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleGenerateBrain = async () => {
    if (!createdBrand) return;
    setIsGeneratingBrain(true);
    setError('');

    try {
      const response = await apiRequest<{ dna: BrandDNA }>(`/api/brands/${createdBrand.id}/dna/generate`, {
        method: 'POST'
      });
      setGeneratedDna(response.dna);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI Brand Brain generation failed');
    } finally {
      setIsGeneratingBrain(false);
    }
  };

  const handleFinish = () => {
    if (createdBrand) {
      navigate(`/brands/${createdBrand.id}`);
    } else {
      navigate('/brands');
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '860px' }}>
      {/* Wizard Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STEP {currentStep} OF {totalSteps}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {currentStep === 1 && 'Brand Basics'}
            {currentStep === 2 && 'Target Audience'}
            {currentStep === 3 && 'Identity & Voice'}
            {currentStep === 4 && 'Product Knowledge'}
            {currentStep === 5 && 'Marketing Rules'}
            {currentStep === 6 && 'Brand Assets'}
            {currentStep === 7 && 'AI Brand Brain Generation'}
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(currentStep / totalSteps) * 100}%`,
              height: '100%',
              background: 'var(--accent-gradient)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      <Card>
        {error && <ErrorBanner message={error} />}

        {/* STEP 1: BASICS */}
        {currentStep === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                <Layers size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>Brand Basics</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Core company details to anchor all future marketing campaigns
                </p>
              </div>
            </div>

            <Input
              id="wizard-brand-name"
              label="Brand Name *"
              placeholder="e.g. Lumina Audio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="form-group">
              <label htmlFor="wizard-industry" className="form-label">
                Industry / Niche *
              </label>
              <select
                id="wizard-industry"
                className="form-select"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="SaaS & Software">SaaS & Software</option>
                <option value="E-Commerce & DTC">E-Commerce & DTC</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Agency & B2B Services">Agency & B2B Services</option>
                <option value="Consumer Electronics">Consumer Electronics</option>
                <option value="Education & EdTech">Education & EdTech</option>
                <option value="Finance & Fintech">Finance & Fintech</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-description" className="form-label">
                Brand Description *
              </label>
              <textarea
                id="wizard-description"
                className="form-input"
                rows={3}
                placeholder="What does your company do and who do you serve?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <Input
              id="wizard-website"
              label="Website URL (Optional)"
              type="url"
              placeholder="https://luminaaudio.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
        )}

        {/* STEP 2: AUDIENCE */}
        {currentStep === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Users size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>Target Audience & Psychology</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Define who buys your products and the exact pain points they experience
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-audience" className="form-label">
                Primary Customer Profile
              </label>
              <textarea
                id="wizard-audience"
                className="form-input"
                rows={2}
                placeholder="e.g. Remote professionals and podcasters seeking studio-grade acoustic clarity"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <Input
              id="wizard-pain-points"
              label="Core Customer Pain Points"
              placeholder="e.g. Background noise in video calls, heavy ear fatigue, poor microphone quality"
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
            />

            <Input
              id="wizard-desires"
              label="Customer Desires & Dreams"
              placeholder="e.g. Flawless audio recordings, effortless all-day comfort, professional presentation"
              value={desires}
              onChange={(e) => setDesires(e.target.value)}
            />

            <Input
              id="wizard-motivations"
              label="Key Buying Motivations"
              placeholder="e.g. Higher productivity, looking professional to clients, premium craftsmanship"
              value={buyingMotivations}
              onChange={(e) => setBuyingMotivations(e.target.value)}
            />
          </div>
        )}

        {/* STEP 3: IDENTITY & VOICE */}
        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6' }}>
                <Palette size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>Brand Identity & Tone of Voice</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Define your brand personality and visual tone
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-story" className="form-label">
                Brand Origin Story & Mission
              </label>
              <textarea
                id="wizard-story"
                className="form-input"
                rows={3}
                placeholder="Why was this company created and what mission drives your team?"
                value={story}
                onChange={(e) => setStory(e.target.value)}
              />
            </div>

            <Input
              id="wizard-voice"
              label="Tone of Voice"
              placeholder="e.g. High-energy, crisp, authoritative, witty, empathetic"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
            />

            <Input
              id="wizard-personality"
              label="Personality Traits"
              placeholder="e.g. Bold, sophisticated, minimalist, forward-thinking"
              value={brandPersonality}
              onChange={(e) => setBrandPersonality(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                id="wizard-color-primary"
                label="Primary Brand Color (Hex)"
                placeholder="#6366f1"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <Input
                id="wizard-color-secondary"
                label="Accent Color (Hex)"
                placeholder="#8b5cf6"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 4: PRODUCTS */}
        {currentStep === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Package size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.375rem' }}>Product & Service Knowledge</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    BrandPilot AI uses this catalog to generate high-converting promotional hooks
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleAddProduct}
                style={{ fontSize: '0.8125rem' }}
              >
                <Plus size={14} />
                <span>Add Another Product</span>
              </Button>
            </div>

            {products.map((product, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    Product #{idx + 1}
                  </span>
                  {products.length > 1 && (
                    <button
                      onClick={() => handleRemoveProduct(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <Input
                    label="Product Name *"
                    placeholder="e.g. Lumina Studio Headset Pro"
                    value={product.name}
                    onChange={(e) => handleUpdateProduct(idx, 'name', e.target.value)}
                    required
                  />
                  <Input
                    label="Price ($)"
                    type="number"
                    placeholder="199"
                    value={product.price ?? ''}
                    onChange={(e) => handleUpdateProduct(idx, 'price', Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Key benefits and what makes this product exceptional..."
                    value={product.description}
                    onChange={(e) => handleUpdateProduct(idx, 'description', e.target.value)}
                  />
                </div>

                <Input
                  label="Call to Action (CTA)"
                  placeholder="e.g. Claim 20% Off Launch Offer"
                  value={product.cta || ''}
                  onChange={(e) => handleUpdateProduct(idx, 'cta', e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* STEP 5: MARKETING RULES */}
        {currentStep === 5 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>Marketing Rules & Guardrails</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Content pillars and compliance rules for all generated scripts
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-pillars" className="form-label">
                Content Pillars (Comma separated)
              </label>
              <textarea
                id="wizard-pillars"
                className="form-input"
                rows={2}
                placeholder="e.g. Expert Tips, Product Deep-Dives, Customer Transformations, Behind-The-Scenes"
                value={contentPillars}
                onChange={(e) => setContentPillars(e.target.value)}
              />
            </div>

            <Input
              id="wizard-claims-avoid"
              label="Claims & Words to Avoid"
              placeholder="e.g. Guaranteed 100% results, Instant fix, Miracle cure"
              value={claimsToAvoid}
              onChange={(e) => setClaimsToAvoid(e.target.value)}
            />

            <Input
              id="wizard-restrictions"
              label="Brand Restrictions / Competitor Rules"
              placeholder="e.g. Never compare directly to Bose, avoid slang"
              value={brandRestrictions}
              onChange={(e) => setBrandRestrictions(e.target.value)}
            />

            <Input
              id="wizard-primary-cta"
              label="Global Default CTA"
              placeholder="e.g. Visit luminaaudio.com or Link in Bio"
              value={primaryCta}
              onChange={(e) => setPrimaryCta(e.target.value)}
            />
          </div>
        )}

        {/* STEP 6: ASSETS */}
        {currentStep === 6 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <ImageIcon size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.375rem' }}>Brand Visual Assets</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Provide brand logo and visual asset references for video watermarking
                </p>
              </div>
            </div>

            <Input
              id="wizard-logo"
              label="Primary Logo Image URL (Optional)"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border-medium)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem'
              }}
            >
              Additional product photos and video clips can be managed in your Brand Asset Library anytime after onboarding.
            </div>
          </div>
        )}

        {/* STEP 7: AI BRAND BRAIN SYNTHESIS */}
        {currentStep === 7 && (
          <div>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'var(--accent-gradient)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow)',
                  marginBottom: '1rem'
                }}
              >
                <Brain size={28} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: '1.625rem', marginBottom: '0.5rem' }}>
                {generatedDna ? 'Brand Brain DNA Synthesized!' : 'Synthesize Brand Brain'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>
                {generatedDna
                  ? `BrandPilot AI has constructed Brand DNA (Version ${generatedDna.version}) based on your complete profile.`
                  : 'BrandPilot AI will normalize your brand identity, audience psychology, product catalog, and marketing rules into a persistent Brand DNA model.'}
              </p>

              {!generatedDna ? (
                <Button
                  id="generate-brain-button"
                  variant="primary"
                  onClick={handleGenerateBrain}
                  isLoading={isGeneratingBrain}
                  style={{ padding: '0.75rem 2rem', fontSize: '0.9375rem' }}
                >
                  <Sparkles size={18} />
                  <span>Generate Brand Brain</span>
                </Button>
              ) : (
                <div style={{ textAlign: 'left', marginTop: '1.5rem' }}>
                  {/* Summary Preview Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        POSITIONING
                      </span>
                      <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
                        {generatedDna.messaging.positioning}
                      </p>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        CORE VALUE PROPOSITION
                      </span>
                      <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
                        {generatedDna.messaging.valueProposition}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    <Check size={18} />
                    <span>Brand DNA is persistent and ready for AI campaign planning.</span>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleFinish}
                    style={{ width: '100%' }}
                  >
                    <span>Go to Brand Brain Dashboard</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        {currentStep < 7 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            {currentStep > 1 ? (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              >
                <ArrowLeft size={15} />
                <span>Previous</span>
              </Button>
            ) : (
              <div />
            )}

            <Button
              id="wizard-next-button"
              variant="primary"
              onClick={handleNext}
              isLoading={isSaving}
            >
              <span>{currentStep === 6 ? 'Save & Review Brand Brain' : 'Next Step'}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
