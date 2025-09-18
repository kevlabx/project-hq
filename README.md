# LoomPages Project HQ

Static project tracker with 10-day plan, tasks, prompts, and live progress.  
Hosted on GitHub Pages. Updates flow through GitHub Issues.

## How it works

- Public read on GitHub Pages.
- Contributors click **Update** or **Report bug** which opens a prefilled GitHub Issue.
- A GitHub Action parses the JSON block in the issue and updates `data/tasks.json` (and adds bugs to `data/bugs.json`), then commits.
- GitHub Pages rebuilds and the dashboard reflects new progress.

## Setup

1. Edit `data/config.js` with your GitHub owner and repo.
2. Push to `main`.
3. In repo **Settings → Pages → Source = GitHub Actions**.
4. Share the Pages URL shown in Actions → Deploy to GitHub Pages.

## Local test

Use VS Code Live Server or:

```bash
npx serve
# open http://localhost:3000
```

---

# Step 3 — Push to GitHub and turn on Pages

In your VS Code terminal:

```powershell
# Replace placeholders
# If you use GitHub CLI (gh):
# gh repo create YOUR_REPO_NAME --private --source . --push

# Or add remote manually:
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```
