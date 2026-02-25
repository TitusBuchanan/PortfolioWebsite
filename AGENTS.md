## Cursor Cloud specific instructions

This is a React 16 portfolio SPA built with Create React App (`react-scripts 3.4.1`). No database, Docker, or backend API required.

### Node.js version requirement

This project requires **Node.js 14** (`nvm use 14`). The `react-scripts 3.4.1` bundler is incompatible with Node 18+. The update script handles this automatically via nvm.

### Commands

See `README.md` for standard CRA commands. Key ones:

- **Dev server:** `BROWSER=none npm start` (port 3000, hot-reload)
- **Lint:** `npx eslint src/`
- **Tests:** `CI=true npm test -- --watchAll=false`
- **Build:** `npm run build`
- **Production server:** `node server.js` (serves `build/` on port 5000)

### Known issues (pre-existing)

- `npm test` fails because `App.test.js` renders `<App>` without wrapping it in a `<Router>`, causing an invariant violation. This is a pre-existing bug in the test file, not an environment issue.
- ESLint reports 1 warning: unused `Fade` import in `src/components/aboutme.js`.
