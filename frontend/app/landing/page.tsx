'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Bell,
  Webhook,
  Link2,
  ArrowRight,
  Menu,
  X,
  Smartphone,
  ChevronRight,
  Clock,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';

/* ─── Animated WhatsApp mock ─── */
function WhatsAppMock() {
  const [visible, setVisible] = useState(0);
  const messages = [
    { from: 'bot', text: 'Hi Thabo! Here is your invoice for March:\nAmount: R4,500.00', time: '09:14' },
    { from: 'bot', text: '🔗 Pay now: pay.smartpay.co.za/pay/inv_8f2a', time: '09:14' },
    { from: 'user', text: '✅ Payment received — R4,500.00\nReceipt #REC-2041', time: '09:15' },
  ];

  useEffect(() => {
    const timers = messages.map((_, i) => setTimeout(() => setVisible(i + 1), 800 + i * 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* phone shell */}
      <div className="rounded-[2rem] bg-[#1a2634] border border-[#2a3a4a] p-3 shadow-2xl shadow-primary-500/10">
        {/* notch */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">SmartPay Bot</p>
              <p className="text-[10px] text-primary-400">online</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400/30" />
          </div>
        </div>

        {/* chat area */}
        <div className="rounded-2xl bg-[#0b141a] p-4 space-y-3 min-h-[300px]">
          {messages.slice(0, visible).map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-[#1f2c34] text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-primary-200' : 'text-gray-500'}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}

          {/* typing indicator */}
          {visible < messages.length && visible > 0 && (
            <div className="flex justify-start">
              <div className="bg-[#1f2c34] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* input bar */}
        <div className="flex items-center gap-2 pt-3">
          <div className="flex-1 rounded-full bg-[#1f2c34] px-4 py-2.5 text-xs text-gray-500">
            Type a message...
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Problem ─── */
const painPoints = [
  { icon: CreditCard, label: 'Create & send invoice — PDF via email or WhatsApp' },
  { icon: Clock, label: 'Wait for manual EFT — no confirmation, no timeline' },
  { icon: MessageSquare, label: 'Chase POP proof — blurry screenshot via email' },
  { icon: RefreshCw, label: 'Reconcile manually — match payments to invoices in a spreadsheet' },
];

/* ─── Section: How it works ─── */
const steps = [
  {
    num: '01',
    title: 'Connect your payment keys',
    desc: 'Securely link your Paystack or Ozow API keys in under 60 seconds. We never store raw keys.',
  },
  {
    num: '02',
    title: 'Scan & link WhatsApp',
    desc: 'Link your WhatsApp number by scanning a QR code — just like WhatsApp Web. Your chats stay private.',
  },
  {
    num: '03',
    title: 'Send & automate',
    desc: 'Send instant payment links or set up automated reminders that nudge customers until they pay.',
  },
];

/* ─── Section: Features ─── */
const features = [
  { icon: Zap, title: 'Instant Link Generation', desc: 'Generate branded payment links in one click — no copy-paste required.' },
  { icon: RefreshCw, title: 'Automatic Reconciliation', desc: 'Payments auto-match to invoices. No more spreadsheet Tetris.' },
  { icon: Shield, title: 'Anti-Ban Humanization', desc: 'Smart rate-limiting and message variation keeps your WhatsApp account safe.' },
  { icon: Bell, title: 'Smart Reminders', desc: 'Set up dunning sequences that follow up on overdue invoices automatically.' },
  { icon: Link2, title: 'Multi-tenant Security', desc: 'Each tenant gets isolated keys, sessions, and data — fully SOC 2 aligned.' },
  { icon: Webhook, title: 'Real-time Webhooks', desc: 'Push payment events to your systems instantly via configurable webhooks.' },
];

/* ─── Section: Pricing ─── */
const plans = [
  {
    name: 'Starter',
    price: 'R299',
    period: '/mo',
    features: ['1 WhatsApp number', '100 payment links/mo', 'Basic reminders', 'Email support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: 'R599',
    period: '/mo',
    features: ['Unlimited payment links', 'Webhooks & API access', 'Receipt bot included', 'Priority email support', 'Advanced analytics'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Pro',
    price: 'R1,199',
    period: '/mo',
    features: ['Multi-agent access', 'Priority support & SLA', 'Full audit trails', 'Custom integrations', 'Dedicated account manager'],
    cta: 'Start Free Trial',
    popular: false,
  },
];

/* ─── Navbar ─── */
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">SmartPay</span>
          </div>

          {/* desktop nav */}
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          {/* desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-gray-400 hover:text-white p-2">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-white/5 pt-4 space-y-3">
            <a href="#how-it-works" onClick={() => setOpen(false)} className="block text-sm text-gray-400 hover:text-white py-2">How it works</a>
            <a href="#features" onClick={() => setOpen(false)} className="block text-sm text-gray-400 hover:text-white py-2">Features</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="block text-sm text-gray-400 hover:text-white py-2">Pricing</a>
            <div className="pt-3 border-t border-white/5 space-y-2">
              <Link href="/login" className="block text-sm text-gray-400 hover:text-white py-2">Log in</Link>
              <Link href="/register" className="block text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-center">Get Started Free</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ─── Main page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* subtle gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-500/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-3 py-1 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                <span className="text-xs font-medium text-primary-400">Now live in South Africa</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Turn WhatsApp Chats Into{' '}
                <span className="text-primary-400">Instant Revenue</span>
              </h1>

              <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Automate payment links, eliminate manual copy-pasting, and get paid instantly via Paystack and Ozow—all directly inside WhatsApp.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-all bg-white/5 hover:bg-white/10">
                  Watch 1-Min Demo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-500">No credit card required. Free 14-day trial.</p>
            </div>

            {/* mock */}
            <div className="relative">
              <WhatsAppMock />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-gray-500 text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary-500" /> 500+ invoices processed daily</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary-500" /> R12M+ payments settled</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary-500" /> 98.7% uptime SLA</span>
          </div>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Sound familiar?</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              The invoice → EFT → POP → reconcile loop
            </h2>
            <p className="mt-4 text-gray-400 text-lg leading-relaxed">
              Create an invoice, send it, wait for the EFT, chase the POP, reconcile manually. Then do it all again tomorrow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {painPoints.map((p, i) => (
              <div
                key={i}
                className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-6 group hover:border-red-500/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                  <p.icon className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{p.label}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-gray-500 text-sm">
            One invoice, four pain points, zero automation. SmartPay fixes all four.
          </p>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-[#0c1322]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Three steps to automated billing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                {/* connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[calc(100%-40px)] h-px bg-gradient-to-r from-primary-500/30 to-transparent" />
                )}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 hover:border-primary-500/20 transition-colors">
                  <span className="text-4xl font-extrabold text-primary-500/20">{s.num}</span>
                  <h3 className="mt-4 text-xl font-bold text-white">{s.title}</h3>
                  <p className="mt-3 text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to automate WhatsApp billing
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white/[0.02] border border-white/5 rounded-2xl p-7 hover:border-primary-500/20 hover:bg-white/[0.04] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center mb-5 group-hover:bg-primary-500/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#0c1322]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, transparent pricing in ZAR
            </h2>
            <p className="mt-4 text-gray-400">No hidden fees. Cancel anytime. All plans include a 14-day free trial.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-primary-500/10 border-2 border-primary-500/40 shadow-xl shadow-primary-500/10'
                    : 'bg-white/[0.03] border border-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-bold text-white">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 w-full inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-all active:scale-[0.98] ${
                    plan.popular
                      ? 'bg-primary-500 hover:bg-primary-600 text-white hover:shadow-lg hover:shadow-primary-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER CTA ═══════════ */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Stop chasing EFT proofs of payment.
            <br />
            <span className="text-primary-400">Automate your billing today.</span>
          </h2>
          <p className="mt-6 text-gray-400 text-lg max-w-xl mx-auto">
            Join hundreds of South African SMEs using SmartPay to send invoices and collect payments directly through WhatsApp.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">SmartPay</span>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
              <a href="#how-it-works" className="hover:text-gray-300 transition-colors">How it works</a>
              <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
              <span>Terms</span>
              <span>Privacy</span>
            </div>

            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} SmartPay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
