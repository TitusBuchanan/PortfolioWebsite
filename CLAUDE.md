# CLAUDE.md — Portfolio Website

This file provides guidance for AI assistants (Claude, Copilot, etc.) working on this codebase.

---

## Project Overview

A React-based portfolio website for **Titus Buchanan**, a DevOps Engineer. The project has two distinct parts:

1. **`src/`** — A single-page React application with five pages (Landing, About, Resume, Projects, Contact)
2. **`projects/`** — Eleven DevOps/IaC project templates (Terraform, Ansible, Kubernetes, CI/CD pipelines, etc.) showcased on the portfolio

**Deployment target:** Heroku (via `Procfile` + Express `server.js`)

---

## Repository Structure

```
PortfolioWebsite/
├── src/
│   ├── App.js                  # App shell with fixed nav bar (64px)
│   ├── App.css                 # All component styles (animations, layouts)
│   ├── index.js                # Entry point — BrowserRouter + Material CSS import
│   ├── index.css               # Global CSS variables, reset, typography
│   ├── App.test.js             # Single smoke test (CRA default)
│   ├── setupTests.js           # Jest-DOM setup
│   ├── serviceWorker.js        # PWA service worker (unregistered by default)
│   ├── Assets/                 # logo.png, landingpage image
│   └── components/
│       ├── main.js             # React Router Switch/Route — page router
│       ├── landingpage.js      # Hero, marquee, CTA buttons
│       ├── aboutme.js          # Stats with CountUp, tags, summary
│       ├── resume.js           # Timeline: experience, education, skills
│       ├── projects.js         # Filterable project grid
│       ├── contact.js          # Contact info + social links
│       ├── Reveal.js           # IntersectionObserver scroll reveal wrapper
│       ├── education.js        # (placeholder, not actively routed)
│       ├── experience.js       # (placeholder, not actively routed)
│       └── skills.js           # (placeholder, not actively routed)
├── projects/                   # 11 DevOps project codebases
│   ├── aws-multi-region-infra/
│   ├── ansible-config-mgmt/
│   ├── eks-microservices/
│   ├── cluster-monitoring/
│   ├── jenkins-cicd-pipeline/
│   ├── gitlab-ci-multistage/
│   ├── serverless-event-pipeline/
│   ├── vpc-network-architecture/
│   ├── iot-firmware-deploy/
│   └── infra-automation-scripts/
├── public/                     # Static assets, index.html, manifest.json
├── server.js                   # Express production server (serves build/)
├── Procfile                    # Heroku: `web: node server.js`
├── package.json
├── AGENTS.md                   # Validation instructions for projects/ directory
└── README.md                   # Standard CRA documentation (boilerplate)
```

---

## Development Commands

```bash
npm start          # Dev server on http://localhost:3000 (hot reload)
npm test           # Jest test runner (interactive watch mode)
npm run build      # Production build → build/ directory
npm run eject      # Eject from CRA (irreversible — avoid)
node server.js     # Run production Express server (after build)
```

**Important:** The `build/` directory is git-ignored. Always run `npm run build` before deploying or testing the production server.

---

## Tech Stack

| Layer | Library / Version |
|-------|------------------|
| Framework | React 16.13.1 (class components) |
| Routing | react-router-dom 5.1.2 |
| UI Components | react-mdl 2.1.0 (Material Design Lite) |
| Animations | react-reveal 1.2.2, react-spring 8.0.27 |
| Build | Create React App (react-scripts 3.4.1) |
| Server | Express (production, serves `build/`) |
| Testing | @testing-library/react, jest-dom, user-event |
| Icons | Font Awesome 4.7.0 (CDN), Material Icons (CDN) |
| Fonts | Bebas Neue, Space Grotesk, JetBrains Mono, Inter (Google Fonts) |

---

## CSS & Styling Conventions

### CSS Variables (defined in `src/index.css`)

All colors, fonts, and borders are defined as CSS custom properties. Use these — never hardcode values.

```css
/* Colors */
--bg: #060608              /* Primary dark background */
--bg2: #0c0c10             /* Secondary background */
--bg3: #121216             /* Tertiary background */
--white: #f0ede6           /* Primary text color */
--white-d: rgba(...)       /* Dimmed text (55% opacity) */
--white-m: rgba(...)       /* Medium dimmed (18% opacity) */
--white-f: rgba(...)       /* Faint (6% opacity) */
--orange: #e8a020          /* Primary accent / CTA */
--orange2: #f0c050         /* Secondary accent */
--orange-g: linear-gradient(135deg, #e8a020, #f0c050)
--border: rgba(255,255,255,0.06)
--border-h: rgba(255,255,255,0.12)  /* Hover border */

/* Typography */
--fd: 'Bebas Neue', Impact    /* Display / large headings */
--fh: 'Space Grotesk'         /* Section headings */
--fb: 'Inter'                 /* Body text */
--fm: 'JetBrains Mono'        /* Monospace / meta text */
```

### Naming Conventions

- **CSS classes:** `kebab-case` (e.g., `.hero-center`, `.proj-cell`, `.nav-link`)
- **File names:** `lowercase` (e.g., `landingpage.js`, `aboutme.js`)
- **React components:** `PascalCase` exports (e.g., `export default Landing;`)
- **CSS custom properties:** `--double-dash-prefix`

### Animation Approach

