// The CHI 2027 PCS keyword taxonomy, as shown to authors at submission.
// "A reviewer judging my work should have expertise related to…" — the keywords
// tag the expertise needed to assess the contribution, not the submission itself,
// and are matched against reviewers' self-rated expertise.

export const KEYWORD_FRAMING = "A reviewer judging my work should have expertise related to…";

export type KeywordGroup = "domain" | "method" | "users" | "contribution";

export const KEYWORD_RULES: Record<KeywordGroup, { min: number; max: number; label: string; hint: string }> = {
  domain: { min: 2, max: 6, label: "Domain", hint: "select between 2 and 6" },
  method: { min: 1, max: 2, label: "Method / Approach", hint: "select between 1 and 2" },
  users: { min: 0, max: 2, label: "Users", hint: "at most 2 — only if a specific population is the focus" },
  contribution: { min: 1, max: 1, label: "Primary Contribution", hint: "exactly 1" },
};

export interface KeywordDef {
  name: string;
  about: string;
}

export const PCS_DOMAINS: KeywordDef[] = [
  { name: "Accessibility - Assistive Technology (general)", about: "General accessibility research and assistive technologies (aac; web accessibility; accessibility auditing; social accessibility; inclusive technology; WCAG)." },
  { name: "Accessibility - Auditory (Deaf / HoH / Sign Language)", about: "Deaf and hard of hearing communities, sign language technologies, captioning (sign language generation; deaf culture; asl; deaf education)." },
  { name: "Accessibility - Cognitive & Neurodivergent", about: "Technology for and with neurodivergent people and cognitive, speech, or developmental differences (autism; adhd; dyslexia; aphasia; mild cognitive impairment; stuttering)." },
  { name: "Accessibility - Mixed-ability", about: "Collaboration and design across differing abilities, disability representation and justice (ability-based design; disability justice; mixed-ability collaboration; ableism)." },
  { name: "Accessibility - Motor & Physical", about: "Motor and physical disabilities: assistive devices, mobility, rehabilitation (exoskeleton; stroke; upper-limb rehabilitation; wheelchair; posture correction)." },
  { name: "Accessibility - Visual (Blind / Low Vision)", about: "Blind and low vision people, screen reading, access to images and video (screen readers; image captioning; remote sighted assistance; audio description)." },
  { name: "AI & Machine Learning - AI Agents", about: "Autonomous AI systems that plan and act on a user's behalf, alone or in multi-agent settings (multi-agent systems; human-agent interaction; embodied ai)." },
  { name: "AI & Machine Learning - AI Ethics & Responsible AI", about: "Fairness, transparency, accountability, societal consequences of AI, auditing and governance (explainable ai; algorithmic fairness; ai governance; ai safety; value alignment)." },
  { name: "AI & Machine Learning - Conversational Interfaces", about: "Agents people talk or chat with — companions, assistants, dialogue systems (chatbots; conversational agents; ai companions; proactive agent; social ai)." },
  { name: "AI & Machine Learning - Generative AI", about: "Systems that produce text, images, video, audio, or 3D content; creating and coping with machine-generated media (image generation; video generation; deepfake videos)." },
  { name: "AI & Machine Learning - Human-AI Collaboration", about: "People and AI systems working together on shared tasks (human-ai teaming; human-ai decision-making; ai-assisted writing; human-in-the-loop workflows; co-creation)." },
  { name: "AI & Machine Learning - Large Language Models", about: "How people use, evaluate, and interact with LLMs; prompting practices, model behavior, multilingual and multimodal use (prompt engineering; chatgpt; llm evaluation; vision language model)." },
  { name: "AI & Machine Learning - ML Methods & Foundations", about: "Core machine learning techniques and model-building practice (reinforcement learning; NLP; computer vision; deep learning; federated learning; topic modeling)." },
  { name: "Computational Interaction - Computational Models of Interaction", about: "Formal and simulation models that explain and predict behavior with interactive systems (user modeling; computational rationality; biomechanical models; psychophysics)." },
  { name: "Computational Interaction - ML for Interaction", about: "Recognition models turning sensor and behavioral data into signals for interactive systems (activity recognition; gait recognition; intent detection; OCR)." },
  { name: "Computational Interaction - Optimization-based UI & Adaptive Interfaces", about: "Interfaces that tailor themselves to users and contexts by optimizing layout, content, or assistance (personalization; layout optimization; ui task automation; context-aware support)." },
  { name: "Computational Interaction - Sensing & Signal Processing", about: "Hardware and signal techniques for detecting people, objects, and activity (acoustic sensing; imu; mmwave; physiological sensing; motion capture; capacitive sensing)." },
  { name: "Creativity & Creative Practice - Co-creativity & Creative AI", about: "Creative work shared between people and computational tools; agency and ownership (creativity support tools; co-creation; authorship; divergent thinking; content creators)." },
  { name: "Creativity & Creative Practice - Craft & Textiles", about: "Handwork and material practice, knitting and weaving to smart textiles (e-textiles; knitting; weaving; embroidery; origami; fashion design)." },
  { name: "Creativity & Creative Practice - Culture, Heritage & Museums", about: "Cultural memory and its keepers: museums, archives, libraries, heritage communities (digital cultural heritage; museum education; indigenous knowledge; digital preservation)." },
  { name: "Creativity & Creative Practice - Live Performance", about: "Technology on and around the stage — dance, theater, live music (dance; theater; actor training; concerts)." },
  { name: "Creativity & Creative Practice - Maker Culture & DIY", about: "Hobbyist making, repair, tinkering and their spaces and communities (makerspaces; informal repair practices; unmaking; patchworking)." },
  { name: "Creativity & Creative Practice - Music & Sound", about: "Music and audio as material for interaction — instruments, performance, listening, sound design (spatial audio; digital musical instruments; music therapy; songwriting)." },
  { name: "Creativity & Creative Practice - Photo, Video & Film", about: "Capturing, editing, and sharing photographs and moving images, and their audiences (photography; video editing; cinematography; youtube; short-form videos; subtitle)." },
  { name: "Creativity & Creative Practice - Visual Art & Image-making", about: "Drawing, painting, illustration, animation, and the tools artists use (ai art; drawing; animation; digital comics; style transfer; sketch)." },
  { name: "Creativity & Creative Practice - Writing & Storytelling", about: "Crafting stories and text, with and without machine help (creative writing; interactive storytelling; screenwriting; writing assistants; metaphor)." },
  { name: "Critical, Civic & Sustainable Computing - Civic Tech & Public Sector", about: "Technology in government, public services, civic participation, community infrastructures (citizen science; public administration; urban informatics; fintech; mobile money)." },
  { name: "Critical, Civic & Sustainable Computing - Climate & Carbon", about: "Climate, carbon, and environment — emissions, weather, how people feel and learn about a changing planet (climate change; air pollution; climate anxiety; environmental data; data centers)." },
  { name: "Critical, Civic & Sustainable Computing - Critical AI / Critical Computational Interaction", about: "Critical perspectives on AI and computational systems, their assumptions, framings, and effects (reflective ai)." },
  { name: "Critical, Civic & Sustainable Computing - Culture, Pluralistic & Diversity", about: "Cultural difference and plural ways of knowing as they shape technology and its uptake (reflective hci; cultural adaptation; epistemic pluralism; cultural acceptance)." },
  { name: "Critical, Civic & Sustainable Computing - Decolonialism, Activism & Social Movements", about: "How communities organize, resist, and reimagine technology's role in power, justice, and social change (digital activism; data justice; afrofuturism; data feminism; indigenous data sovereignty)." },
  { name: "Critical, Civic & Sustainable Computing - HCI4D / Global South", about: "Computing in the Global South and low-resource settings (ictd; developing countries; rural computing; southeast asia; latin america)." },
  { name: "Critical, Civic & Sustainable Computing - More-than-Human", about: "Interaction beyond the human — animals, their enrichment and welfare, relationships with people (animal-computer interaction; animal welfare; zoo; parrot-human communication)." },
  { name: "Critical, Civic & Sustainable Computing - Nature", about: "Encounters with the living world — gardens, farms, conservation, outdoor life (agriculture; wildlife conservation; foraging; urban nature; plant-computer interaction)." },
  { name: "Critical, Civic & Sustainable Computing - Policy & Labor", about: "Rules and institutions around technology — law, governance, standards — and entangled labor questions (regulation; accountability; tech policy; labor union; data ethics)." },
  { name: "Critical, Civic & Sustainable Computing - Sustainable HCI", about: "Computing's environmental footprint and designs for sustainable everyday practices (eco-feedback; energy management; waste management; pro-environmental behavior)." },
  { name: "Design - Design Frameworks", about: "General design knowledge — spaces, methods, patterns, processes (design space; design method; design thinking; user experience; design patterns; design guidelines)." },
  { name: "Design - Embodied Design", about: "Designing from and for the felt, moving body; somatic and sensory approaches (soma design; somaesthetics; biodesign; olfactory interfaces; motion design)." },
  { name: "Design - Inclusive, Caring & Ethical Design", about: "Design that welcomes people across cultures, abilities, and circumstances, with care as a guiding value (digital inclusion; cultural sensitivity; ethics of care; social inclusion)." },
  { name: "Design - Theoretical Foundations", about: "Theories, constructs, and scientific practice grounding research on people and technology (theory building; sociotechnical systems; open science; human factors; philosophy)." },
  { name: "Design - Value-Driven Design", about: "Designing with explicit attention to human values, ethics, and justice (value sensitive design; design justice; trauma-informed design; design ethics; legal design)." },
  { name: "Education & Learning - AI in Education", about: "AI tutors, chatbots, and generative tools in teaching and learning (ai literacy; educational chatbots; pedagogical agent; student-ai interaction; course-specific ai tutors)." },
  { name: "Education & Learning - Higher Education", about: "University-level teaching and learning, STEM and professional education, the student experience (computer science education; medical education; college students; women in stem)." },
  { name: "Education & Learning - K-12 & School Settings", about: "Teaching and learning in schools — classrooms, teachers, curricula, family involvement (mathematics education; teacher professional development; pedagogy; elementary education)." },
  { name: "Education & Learning - Learning Tools & Tutors", about: "Software that teaches — adaptive tutors, learning platforms, language and skill instruction (adaptive learning; personalized learning; multimedia learning; CSCL; language acquisition)." },
  { name: "Education & Learning - Pre-Kindergarten", about: "Learning and development in the earliest years (play-based learning; emergent literacy; early numeracy; school readiness; early childhood development)." },
  { name: "Education & Learning - Self-directed & Informal Learning", about: "Learning outside formal instruction, driven by learners, peers, families, communities (metacognition; peer learning; mentorship; online learning; self-regulated learning)." },
  { name: "Extended Reality (XR) - Avatars & Embodiment", about: "How people inhabit and are represented by virtual bodies; presence and self (presence; virtual body; self-avatar; avatar-mediated interaction; character animation)." },
  { name: "Extended Reality (XR) - Immersive Learning & Training", about: "Immersive environments for education, skill training, and analysis; qualities of immersion (immersive analytics; 360-degree video; vr locomotion; educational simulation)." },
  { name: "Extended Reality (XR) - Social VR & Multi-user XR", about: "Shared immersive spaces where multiple people meet, play, and collaborate (social presence; vrchat; collaborative vr; virtual influencers; ar collaboration)." },
  { name: "Extended Reality (XR) - VR / AR / MR / XR Systems", about: "Headset, projection, and display technologies blending virtual content with surroundings (digital twin; diminished reality; projector camera system; ar glasses; handheld ar)." },
  { name: "Extended Reality (XR) - XR Interaction Techniques", about: "Selecting, manipulating, and moving through 3D content in immersive environments (gestural interaction; 3d manipulation; bare-hand interaction; raycasting; bimanual interaction)." },
  { name: "Games, Play & Sports - Esports & Competitive Play", about: "Competitive gaming and its ecosystem of players, coaches, teams, spectators (spectator; sports broadcasting; team formation; co-watching; rivalry)." },
  { name: "Games, Play & Sports - Exergames & Movement Games", about: "Games that get bodies moving — fitness, rehabilitation, play (rehabilitation games; indoor cycling; eudaimonic gameplay; transformational games)." },
  { name: "Games, Play & Sports - Game Design", about: "The craft of designing games — mechanics, difficulty, development practice, modding (game development; game difficulty; indie game development; quest design; mods)." },
  { name: "Games, Play & Sports - Multiplayer & Social Games", about: "Games played together, online and in place, and their social life (moba; league of legends; location-based game; online games; roblox)." },
  { name: "Games, Play & Sports - Play & Playful Interaction", about: "Playfulness beyond formal games — humor, improvisation, movement, playing together (social play; improvisation; bodily play; humor; interactive dance; family co-play)." },
  { name: "Games, Play & Sports - Serious & Educational Games", about: "Games built to teach, assess, or change behavior; game elements beyond entertainment (gamification; game-based learning; game-based assessment; edularp)." },
  { name: "Games, Play & Sports - Sports", about: "Athletic activity and training and the technologies supporting athletes (sport training; running; rock climbing; athletics; skiing)." },
  { name: "Games, Play & Sports - Tabletop & Boardgames", about: "Board, card, and tabletop role-playing games in physical, digital, and hybrid forms (card game; ttrpg; party games; interactive cards)." },
  { name: "Games, Play & Sports - Video Games & Player Experience", about: "Digital games and their players — motivations, experiences, cultures of play (game analytics; games user research; gaming culture; accessible gaming; game preservation)." },
  { name: "Health & Wellbeing - Affective Computing & Emotion", about: "Sensing, expressing, and working with emotion in interactive systems (emotion regulation; emotion recognition; empathy; physiological signals; stress detection; mood tracking)." },
  { name: "Health & Wellbeing - Aging & Dementia", about: "Later life with technology — dementia care, intergenerational ties, end-of-life (caregiving; intergenerational relationships; gerontechnology; reminiscence technology; ageism)." },
  { name: "Health & Wellbeing - Chronic Illness & Clinical Health", about: "Living with and treating illness — patient experiences, clinical practice, health systems (cancer; palliative care; patient-provider communication; medication management; health equity)." },
  { name: "Health & Wellbeing - Gastronomy", about: "Eating, cooking, and food culture as sites of interaction design (human-food interaction; culinary culture; food texture; child-food interaction)." },
  { name: "Health & Wellbeing - Health Behavior Change", about: "Interventions that help people form, keep, or change health habits, and their theories (persuasive technology; nudge; goal setting; self-regulation; self-determination theory)." },
  { name: "Health & Wellbeing - Healthcare & Caregiving Support", about: "Tools supporting clinicians and care teams — decisions, records, workflows, coordination (clinical decision support; telemedicine; electronic health records; care coordination)." },
  { name: "Health & Wellbeing - Mental Health", about: "Technology's role in mental health — therapy, coping, stress, sleep, grief, mood (depression; psychotherapy; CBT; loneliness; eating disorders; ptsd)." },
  { name: "Health & Wellbeing - Personal Health Tracking", about: "People collecting and reflecting on data about their bodies, activities, and habits (personal informatics; self-tracking; lifelogging; digital biomarkers; screen time)." },
  { name: "Health & Wellbeing - Reproductive & Women's Health", about: "Menstruation, fertility, pregnancy, sexual and reproductive health across life stages (menstruation; pregnancy; menopause; abortion; contraception; sexual health)." },
  { name: "Health & Wellbeing - Wellbeing & Self-care", about: "Everyday flourishing — mindfulness, social support, spiritual practice, healthier digital habits (mindfulness; meditation; social support; spirituality; digital wellbeing)." },
  { name: "Information Seeking & Search - Exploratory Search & Browsing", about: "Open-ended looking around — browsing, navigating, discovering while the goal is still forming (navigation; visual search; web browsing; help-seeking; guided exploration)." },
  { name: "Information Seeking & Search - Information Behavior & Sensemaking", about: "How people search for, encounter, trust, and make sense of information in everyday life (information seeking; information foraging; health information seeking; news consumption)." },
  { name: "Information Seeking & Search - Question Answering & RAG", about: "Asking systems questions in natural language and grounding answers in retrieved sources (conversational search; visual question answering; natural language interfaces)." },
  { name: "Information Seeking & Search - Recommender Systems", about: "Systems that suggest content and items matched to a person's tastes and situation (personalized media; food recommendations; bookmarking)." },
  { name: "Information Seeking & Search - Search Interfaces & Retrieval", about: "Systems that find and rank information in response to queries (information retrieval; ranking; search engines; keyword extraction)." },
  { name: "Input & Interaction Modalities - Brain-Computer Interfaces", about: "Interfaces driven by neural and muscle signals (eeg; electromyography; fnirs; neurofeedback; myoelectric control)." },
  { name: "Input & Interaction Modalities - Gaze & Eye Tracking Input", about: "Where people look, as an input channel and a window onto attention (gaze redirection; smooth pursuit; dwell; attention capture; eye-head coordination)." },
  { name: "Input & Interaction Modalities - Gesture & Mid-air Input", about: "Hand and body movement as input, tracked gestures to microgestures (hand tracking; gesture elicitation; co-speech gestures; hand pose estimation; microgesture)." },
  { name: "Input & Interaction Modalities - Graphical User Interfaces", about: "Windows, menus, widgets, and desktop conventions (direct manipulation; window management; menu design; ui toolkits; tooltip)." },
  { name: "Input & Interaction Modalities - Pointing & Selection", about: "Aiming at and picking targets on screens and in space; performance models (fitts law; moving target selection; selection techniques; multi-selection)." },
  { name: "Input & Interaction Modalities - Text Entry", about: "Getting words into machines — keyboards, prediction, hands-busy and novel settings (predictive text; eyes-free text entry; text editor; typing strategies)." },
  { name: "Input & Interaction Modalities - Touch & Pen Input", about: "Input on and around touch surfaces with fingers, styluses, pens (stylus; soft keyboards; ten-finger typing; scrolling; surface-independent input)." },
  { name: "Input & Interaction Modalities - Voice & Speech Input", about: "Talking to and through machines — assistants, speech recognition, voice qualities (smart speaker; silent speech; ASR; voice cloning; dictation; speech prosody)." },
  { name: "Physical Interfaces & Devices - Advanced Computing Technologies", about: "Interaction questions raised by emerging platforms such as quantum and high-performance machines (quantum; super computer)." },
  { name: "Physical Interfaces & Devices - Fabrication", about: "Digital design and making of physical things — printing, materials, electronics, CAD (3d printing; cad; printed electronics; metamaterial; 4d printing; biodegradable material)." },
  { name: "Physical Interfaces & Devices - Haptics", about: "Touch feedback — vibration, force, heat, illusions of texture and weight (electrical muscle stimulation; vibrotactile; force-feedback; mid-air haptics; thermal haptics)." },
  { name: "Physical Interfaces & Devices - IoT & Smart Environments", about: "Connected devices and sensing woven into homes, buildings, everyday spaces (smart homes; ubiquitous computing; smart buildings; connected home; smart grid)." },
  { name: "Physical Interfaces & Devices - Mobile & Smartphones", about: "Phones and handheld devices, their apps, and daily life with them (mobile apps; mobile health; foldable phones; android; app usage)." },
  { name: "Physical Interfaces & Devices - Multimodal Interaction", about: "Interfaces combining several senses and channels — sight, sound, smell, taste, touch (crossmodal interaction; multisensory feedback; olfactory; multimodal fusion)." },
  { name: "Physical Interfaces & Devices - Public Displays", about: "Screens and display technologies situated in the environment — ambient, peripheral, novel display hardware (ambient displays; mid-air display; pneumatic display; multi-display environment)." },
  { name: "Physical Interfaces & Devices - Shape-changing & Soft Interfaces", about: "Interfaces whose physical form moves, inflates, or deforms, often from soft materials (soft robotics; inflatables; shape perception; knitted soft robotics; reconfiguration)." },
  { name: "Physical Interfaces & Devices - Tangible Interfaces", about: "Interaction through graspable physical objects carrying digital behavior (physical computing; tangible learning; malleable user interface; battery-free interaction)." },
  { name: "Physical Interfaces & Devices - Wearables & Earables", about: "Computing worn on the body — watches, rings, clothing, in and around the ear (smartwatch; smart clothing; fitness trackers; smart ring; earphones; medical devices)." },
  { name: "Privacy, Security & Trust - Cybercrime & Blockchain", about: "Scams, fraud, online crime, cryptocurrency and blockchain systems and their users (cryptocurrency; phishing; online fraud; romance scams; digital identity)." },
  { name: "Privacy, Security & Trust - Privacy", about: "How people manage personal information, and the designs, norms, and rules protecting it (self-disclosure; differential privacy; data protection; anonymity; contextual integrity; gdpr)." },
  { name: "Privacy, Security & Trust - Security", about: "Keeping systems and accounts safe in usable ways — passwords, passkeys, professional security work (authentication; password management; behavioral biometrics; security awareness)." },
  { name: "Privacy, Security & Trust - Surveillance & Dark Patterns", about: "Watching and being watched, and interface designs that steer or deceive (manipulative design; surveillance capitalism; creepy technology; surveillance as care)." },
  { name: "Privacy, Security & Trust - Trust", about: "How people come to rely on technology and others, when that reliance is warranted, and its repair (trust calibration; trust in automation; trust repair; verifiability; mistrust)." },
  { name: "Robots - Drones & Aerial Robots", about: "Flying robots and the ways people direct, coexist with, and put them to work (human drone interaction)." },
  { name: "Robots - Human-Robot Interaction", about: "People and robots together — social, assistive, collaborative robots (social robots; teleoperation; anthropomorphism; assistive robots; companion robots; swarm robotics)." },
  { name: "Robots - Vehicles, Driving & Navigation", about: "Cars, transit, travel — automated driving, in-vehicle interfaces, moving through cities (autonomous vehicles; driving simulator; pedestrian interaction; ride-hailing; driver distraction)." },
  { name: "Social Computing & Online Communities - Computer-Mediated Communication", about: "Communicating through digital channels — messaging, video calls, livestreams, long-distance relationships (instant messaging; videoconferencing; telepresence; digital intimacy)." },
  { name: "Social Computing & Online Communities - Content Moderation", about: "How platforms and communities decide what content stays and who decides; tools and labor (platform governance; volunteer moderation; algorithmic curation; deliberation)." },
  { name: "Social Computing & Online Communities - Crisis & Disaster Informatics", about: "Information systems in emergencies and disasters (disaster response; emergency alerts; situational awareness; pandemic response; trauma-informed computing)." },
  { name: "Social Computing & Online Communities - Misinformation & Disinformation", about: "False and misleading information online, its detection and correction, news ecosystems (fact-checking; fake news; deepfake detection; media literacy; propaganda; journalism)." },
  { name: "Social Computing & Online Communities - Online Communities & Social Relationships", about: "Groups and relationships sustained online — support forums, fandoms, dating, group chats (reddit; online health communities; peer support; online dating; parasocial relationships)." },
  { name: "Social Computing & Online Communities - Online Safety & Harassment", about: "Harms encountered through technology — harassment, abuse, child safety — and resistance (cyberbullying; hate speech; intimate partner violence; technology-facilitated abuse)." },
  { name: "Social Computing & Online Communities - Social Media", about: "Platforms where people post, share, and watch, and their practices and designs (tiktok; live streaming; whatsapp; decentralized social media; user-generated content; sharenting)." },
  { name: "Visualization & Data - Specific Visualization Techniques", about: "Particular chart forms and display approaches — networks, time series, physical and situated displays (uncertainty visualization; data physicalization; network visualization; geospatial)." },
  { name: "Visualization & Data - Storytelling with Visualizations", about: "Visualizations that carry a narrative for broad audiences (narrative visualization; data journalism; infographics; scrollytelling; data comics; data videos)." },
  { name: "Visualization & Data - Visual Analytics", about: "Interactive systems helping analysts explore data and reason toward insight (exploratory data analysis; interactive visualization; sensemaking; situated analytics; progressive visualization)." },
  { name: "Visualization & Data - Visualization Design", about: "How visualizations are composed and built — encodings, color, dashboards, authoring tools (dashboards; visual encoding; colormap design; visualization authoring; chart design)." },
  { name: "Visualization & Data - Visualization Perception", about: "How people read charts — perception, attention, literacies (graphical perception; visualization literacy; data literacy; visual attention; gestalt principles; color perception)." },
  { name: "Visualization & Data - Visualization Theory and Methodology", about: "Foundations of visualization — theory, taxonomies, evaluation methods, critical perspectives (information visualization; visualization evaluation; grammar of graphics; human-data interaction)." },
  { name: "Workplace, Productivity & Future of Work - Crowd Work & Platform Labor", about: "Work mediated by platforms — gig jobs, freelancing, data labeling behind AI (gig economy; data labeling; peer production; freelance platform; human infrastructure)." },
  { name: "Workplace, Productivity & Future of Work - Hidden & Invisible Labor", about: "Work that goes unseen or unpaid — care, upkeep, coordination (care work; invisible work; division of labor; worker exploitation; moneywork)." },
  { name: "Workplace, Productivity & Future of Work - Knowledge Work & Sensemaking", about: "How professionals and teams gather, organize, and reason over information at work (decision support; ideation; knowledge sharing; data science; attention management; note-taking)." },
  { name: "Workplace, Productivity & Future of Work - Programming & Developer Tools", about: "Writing software and its tools, professional to novice and end-user programming (vibe coding; ai code assistants; end-user programming; code review; computational notebook)." },
  { name: "Workplace, Productivity & Future of Work - Workplace & Remote Work", about: "Work and collaboration in offices and at a distance — teams, meetings, workflows (hybrid work; meetings; CSCW; work-life balance; workplace monitoring; entrepreneurship)." },
];

