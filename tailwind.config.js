/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        aq: {
          green: {
            DEFAULT: '#22A67A',
            hover: '#1B8F6A',
            pressed: '#147A5A',
            tint: '#E6F7F0',
            'tint-border': '#C5E8D5',
          },
          gold: {
            DEFAULT: '#F0B542',
            hover: '#D9A03A',
            tint: '#FEF7E6',
            'tint-border': '#F5E2B0',
          },
          ink: '#1F2D37',
          muted: '#4A5B68',
          subtle: '#8CA3A0',
          border: '#E4EAE8',
          surface: '#F6F8F7',
          error: '#D94444',
          'error-tint': '#FEF0F0',
          'error-tint-border': '#F5C5C5',
          info: '#3B82D6',
          'info-tint': '#E8F1FB',
          'info-tint-border': '#B5D4F4',
          status: {
            draft: '#E4EAE8',
            awaiting: '#E8940D',
            accepted: '#22A67A',
            scheduled: '#3B82D6',
            ordered: '#7B5CC3',
            completed: '#22A67A',
            invoiced: '#1F2D37',
            custom: '#E4EAE8',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        display: ['34px', { lineHeight: '1.1', fontWeight: '500' }],
        'page-title': ['28px', { lineHeight: '1.2', fontWeight: '500' }],
        section: ['22px', { lineHeight: '1.3', fontWeight: '500' }],
        body: ['18px', { lineHeight: '1.5', fontWeight: '400' }],
        btn: ['17px', { lineHeight: '1', fontWeight: '500' }],
        secondary: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '1', fontWeight: '500' }],
      },
      borderRadius: {
        'aq-sm': '6px',
        'aq-md': '8px',
        'aq-lg': '10px',
        'aq-xl': '12px',
        'aq-icon': '18px',
      },
      minHeight: {
        tap: '48px',
      },
      spacing: {
        'aq-xs': '4px',
        'aq-sm': '8px',
        'aq-md': '12px',
        'aq-lg': '16px',
        'aq-xl': '24px',
        'aq-2xl': '32px',
      },
    },
  },
  plugins: [],
}
