import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";

const marketingCopy = {
  label: "Complaint Portal · Officers & Citizens",
  title: "Manage complaints with confidence",
  body: "Pick up citizen requests, organize workloads, and resolve issues faster with a focused workspace inspired by Antigravity.",
  bullets: [
    "Drag-and-drop status control",
    "Instant officer handoff",
    "Live case updates",
  ],
};

const panelVariants = {
  initial: (direction) => ({
    opacity: 0,
    x: direction === "left" ? -35 : 35,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction === "left" ? 35 : -35,
    scale: 0.98,
    transition: {
      duration: 0.45,
      ease: "easeInOut",
    },
  }),
};

const backdropPulse = [
  { top: "10%", left: "5%", size: "400px" },
  { bottom: "0%", right: "15%", size: "520px" },
];

function AuthLayout({ mode, children }) {
  const isLogin = mode === "login";

  const renderMarketingPanel = (position) => (
    <motion.div
      key={`marketing-${position}`}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={position === "left" ? "left" : "right"}
      className="space-y-6"
    >
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-bg-primary)]/70 border border-[var(--color-border)]/60 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] backdrop-blur">
        <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
        {marketingCopy.label}
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight text-[var(--color-text-primary)]">
          {marketingCopy.title}
        </h1>
        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl">
          {marketingCopy.body}
        </p>
      </div>
      <ul className="space-y-3">
        {marketingCopy.bullets.map((bullet) => (
          <motion.li
            key={bullet}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 text-[var(--color-text-primary)] font-medium"
          >
            <span className="w-8 h-8 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center text-base">
              ✓
            </span>
            {bullet}
          </motion.li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-4 text-sm text-[var(--color-text-secondary)]">
        <div className="rounded-2xl bg-[var(--color-bg-primary)]/60 border border-[var(--color-border)]/40 p-4">
          <p className="text-xs uppercase tracking-wide mb-1 text-[var(--color-text-tertiary)]">
            Citizens resolved
          </p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            12k+
          </p>
          <p>this quarter</p>
        </div>
        <div className="rounded-2xl bg-[var(--color-bg-primary)]/60 border border-[var(--color-border)]/40 p-4">
          <p className="text-xs uppercase tracking-wide mb-1 text-[var(--color-text-tertiary)]">
            Avg. response time
          </p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            2.4h
          </p>
          <p>with live updates</p>
        </div>
      </div>
    </motion.div>
  );

  const renderFormPanel = (position) => (
    <motion.div
      key={`form-${mode}`}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={position === "left" ? "left" : "right"}
      className="w-full"
    >
      {children}
    </motion.div>
  );

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%)]" />
      {backdropPulse.map((pulse, index) => (
        <div
          key={index}
          className="absolute pointer-events-none rounded-full blur-3xl opacity-40 bg-[var(--color-primary)]/30"
          style={{
            top: pulse.top,
            bottom: pulse.bottom,
            left: pulse.left,
            right: pulse.right,
            width: pulse.size,
            height: pulse.size,
          }}
        />
      ))}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <motion.div
          layout
          className="flex flex-col gap-6 lg:flex-row lg:gap-10"
          transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
        >
          <section className="flex-1">
            <div className="relative h-full rounded-[32px] bg-[var(--color-bg-primary)]/80 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-[var(--color-primary)]/10 border border-[var(--color-border)]/30 backdrop-blur-xl overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_60%)]" />
              <div className="relative z-10">
                <AnimatePresence mode="wait" initial={false}>
                  {isLogin
                    ? renderMarketingPanel("left")
                    : renderFormPanel("left")}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <section className="flex-1">
            <div className="relative h-full rounded-[32px] bg-[var(--color-bg-primary)]/85 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-[var(--color-primary)]/12 border border-[var(--color-border)]/25 backdrop-blur-xl overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_65%)]" />
              <div className="relative z-10">
                <AnimatePresence mode="wait" initial={false}>
                  {isLogin
                    ? renderFormPanel("right")
                    : renderMarketingPanel("right")}
                </AnimatePresence>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  mode: PropTypes.oneOf(["login", "register"]).isRequired,
  children: PropTypes.node.isRequired,
};

export default AuthLayout;

