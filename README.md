# orlovsky.dev

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://orlovsky.dev)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro)](https://astro.build)

This is the source code for [orlovsky.dev](https://orlovsky.dev), a personal website built with [Astro](https://astro.build).

## 📚 Features

- Modern, responsive design
- MDX-powered content
- Interactive map using MapLibre GL

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime & toolkit)

### Installation

1. Clone the repository
```
git clone https://github.com/sadorlovsky/site.git
cd site
```

2. Install dependencies
```
bun install
```

3. Start the development server
```
bun dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command           | Action                                      |
|:------------------|:--------------------------------------------|
| `bun install`     | Installs dependencies                       |
| `bun dev`         | Starts local dev server at `localhost:4321` |
| `bun build`       | Build your production site to `./dist/`     |
| `bun preview`     | Preview your build locally                  |
| `bun test`        | Run tests with Vitest                       |

## 📦 Project Structure

```
site/
├── public/           # Static assets
├── src/
│   ├── components/   # UI components
│   ├── content/      # Content collections (blog posts, etc.)
│   ├── icons/        # Icon components
│   ├── layouts/      # Page layouts
│   ├── lib/          # Utility functions and shared code
│   ├── pages/        # Page components
│   ├── scripts/      # Client-side scripts
│   └── styles/       # CSS stylesheets
├── astro.config.mjs  # Astro configuration
└── tsconfig.json     # TypeScript configuration
```

## 🔄 Deployment

This site is automatically deployed to [Vercel](https://vercel.com) when changes are pushed to the main branch.

## 📄 License

MIT
