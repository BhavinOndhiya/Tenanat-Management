# UI/UX Setup Guide

## CSS Loading Issue Fix

If you're seeing a blank page with no CSS:

1. **Restart the dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   cd frontend
   npm run dev
   ```

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

3. **Verify Tailwind is working:**
   - Check browser console for errors
   - Verify `tailwindcss@^3.4.0` is installed (not v4)

## Dependencies

- **Framer Motion**: Animations and transitions
- **react-hot-toast**: Toast notifications
- **Tailwind CSS v3**: Utility classes (downgraded from v4 for compatibility)

## Theme System

The app uses CSS variables defined in `src/styles/theme.css` for:
- Colors (primary, secondary, backgrounds, text)
- Spacing scale
- Typography
- Shadows
- Border radius

## Development

After installing dependencies or making CSS changes:
1. Restart the dev server
2. Hard refresh the browser