export const PCS_USERS: KeywordDef[] = [
  { name: "Children / Parents", about: "Children, parents, and family life with technology (child-computer interaction; parenting; family communication; parental mediation; new parents; kinship)." },
  { name: "Communities in Unequally Resourced Contexts", about: "People living with limited economic resources, low-income settings and LMICs (low-income; poverty; homelessness; lmic)." },
  { name: "General / No Specific User Group", about: "Broad, unspecified user populations (novice users; expert users; non-experts; general population)." },
  { name: "Individuals with Disabilities", about: "Disabled people as a study population across physical, sensory, and cognitive differences (neurodivergent individuals; mobility impairment; print disability; disabled workers)." },
  { name: "Knowledge Workers", about: "Professionals whose work centers on thinking, designing, analyzing (software developers; data scientists; designers; managers; analysts)." },
  { name: "Labor / Data Workers", about: "People doing platform-mediated and data work, often paid by task or hour (crowdworkers; gig workers)." },
  { name: "Older Adults", about: "People in later life as technology users and participants (elderly; senior citizen; retiree)." },
  { name: "Patients / Healthcare Providers", about: "People giving and receiving care — patients, family caregivers, health professionals (nurses; therapists; caregivers; pharmacists; chronic illness patients)." },
  { name: "Physical Workers", about: "People in manual and skilled trades (construction workers; factory workers; warehouse workers; mechanics; agricultural workers)." },
  { name: "Racialized and Culturally Minoritized Communities", about: "Communities minoritized by race, culture, migration, or caste (immigrant; refugees; indigenous; marginalized communities; caste; diaspora)." },
  { name: "Students / Educators", about: "Learners and the people who teach them, K-12 through university (university students; teachers; graduate students; faculty; tutors)." },
  { name: "Teens", about: "Adolescents and young people, their peer worlds and lives with technology (adolescents; young adults; girls; minors; peer culture)." },
  { name: "Underrepresented Identity/Sexuality", about: "Gender and sexual identity as they shape technology use and design, LGBTQIA+ communities and women (transgender; lgbtqia; queer; women; non-binary)." },
];

