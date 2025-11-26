import { motion } from "framer-motion";
import { showToast } from "../../utils/toast";

function OAuthButton({ provider, icon, onClick }) {
  const handleClick = async () => {
    try {
      // Attempt OAuth flow
      const providerLower = provider.toLowerCase();
      const redirectUrl = `${window.location.origin}/auth/callback/${providerLower}`;

      // For now, redirect to OAuth endpoint (backend needs to implement this)
      // This is a placeholder that will work once backend is set up
      const oauthUrl = `/api/auth/${providerLower}`;

      // Check if backend endpoint exists
      const response = await fetch(oauthUrl, { method: "GET" });

      if (response.ok || response.status === 401) {
        // If endpoint exists, redirect
        window.location.href = oauthUrl;
      } else {
        // Fallback: show info message
        showToast.info(
          `${provider} OAuth integration is being set up. Please use email login for now.`,
          { duration: 4000 }
        );
      }
    } catch (error) {
      // If OAuth endpoint doesn't exist yet, show helpful message
      showToast.info(
        `${provider} OAuth will be available soon. Please use email login for now.`,
        { duration: 4000 }
      );
    }

    if (onClick) onClick();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] transition-all text-[var(--color-text-primary)] font-medium"
      whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {icon}
      <span>Continue with {provider}</span>
    </motion.button>
  );
}

export default OAuthButton;
