# 🌌 3D Galaxy Portfolio & Solar System

An interactive 3D web experience built with **Three.js** and **GLSL shaders**, featuring a particle galaxy portfolio and a realistic solar system simulation.

## ✨ Features

### 🎆 Galaxy Portfolio
- **10,000+ particles** morphing into custom text with scroll animation
- Colorful mouse trail effects with dynamic particle systems
- Scroll-driven multi-section layout: Hero, About, Projects, Solar System link, Contact
- Theme switching with premium glassmorphism UI
- Smooth post-processing with UnrealBloom

### ☀️ 3D Solar System
- **NASA 2K texture maps** for all planets (daymap, normal, specular, clouds)
- GLSL shader-based Sun with animated plasma effect
- Earth with multi-layer rendering: surface, normal map, specular oceans, cloud layer, Fresnel atmosphere
- Saturn with texture-mapped rings
- Particle-based asteroid belt
- 3D text labels for each planet
- Interactive "Explore Planets" panel with real astronomical data
- Orbit lines and auto-rotation

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| [Three.js](https://threejs.org) | 3D rendering engine |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| GLSL Shaders | Custom Sun plasma, galaxy vertex/fragment shaders |
| Vanilla CSS | Glassmorphism UI, animations, responsive design |
| HTML5 Canvas | Mouse trail, text sprite labels |

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/web-3D.git
cd web-3D

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
web-3D/
├── index.html              # Portfolio main page
├── solar.html              # Solar System page
├── style.css               # Portfolio styles
├── solar-style.css         # Solar System styles
├── public/
│   └── textures/           # NASA 2K planet textures
│       ├── 2k_sun.jpg
│       ├── 2k_earth_daymap.jpg
│       ├── 2k_earth_nightmap.jpg
│       ├── 2k_earth_normal_map.jpg
│       ├── 2k_earth_specular_map.jpg
│       ├── 2k_earth_clouds.jpg
│       ├── 2k_mercury.jpg
│       ├── 2k_venus_surface.jpg
│       ├── 2k_mars.jpg
│       ├── 2k_jupiter.jpg
│       ├── 2k_saturn.jpg
│       ├── 2k_saturn_ring_alpha.png
│       ├── 2k_uranus.jpg
│       └── 2k_moon.jpg
└── src/
    ├── main.js             # Galaxy portfolio logic
    ├── solar-main.js       # Solar system logic
    ├── scene.js            # Three.js scene setup
    ├── galaxy.js           # Particle galaxy system
    ├── interactions.js     # Mouse/scroll interactions
    ├── postprocessing.js   # Bloom effects
    └── shaders/
        ├── galaxyVertex.glsl
        ├── galaxyFragment.glsl
        └── sunFragment.glsl
```

## 🌍 Deployment

This project is optimized for **Vercel**:

1. Push to GitHub
2. Connect repo on [vercel.com](https://vercel.com)
3. Auto-detects Vite → deploys in ~30 seconds

## 📸 Credits

- Planet textures by [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)
- Fonts: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) & [Inter](https://fonts.google.com/specimen/Inter)

## 👤 Author

**Khang** — Built with Three.js + GLSL Shaders

---

*A personal 3D web project exploring WebGL, particle systems, and space visualization.*