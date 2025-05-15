/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Make sure Tailwind doesn't conflict with Designsystemet's CSS variables
  // theme: {
  //   extend: {
  //     colors: {
  //       // Map Tailwind colors to Designsystemet variables
  //       background: 'var(--ds-color-background-default)',
  //       foreground: 'var(--ds-color-text-default)',
  //       border: 'var(--ds-color-border-default)',
  //       primary: 'var(--ds-color-accent-base-default)',
  //       'primary-foreground': 'var(--ds-color-accent-base-contrast-default)',
  //       secondary: 'var(--ds-color-neutral-surface-tinted)',
  //       'secondary-foreground': 'var(--ds-color-neutral-text-default)',
  //       accent: 'var(--ds-color-accent-surface-tinted)',
  //       'accent-foreground': 'var(--ds-color-accent-text-default)',
  //       destructive: 'var(--ds-color-danger-base-default)',
  //       'destructive-foreground': 'var(--ds-color-danger-base-contrast-default)',
  //       muted: 'var(--ds-color-neutral-background-tinted)',
  //       'muted-foreground': 'var(--ds-color-neutral-text-subtle)',
  //       ring: 'var(--ds-color-accent-border-default)',
  //     },
  //     borderRadius: {
  //       sm: 'var(--ds-border-radius-sm)',
  //       md: 'var(--ds-border-radius-md)',
  //       lg: 'var(--ds-border-radius-lg)',
  //       xl: 'var(--ds-border-radius-xl)',
  //     },
  //     fontSize: {
  //       xs: 'var(--ds-font-size-1)',
  //       sm: 'var(--ds-font-size-2)',
  //       base: 'var(--ds-font-size-3)',
  //       lg: 'var(--ds-font-size-4)',
  //       xl: 'var(--ds-font-size-5)',
  //       '2xl': 'var(--ds-font-size-6)',
  //       '3xl': 'var(--ds-font-size-7)',
  //       '4xl': 'var(--ds-font-size-8)',
  //       '5xl': 'var(--ds-font-size-9)',
  //       '6xl': 'var(--ds-font-size-10)',
  //     },
  //     fontWeight: {
  //       normal: 'var(--ds-font-weight-regular)',
  //       medium: 'var(--ds-font-weight-medium)',
  //       semibold: 'var(--ds-font-weight-semibold)',
  //     },
  //   },
  // },
  // corePlugins: {
  //   preflight: false, // Disable Tailwind's reset to avoid conflicts with Designsystemet
  // },
  // Give Designsystemet classes priority over Tailwind
  // important: false,
  // plugins: [],
}; 