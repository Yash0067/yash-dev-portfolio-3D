/* ═══════════════════════════════════════════════════════════════════════════
   content.js — every word, number and link on the site lives here.
   Edit this file to update the portfolio; no other file needs to change.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── the guide ──────────────────────────────────────────────────────────────
   One line. Change it and the whole site renames him: dialogue box, portrait
   label, loading screen, title card, chapter menu and the 2D page.        */
export const GUIDE_NAME = 'Claude';

export const PROFILE = {
  name: 'Yash Dhiver',
  brand: 'YASH.DEV',
  role: 'Full Stack & Front-End Developer',
  location: 'Mumbai, Maharashtra, India',
  objective:
    'B.Sc. Computer Science graduate (2026) looking for a Full Stack or Front-End Developer role. Hands-on industry experience building responsive web applications with React, JavaScript, Python, HTML, CSS, MySQL and REST APIs. Quick learner with strong problem-solving skills and a creative eye from video editing.',
  story:
    'I am a B.Sc. Computer Science graduate from Mumbai. I spent six months as a Full Stack Developer Intern at Insight Fusion Analytics, building and shipping React interfaces, REST integrations and MySQL work in an Agile team, then a summer as a Sports Analyst at Hudl. I build with semantic HTML, modern CSS, React and vanilla JavaScript, and I care about the details: spacing, type, motion and accessibility.',
  email: 'yashdhiver00@gmail.com',
  phone: '+91 98676 01301',
  phoneHref: 'tel:+919867601301',
  linkedin: 'https://www.linkedin.com/in/yash-dhiver-543941252/',
  linkedinLabel: 'linkedin.com/in/yash-dhiver-543941252',
  github: 'https://github.com/Yash0067',
  githubLabel: 'github.com/Yash0067',
  resume: 'assets/resumes/Yash_Dhiver_FullStack_Developer_Resume.pdf',
  availability: 'Open to full-time roles and freelance work',
};

/* ── the five zones / portals ─────────────────────────────────────────────── */
export const ZONES = [
  {
    id: 'about', name: 'ABOUT HOUSE', model: 'house', page: 'about.html',
    pos: [-16, 0, -6], color: 0xffc93c, tag: 'THE COZY ROOM',
    blurb: 'Education, interests and the story behind the pixels.',
  },
  {
    id: 'projects', name: 'PROJECT GALLERY', model: 'library', page: 'projects.html',
    pos: [0, 0, -25], color: 0x2f9bff, tag: 'THE ARCADE',
    blurb: 'Five builds, each one a cabinet you can walk up to.',
  },
  {
    id: 'skills', name: 'SKILL ARCADE', model: 'arcade', page: 'skills.html',
    pos: [16, 0, -7], color: 0xff2a00, tag: 'THE CONSTELLATION',
    blurb: 'The whole stack as a sky of glowing nodes.',
  },
  {
    id: 'quests', name: 'WORK HISTORY', model: 'questboard', page: 'quests.html',
    pos: [-17, 0, 12], color: 0xff2a00, tag: 'THE ROAD',
    blurb: 'A timeline road with a flag for every thing I have shipped.',
  },
  {
    id: 'contact', name: 'CONTACT POST', model: 'mailbox', page: 'contact.html',
    pos: [17, 0, 12], color: 0x2f9bff, tag: 'THE LAUNCH PAD',
    blurb: 'Mail, phone, LinkedIn and the resume — one big button each.',
  },
];