export const PCS_CONTRIBUTIONS: KeywordDef[] = [
  { name: "Artifact or System", about: "A new interactive system, technique, or artifact is the primary contribution." },
  { name: "Dataset", about: "A dataset is the primary contribution." },
  { name: "Empirical study that tells us about how people use a system", about: "An evaluation or deployment study of a system is the primary contribution." },
  { name: "Empirical study that tells us about people", about: "A study of people, practices, or contexts (not of a particular system) is the primary contribution." },
  { name: "Essay / Argument", about: "A position, critique, or argument is the primary contribution." },
  { name: "Industry / Practice Reflection", about: "Reflection on practice or industrial deployment is the primary contribution." },
  { name: "Meta-Analysis / Literature Survey", about: "A systematic review, survey, or meta-analysis is the primary contribution." },
  { name: "Methodological Contribution", about: "A new research or design method is the primary contribution." },
  { name: "Theoretical Contribution", about: "A theory, framework, or conceptual model is the primary contribution." },
];

export const PCS_METHODS: KeywordDef[] = [
  { name: "Application Instrumentation / Usage Logs", about: "Analysis of instrumented application use and logs." },
  { name: "Art", about: "Artistic practice as method." },
  { name: "Case Study", about: "In-depth study of one or a few cases." },
  { name: "Content Analysis", about: "Systematic analysis of texts, media, or posts." },
  { name: "Contextual Inquiry", about: "Observation and interview in the context of work." },
  { name: "Conversation Analysis", about: "Fine-grained analysis of talk and interaction." },
  { name: "Diary Study", about: "Participants record experiences over time." },
  { name: "Ethnography", about: "Extended fieldwork and participant observation." },
  { name: "Experience Sampling", about: "In-the-moment prompts sampling experience over time." },
  { name: "Eye Tracking (as method)", about: "Eye tracking used as a measurement method." },
  { name: "Field Study", about: "Study in real-world settings." },
  { name: "First-Person Methods", about: "Autoethnography, autobiographical design, and other first-person approaches." },
  { name: "Humanistic & Cultural Analysis", about: "Interpretive, critical, or cultural analysis." },
  { name: "Interview", about: "Semi-structured or structured interviews." },
  { name: "Lab Study", about: "Controlled study in a laboratory setting." },
  { name: "Literature Review", about: "Systematic or scoping review of literature." },
  { name: "Longitudinal Study", about: "Study across an extended period." },
  { name: "Mixed Methods", about: "Combined qualitative and quantitative methods." },
  { name: "Participatory Design / Co-Design", about: "Designing with stakeholders as partners." },
  { name: "Prototyping / Implementation", about: "Building working prototypes or systems." },
  { name: "Qualitative Methods", about: "Thematic analysis, grounded theory, and other qualitative approaches." },
  { name: "Quantitative Methods", about: "Statistical analysis of quantitative data, experiments." },
  { name: "Quantitative Modeling", about: "Computational or mathematical modeling of behavior or performance." },
  { name: "Research through Design", about: "Design practice as the means of inquiry." },
  { name: "Social Sciences & Practice", about: "Methods from the social sciences and professional practice." },
  { name: "Speculative & Critical Design", about: "Design fiction and critical/speculative design." },
  { name: "Survey (questionnaire)", about: "Questionnaire-based data collection." },
  { name: "Usability Study", about: "Usability testing and evaluation." },
];

