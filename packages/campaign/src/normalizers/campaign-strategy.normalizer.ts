/**
 * Deterministic normalizer for raw AI Campaign Strategy output.
 * Safely unwrap wrappers, parse embedded JSON in markdown fences,
 * and normalize common formatting/representation variants without inventing strategic facts.
 */
export function normalizeCampaignStrategyOutput(raw: unknown): unknown {
  if (!raw) return raw;

  let data = raw;

  // 1. If string, extract JSON safely from markdown fences or text
  if (typeof data === 'string') {
    let clean = data.trim();
    // Remove markdown ```json ... ``` or ``` ... ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    // If there's still wrapping text, find outermost { ... }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    try {
      data = JSON.parse(clean);
    } catch {
      return raw;
    }
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const obj = data as Record<string, unknown>;

  // 2. Unwrap nested wrapper objects (e.g. { campaignStrategy: {...} }, { strategy: {...} }, { data: {...} })
  let candidate: Record<string, unknown> = obj;
  if (obj.campaignStrategy && typeof obj.campaignStrategy === 'object') {
    candidate = obj.campaignStrategy as Record<string, unknown>;
  } else if (obj.campaign_strategy && typeof obj.campaign_strategy === 'object') {
    candidate = obj.campaign_strategy as Record<string, unknown>;
  } else if (obj.strategy && typeof obj.strategy === 'object' && !('funnel' in obj && 'corePromise' in obj)) {
    candidate = obj.strategy as Record<string, unknown>;
  } else if (obj.data && typeof obj.data === 'object' && !('funnel' in obj && 'corePromise' in obj)) {
    candidate = obj.data as Record<string, unknown>;
  } else if (obj.output && typeof obj.output === 'object' && !('funnel' in obj && 'corePromise' in obj)) {
    candidate = obj.output as Record<string, unknown>;
  }

  const res: Record<string, unknown> = { ...candidate };

  // 3. Normalize Audience
  if (res.audience && typeof res.audience === 'object') {
    const aud = { ...(res.audience as Record<string, unknown>) };
    if (!aud.painPoints && Array.isArray(aud.pain_points)) {
      aud.painPoints = aud.pain_points;
    }
    if (!aud.primary && typeof aud.primaryAudience === 'string') {
      aud.primary = aud.primaryAudience;
    }
    if (!aud.primary && typeof aud.primary_audience === 'string') {
      aud.primary = aud.primary_audience;
    }
    if (!Array.isArray(aud.painPoints)) {
      aud.painPoints = aud.painPoints ? [String(aud.painPoints)] : [];
    }
    if (!Array.isArray(aud.desires)) {
      aud.desires = aud.desires ? [String(aud.desires)] : [];
    }
    if (!Array.isArray(aud.motivations)) {
      aud.motivations = aud.motivations ? [String(aud.motivations)] : [];
    }
    res.audience = aud;
  }

  // 4. Normalize Array Fields (keyMessages, messagingAngles, contentPillars)
  if (typeof res.keyMessages === 'string') {
    res.keyMessages = [res.keyMessages];
  } else if (!res.keyMessages && Array.isArray(res.key_messages)) {
    res.keyMessages = res.key_messages;
  }

  if (typeof res.messagingAngles === 'string') {
    res.messagingAngles = [res.messagingAngles];
  } else if (!res.messagingAngles && Array.isArray(res.messaging_angles)) {
    res.messagingAngles = res.messaging_angles;
  }

  if (typeof res.contentPillars === 'string') {
    res.contentPillars = [res.contentPillars];
  } else if (!res.contentPillars && Array.isArray(res.content_pillars)) {
    res.contentPillars = res.content_pillars;
  }

  // Normalize corePromise / core_promise
  if (!res.corePromise && typeof res.core_promise === 'string') {
    res.corePromise = res.core_promise;
  }

  // Normalize offerStrategy / offer_strategy
  if (!res.offerStrategy && typeof res.offer_strategy === 'string') {
    res.offerStrategy = res.offer_strategy;
  }

  // Normalize ctaStrategy / cta_strategy
  if (!res.ctaStrategy && typeof res.cta_strategy === 'string') {
    res.ctaStrategy = res.cta_strategy;
  }

  // 5. Normalize Content Mix
  const mixSource = res.contentMix || res.content_mix;
  if (Array.isArray(mixSource)) {
    res.contentMix = mixSource.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) return item;
      const it = item as Record<string, unknown>;
      let pct = it.percentage;
      if (typeof pct === 'string') {
        pct = Number((pct as string).replace(/[^0-9.]/g, ''));
      }
      return {
        type: String(it.type || 'EDUCATIONAL'),
        percentage: typeof pct === 'number' && !isNaN(pct) ? pct : 33,
        purpose: String(it.purpose || ''),
        funnelStage: String(it.funnelStage || it.funnel_stage || 'AWARENESS')
      };
    });
  }

  // 6. Normalize Funnel Stages (case sensitivity & casing)
  if (res.funnel && typeof res.funnel === 'object') {
    const fn = res.funnel as Record<string, unknown>;
    const awareness = (fn.awareness || fn.AWARENESS || {}) as Record<string, unknown>;
    const consideration = (fn.consideration || fn.CONSIDERATION || {}) as Record<string, unknown>;
    const conversion = (fn.conversion || fn.CONVERSION || {}) as Record<string, unknown>;

    res.funnel = {
      awareness: {
        message: String(awareness.message || ''),
        formatGuidance: String(awareness.formatGuidance || awareness.format_guidance || ''),
        cta: String(awareness.cta || '')
      },
      consideration: {
        message: String(consideration.message || ''),
        formatGuidance: String(consideration.formatGuidance || consideration.format_guidance || ''),
        cta: String(consideration.cta || '')
      },
      conversion: {
        message: String(conversion.message || ''),
        formatGuidance: String(conversion.formatGuidance || conversion.format_guidance || ''),
        cta: String(conversion.cta || '')
      }
    };
  }

  // 7. Normalize Channel Strategy
  const chanSource = res.channelStrategy || res.channel_strategy;
  if (Array.isArray(chanSource)) {
    res.channelStrategy = chanSource.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) return item;
      const ch = item as Record<string, unknown>;
      return {
        channel: String(ch.channel || 'INSTAGRAM'),
        role: String(ch.role || ''),
        contentApproach: String(ch.contentApproach || ch.content_approach || ''),
        formatGuidance: String(ch.formatGuidance || ch.format_guidance || ''),
        ctaStrategy: String(ch.ctaStrategy || ch.cta_strategy || '')
      };
    });
  }

  // 8. Normalize KPIs
  if (res.kpis && typeof res.kpis === 'object') {
    const k = res.kpis as Record<string, unknown>;
    res.kpis = {
      primary: Array.isArray(k.primary) ? k.primary.map(String) : [],
      targets: Array.isArray(k.targets) ? k.targets.map(String) : []
    };
  }

  // 9. Normalize Guardrails
  const guardSource = (res.guardrails || res.risksAndGuardrails || res.risks_and_guardrails) as Record<string, unknown> | undefined;
  if (guardSource && typeof guardSource === 'object') {
    res.guardrails = {
      claimsToAvoid: Array.isArray(guardSource.claimsToAvoid)
        ? guardSource.claimsToAvoid.map(String)
        : Array.isArray(guardSource.claims_to_avoid)
        ? guardSource.claims_to_avoid.map(String)
        : [],
      restrictions: Array.isArray(guardSource.restrictions)
        ? guardSource.restrictions.map(String)
        : Array.isArray(guardSource.brandRestrictions)
        ? guardSource.brandRestrictions.map(String)
        : []
    };
  }

  return res;
}
