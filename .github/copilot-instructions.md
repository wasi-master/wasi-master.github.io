# Project Guidelines

## Code Style
- Use Vanilla HTML, CSS, and JavaScript. Avoid introducing heavy frontend frameworks (like React or Vue) as this is built for raw performance.
- For Python automation scripts like `updater.py`, use standard formatting (e.g., Black/Ruff if available) and the existing imported libraries (`requests`, `beautifulsoup4`, `rich`).
- Prioritize static, lightweight implementations to maintain the current 98% GTMetrix performance score.

## Architecture
- This is a statically generated personal portfolio targeting GitHub Pages and Netlify.
- `index.html`, `main.css`, and `script.js` compose the user interface.
- `updater.py` is a specialized Python script bridging the static site, fetching and injecting GitHub repository stats (stars, forks) and PyPI download counts directly into the markup.

## Build and Test
- Testing locally: Start a generic static web server in the root directory (e.g., `python -m http.server 8000`) and browse to `localhost:8000`.
- Running the updater: `python updater.py` (Set the `GITHUB_TOKEN` environment variable to avoid API rate-limits).
- No compile steps are needed for the frontend resources.

## Conventions
- Images and static assets rely on immutable caching set in `netlify.toml` (`max-age=immutable`). Ensure new media formats are added there if necessary.
- Modify existing HTML directly rather than adding complex client-side rendering logic.