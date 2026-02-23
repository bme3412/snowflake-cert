# Snowflake Learn

A simple web app study guide for Snowflake concepts, organized by **category**.

## Structure

- **Home** (`index.html`) — Lists all categories (Virtual Warehouse, Databases Tables & Views, etc.). Open this first.
- **Categories** — Each category has its own folder with:
  - `index.html` — Category index: list of guides in that category.
  - One HTML file per guide (e.g. `overview.html`, `multi-cluster.html`).

**Current categories:**

| Category | Path | Guides |
|----------|------|--------|
| Virtual Warehouse | `virtual-warehouse/` | Overview, Multi-cluster, Considerations, Working with, Gen2 |
| Databases, Tables & Views | `databases-tables-views/` | Table structures (placeholder) |

## How to run

**Option 1 — Open in browser**  
Open `app/index.html` (the home page). Use it as the entry point so category links work.

**Option 2 — Local server (recommended)**  
From the project root or from `app`:

```bash
# From repo root
python3 -m http.server 8080 --directory app

# Or from app
cd app && python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Features

- **Home page** — Category cards link to each category’s index.
- **Category index** — Lists guides in that category with short descriptions.
- **Guides** — Sidebar: category link, list of guides in the category, “In this guide” sections, progress. Breadcrumb: Home › Category › Guide.
- **Progress** — “I’ve read this” per section; stored per guide in the browser.

## Adding a new category

1. Create a folder under `app/`, e.g. `app/my-category/`.
2. Add `app/my-category/index.html` — same layout as `databases-tables-views/index.html`: header (Home + your category), breadcrumb, title, and a `<ul class="guide-list">` of guides.
3. Add a **category card** on the home page (`index.html`): copy an existing `<article class="category-card">` and update title, description, and link to `my-category/index.html`.

## Adding a new guide to a category

1. Add a new HTML file in that category’s folder (e.g. `virtual-warehouse/my-guide.html`). Copy an existing guide (e.g. `overview.html`) and change:
   - `data-guide-id`, title, breadcrumb, guide content.
   - In the sidebar, add a link in the “Virtual Warehouse” (or that category) guide list and set `class="is-active"` on the current guide.
2. Add a link to the new guide on the category index page (`index.html` in that folder).

## Adding a new top-level category from documentation

When you add something like `documentation/03-storage/00-overview.md`:

1. Create `app/storage/` (or a slug that matches your docs).
2. Add `app/storage/index.html` (category index) and `app/storage/overview.html` (or the guide name) with content converted from the markdown (same paragraph + key-takeaway style as the warehouse guides).
3. Add a category card on `app/index.html` linking to `storage/index.html`.