/* ── projects (from the résumé / site archive) ───────────────────────────── */
export const PROJECTS = [
  {
    id: 'portfolio',
    title: 'Portfolio Website',
    kind: 'WEB DEVELOPMENT',
    year: '2025',
    blurb: 'Mobile-first portfolio with sections for projects, skills and contact. Implemented semantic HTML, Flexbox/Grid and a responsive navbar.',
    detail:
      'The first site I built end to end: a mobile-first portfolio with a responsive navigation bar, a project grid, a skills section and a contact block. Focus areas were semantic structure, fluid typography and a layout that never breaks between 320px and 1440px.',
    tech: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Responsive'],
    highlights: [
      'Semantic landmarks so screen readers can jump between sections',
      'Flexbox + CSS Grid instead of fixed-width layouts',
      'Mobile-first breakpoints, tested from 320px up',
    ],
    github: 'https://github.com/Yash0067/yash-dev-portfolio-3D',
  },
  {
    id: 'bio',
    title: 'Styled Bio Page',
    kind: 'WEB DESIGN',
    year: '2025',
    blurb: 'Clean single-page bio with typography hierarchy, spacing scale and interactive buttons; passed basic Lighthouse checks.',
    detail:
      'A one-page introduction where the layout is carried by typography: a modular type scale, a consistent spacing rhythm and just enough interaction (hover states, an animated button) to feel alive without shipping a megabyte of JavaScript.',
    tech: ['HTML5', 'CSS3', 'Typography', 'Design'],
    highlights: [
      'Type scale and spacing tokens kept in CSS custom properties',
      'Accessible contrast and focus states throughout',
      'Passed the basic Lighthouse checks for performance and accessibility',
    ],
  },
  {
    id: 'components',
    title: 'UI Components Mini Pack',
    kind: 'UI COMPONENTS',
    year: '2025',
    blurb: 'Reusable navbar, cards and grid gallery components; vanilla JS for menu toggle and smooth scroll.',
    detail:
      'A small component library I reuse across my pages: a responsive navbar with a mobile drawer, a card component with a media slot, and a masonry-ish gallery grid. All vanilla JavaScript, no framework, no build step.',
    tech: ['HTML5', 'CSS3', 'JavaScript', 'Components'],
    highlights: [
      'Navbar with a keyboard-accessible mobile drawer',
      'Cards that work with or without an image',
      'Smooth scrolling without a library',
    ],
  },
  {
    id: 'mysql',
    title: 'MySQL Academic Database',
    kind: 'DATABASE',
    year: '2025',
    blurb: 'Normalized schema for a mock business; wrote SELECT/JOIN/AGG queries for reporting and data analysis.',
    detail:
      'A coursework database designed from an ER model: entities normalised to third normal form, foreign keys enforced, and a set of reporting queries built on joins, grouping and aggregate functions.',
    tech: ['MySQL', 'SQL', 'Database', 'Queries'],
    highlights: [
      'ER model → 3NF schema with documented keys',
      'JOIN + GROUP BY reporting queries for monthly totals',
      'Indexes added after profiling the slow queries',
    ],
  },
  {
    id: 'java',
    title: 'Java Coursework App',
    kind: 'APPLICATION',
    year: '2024',
    blurb: 'Object-oriented programming fundamentals with classes, inheritance and data structures implementation.',
    detail:
      'A console application written to practise object-oriented design: an abstract base class, two subclasses, an interface for persistence, and hand-written data structures instead of relying on the standard collections.',
    tech: ['Java', 'OOP', 'Data Structures'],
    highlights: [
      'Inheritance and polymorphism in a small, readable domain model',
      'Custom list and stack implementations',
      'Input validation and clear console menus',
    ],
  },
  {
    id: 'ifa',
    title: 'IFA Hiring Platform',
    kind: 'PLATFORM',
    year: '2025',
    blurb: 'Gamified hiring system with authentication, admin/candidate dashboards and task management features.',
    detail:
      'A hiring platform that treats the process like a game: candidates work through tasks, admins watch progress from a dashboard, and both sides log in through the same authentication layer. Built in JavaScript with separate candidate and admin views.',
    tech: ['JavaScript', 'Auth', 'Dashboard', 'Gamification'],
    highlights: [
      'Sign-in flow shared by candidates and admins',
      'Two dashboards: one for applying, one for reviewing',
      'Tasks tracked from assigned to completed',
    ],
    github: 'https://github.com/Yash0067/IFA-Hiring-Platform',
  },
  {
    id: 'copascore',
    title: 'CopaScore',
    kind: 'ANALYTICS',
    year: '2025',
    blurb: 'Football analytics platform with player performance tracking, live match metrics and data visualisation.',
    detail:
      'A football dashboard: player performance is tracked across matches and turned into charts, with live match metrics shown next to season totals so a number has context instead of standing alone.',
    tech: ['Analytics', 'Tracking', 'Sports', 'Data Viz'],
    highlights: [
      'Player and match views side by side',
      'Charts built from the tracked stats, not screenshots',
      'Live metrics next to season aggregates',
    ],
    github: 'https://github.com/Yash0067/copascore-',
  },
  {
    id: 'copascore-ai',
    title: 'CopaScore AI',
    kind: 'AI / ML',
    year: '2025',
    blurb: 'AI-powered sports analytics with machine-learning predictions, player forecasting and intelligent insights.',
    detail:
      'The analytical arm of CopaScore: historical match data is used to forecast player performance, and the predictions are presented with the metrics that produced them rather than as a black-box score.',
    tech: ['AI', 'Machine Learning', 'Predictions', 'Analytics'],
    highlights: [
      'Forecasts built on past match performance',
      'Predictions shown with their supporting metrics',
      'Same data model as CopaScore, so numbers agree',
    ],
  },
  {
    id: 'sports-prediction',
    title: 'Trading Strategy Backtesting',
    kind: 'TRADING DATA',
    year: '2025',
    blurb: 'Trading-data backtesting system for evaluating strategies against historical market data.',
    detail:
      'A backtesting workflow that processes historical trading data and evaluates strategy performance before it is used with live markets.',
    tech: ['Trading Data', 'Backtesting', 'Analysis', 'Strategies'],
    highlights: [
      'Strategies tested against historical trading data',
      'Performance evaluated before live-market use',
      'Results traceable to the source data and strategy',
    ],
    github: 'https://github.com/Yash0067/Treading_Strategy_backtesting',
  },
  {
    id: 'algo-trading',
    title: 'Smart Algo Trading',
    kind: 'FINANCIAL SYSTEM',
    year: '2025',
    blurb: 'Trading backtesting engine with performance analysis, risk metrics and strategy optimisation tools.',
    detail:
      'A backtesting sandbox: a strategy is run against historical prices, then judged on return, drawdown and other risk metrics so a strategy can be compared against doing nothing.',
    tech: ['Trading', 'Backtesting', 'Analysis', 'Algorithms'],
    highlights: [
      'Strategies replayed against historical data',
      'Risk metrics alongside raw returns',
      'Results comparable between strategies',
    ],
    github: 'https://github.com/Yash0067/Smart-Algo-Trading',
  },
  {
    id: 'godrej',
    title: 'Godrej Properties Platform',
    kind: 'REAL ESTATE',
    year: '2025',
    blurb: 'Real-estate lead generation and sales-funnel optimisation with CRM integration and an analytics dashboard.',
    detail:
      'A property site built around the sales funnel rather than the brochure: enquiries are captured, routed into the CRM, and the dashboard shows where leads drop out of the funnel.',
    tech: ['Real Estate', 'Lead Gen', 'Optimization', 'CRM'],
    highlights: [
      'Enquiry forms wired into a CRM flow',
      'Funnel stages measured, not assumed',
      'Dashboard for the sales team',
    ],
    github: 'https://github.com/Yash0067/Godrej-Propertie',
  },
  {
    id: 'employee',
    title: 'Employee Management System',
    kind: 'MANAGEMENT SYSTEM',
    year: '2025',
    blurb: 'Workflow management platform with task assignment, progress tracking and reporting features.',
    detail:
      'An internal tool: tasks are assigned to people, moved through states, and rolled up into reports so a manager can see what is actually in progress instead of asking around.',
    tech: ['Management', 'Workflow', 'Tracking', 'Platform'],
    highlights: [
      'Task assignment with clear ownership',
      'Progress states from open to done',
      'Reports generated from the same data',
    ],
    github: 'https://github.com/Yash0067/EMPLOYEE_MANAGEMENT_SYSTEM-EMS-',
  },
  {
    id: 'skillquest',
    title: 'SkillQuest',
    kind: 'EDTECH',
    year: '2025',
    blurb: 'Gamified learning platform with skill tracking, progress achievements and interactive course modules.',
    detail:
      'A learning platform that borrows from games: skills are tracked as they are practised, progress unlocks achievements, and the course modules are interactive rather than page after page of text.',
    tech: ['Gamification', 'Learning', 'Skills', 'EdTech'],
    highlights: [
      'Skill progress tracked per learner',
      'Achievements tied to real milestones',
      'Interactive modules instead of static pages',
    ],
    github: 'https://github.com/Yash0067/skillquest-',
  },
];

