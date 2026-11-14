# joe-suh

A resume that you can either read, or go looking for.

**Live:** https://jsuh719.github.io/joe-suh/

The landing page is a hero — a line of introduction with the whole herd of
dinosaurs arrayed around it, and three ways in:

- **Welcome to Suh-rassic Park** scrolls down and starts the journey
- **I like boring resumes** downloads the PDF
- **Read it as plain text** switches to the plain semantic resume at `#/resume`

As you scroll, the herd scatters, and the Jeep pulls away from the trailhead.

## The drive

The whole page is a road. A Jeep is pinned to the bottom of the screen and the
world comes toward it: a curving two-track trail through the jungle that thins
into palms, then sand, then the sea at sunset. Every line of the resume is a
sign standing beside that road at its own distance, and scrolling is how far
you've driven.

Each stop has a **guide**: its dinosaur stands at the start of the stop, falls
in beside the Jeep when you reach it, walks with you through every sign, and
stays behind when the stop ends. The pterodactyl flies. The surfer runs on
ahead into the sea, and is out on the water when you park. Click any of them.

The Jeep **slows at each sign** so it holds at reading size, then picks up speed
between them, and the longest stretches of open road are between stops. Words
flip up out of the ground as a sign arrives; figures like *eight figures* and
*400%+* get a highlighter stroke automatically. The brake lights come on when
you slow down hard.

The trail map on the right (a strip of beads on phones) shows where you are,
and jumps to any stop.

### How it's built

| File | Job |
|---|---|
| `world.js` | Paints the world on a `<canvas>`. A pseudo-3D road renderer: the ground is drawn back to front in thin slices, and every tree, fern and dinosaur is a flat sprite stood up at its depth. Fog is laid down between depth bands. All the scenery is drawn in code at startup, in the same flat outlined style as the dinosaurs; nothing but the dinosaurs is downloaded. A second canvas in front of the Jeep holds dust, fireflies and falling leaves. |
| `main.js` | Builds the signs from `resume.js`, maps scroll to camera distance, places each sign where it stands in the world, walks the guides, and runs the Jeep. |

The signs are real DOM text, not canvas. They stay selectable, linkable and
readable by screen readers, and keyboard focus on a link drives you to its sign.

**Tuning knobs** are the `TOUR` object at the top of section 4 in `main.js`:
screens of scroll per sign (`BEAT`), extra open road before each stop (`GAP`),
and so on. The drive is about 17 screens long; `BEAT` is the number to lower if
it drags. From the browser console, `SuhTour.go(5)` drives to the sixth sign.

**Reduced motion** turns the drive off entirely: the world becomes a still
backdrop and the signs stand in an ordinary column.

## The dinosaurs

They are transparent PNGs in `dino/`, generated as one sheet (five in a single
image, which is the only reliable way to get a consistent style across a set)
and then split by `tools/extract-dinos.py`.

If you regenerate them, run:

```sh
python3 tools/extract-dinos.py dinos.png
```

That script exists because background removers leave the key colour smeared
through the semi-transparent rim, and sometimes trapped in concave pockets — the
gaps between the stegosaurus's back plates were full of it. Against the dark
green page that reads as a bright pink halo. The script scales each pixel's
alpha by how magenta it is (rather than thresholding, which would notch the
silhouette), floods each creature's own colour outward into the soft rim, and
cuts the five apart. The surfer gets a gentler threshold than the rest because
purple legitimately leans magenta and an aggressive pass would eat him.

All five are padded onto one square canvas so they stay the same relative scale
— the page's sizing rules assume that. Keep the sheet in the order
**trex, trike, stego, ptero, surf**, left to right; the script names them by
position.

## Updating the content

**Edit `resume.js`. That's the whole job.** Everything else reads from it, so
the plain resume and the jungle clearings can never disagree with each other.

Every bullet is a plain string in quotes. The one piece of markup bullets
understand is a link — square brackets for the words, round brackets for the
address:

```js
"Listed author of [the paper title](https://example.com/paper), 2014"
```

Anything outside the brackets is literal text. Links are built as real DOM nodes
rather than injected as HTML, so nothing you type can break the page.

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

Reordering anything is just moving blocks up or down. Deleting a section means
deleting its whole `{ ... }` block — don't blank the fields out and leave the
block behind, or it renders as an empty heading.

The hero headline lives in the same file, under `hero`. `{{JOB TITLE}}` and
`{{COMPANY}}` are substituted from the `currentTitle` and `currentCompany`
fields, so a job change is a two-line edit.

**The one exception:** adding an entirely new top-level *category* needs a new
guide. That's an entry in `GUIDES` near the top of section 4 in `main.js` (its
picture in `dino/`, an accent colour, and what it says when clicked) keyed by
the category's `slug`. A category without a guide isn't shown on the drive,
though it still appears in the plain resume.

## The "I like boring resumes" button

It serves `Joe-Suh-Resume.pdf` from the root of this repo.

**Put a scrubbed copy there** — one with the phone number and email removed. The
originals in `~/Documents/Work/Resumes` carry both in their text *and* their
metadata, and this repo is public, so committing one as-is puts them on the
internet permanently. `.gitignore` blocks every PDF except that one filename, on
purpose.

The page content is built from `Joe Suh Resume July 2026 - FDE.pdf`, so a scrubbed
copy of that one keeps the download and the page saying the same thing.

If the file isn't there, the button 404s — that's the only thing tying the two
together, so it's safe to add whenever.

## Files

| File | What's in it |
|---|---|
| `resume.js` | All the content. The only file you need to touch. |
| `index.html` | Page structure and the Jeep (inline SVG). |
| `world.js` | The painted world: scenery, road, sky, fog, dust. |
| `main.js` | The tour, the guides, the trail map, the plain resume, the router. |
| `style.css` | Type, signs, chrome, reduced-motion and print stylesheets. |

No framework, no build step, nothing to install. Fonts (Bricolage Grotesque and
Inter) come from Google Fonts, with system fallbacks.

## Running it locally

Double-click `index.html` and it works.

If you'd rather serve it (closer to how GitHub Pages behaves):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing

Pages is currently **disabled**. To turn it back on:

```sh
gh api -X POST repos/jsuh719/joe-suh/pages -f "source[branch]=main" -f "source[path]=/"
```

Takes about a minute to build. To take it down again:

```sh
gh api -X DELETE repos/jsuh719/joe-suh/pages
```

## Notes for future edits

- **Keep asset paths relative** (`./style.css`, not `/style.css`). This is a
  project page served from a subpath, so absolute paths 404 on the live site
  while still working fine locally.
- **No phone number or email in the HTML or JS**, on purpose — the page is
  publicly indexed and scraped, so contact routes through LinkedIn.
- Accessibility is deliberate, not incidental: the signs are real text in
  reading order, focus drives you to whichever sign holds it, and
  `prefers-reduced-motion` turns off the drive entirely.

Built with a coding agent — vanilla HTML, CSS and JS the whole way down.