export const KEYWORD_GROUPS: Record<KeywordGroup, KeywordDef[]> = {
  domain: PCS_DOMAINS,
  method: PCS_METHODS,
  users: PCS_USERS,
  contribution: PCS_CONTRIBUTIONS,
};

export const ALL_KEYWORD_NAMES: string[] = (Object.keys(KEYWORD_GROUPS) as KeywordGroup[]).flatMap((g) =>
  KEYWORD_GROUPS[g].map((k) => k.name)
);

const GROUP_OF = new Map<string, KeywordGroup>();
for (const g of Object.keys(KEYWORD_GROUPS) as KeywordGroup[]) {
  for (const k of KEYWORD_GROUPS[g]) GROUP_OF.set(k.name, g);
}

export function groupOf(tag: string): KeywordGroup | null {
  return GROUP_OF.get(tag) ?? null;
}

/**
 * IDF-style weight proxy: the real matcher weights rarer descriptors higher over
 * the reviewer pool. Without that pool, a tag drawn from a larger vocabulary is,
 * on average, rarer — so weight by log(vocabulary size of its group).
 */
export function tagWeight(tag: string): number {
  const g = groupOf(tag);
  if (!g) return 1;
  return Math.log(KEYWORD_GROUPS[g].length);
}

const STOP = new Set(["and", "or", "of", "the", "for", "with", "as", "in", "a", "an", "to"]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-–—/&(),.:]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .join(" ")
    .trim();
}