/* ── skills ──────────────────────────────────────────────────────────────── */
export const SKILLS = [
  { name: 'HTML5', tier: 'core', width: '100%', group: 'Front-end', note: 'Semantic structure, forms, accessibility landmarks.' },
  { name: 'CSS3', tier: 'core', width: '100%', group: 'Front-end', note: 'Flexbox, CSS Grid, custom properties, responsive layouts.' },
  { name: 'JavaScript', tier: 'core', width: '92%', group: 'Front-end', note: 'DOM, events, fetch, ES modules, vanilla UI logic.' },
  { name: 'Responsive Design', tier: 'core', width: '94%', group: 'Front-end', note: 'Mobile-first breakpoints from 320px up.' },
  { name: 'React.js', tier: 'work', width: '68%', group: 'Front-end', note: 'Components, props/state, hooks; built app UI in a production team.' },
  { name: 'REST APIs', tier: 'work', width: '64%', group: 'Front-end', note: 'Fetching, integrating and debugging API responses in React apps.' },
  { name: 'Java', tier: 'work', width: '72%', group: 'Languages', note: 'OOP fundamentals, classes, inheritance, data structures.' },
  { name: 'Python', tier: 'basic', width: '48%', group: 'Languages', note: 'Scripting basics, coursework exercises.' },
  { name: 'MySQL', tier: 'work', width: '70%', group: 'Data', note: 'Schema design, joins, aggregate reporting queries.' },
  { name: 'MS Excel', tier: 'basic', width: '55%', group: 'Data', note: 'Formulas, tables and simple analysis.' },
  { name: 'Power BI', tier: 'basic', width: '40%', group: 'Data', note: 'Introductory dashboards and charts.' },
  { name: 'Git & GitHub', tier: 'work', width: '75%', group: 'Tooling', note: 'Branching, commits, pushing coursework and projects.' },
  { name: 'VS Code', tier: 'core', width: '90%', group: 'Tooling', note: 'Daily editor, extensions, integrated terminal.' },
  { name: 'DevTools', tier: 'work', width: '74%', group: 'Tooling', note: 'Inspect, debug, performance and network panels.' },
  { name: 'Figma', tier: 'work', width: '68%', group: 'Design', note: 'Wireframes, spacing and component specs.' },
  { name: 'UI / UX', tier: 'work', width: '72%', group: 'Design', note: 'Hierarchy, contrast, spacing systems.' },
  { name: 'ChatGPT / AI Tools', tier: 'work', width: '80%', group: 'Tooling', note: 'Drafting, debugging and learning faster.' },
  { name: 'Testing & Debugging', tier: 'work', width: '70%', group: 'Support', note: 'Reproducing bugs, reading DevTools, documenting fixes.' },
  { name: 'Networking (CCNA)', tier: 'basic', width: '35%', group: 'Support', note: 'OSI and TCP/IP models, VLANs, routing basics, Packet Tracer.' },
  { name: 'MS Word', tier: 'basic', width: '70%', group: 'Data', note: 'Documentation and reports.' },
];

