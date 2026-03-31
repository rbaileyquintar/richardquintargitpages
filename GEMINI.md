# GEMINI.md: richardquintargitpages

This project, **richardquintargitpages**, is a GitHub Pages site for **Richard Quintar** (`rbaileyquintar`). It serves as a resource hub and documentation center for sports telestration systems and related technologies.

## Project Overview

- **Purpose:** Central hub for documentation, POCs, and technical analysis of professional sports systems.
- **Technologies:** HTML, CSS (Vanilla), GitHub Pages.
- **Architecture:** Static web application utilizing a CSS-variable driven dark theme and modular documentation directory structure.

## Building and Running

Since this is a static site hosted on GitHub Pages:

- **Run Locally:** Open `index.html` in any web browser.
- **Build/Deploy:** Automatic deployment on `git push` to the `main` branch.

## Current Project Structure

- `index.html`: The main Resource Hub with a dark-themed navigation menu and grid layout.
- `telistration-poc/docs/telestration.md`: Advanced documentation on telestration systems.
- `features.json`: Task list and development roadmap.

## Development Conventions

The following mandates are strictly followed:

### Core Mandates

- **Features Tracking:** Always refer to the `features.json` file in the project root to track, list, and update implemented and pending tasks (id, scope, description, status, completedAt).
- **UI/CSS Updates:** Always remind the user to perform a hard refresh (**Cmd+Shift+R** or **Ctrl+F5**) in the browser after making code changes, especially for UI/CSS updates.
- **Visual Alert for Refresh:** Use clear ASCII borders and bold text for the hard refresh reminder instead of HTML tags.
  ```text
  ########################################
  # !!! REMINDER: Hard Refresh (Cmd+Shift+R) !!! #
  ########################################
  ```
- **Iterative Changes:** Prefer small, iterative changes. If a significant refactor is necessary, you MUST call out `*** REFACTOR WARNING ***` and propose a plan for approval before proceeding.

### Testing and Validation

- **Empirical Reproduction:** For bug fixes, always empirically reproduce the failure with a new test case or reproduction script before applying the fix.
- **Verification:** Validation is the only path to finality. A task is only complete when behavioral correctness and structural integrity are confirmed.

---

*Last Updated: 2026-03-30*
