# joe-suh

A resume that you can either read, or go looking for.

**Live:** https://jsuh719.github.io/joe-suh/

The landing page is the plain resume — white on jungle green, fully scannable,
prints cleanly. There's also a jungle route: a first-person tropical forest where
each section of the resume is a dinosaur hiding behind the leaves. Move your
cursor near one and it leans out. Click it and the camera travels to it.

Seven inhabitants: Scale AI (T. rex), Scenera (triceratops), US Army
(stegosaurus), West Point (pterodactyl), skills (a compy pack), mentorship
(a maiasaura and her hatchlings), and a surfer out past the break.

## Updating the content

**Edit `resume.js`. That's the whole job.** Everything else reads from it, so
the plain resume and the jungle clearings can never disagree with each other.

Every bullet is a plain string in quotes — no markdown, no HTML, no escaping.

Add a bullet to an existing role:

```js
bullets: [
  "An existing bullet",
  "Your new bullet goes here"      // <- last one gets no trailing comma
]
```

Add a whole new role under a job:

```js
roles: [
  {
    title: "Your New Title",
    dates: "Jan 2027 – Present",
    bullets: [
      "What you did"
    ]
  },
  // ...the older roles stay below
]
```

Reordering anything is just moving blocks up or down. No code changes needed for
any of that.

**The one exception:** adding an entirely new top-level *category* means adding a
new creature to the scene, which is a code change in `index.html` (a `.hot` group
with its own artwork, hit area and chip). Seven categories is the shape the
jungle is drawn for.

## Files

| File | What's in it |
|---|---|
| `resume.js` | All the content. The only file you need to touch. |
| `index.html` | Page structure, and the entire jungle drawn as inline SVG. |
| `style.css` | Theme, layer/parallax/camera animation, print stylesheet. |
| `main.js` | Hash router, proximity engine, content rendering. |

No framework, no build step, no dependencies, nothing to install.

## Running it locally

Double-click `index.html` and it works.

If you'd rather serve it (closer to how GitHub Pages behaves):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Notes for future edits

- **Keep asset paths relative** (`./style.css`, not `/style.css`). This is a
  project page served from a subpath, so absolute paths 404 on the live site
  while still working fine locally.
- **No phone number or email address in this repo, on purpose.** The page is
  publicly indexed and scraped; contact routes through LinkedIn. The
  "Print / Save as PDF" button generates a PDF from the live content rather than
  hosting the resume PDF, which would put those details back on the internet.
- Accessibility is deliberate, not incidental: every dinosaur is a real button
  with a keyboard focus state that triggers the same reveal a mouse gets, and
  `prefers-reduced-motion` turns off the parallax and camera moves entirely.

Built with a coding agent — vanilla HTML, CSS and JS the whole way down.
