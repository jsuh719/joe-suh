/* ============================================================================
   resume.js — the ONLY file you need to edit to update this site.
   ----------------------------------------------------------------------------
   Everything below is plain data. Both the plain resume view and the jungle
   clearings read from this one object, so you never edit content twice.

   Every bullet is a plain string. Just type a sentence in quotes, with commas
   between items and no comma after the last one.

   The one piece of markup bullets understand is a link, written the markdown
   way -- square brackets for the words, round brackets for the address:
       "Listed author of [the paper title](https://example.com/paper), 2014"
   Anything outside the brackets is treated as literal text.

   To add a role to an existing job: add another {...} block to its "roles" list.
   To reorder anything: move the block up or down.

   NOTE: adding a whole NEW top-level category needs a new dinosaur drawn into
   the scene, which is a code change (see README). Editing the seven that exist
   is entirely a matter of editing this file.
   ========================================================================== */

window.RESUME = {

  name: "Joe Suh",

  /* The hero headline. {{JOB TITLE}} and {{COMPANY}} are filled in from the two
     fields directly below, so when you change jobs you edit them in one place. */
  currentTitle: "Senior Mission Software Engineer (FDE)",
  currentCompany: "Scale AI",

  hero: {
    greeting: "Great to meet you!",
    intro:
      "I'm Joe Suh, and currently work as a {{JOB TITLE}} at {{COMPANY}}. " +
      "After a stint as an infantry officer in the US Army, I've spent my career " +
      "building AI platforms for sensitive use cases on regulated customer networks."
  },

  location: "Arlington, VA",
  headline: "Senior Mission Software Engineer (FDE) at Scale AI",
  summary:
    "Army Veteran | Product leader deploying AI to regulated industries",

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
      slug: "scale-ai",
      section: "Professional Experience",
      chip: "Scale AI",
      title: "Scale AI",
      subtitle: "Washington, DC",
      dates: "Jan 2024 – Present",
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
          dates: "Nov 2024 – Present",
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
      subtitle: "JFK Special Warfare Center, Fort Bragg, NC && 25th Infantry Division, Wahiawa, HI",
      dates: "May 2016 – Feb 2022",
      roles: [
        {
          title: "Special Projects Lead & Company Executive Officer",
          dates: "",
          bullets: [
            "Revamped training curriculum and managed logistics for over 300 special operations students",
            "Graudated US Army Ranger School and was a selected candidate after completing Special Forces Assessment and Selection"
          ]
        },
        {
          title: "Infantry Company Executive Officer and Platoon Leader",
          dates: "",
          bullets: [
            "Earned top 10% ratings from management, peers, and reports in 3 different roles",
            "Managed teams from 40 to 120 soldiers; oversaw military training, mentored junior leaders, and repeatedly led my units to be the top-perfoming teams in the organization"
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
      bullets: [
        "Distinguished Graduate (top 15% of a class of 990 students), Dean's List, Commandant's List",
        "Listed author of [“On the Generality and Convenience of Etypes”](https://ieeexplore.ieee.org/document/7163215/), presented at IEEE LangSec 2014",
        "Interned with the NSA and Lawrence Berkeley Labs in cryptography and supercomputer optimization"
      ]
    },

    {
      slug: "surfer",
      section: "Off the clock",
      chip: "Off the clock",
      title: "Other Interests",
      subtitle: "",
      bullets: [
        "Mentoring 4 Female Afghan Commandos and their families through relocating to the US, navigating of the citizenship process, and adjusting to life in America",
        "Reading, cooking, and working out.",
        "Surfing! I was stationed in Hawaii, but I'm not good at it by any means."
        
      ],
      showLinks: true
    }

  ]
};