/* ── certifications ──────────────────────────────────────────────────────── */
export const CERTIFICATIONS = [
  { title: 'Cisco Certified Network Associate (CCNA)', meta: 'IN PROGRESS · self-study', body: 'OSI and TCP/IP models, VLANs, routing basics and Cisco Packet Tracer labs.' },
];

/* ── education ───────────────────────────────────────────────────────────── */
export const EDUCATION = [
  {
    title: 'B.Sc. Computer Science',
    meta: 'Thakur College of Science & Commerce · Mumbai University · 2022 – 2026',
    body: 'Graduated 2026. Core computer science: programming, databases, data structures and web development.',
  },
  {
    title: 'HSC (Science)',
    meta: 'Esplanade Junior College of Science & Commerce · 2020 – 2022',
    body: 'Science stream with physics, chemistry, mathematics and computer science.',
  },
  {
    title: 'SSC',
    meta: 'Our Lady of Remedy High School · 2020',
    body: 'Secondary school certificate.',
  },
];

/* ── quests / experience ─────────────────────────────────────────────────── */
export const QUESTS = [
  {
    title: 'Full Stack Developer Intern',
    meta: 'INSIGHT FUSION ANALYTICS · NOV 2025 – APR 2026',
    bullets: [
      'Developed and maintained full-stack web applications with React, JavaScript, Python, HTML, CSS and MySQL.',
      'Built responsive user interfaces and integrated REST APIs.',
      'Worked with databases, debugging, testing and deployment.',
      'Collaborated in an Agile team using Git and GitHub; optimised performance and resolved production issues.',
    ],
  },
  {
    title: 'Sports Analyst',
    meta: 'HUDL · JUN 2026 – SEP 2026',
    bullets: [
      'Tagged match footage and analysed gameplay to support performance review workflows.',
      'Used AI-powered tools to speed up match analysis and improve tagging accuracy.',
    ],
  },
  {
    title: 'IT Support (Volunteer)',
    meta: 'PEER SUPPORT · ONGOING',
    bullets: [
      'Helped peers with software installation and troubleshooting.',
      'Explained technical issues clearly to non-technical people.',
      'Assisted with file organisation and system optimisation.',
    ],
  },
  {
    title: 'Video Editing, AI Tools & CCNA',
    meta: 'SELF-DIRECTED · ONGOING',
    bullets: [
      'Edited short videos for social media: pacing, transitions, audio balance.',
      'Used ChatGPT and generative AI for coding, documentation and productivity.',
      'Studying for the Cisco Certified Network Associate (CCNA) certification.',
    ],
  },
];

