# Portfolio — AI Automation & Workflow Specialist

Vite + Three.js + GSAP ScrollTrigger + Lenis. Five pages: Home, Services, About, Practical Guides, Contact.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/ — deploy that folder (Netlify recommended: the contact form uses Netlify Forms)
```

## The story the site tells
One 3D world sits behind every page: six "tool" panels (Inbox, Sheet, Tasks, CRM, Docs, Chat).
- **Amber** = information copied by hand. **Cyan** = information that moves on its own.
- Hero: tools scattered, amber packets hop between them → "Give your team fewer things…": tools start to line up →
  "Update three places": panels flash amber and shake → Meet: things settle → Process: lines draw in, AI core appears →
  Offers: full cyan flow → "Open your laptop…": a light, quiet "morning" page → Final CTA: the button sits on the core.
- Each section sets this with `data-scene='{...}'` in the HTML (values: chaos, connect, flow, core, pain, calm, offsetX, offsetY, camZ, tilt).

## Before publishing
1. `src/config.js`: name, Calendly link, business email, LinkedIn/other social, privacy policy URL.
2. Photos go in `public/images/`: `portrait-workflow.jpg`, `headshot.jpg`, `early-project.jpg`, `personal.jpg`. Frames pick them up automatically.
3. `about.html`: fill the amber `[bracketed]` origin story and personal sections.
4. Testimonials (home): hidden until you add three real, approved quotes in `index.html` and set `showTestimonials: true`.
5. Guides: each card links to `#` until its article exists. The copy suggests hiding this page from the nav until real articles are published (edit `NAV` in `src/main.js`).
6. Confirm deliverables (walkthroughs, handover notes) match your real service package.
