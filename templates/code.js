/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html", // مسح قوالب HTML
    "./static/js/**/*.js",    // مسح ملفات JavaScript للبحث عن كلاسات Tailwind
  ],
  darkMode: 'class', // تفعيل الوضع الليلي بناءً على الكلاس
  theme: {
    extend: {
      fontFamily: {
        // استخدام خط Tajawal كخط أساسي
        sans: ['Tajawal', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
      },
      colors: {
        'brand-purple': {
          light: '#c084fc', // بنفسجي فاتح
          DEFAULT: '#a855f7', // بنفسجي أساسي
          dark: '#7e22ce',  // بنفسجي غامق
        },
        'brand-blue': {
          light: '#93c5fd',
          DEFAULT: '#60a5fa',
          dark: '#3b82f6',
        },
        // تخصيص ألوان الوضعين النهاري والليلي
        // الوضع الفاتح
        light: {
          background: 'hsl(210, 40%, 98%)', // slate-50
          foreground: 'hsl(222, 84%, 4.9%)', // slate-950
          card: 'hsl(0, 0%, 100%)',
          'card-foreground': 'hsl(222, 84%, 4.9%)',
          popover: 'hsl(0, 0%, 100%)',
          'popover-foreground': 'hsl(222, 84%, 4.9%)',
          primary: 'hsl(262, 83%, 58%)', // بنفسجي
          'primary-foreground': 'hsl(210, 40%, 98%)',
          secondary: 'hsl(210, 40%, 96.1%)', // slate-100
          'secondary-foreground': 'hsl(222, 47%, 11.2%)', // slate-900
          muted: 'hsl(210, 40%, 96.1%)',
          'muted-foreground': 'hsl(215, 20.2%, 65.1%)', // slate-500
          accent: 'hsl(210, 40%, 96.1%)',
          'accent-foreground': 'hsl(222, 47%, 11.2%)',
          destructive: 'hsl(0, 84.2%, 60.2%)', // red-500
          'destructive-foreground': 'hsl(210, 40%, 98%)',
          border: 'hsl(214.3, 31.8%, 91.4%)', // slate-200
          input: 'hsl(214.3, 31.8%, 91.4%)',
          ring: 'hsl(222, 84%, 4.9%)',
        },
        // الوضع الداكن
        dark: {
          background: 'hsl(222, 47%, 11.2%)', // slate-900
          foreground: 'hsl(210, 40%, 98%)', // slate-50
          card: 'hsl(217, 33%, 17%)', // slate-800 (أغمق قليلاً)
          'card-foreground': 'hsl(210, 40%, 98%)',
          popover: 'hsl(222, 84%, 4.9%)',
          'popover-foreground': 'hsl(210, 40%, 98%)',
          primary: '#a855f7', // بنفسجي
          'primary-foreground': 'hsl(0, 0%, 100%)',
          secondary: 'hsl(217, 33%, 25%)', // أغمق من card
          'secondary-foreground': 'hsl(210, 40%, 98%)',
          muted: 'hsl(217, 33%, 25%)',
          'muted-foreground': 'hsl(215, 20.2%, 65.1%)', // slate-400
          accent: 'hsl(217, 33%, 25%)',
          'accent-foreground': 'hsl(210, 40%, 98%)',
          destructive: 'hsl(0, 63%, 40%)', // أحمر أغمق
          'destructive-foreground': 'hsl(210, 40%, 98%)',
          border: 'hsl(217, 33%, 25%)', // حدود أغمق
          input: 'hsl(217, 33%, 25%)',
          ring: 'hsl(212.7, 26.8%, 83.9%)', // zinc-300
        }
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
      keyframes: {
        'typing-blink': {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        'mic-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.7' },
        }
      },
      animation: {
        'typing-blink': 'typing-blink 1.4s infinite both',
        'mic-pulse': 'mic-pulse 1.5s infinite ease-in-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}