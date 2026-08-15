/* ============================================================================
   resume.js — the ONLY file you need to edit to update this site.
   ----------------------------------------------------------------------------
   Everything below is plain data. Both the plain resume view and the jungle
   clearings read from this one object, so you never edit content twice.

   Every bullet is a plain string. No markdown, no HTML, no escaping rules.
   Just type a sentence in quotes. Commas between items, no comma after the last.

   To add a role to an existing job: add another {...} block to its "roles" list.
   To reorder anything: move the block up or down.

   NOTE: adding a whole NEW top-level category needs a new dinosaur drawn into
   the scene, which is a code change (see README). Editing the seven that exist
   is entirely a matter of editing this file.
   ========================================================================== */

window.RESUME = {

  name: "Joseph Suh",
  location: "Arlington, VA",
  headline: "Senior Mission Software Engineer (FDE) at Scale AI",
  summary:
    "Product and forward-deployed engineering leader working on AI agents, evals, " +
    "and ML Ops for public sector customers. West Point CS, six years in the Army, " +
    "then a decade of shipping technical products to hard customers.",

  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/josephssuh/" },
    { label: "GitHub",   href: "https://github.com/jsuh719" }
  ],

  /* --------------------------------------------------------------------------
     CATEGORIES — each one is a section of the resume AND an inhabitant of the
     jungle. "slug" wires it to its creature in the scene; don't change those.
     "section" prints as a heading in the plain resume view.
     ------------------------------------------------------------------------ */
  categories: [

    {
      slug: "skills",
      section: "Technical Skills",
      chip: "Skills",
      title: "Technical Skills",
      creature: "a pack of compsognathus",
      blurb: "Quick, curious, travels in a group.",
      groups: [
        { name: "Product",  items: ["Figma", "Various Coding Agents", "Data Tools"] },
        { name: "Software", items: ["Python", "Bash"] },
        { name: "ML Ops",   items: ["Ray", "MLFlow", "KubeFlow"] },
        { name: "DevOps",   items: ["Docker", "Kubernetes"] }
      ]
    },

    {
      slug: "scale-ai",
      section: "Professional Experience",
      chip: "Scale AI",
      title: "Scale AI",
      subtitle: "Washington, DC",
      dates: "Jan 2024 – Present",
      creature: "a Tyrannosaurus rex",
      blurb: "The big one, center of frame, mostly behind a leaf.",
      roles: [
        {
          title: "Senior Mission Software Engineer (FDE)",
          dates: "May 2026 – Present",
          bullets: [
            "Leading technical execution for an eight-figure DoW program, including agent system design, implementation on classified networks, eval and data strategy, and customer engagement"
          ]
        },
        {
          title: "Senior Product Manager",
          dates: "Nov 2024 – May 2026",
          bullets: [
            "Led the Public Sector team's ML Ops and Frontier Data product suite, growing revenue by eight figures YoY, improving GM by 10%+, and securing an enterprise DoW contract worth nine figures",
            "Spearheaded 0-1 efforts for the AgentOps team, growing 400%+ YoY to seven figures, and improved customer-facing Agent performance by over 40% across multiple eight-figure contracts",
            "Served as technical scoping lead for multiple Frontier Eval solicitations, totalling eight figures in funnel"
          ]
        },
        {
          title: "Strategic Product Manager (Deployment Strategist)",
          dates: "Jan 2024 – Jul 2025",
          bullets: [
            "Grew a 0-1 GenAI pilot 300% YoY to seven figures to deliver AI Agents for operational military planning; led customer discovery efforts that shaped the overall direction of our flagship eight-figure Agentic platform",
            "Led a high six-figure contract that became the team's first GenAI agentic tool, integrating with a partner's VR platform to automate curriculum development and reduce DoD instructor overhead by over 60%",
            "Served as the customer-facing technical lead for the DoD's oldest and largest ML Ops program (nine figures); translated operational requirements into clear ML eval metrics and data strategy; $100M+ TCV"
          ]
        }
      ]
    },

    {
      slug: "scenera",
      section: "Professional Experience",
      chip: "Scenera",
      title: "Scenera, Inc",
      subtitle: "Palo Alto, CA (Remote)",
      dates: "Feb 2022 – Jan 2024",
      creature: "a triceratops",
      blurb: "Three horns, one frill, hiding in the ferns.",
      roles: [
        {
          title: "Director, Commercial Ops (FDE Lead)",
          dates: "Feb 2022 – Jan 2024",
          bullets: [
            "Grew the team from 8 to 30 people and over $6M in annual revenue; directly managed a team of 4 FDEs",
            "Executed 4 deployments of custom edge AI hardware and software to enterprise customer sites worldwide",
            "Acted as the product SME in customer architecture meetings; wrote and reviewed outward-facing API and architectural design specs for 5 pilots with enterprise commercial real estate clients"
          ]
        }
      ]
    },

    {
      slug: "army",
      section: "Professional Experience",
      chip: "US Army",
      title: "US Army",
      subtitle: "JFK Special Warfare Center & 25th Infantry Division — Fort Bragg, NC and Wahiawa, HI",
      dates: "May 2016 – Feb 2022",
      creature: "a stegosaurus",
      blurb: "Armor plated. Low and to the right.",
      roles: [
        {
          title: "Special Projects Lead & Infantry Company Executive Officer",
          dates: "May 2016 – Feb 2022",
          bullets: [
            "Earned top 10% ratings from management, peers, and reports in 4 different roles across 2 organizations",
            "Passed US Army Ranger School and was selected to attend the Special Forces Qualification Course"
          ]
        }
      ]
    },

    {
      slug: "west-point",
      section: "Education",
      chip: "West Point",
      title: "United States Military Academy at West Point",
      subtitle: "B.S. in Computer Science — West Point, NY",
      dates: "May 2016",
      creature: "a pterodactyl",
      blurb: "Perched up in the canopy, watching everything.",
      bullets: [
        "Distinguished Graduate (top 15% of a class of 990 students), Dean's List, Commandant's List",
        "Listed author of “On the Generality and Convenience of Etypes”, presented at IEEE LangSec 2014",
        "Interned with the NSA and Lawrence Berkeley Labs in cryptography and supercomputer optimization"
      ]
    },

    {
      slug: "mentorship",
      section: "Additional",
      chip: "Mentorship",
      title: "Mentorship",
      subtitle: "ANA Female Tactical Platoon",
      creature: "a maiasaura and her hatchlings",
      blurb: "Maiasaura means “good mother lizard”. That one is on purpose.",
      bullets: [
        "Mentoring 4 Afghan Commandos from the ANA Female Tactical Platoon, along with their families, through emergency relocation to the US, navigation of the citizenship process, and cultural acclimatization"
      ]
    },

    {
      slug: "surfer",
      section: "Off the clock",
      chip: "Off the clock",
      title: "Off the clock",
      subtitle: "Out past the break",
      creature: "a surfer",
      blurb: "That speck out on the water is the whole reason this page has a beach in it.",
      bullets: [
        "I surf. Badly, enthusiastically, and mostly on the wrong coast for it.",
        "I built this page myself with a coding agent — no framework, no build step, no template. It seemed like a more honest way to say I'm comfortable with these tools than putting a line about it on a resume.",
        "Best way to reach me is LinkedIn."
      ],
      showLinks: true
    }

  ]
};
