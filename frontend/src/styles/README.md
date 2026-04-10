# CSS Structure

This directory contains the split stylesheet architecture for the frontend.

## Entry

- `../App.css`
  - Only contains `@import` statements.
  - Uses `layer(...)` on imports to keep cascade intent explicit.

## Layers and files

1. `base`
- `base.css`

2. `pages`
- `pages/home-portal.css`
- `pages/space.css`
- `pages/anonymous.css`
- `pages/forum.css`
- `pages/stories.css`
- `pages/shared-content.css`
- `pages/gallery.css`

3. `themes`
- `themes/theme-polish.css`

4. `motion`
- `motion.css`

5. `polish`
- `themes/stories-forum-night-polish.css`

6. `skins`
- `themes/skins.css`

## Notes

- Legacy pre-split files have been removed.
- New changes should be added to the split files above.
