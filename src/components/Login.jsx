import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { 
  HiOutlineCube, 
  HiOutlineShieldCheck, 
  HiOutlineLightningBolt, 
  HiOutlineOfficeBuilding,
  HiOutlineBriefcase
} from 'react-icons/hi';
import './Login.css';

const loadingSteps = [
  { text: "Initializing EPOSX core modules...",   icon: "⚙️" },
  { text: "Loading inventory databases...",        icon: "🗄️" },
  { text: "Syncing with esystemlk cloud...",       icon: "☁️" },
  { text: "Applying UI theme preferences...",      icon: "🎨" },
  { text: "Securing workstation session...",       icon: "🔒" },
  { text: "Ready to launch!",                      icon: "🚀" },
];

const features = [
  { icon: HiOutlineCube,            label: "Real-time Stock Tracking" },
  { icon: HiOutlineShieldCheck,     label: "Lifetime Guaranteed Maintenance" },
  { icon: HiOutlineLightningBolt,   label: "4+ Years Reliable Service" },
  { icon: HiOutlineBriefcase,       label: "10+ Packages (Budget to Enterprise)" },
  { icon: HiOutlineOfficeBuilding,  label: "Multi-store Management" },
];

const stats = [
  { value: 20,   suffix: "+", label: "Businesses" },
  { value: 4,    suffix: "+", label: "Years Experience" },
  { value: 99.9, suffix: "%", label: "Uptime" },
];

function useCountUp(target, active, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(parseFloat(start.toFixed(1)));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

function StatCounter({ value, suffix, label, active }) {
  const count = useCountUp(value, active);
  return (
    <div className="stat-item">
      <span className="stat-value">{count}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Floating particle for loading overlay
function Particle({ index }) {
  const size = Math.random() * 6 + 3;
  const x = Math.random() * 100;
  const duration = Math.random() * 6 + 4;
  const delay = Math.random() * 4;
  return (
    <motion.div
      className="particle"
      style={{ width: size, height: size, left: `${x}%`, bottom: '-10px' }}
      animate={{ y: [0, -(window.innerHeight + 40)], opacity: [0, 0.7, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export default function Login({ onLogin, bgImage, logo }) {
  const [username, setUsername] = useState('tikfese@gmail.com');
  const [password, setPassword] = useState('200377');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statsActive, setStatsActive] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const cardRef = useRef(null);

  // Mouse-tilt effect on card
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 100, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 100, damping: 20 });

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotateX.set(((e.clientY - cy) / rect.height) * -8);
    rotateY.set(((e.clientX - cx) / rect.width) * 8);
  };
  const handleMouseLeave = () => { rotateX.set(0); rotateY.set(0); };

  // Activate stats when right panel mounts
  useEffect(() => {
    const t = setTimeout(() => setStatsActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Loading sequence
  useEffect(() => {
    if (!isLoading) return;
    let step = 0;
    const totalDuration = 4800;
    const stepInterval = totalDuration / loadingSteps.length;

    const stepTimer = setInterval(() => {
      step += 1;
      if (step < loadingSteps.length) setLoadingStep(step);
      else clearInterval(stepTimer);
    }, stepInterval);

    // Smooth progress bar
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const next = prev + 100 / (totalDuration / 50);
        return next >= 100 ? 100 : next;
      });
    }, 50);

    const loginTimer = setTimeout(() => {
      onLogin({ username, password });
    }, 5000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
      clearTimeout(loginTimer);
    };
  }, [isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
  };

  return (
    <div className="login-page">

      {/* ── LOADING OVERLAY ─────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          >
            {/* Floating particles */}
            <div className="particles-bg">
              {Array.from({ length: 18 }).map((_, i) => <Particle key={i} index={i} />)}
            </div>

            {/* Scanline sweep */}
            <div className="scanline" />

            {/* Central spinner stack */}
            <div className="loader-stage">
              <div className="loader-ring loader-ring-outer" />
              <div className="loader-ring loader-ring-mid" />
              <div className="loader-ring loader-ring-inner" />
              <motion.div
                className="loader-core"
                animate={{ scale: [1, 1.08, 1], boxShadow: [
                  '0 0 20px rgba(255,106,0,0.4)',
                  '0 0 40px rgba(255,106,0,0.8)',
                  '0 0 20px rgba(255,106,0,0.4)',
                ]}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <img src={logo} alt="EPOSX" className="loader-logo-img" />
              </motion.div>
            </div>

            {/* Brand name */}
            <motion.div
              className="loader-brand"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              EPOSX
            </motion.div>

            {/* Progress bar */}
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
              <span className="progress-pct">{Math.round(progress)}%</span>
            </div>

            {/* Step text */}
            <div className="loading-steps-area">
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingStep}
                  className="loading-step-row"
                  initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35 }}
                >
                  <span className="step-icon">{loadingSteps[loadingStep].icon}</span>
                  <span className="step-text">{loadingSteps[loadingStep].text}</span>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="step-dots">
                {loadingSteps.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`step-dot ${i <= loadingStep ? 'active' : ''}`}
                    animate={i === loadingStep ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>

            <div className="loader-subtext">Powered by esystemlk Advanced POS Solutions</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEFT PANEL ──────────────────────────────────── */}
      <div className="login-left">
        {/* Ambient orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        <motion.div
          ref={cardRef}
          className="login-card"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo + title */}
          <motion.div
            className="login-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className="logo-wrapper"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={logo} alt="EPOSX" className="login-logo-img" />
              <div className="logo-glow" />
            </motion.div>
            <h1 className="brand-title">EPOSX</h1>
            <p className="brand-sub">Welcome back — sign in to your workspace</p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <motion.div
              className="form-group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <label className={userFocused || username ? 'label-float' : ''}>
                <span className="label-icon">👤</span> Username
              </label>
              <div className={`input-shell ${userFocused ? 'focused' : ''}`}>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setUserFocused(true)}
                  onBlur={() => setUserFocused(false)}
                  required
                />
                <div className="input-border-line" />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              className="form-group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <label className={passFocused || password ? 'label-float' : ''}>
                <span className="label-icon">🔒</span> Password
              </label>
              <div className={`input-shell ${passFocused ? 'focused' : ''}`}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  required
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
                <div className="input-border-line" />
              </div>
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="login-button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="btn-shimmer" />
              <span className="btn-content">
                <span>Sign In to System</span>
                <span className="btn-arrow">→</span>
              </span>
            </motion.button>
          </form>

          <motion.p
            className="login-footer-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            EPOSX v2.0 · esystemlk · {new Date().getFullYear()}
          </motion.p>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────── */}
      <div
        className="login-right"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        {/* Gradient layers */}
        <div className="right-overlay-bottom" />
        <div className="right-overlay-top" />

        {/* Animated grid lines */}
        <div className="grid-overlay" />

        <div className="info-content">
          {/* Live badge */}
          <motion.div
            className="info-badge"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="live-dot" />
            Advanced Business Management
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            The Future of<br />
            <span className="heading-highlight">Retail Intelligence</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Experience the most reliable EPOSX system by esystemlk. 
            With over 4 years of uninterrupted service and a lifetime maintenance guarantee, 
            we provide the foundation your business needs to scale with confidence.
          </motion.p>

          {/* Stats row */}
          <motion.div
            className="stats-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            {stats.map((s, i) => (
              <StatCounter key={i} {...s} active={statsActive} />
            ))}
          </motion.div>

          {/* Features grid */}
          <motion.div
            className="features-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  className="feature-item"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,106,0,0.18)' }}
                >
                  <span className="feature-emoji">
                    <Icon />
                  </span>
                  <span className="feature-text">{f.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
