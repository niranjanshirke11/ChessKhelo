import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import s from './PricingPage.module.css';

const PLANS = [
  {
    name: 'Free', price: '$0', period: 'forever', color: 'var(--muted)', icon: '♟',
    cta: 'Current Plan', ctaStyle: 'outline',
    features: ['10 ranked games/day','Basic Elo matchmaking','Game history (last 30)','Standard piece sets','Public profile'],
  },
  {
    name: 'Premium', price: '$9', period: '/month', color: 'var(--gold)', icon: '♛', popular: true,
    cta: 'Upgrade to Premium', ctaStyle: 'gold',
    features: ['Unlimited ranked games','Priority matchmaking','Full game history + PGN','AI opponent (all levels)','Post-game accuracy analysis','10 custom board themes','Animated pieces','Platinum badge'],
  },
  {
    name: 'Elite', price: '$24', period: '/month', color: 'var(--cyan)', icon: '♔',
    cta: 'Go Elite', ctaStyle: 'cyan',
    features: ['Everything in Premium','Real-time engine analysis','Opening explorer (5M+ games)','Tournaments & events','Custom profile frame','Priority support','Elite badge + special title','Early access to new features'],
  },
];

const INVESTOR_STATS = [
  { val: '47K',  label: 'Registered Players', delta: '+12% MoM' },
  { val: '$28',  label: 'ARPU (Premium)',      delta: 'vs $22 avg' },
  { val: '68%',  label: 'Day-7 Retention',     delta: '+8pp YoY' },
  { val: '3.2x', label: 'CAC Payback',         delta: '4.1 months' },
];

export default function PricingPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="page-wrap">
      <h1 className="page-title">Choose Your Plan</h1>
      <p className="page-sub">Unlock unlimited games, AI analysis, and pro features</p>

      {/* Plan cards */}
      <div className={s.cards}>
        {PLANS.map((p, i) => (
          <motion.div key={p.name}
            className={`card ${s.planCard}${p.popular ? ' ' + s.popular : ''}`}
            style={{ borderColor: p.popular ? `${p.color}55` : undefined }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}
            whileHover={{ y: -4 }}>

            {p.popular && <div className={s.popularTag}>⭐ Most Popular</div>}
            <div className={s.planIcon} style={{ color: p.color }}>{p.icon}</div>
            <div className={s.planName} style={{ color: p.color }}>{p.name}</div>
            <div className={s.planPrice}>
              <span className={s.amount}>{p.price}</span>
              <span className={s.period}>{p.period}</span>
            </div>
            <ul className={s.featureList}>
              {p.features.map(f => (
                <li key={f} className={s.feature}>
                  <span className={s.check} style={{ color: p.color }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`btn btn-${p.ctaStyle === 'gold' ? 'gold' : p.ctaStyle === 'cyan' ? 'outline' : 'outline'} btn-lg ${s.planCta}`}
              style={p.ctaStyle === 'cyan' ? { borderColor: 'var(--cyan)', color: 'var(--cyan)' } : {}}
              disabled={p.name === 'Free' && user?.plan === 'free'}
              onClick={() => p.name !== 'Free' && alert('Payment integration — connect Stripe here!')}>
              {p.name === 'Free' && user?.plan === 'free' ? '✓ Your Plan' : p.cta}
            </button>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div className={`card ${s.faqCard}`}>
        <div className="sec-hdr">Frequently Asked Questions</div>
        <div className={s.faqGrid}>
          {[
            ['Can I cancel anytime?', 'Yes — cancel any time. Your plan stays active until the end of the billing period.'],
            ['Is there a free trial?', 'Premium has a 7-day free trial for new accounts. No credit card required.'],
            ['What payment methods?', 'Visa, Mastercard, PayPal, UPI (India), and most local payment methods via Stripe.'],
            ['Do games count toward ELO?', 'Yes — all ranked games affect your Elo regardless of plan. Plan only affects features, not fairness.'],
          ].map(([q, a]) => (
            <div key={q} className={s.faqItem}>
              <div className={s.faqQ}>{q}</div>
              <div className={s.faqA}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Investor metrics strip */}
      <div className={`card ${s.investorStrip}`}>
        <div className={s.investorLabel}>📈 Platform Metrics</div>
        <div className={s.investorStats}>
          {INVESTOR_STATS.map(st => (
            <div key={st.label} className={s.invStat}>
              <div className={s.invVal}>{st.val}</div>
              <div className={s.invLabel}>{st.label}</div>
              <div className={s.invDelta}>{st.delta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
