# Tailwind CSS Configuration Guide

## ✅ Files Created/Updated

### 1. **tailwind.config.js**

Main Tailwind configuration with custom colors matching the Nexus Core design system.

### 2. **postcss.config.js**

PostCSS configuration for Tailwind processing with Vite plugin.

### 3. **vite.config.js**

Vite configuration with React and Tailwind CSS plugins.

### 4. **src/index.css**

Main stylesheet with Tailwind directives and custom scrollbar styles.

### 5. **src/App.jsx**

Removed unnecessary App.css import (Tailwind handles all styling).

## 🎨 Tailwind v4 Updates

This project uses **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`).

### Key Changes from v3:

- Gradient classes: Use `bg-linear-to-*` instead of `bg-gradient-to-*`
- Import in CSS: `@import "tailwindcss";` instead of `@tailwind` directives
- Plugin integration: Direct Vite plugin instead of PostCSS only

## 📦 Dependencies

Required packages (already installed):

```json
{
  "@tailwindcss/vite": "^4.1.17",
  "tailwindcss": "^4.1.17",
  "recharts": "^2.x.x"
}
```

## 🚀 Usage

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🎨 Design Tokens

All custom colors are defined in `tailwind.config.js`:

- **Slate** (Primary grays): 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- **Emerald** (Success/Running): 50, 600, 700
- **Amber** (Warning/Idle): 50, 600, 700
- **Red** (Danger/Fault): 50, 600, 700, 800

## ✨ Custom Styles

### Scrollbar Styling

Custom scrollbar styles in `index.css` for a polished look:

- Width: 8px
- Track: Light slate gray
- Thumb: Medium slate with hover effect

### Font Configuration

- System font stack for optimal performance
- Monospace for code/RFID tags

## 🔧 Components Guidelines

All Componentss use Tailwind utility classes. Example patterns:

```jsx
// Cards
<div className="bg-white rounded-xl shadow-sm p-6">

// Status Badges
<span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">

// Buttons
<button className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
```

## 📝 Notes

- No custom CSS files needed beyond `index.css`
- All styling is done through Tailwind utilities
- Responsive design built-in with Tailwind's responsive prefixes
- Dark mode support can be added via Tailwind's dark: prefix