- Scroll reveals: Use the `<Reveal>` component wrapper (uses IntersectionObserver, threshold 0.1)
- Staggered delays: Use `.reveal-d1` through `.reveal-d6` CSS delay classes
- Text reveals: `clip-path` animation (`textReveal` keyframe in `App.css`)
- 3D hover effects: `perspective: 600-800px` + `transform-style: preserve-3d`
- Marquee: infinite linear animation, paused on hover via CSS
- All transitions use `cubic-bezier(0.16, 1, 0.3, 1)` easing

### Responsive Design

- Single breakpoint at **768px** (`max-width: 768px`)
- Layouts shift from multi-column grid to single column
- Decorative elements (diagonal lines, scribble, meta info) are hidden on mobile
- Typography uses `clamp()` for fluid scaling

---

## Component Architecture

### Class Components

All page components use the older React **class component** pattern. When adding new components, match this style unless refactoring the entire file:

```jsx
import React, { Component } from 'react';

class MyComponent extends Component {
  render() {
    return <div className="my-component">...</div>;
  }
}

export default MyComponent;
```

### Routing (`src/components/main.js`)

Uses `react-router-dom` v5 `<Switch>` + `<Route>`. To add a new page:
1. Create the component in `src/components/`
2. Import it in `main.js`
3. Add a `<Route path="/your-path" component={YourComponent} />`
4. Add a nav link in `App.js`

### Data Storage

All page data (projects list, skills array, experience, education) is **hardcoded inline** inside the component's `render()` method. There is no external data file, API, or state management library. To update content, edit the relevant component directly.

### The `<Reveal>` Component (`src/components/Reveal.js`)

A scroll-triggered animation wrapper. Usage:

```jsx
import Reveal from './Reveal';

<Reveal delay={200}>
  <p>This fades in when scrolled into view</p>
</Reveal>
```

The `delay` prop (ms) staggers the animation. Internally uses `IntersectionObserver` and adds a CSS class to trigger transitions.

---

## Projects Directory (`projects/`)

Each subdirectory is a standalone DevOps project template. They are **independent of the React app** — the portfolio website only references them by name/description in `projects.js`.

### Validation (from `AGENTS.md`)

When modifying files in `projects/`:

```bash
# Shell scripts
bash -n <script.sh>                # Syntax check
shellcheck <script.sh>             # Lint (if available)

# YAML
python3 -m py_compile              # Not applicable
python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"

# JSON
python3 -m json.tool < file.json

# Terraform
terraform validate                  # Inside the terraform directory
terraform fmt -check -recursive     # Format check

# Makefiles
make -n <target>                    # Dry-run check

# Ansible
ansible-playbook --syntax-check -i inventory playbook.yml
```

**Special notes for `projects/`:**
- Ansible playbooks use role-based organization; handlers live in `roles/*/handlers/main.yml`
- `infra-automation-scripts/` Python scripts require: `boto3`, `tabulate`, `requests`, `pyyaml`
- Docker is unavailable in the cloud environment; `iot-firmware-deploy` can use temp directories for builds

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.css` | **Start here for styling** — all CSS variables and global reset |
| `src/App.css` | All component-level styles, animations, keyframes |
| `src/components/main.js` | Page routing — add/remove pages here |
| `src/App.js` | Navigation bar — add nav links here |
| `src/components/projects.js` | Project grid data — update project cards here |
| `src/components/resume.js` | Experience, education, skills content |
| `AGENTS.md` | Validation commands for `projects/` directory |

---

## Design Philosophy

- **Dark-first:** Near-black backgrounds (`#060608`) with orange (`#e8a020`) as the sole accent color
- **Minimalist brutalist:** Generous whitespace, strong typography, restrained color use
- **Motion-rich:** Scroll reveals, 3D card transforms, animated gradients, and a skill marquee
- **No external state management:** React component state only — no Redux, Context API, or Zustand
- **No CSS modules:** Global CSS with BEM-adjacent kebab-case class names

---

## Testing

Tests live in `src/App.test.js`. The test suite currently has one smoke test. Use `@testing-library/react` patterns when adding tests:

```js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders nav', () => {
  render(<App />);
  expect(screen.getByText(/titus/i)).toBeInTheDocument();
});
```

Run tests: `npm test`

---

## Deployment

**Local production preview:**
```bash
npm run build
node server.js       # Serves on port 5000 (or $PORT)
```

**Heroku:** Push to the deployment remote. The `Procfile` runs `node server.js` automatically. The Express server in `server.js` serves all routes from `build/index.html` (SPA fallback).

**Environment variables:** No custom env vars are currently used. If you add one, prefix it with `REACT_APP_` for CRA to expose it to the frontend bundle.

---

## Common Tasks

### Adding a new project card to the Projects page

Edit `src/components/projects.js`. Find the `projects` array and add an entry:

```js
{
  cat: 'cloud',          // Filter category: web | cloud | cicd | k8s | automation
  title: 'Project Name',
  desc: 'Short description of the project.',
  tags: ['AWS', 'Terraform'],
  link: 'https://github.com/...'
}
```

### Adding a new skill to the marquee

Edit `src/components/landingpage.js`. Find the `skills` array and append the new skill string.

### Updating experience / education

Edit `src/components/resume.js`. Content is hardcoded JSX — locate the relevant section and update in place.

### Changing accent color

Update `--orange` and `--orange2` in `src/index.css`. The gradient `--orange-g` should also be updated.