function tailOf(name: string): string {
  return name.split(" - ").slice(-1)[0];
}

/** Snap a model-returned tag to the exact taxonomy name (exact, case-insensitive, family-less tail, then fuzzy). */
export function canonicalTag(input: string, group?: KeywordGroup): string | null {
  const pool = group ? KEYWORD_GROUPS[group] : (Object.values(KEYWORD_GROUPS).flat() as KeywordDef[]);
  const exact = pool.find((k) => k.name === input);
  if (exact) return exact.name;
  const n = norm(input);
  if (!n) return null;
  const ci = pool.find((k) => norm(k.name) === n);
  if (ci) return ci.name;
  // The input is the part after the family prefix ("Large Language Models").
  const tail = pool.find((k) => norm(tailOf(k.name)) === n);
  if (tail) return tail.name;
  // Near-miss: most of the input's tokens appear in one tag's tail (or full name).
  const tokens = n.split(" ");
  if (tokens.length < 2) return null;
  let best: { name: string; score: number } | null = null;
  for (const k of pool) {
    const kt = new Set([...norm(k.name).split(" "), ...norm(tailOf(k.name)).split(" ")]);
    const hits = tokens.filter((t) => kt.has(t)).length;
    const score = hits / tokens.length;
    if (hits >= 2 && score >= 0.75 && (!best || score > best.score)) best = { name: k.name, score };
  }
  return best?.name ?? null;
}

/** Prompt text listing a group's tags (names + one-line hints). */
export function taxonomyPrompt(group: KeywordGroup, withHints = true): string {
  return KEYWORD_GROUPS[group].map((k) => (withHints ? `- ${k.name} — ${k.about}` : `- ${k.name}`)).join("\n");
}