/* ── interests ───────────────────────────────────────────────────────────── */
export const INTERESTS = [
  { icon: '✎', title: 'Drawing & sketching', body: 'Pencil first, pixels second — the avatar on this site started as a sketch.' },
  { icon: '⌁', title: 'UI/UX design', body: 'Collecting interfaces, spacing systems and type pairings.' },
  { icon: '▶', title: 'Video editing', body: 'Short-form edits: pacing, transitions and sound balance.' },
  { icon: '✦', title: 'Full stack development', body: 'React on the front, Python and MySQL behind it.' },
  { icon: '⌘', title: 'AI tools', body: 'ChatGPT and generative AI for drafts, debugging and learning.' },
  { icon: '↻', title: 'Learning new tech', body: 'Currently CCNA networking — the layer under the browser.' },
];

/* ── collectible coins: one skill or fact each ───────────────────────────── */
export const COINS = [
  { label: 'HTML5', fact: 'Semantic tags are free accessibility.' },
  { label: 'CSS Grid', fact: 'Two axes, no hacks.' },
  { label: 'JavaScript', fact: 'Vanilla is a perfectly good flavour.' },
  { label: 'Flexbox', fact: 'One axis, perfect alignment.' },
  { label: 'MySQL', fact: 'Normalise first, index later.' },
  { label: 'Git', fact: 'Commit small, commit often.' },
  { label: 'Java', fact: 'Objects all the way down.' },
  { label: 'Figma', fact: 'Spacing scale beats guesswork.' },
  { label: 'Power BI', fact: 'Charts are arguments.' },
  { label: 'Python', fact: 'Readable beats clever.' },
  { label: 'DevTools', fact: 'The console never lies.' },
  { label: 'Mumbai', fact: 'Home base, GMT +5:30.' },
];

/* ── NPC robot lines ─────────────────────────────────────────────────────── */
export const ROBOT_LINES = [
  'Beep. Five portals, twelve data-coins. Collect everything and the island throws you a party.',
  'Hint: red rings are portals. Walk into one, then press E to jump through.',
  'The yellow pod makes you fast. The spring pad makes you tall. Both are excellent ideas.',
  'Fun fact: Yash edits videos, which is why this thing has such good pacing. Beep.',
  'My favourite skill node is JavaScript. It is the loud one.',
  'Press Shift while running. Actually press Shift and run. You know what I mean.',
  'If you find a coin about CSS Grid, that one is my favourite. Do not tell the others.',
];
