-- ============================================================
-- BIG SPEAKING — Seed Data
-- Run AFTER 001_initial_schema.sql.
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
-- NOTE: YouTube URLs are accurate as of the seed date —
--       verify if links rot (YouTube IDs rarely change).
-- ============================================================


-- ============================================================
-- SPEAKERS (10)
-- Ordered by sort_order for consistent UI listing.
-- WPM ranges based on analysis of documented speech transcripts.
-- ============================================================

INSERT INTO public.speakers
  (name, specialty, signature_trait, bio,
   ideal_wpm_min, ideal_wpm_max, ideal_pause_frequency, energy_profile,
   famous_speeches, learnings, monogram, sort_order)
VALUES

-- 1. Steve Jobs
(
  'Steve Jobs',
  'Product Storytelling & Visionary Narrative',
  'The Dramatic Reveal',
  'Steve Jobs transformed Apple from a garage startup into the world''s most valuable company through the sheer power of his presentations. His keynote speeches — known internally as "Stevenotes" — were meticulously rehearsed theatrical performances disguised as casual conversations, rehearsed for hundreds of hours until every pause and pivot felt spontaneous. Jobs mastered the art of building suspense through simplicity: he stripped away jargon, used plain language about complex technology, and then detonated a single sentence that reframed everything the audience had just heard. His famous "one more thing" outro became one of the most anticipated phrases in tech history, demonstrating how a single phrase delivered with perfect timing can generate global excitement from a standing audience.',
  100, 130, 'high',
  'Calm and deliberate, with sudden spikes of infectious, child-like excitement',
  '[
    {"title": "Stanford Commencement Address 2005", "url": "https://www.youtube.com/watch?v=UF8uR6Z6KLc"},
    {"title": "Original iPhone Keynote 2007",        "url": "https://www.youtube.com/watch?v=MnrJzXM7a6o"}
  ]'::jsonb,
  '[
    "Use the rule of three — group all information in triads for maximum memorability and rhythm",
    "Rehearse obsessively until delivery feels effortlessly spontaneous — the audience should never see the work",
    "Strategic silence is more powerful than filling every second; hold pauses past the point of comfort",
    "Lead with the problem or the enemy before revealing the solution — build emotional stakes first",
    "Simple language about complex ideas signals mastery; jargon signals insecurity"
  ]'::jsonb,
  'SJ', 1
),

-- 2. Barack Obama
(
  'Barack Obama',
  'Political Oratory & Inclusive Rhetoric',
  'The Tricolon Build',
  'Barack Obama is widely regarded as one of the greatest political orators of the modern era, combining the precision of a constitutional lawyer with the emotional resonance of a Baptist preacher. His speeches employ the classical rhetorical device of the tricolon — three parallel phrases that build to a crescendo — to create moments so quotable that they outlast the speeches themselves. Obama speaks with unhurried presidential confidence, using strategic silence to let ideas breathe and land with their full moral weight before the audience exhales. His singular ability to weave personal biography, national history, and aspirational vision into a single coherent arc set a new standard for what political communication could be in the twenty-first century.',
  100, 120, 'high',
  'Measured and presidential, steadily escalating to soaring, near-spiritual emotional peaks',
  '[
    {"title": "2004 Democratic National Convention Keynote", "url": "https://www.youtube.com/watch?v=_3u6HPWF4rc"},
    {"title": "Yes We Can Victory Speech, New Hampshire 2008", "url": "https://www.youtube.com/watch?v=Fe751kMBwms"}
  ]'::jsonb,
  '[
    "The tricolon — three parallel phrases — creates rhythm, momentum, and natural applause points",
    "Ground universal themes in specific personal stories to make abstract values feel human and real",
    "Your pace is your power — slowing down to emphasize a word signals it is worth the audience''s full attention",
    "Speak to your audience''s highest aspirations, not just their frustrations or fears",
    "Silence distributed across the full room signals that you are speaking to every single individual, not the crowd"
  ]'::jsonb,
  'BO', 2
),

-- 3. Martin Luther King Jr.
(
  'Martin Luther King Jr.',
  'Moral Persuasion & Prophetic Oratory',
  'The Anaphoric Crescendo',
  'Dr. Martin Luther King Jr. stands as the most powerful moral orator in American history, wielding language simultaneously as a weapon of justice and a balm for the suffering of millions. Trained in the Black Baptist preaching tradition, King deployed anaphora — the hypnotic repetition of opening phrases like "I have a dream" or "Now is the time" — to create a prayer-like cadence that swept audiences into a state of shared emotional conviction. His pace slowed and deepened as each speech reached its climax, transforming political argument into spiritual invitation and legal grievance into moral imperative. King''s speeches remain the supreme masterclass in making the abstract urgently personal, and the personal universally resonant across time, culture, and continent.',
  85, 110, 'high',
  'Deep, solemn, and measured — building with deliberate gravity to thunderous, preacher-like peaks',
  '[
    {"title": "I Have a Dream — March on Washington 1963", "url": "https://www.youtube.com/watch?v=vP4iY1TtS3s"},
    {"title": "I''ve Been to the Mountaintop 1968",          "url": "https://www.youtube.com/watch?v=Oehry1JC9Rk"}
  ]'::jsonb,
  '[
    "Anaphora — repeating an opening phrase — builds hypnotic emotional momentum that logic alone cannot create",
    "Move from the specific to the universal: one person''s story, told with precision, becomes every person''s story",
    "The pause before a key line is as important as the line itself — it opens the space for arrival",
    "Moral clarity expressed in concrete, visual language moves people further than abstract philosophical argument",
    "Vary your pace dramatically — slow, deliberate speech in the right moment commands more attention than speed ever can"
  ]'::jsonb,
  'MK', 3
),

-- 4. Tony Robbins
(
  'Tony Robbins',
  'Motivational Psychology & Peak State Induction',
  'The State Break & Reframe',
  'Tony Robbins is the world''s foremost life and business strategist, having coached presidents, Olympic athletes, and Fortune 500 CEOs for over four decades across 100+ countries. His speaking style is simultaneously a physical and psychological force of nature — he delivers information at a rapid, relentless pace while simultaneously managing the emotional state of thousands of people in a stadium through strategic movement, visceral metaphor, and precisely-timed repetition. Robbins pioneered the concept of "state management" in live speaking, understanding that the emotional state a listener is in when they receive information determines whether they act on it or forget it. His trademark is breaking a limiting pattern in the audience with confrontational questioning, then immediately replacing it with an empowering one through a story so specific and vivid that it bypasses the intellect and lands directly in the body.',
  130, 165, 'low',
  'Relentlessly high-energy, physically explosive, and almost overwhelming in its sustained intensity',
  '[
    {"title": "Why We Do What We Do — TED 2006",  "url": "https://www.youtube.com/watch?v=Cpc-t-Uwv1I"},
    {"title": "Awaken the Giant Within — Full Talk", "url": "https://www.youtube.com/watch?v=6EKPhPcFsMc"}
  ]'::jsonb,
  '[
    "Physiology first: your movement and body language change the audience''s neurological state before you say a word",
    "Ask rhetorical questions constantly — a brain answering a question cannot simultaneously drift away from you",
    "Match the audience''s current energy state, then gradually pull them upward to where you want them",
    "Specificity creates belief: vague inspiration evaporates; a specific story with a specific number stays",
    "Repetition of key phrases creates neurological anchors that resurface days after the talk ends"
  ]'::jsonb,
  'TR', 4
),

-- 5. Simon Sinek
(
  'Simon Sinek',
  'Leadership Philosophy & Purpose-Driven Communication',
  'The Golden Circle Framework',
  'Simon Sinek is an organizational thinker and author whose TED Talk "How Great Leaders Inspire Action" became the third most-watched TED Talk of all time, introducing the world to his "Start With Why" framework and permanently changing how business leaders think about communication and culture. Sinek speaks with the calm, unforced authority of a researcher who has just cracked a code that everyone else has been circling for decades, using a single simple diagram and a handful of recognizable business examples to reveal profound truths about human motivation and institutional trust. His delivery is deliberately unhurried and conversational, relying entirely on the power of the insight over rhetorical flourish — pausing often to let the full implication of an idea settle before continuing. Sinek has a rare ability to take abstract leadership concepts that consultants have been obscuring with complexity and make them feel immediately actionable for everyone from Fortune 500 CEOs to first-time managers.',
  90, 115, 'high',
  'Calm, intellectually warm, and methodical — building conviction through clarity rather than volume',
  '[
    {"title": "How Great Leaders Inspire Action — TED 2009", "url": "https://www.youtube.com/watch?v=qp0HIF3SfI4"},
    {"title": "Millennials in the Workplace",                "url": "https://www.youtube.com/watch?v=hER0Qp6QJNU"}
  ]'::jsonb,
  '[
    "Always start with WHY — purpose is the most persuasive force in human communication, more powerful than features",
    "A single powerful framework, clearly explained, is more memorable and actionable than ten scattered good ideas",
    "Speak slowly enough that your audience can think alongside you — comprehension is the prerequisite for agreement",
    "Use contrast (what most companies do vs. what remarkable ones do) to make your insight feel like a revelation",
    "Confidence comes from clarity of message, not from volume, speed, or filler — know your one thing perfectly"
  ]'::jsonb,
  'SS', 5
),

-- 6. Les Brown
(
  'Les Brown',
  'Motivational Speaking & Life Transformation',
  'The Personal Struggle Resurrection Arc',
  'Les Brown is a towering figure in the motivational speaking world who transformed his own story of profound adversity — labeled "educably mentally retarded" as a child, abandoned at birth, raised in poverty in Miami — into a message of unstoppable human potential that has moved and changed millions of lives on every continent. His speaking style is rooted in the African American oratory tradition, blending disarming humor, raw emotional vulnerability, and explosive declarations of possibility to create a live experience that leaves audiences simultaneously in tears and on their feet, sometimes multiple times in the same session. Brown''s trademark phrase "It''s possible!" is delivered with such full-body conviction that it functions almost as a collective prayer being offered on behalf of the entire room. He understands instinctively that people do not primarily need more information — they need permission to believe in their own potential again, and he delivers that permission through the undeniable evidence of his own survival.',
  120, 150, 'medium',
  'Warm and vulnerable, erupting without warning into passionate, church-revival-style climaxes',
  '[
    {"title": "It''s Possible — Full Speech",   "url": "https://www.youtube.com/watch?v=qGx5xbkuK9I"},
    {"title": "You Gotta Be Hungry — Live Talk", "url": "https://www.youtube.com/watch?v=sYTMaMPGqFI"}
  ]'::jsonb,
  '[
    "Vulnerability is your greatest credential — your most painful story is your most persuasive proof of authority",
    "Humor is a delivery system for truth: laughter opens a mind that resistance had shut",
    "Permission to believe is the most valuable gift a speaker can give — grant it explicitly and often",
    "Repetition of your core message through multiple different stories and angles carves it permanently into memory",
    "Call your audience toward their future self by name — address who they are becoming, not who they''ve been"
  ]'::jsonb,
  'LB', 6
),

-- 7. David Goggins
(
  'David Goggins',
  'Mental Toughness & Radical Accountability',
  'The Unfiltered Brutal Truth',
  'David Goggins is a retired Navy SEAL, ultramarathon runner, and author who holds records in pull-ups and endurance events, having built a massive global following by refusing to offer his audiences anything less than the most unvarnished, uncomfortable truths about human potential and the stories we tell ourselves to avoid reaching it. His speaking style is deliberately confrontational — he makes no effort to soften the message or make the audience comfortable, delivering hard truths with the earned intensity of someone who discovered them through genuine, documented, extreme suffering rather than through books or theory. Goggins uses his own extraordinary physical and psychological trials as unimpeachable evidence, building a form of credibility that no academic credential could match because it is carved into his body and history. His raw, profanity-laced authenticity creates an unusual and powerful intimacy with audiences who are exhausted by motivational speakers who have clearly never done the brutally hard things they preach about.',
  110, 145, 'medium',
  'Intense, unflinching, and barely contained — like a pressure-cooker held one degree below explosion',
  '[
    {"title": "The Most Motivational Talk Ever — David Goggins", "url": "https://www.youtube.com/watch?v=5tSTk1083VY"},
    {"title": "David Goggins: This is Why You''re Not Living Up to Your Potential", "url": "https://www.youtube.com/watch?v=Kx-MNpT7Llo"}
  ]'::jsonb,
  '[
    "Earned authority is non-negotiable — your audience instantly senses whether you have actually done the hard thing",
    "Comfort is the enemy of growth; the most valuable gift you can give is the discomfort your audience is avoiding",
    "Specific, quantified suffering creates undeniable credibility that generic inspiration never can",
    "Remove all polish from your delivery — unfiltered rawness signals the message matters more than your image",
    "Hold the standard and refuse to release it — don''t let your audience escape into comfortable consolation prizes"
  ]'::jsonb,
  'DG', 7
),

-- 8. Jordan Peterson
(
  'Jordan Peterson',
  'Psychological Depth & Mythological Storytelling',
  'The Layered Meaning Unpack',
  'Jordan Peterson is a clinical psychologist and University of Toronto professor whose lectures on psychology, mythology, and personal responsibility became a global phenomenon through YouTube, amassing hundreds of millions of views and a devoted international audience hungry for rigorous, honest intellectual engagement. His speaking style is singular for its layered, recursive complexity — he constructs arguments the way a geologist reads strata, moving fluidly through evolutionary biology, Jungian shadow theory, biblical narrative, clinical case studies, and personal memoir to arrive at conclusions that feel simultaneously ancient and urgently applicable to the present moment. Peterson speaks with a deliberate slowness, pausing mid-sentence when genuinely searching for exactly the right word, which creates an effect that conventional speakers never achieve: the audience feels they are watching a first-class mind grappling with difficult truth in real time rather than reciting rehearsed positions. His emotional authenticity — including tears when speaking about suffering, sacrifice, and responsibility — builds a quality of trust that formal rhetoric alone cannot manufacture.',
  110, 140, 'high',
  'Intense, earnest, and searching — with unexpected waves of emotional vulnerability that hit without warning',
  '[
    {"title": "2017 Personality Lecture Series — Maps of Meaning", "url": "https://www.youtube.com/watch?v=I8Xc2_FtpHI"},
    {"title": "Jordan Peterson Destroys the Idea That Life is Meaningless", "url": "https://www.youtube.com/watch?v=CnckJAZWRFI"}
  ]'::jsonb,
  '[
    "Depth beats breadth every time — go fully and completely into one idea rather than skimming across ten",
    "Authentic struggle during speech — visibly searching for the exact right word — builds trust that polish destroys",
    "Connect local, immediate observations to deep universal archetypes for resonance that bypasses cynicism",
    "Emotional vulnerability from a position of strength, not weakness, creates the deepest possible human connection",
    "Precision in word choice is a form of respect for your audience — it signals you take the truth seriously"
  ]'::jsonb,
  'JP', 8
),

-- 9. Mel Robbins
(
  'Mel Robbins',
  'Behavioral Science & Actionable Self-Help',
  'The 5-Second Rule Activation',
  'Mel Robbins is a CNN commentator-turned-bestselling author and speaker whose TEDx Talk "How to Stop Screwing Yourself Over" became one of the most-watched TEDx Talks of all time with over 30 million views, establishing her as the leading voice on practical motivation, habit formation, and overcoming the specific internal resistance that stops capable people from acting on what they already know. Her speaking style is disarmingly direct and relatable in a way that feels earned rather than manufactured — she opens every talk with uncomfortable personal admissions (being nearly bankrupt, not wanting to get out of bed, dreading her own life) that immediately signal to audiences that she has genuinely earned the right to coach them out of the same place. Robbins translates behavioral and neuroscience research into concrete, single-sentence techniques — most famously the 5-Second Rule — that audiences can apply on the drive home rather than in some hypothetical future moment of readiness. Her high-energy, girlfriend-confiding delivery style collapses the distance between speaker and audience in a way that makes transformation feel imminent and achievable rather than aspirational and distant.',
  120, 155, 'medium',
  'Warm and conspiratorially relatable, building to energetic, punchy, and empowering declarations',
  '[
    {"title": "How to Stop Screwing Yourself Over — TEDx 2011", "url": "https://www.youtube.com/watch?v=Lp7E973zozc"},
    {"title": "The 5 Second Rule — Full Keynote",               "url": "https://www.youtube.com/watch?v=yq0tQqWcGXI"}
  ]'::jsonb,
  '[
    "Open with your most embarrassing personal truth — it disarms every audience and earns instant trust and attention",
    "Back your technique with science, then validate it with your own messy human failure — both halves are essential",
    "Make the technique so simple and specific that the audience can use it before they reach their car in the parking lot",
    "Your own enthusiasm about your material is non-negotiable — if you are not lit up by it, the audience will not be",
    "Preempt the internal objections your audience is already forming — naming their resistance out loud dissolves it"
  ]'::jsonb,
  'MR', 9
),

-- 10. Gary Vaynerchuk
(
  'Gary Vaynerchuk',
  'Entrepreneurship & Social Media Marketing',
  'The Radical Candor Dump',
  'Gary Vaynerchuk — universally known as GaryVee — scaled a family wine retail business from $3 million to $60 million using YouTube before social media was considered a legitimate business strategy, then built VaynerMedia into a $300M+ agency serving Fortune 500 brands, establishing himself as the most recognizable and polarizing voice in digital entrepreneurship and personal branding. His speaking style is a deliberate, calculated rejection of polished corporate presentation — raw, rapid-fire, frequently profanity-laced, and delivered at a pace that signals his thinking is moving faster than his words can keep up with, which creates the unmistakable feeling of being in the room with someone who has earned every opinion through real skin in the game. GaryVee''s primary rhetorical device is radical candor: he identifies the specific self-deceptions and comfortable excuses his audience is carrying, names them explicitly without apology, and then immediately offers the alternative with the same unsparing bluntness. He understands attention economics more viscerally than almost any speaker alive, which means that everything about his delivery — the energy level, the refusal of polish, the authenticity — is simultaneously genuine and precisely calibrated to hold an audience in an era of infinite distraction.',
  140, 175, 'low',
  'Relentlessly kinetic, raw, and stream-of-consciousness — like a keynote delivered at a full sprint',
  '[
    {"title": "Do What You Love — Keynote (GaryVee)",           "url": "https://www.youtube.com/watch?v=RVH7rJk0Lec"},
    {"title": "The Single Greatest Strategy for Life — GaryVee", "url": "https://www.youtube.com/watch?v=pKFpJZl4OI0"}
  ]'::jsonb,
  '[
    "Authenticity is a deliberate strategy, not just a virtue — audiences can smell performance from three rows back",
    "Self-awareness is your single most underrated communication asset; know exactly how you are landing",
    "Speed signals passion — if you sound bored by your own message, the audience will be bored three seconds before you are",
    "Name the lie your audience is telling themselves before you offer the alternative — they will love you for it",
    "Volume of output beats perfection of output — ship it, show up again, and iterate in public"
  ]'::jsonb,
  'GV', 10
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- DRILLS (15 — 3 per category)
-- Ordered by category then difficulty then sort_order.
-- ============================================================

INSERT INTO public.drills
  (title, category, difficulty, description, content, instructions, target_skill, xp_reward, sort_order)
VALUES

-- ============================================================
-- CATEGORY: tongue-twister (3)
-- ============================================================

(
  'The Classic Pepper',
  'tongue-twister', 2,
  'A foundational consonant articulation drill targeting the P and K sounds — the building blocks of crisp, confident speech.',
  'Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where''s the peck of pickled peppers Peter Piper picked?',
  'Start at half speed, exaggerating every consonant until your lips and tongue feel the movement. Gradually increase speed across three repetitions while maintaining full clarity — if clarity drops, slow back down. Record yourself at full speed and listen back specifically for slurred stop consonants. Speed without clarity is just noise.',
  'Consonant articulation and lip agility',
  40, 10
),

(
  'She Sells Seashells',
  'tongue-twister', 2,
  'The definitive drill for distinguishing the S and SH sounds — a distinction that separates crisp, credible delivery from muddy, amateur speech.',
  'She sells seashells by the seashore. The shells she sells are surely seashells. So if she sells shells on the seashore, I''m sure she sells seashore shells.',
  'The entire value of this drill is the S versus SH distinction — these are different sounds produced in different parts of the mouth, and the exercise is worthless if you blur them. Repeat five times, increasing speed each round. Stop the moment clarity drops; never trade precision for speed. Record yourself and judge each S and SH pair ruthlessly.',
  'Sibilant distinction and anterior tongue control',
  40, 20
),

(
  'Red Lorry Yellow Lorry',
  'tongue-twister', 3,
  'An advanced drill targeting the L/R distinction and rhythmic consistency under pressure — critical for clear, authoritative delivery at higher speaking speeds.',
  'Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. The red lorry rattled and rolled, the yellow lorry lurched and leaned, and both lorries lumbered loudly through the lane.',
  'This drill targets the L and R distinction — sounds that require very different tongue placements and collapse into each other under speed. Record at full pace and evaluate coldly: do the two sounds remain distinct throughout? If the words blur into a single rolling sound, you have found your ceiling — drop the speed and rebuild. Clarity under pressure is the entire point.',
  'L/R articulation and rhythmic clarity under speed',
  60, 30
),

-- ============================================================
-- CATEGORY: pitch (3)
-- ============================================================

(
  'The Pitch Ladder',
  'pitch', 2,
  'A fundamental range drill that expands your usable pitch register and builds the conscious control needed to modulate your voice intentionally rather than accidentally.',
  'Move through four distinct pitch levels while speaking these phrases: [LOWEST] "Deep and grounded." [LOW-MID] "Confident and clear." [HIGH-MID] "Bright and energized." [HIGHEST] "Excited and alive." Then reverse: step back down through all four levels to where you started.',
  'This is not about volume or shouting — it is entirely about pitch. Each phrase must land at a distinctly different frequency. Record yourself and verify you can hear four separate, clearly differentiated levels in playback. A speaker who operates at only one pitch level is acoustically invisible; the brain stops processing monotone within seconds.',
  'Pitch range expansion and conscious modulation',
  50, 40
),

(
  'Statement vs. Question',
  'pitch', 2,
  'A precision drill for eliminating the vocal habit of "upspeak" — the accidental pitch-rise at the end of statements that destroys perceived authority and competence.',
  'Deliver each pair — first as a confident statement (pitch falls at the end), then as a genuine question (pitch rises at the end): "You did it." / "You did it?" — "This is the answer." / "This is the answer?" — "We''re moving forward." / "We''re moving forward?" — "The work is done." / "The work is done?"',
  'The distinction between a statement and a question in English is almost entirely carried by terminal pitch direction: statements fall, questions rise. Many speakers habitually apply a rising inflection to statements, which sounds like uncertainty asking for approval. Record each pair, confirm the direction is clean and deliberate, and listen for any upward drift that should not be there.',
  'Pitch authority and statement confidence',
  50, 50
),

(
  'The Emotional Color Spectrum',
  'pitch', 4,
  'An advanced pitch and resonance drill for expanding emotional range — the ability to color the same words with entirely different meanings through voice alone.',
  'Deliver this single sentence six times. Each delivery must use a distinctly different emotional color. The words stay identical; only your voice changes. Sentence: "I need you to listen to me carefully." — Emotion 1: Calm authority. Emotion 2: Urgent fear. Emotion 3: Deep sadness. Emotion 4: Joyful excitement. Emotion 5: Cold anger. Emotion 6: Warm, unconditional love.',
  'The goal is to discover that pitch, pace, resonance, and breath — not words — carry emotional meaning. If multiple deliveries sound similar to you on playback, you have found the specific emotional range you need to develop. Elite speakers have full command of their emotional palette and can deploy any shade deliberately. Record all six and evaluate with honest ears.',
  'Emotional range and vocal coloring',
  80, 60
),

-- ============================================================
-- CATEGORY: storytelling (3)
-- ============================================================

(
  'The 60-Second Story Arc',
  'storytelling', 3,
  'A compression drill that builds the ability to tell a complete, emotionally satisfying story in under 60 seconds — the foundational skill of every great communicator.',
  'Tell a true story from your own life in exactly 60 seconds. It must contain all three acts in sequence: BEFORE — who you were or what the situation was before the event. INCITING MOMENT — the specific moment something challenged, changed, or broke you. AFTER — who you became or what you understood that you couldn''t have known before.',
  'The three-act structure is the skeleton of every compelling story in human history. Do not describe — dramatize. Use present tense for the key moment to create immediacy. The listener must feel the before-state and the after-state as distinct emotional realities. If they blur together, you have not found the real inciting moment yet. Time yourself strictly.',
  'Narrative structure and story compression',
  70, 70
),

(
  'The Vivid Opening Hook',
  'storytelling', 3,
  'A drill for mastering the most critical 15 seconds of any speech — the opening hook that determines whether an audience decides to listen or drift.',
  'Choose ONE of the following hooks and continue speaking for 60 seconds from that opening: A) "I was sitting in [specific place], and I realized something I cannot un-know." B) "There was a moment that changed everything for me — it lasted about three seconds." C) "Most people get [topic of your choice] completely wrong. I was one of them."',
  'Your opening 15 seconds determine whether the audience grants you their attention or begins mentally composing grocery lists. A great hook creates a gap in the audience''s knowledge or certainty that they urgently need to close — it makes listening feel necessary rather than polite. Drill your chosen hook until it sounds inevitable rather than rehearsed, then continue into the 60-second piece. Record and evaluate: did the hook genuinely create tension?',
  'Audience capture and curiosity engineering',
  70, 80
),

(
  'The Sensory Scene',
  'storytelling', 4,
  'An advanced storytelling drill that builds the specificity and sensory richness that separates forgettable descriptions from scenes that audiences can inhabit.',
  'Describe a real place you know intimately in 90 seconds. You must include at least one vivid detail from each of the five senses: sight, sound, smell, touch, and taste. Banned words for this drill: "beautiful," "amazing," "incredible," "wonderful," "nice," "great," "interesting." Replace each banned word with a specific, concrete image.',
  'Specificity is the soul of great storytelling. The banned words exist because they outsource the image to the listener''s imagination — your job is to supply the image yourself. The paradox at the heart of storytelling: the more specific and particular a detail is, the more universal the emotional response it produces. "The smell of diesel and salt" is more powerful than "the amazing harbour." Record yourself and identify every moment you defaulted to vague adjectives.',
  'Sensory specificity and immersive scene-setting',
  90, 90
),

-- ============================================================
-- CATEGORY: pacing (3)
-- ============================================================

(
  'Velocity Shift',
  'pacing', 2,
  'A foundational pacing drill that teaches the single most powerful tool in a speaker''s tempo arsenal: the sudden, dramatic contrast between speed and stillness.',
  '[FAST — speak with urgency and momentum]: "When the deadline hit, when the pressure built, when the room went silent and every single person turned to look at me —" [SLOW — one word at a time, letting each land fully]: "... I took one breath. And then I spoke."',
  'Contrast is what makes pacing emotionally felt. Speed creates urgency, chaos, and momentum; a sudden drop to slow deliberate speech creates weight, gravity, and inevitability. The emotional payoff of the slow section is entirely built by the fast section preceding it — without the setup, the landing has no impact. Record yourself and confirm that the contrast is dramatic and unmistakable. If it sounds the same speed throughout, start over.',
  'Tempo contrast and intentional pacing',
  50, 100
),

(
  'The Intentional Pause',
  'pacing', 3,
  'The drill that cures the most common speaking disease: the panic-driven rush to fill silence. Learning to hold a real pause is one of the highest-leverage skills in all of public speaking.',
  'Deliver this passage and hold each indicated pause for its full duration — use a timer or count internally: "The most important thing I can tell you is this [3-SECOND PAUSE] ... you already know the answer. [2-SECOND PAUSE] You have always known. [4-SECOND PAUSE] The question is whether you have the courage to act on it."',
  'Most speakers flee from silence because three seconds of quiet feels — to the speaker — like twenty seconds of failure. To the listener, those same three seconds feel like exactly the right amount of time to digest a difficult idea and decide to believe it. The pause is where persuasion actually happens. Hold the pause, hold eye contact with someone in the room, hold your nerve. Do not rescue the silence — let it work.',
  'Pause tolerance and deliberate silence',
  70, 110
),

(
  'The Metronome Speech',
  'pacing', 3,
  'A conscious pace-control drill that breaks the habit of a single default speed — the most universal and most invisible pacing problem among intermediate speakers.',
  'Choose any topic you know well and speak for 90 seconds. Structure it in three equal thirds: First 30 seconds at your natural, comfortable pace. Next 30 seconds at exactly half your natural pace — let every single word land individually before the next arrives. Final 30 seconds at double your natural pace — speak as if you have urgent news and thirty seconds to deliver it.',
  'This drill builds conscious, intentional control of speaking rate — the ability to choose your speed rather than fall into your one default. Most speakers do not realize they have been operating at a single speed their entire career. Record all three sections and verify that they are clearly, unmistakably different speeds. The ability to move fluidly between rates, on demand, is a hallmark of elite communicators.',
  'Conscious pace control and tempo range',
  60, 120
),

-- ============================================================
-- CATEGORY: vocabulary (3)
-- ============================================================

(
  'Filler Word Detox',
  'vocabulary', 2,
  'The drill that eliminates the verbal tics that are silently eroding your perceived authority and intelligence with every single sentence you speak.',
  'Speak for 90 seconds on any topic you know deeply — your work, a passion, an area of expertise. The rules are absolute: no "um," no "uh," no "like" used as a filler, no "you know," no "basically," no "literally" used for emphasis, no "sort of," no "kind of." Replace every filler urge with a deliberate one-second pause and then continue.',
  'Filler words are verbal placeholders for a thinking brain that has not accepted that silence is allowed. The pause is always, without exception, better than the filler — listeners experience fillers as noise and processing-load; they experience pauses as authority and confidence. This drill is initially brutal and disorienting, which is exactly the right sign. Record yourself and count fillers ruthlessly. Zero is the target.',
  'Filler word elimination and pause substitution',
  60, 130
),

(
  'Power Word Upgrade',
  'vocabulary', 3,
  'A precision vocabulary drill that trains the habit of replacing weak, vague language with vivid, specific, high-impact words — the difference between a sentence that lands and one that slides off.',
  'Rewrite and then speak aloud an upgraded version of each sentence — replace every vague or weak word with something more precise, vivid, or powerful: 1) "The presentation went well and people seemed to like it." 2) "He walked into the room and everyone noticed him." 3) "She talked about the problem for a long time and it was really interesting." 4) "The results were good and the team was happy about it."',
  'Vague words (good, went well, seemed, nice, interesting, really) are cognitive dead weight — they force the listener to supply their own image, which may or may not match yours, and which almost certainly carries less charge than the specific image you could have given them. Record your upgraded versions and evaluate: are they more specific, more visual, more energetically charged? Do they show rather than tell? Language is your primary tool. Sharpen it every day.',
  'Lexical precision and power vocabulary',
  70, 140
),

(
  'The 5-Word Clarity Challenge',
  'vocabulary', 4,
  'An advanced compression drill that trains the executive communication skill of distilling any complex idea to its irreducible core — the seed crystal from which clarity grows.',
  'Compress each concept into exactly five words — not four, not six: 1) What you do for work. 2) Your single most important personal value. 3) What this app is designed to help you do. 4) Why most people never reach their potential. 5) What makes a truly great leader. Then immediately expand each five-word answer into a 20-second spoken explanation.',
  'Constraints force precision in a way that open-ended prompts never can. The five-word version forces you to locate the absolute core of an idea — the compression that makes all expansion possible and coherent. Elite speakers move fluidly and on demand between the compressed insight and the full explanation; it is the defining skill of executive and keynote communication. If you cannot compress it to five words, you do not yet fully understand it.',
  'Concept compression and clarity under constraint',
  90, 150
)

ON CONFLICT DO NOTHING;


-- ============================================================
-- BADGES (8)
-- sort_order reflects the natural progression path.
-- ============================================================

INSERT INTO public.badges
  (name, description, icon_name, requirement_type, requirement_value, sort_order)
VALUES

(
  'First Words',
  'You broke the silence. Recording your very first session takes more courage than most people realize — this is where every great speaker''s journey actually begins.',
  'Mic',
  'total_recordings', 1, 10
),

(
  '3-Day Fire',
  'Three consecutive days of practice. The neural pathways are beginning to form. The habit is starting to take root in the soil.',
  'Flame',
  'streak', 3, 20
),

(
  'Week Warrior',
  'Seven straight days of showing up, recording, and improving. You are not dabbling — you are building something that compounds.',
  'Sword',
  'streak', 7, 30
),

(
  'Flawless',
  'You scored 90 or above on a single session analysis. Your delivery touched elite territory. Now the question is: can you live there?',
  'Star',
  'score_threshold', 90, 40
),

(
  'Drill Sergeant',
  'Ten drills completed. You don''t just talk about improvement — you drill it into your muscle memory, repetition by repetition.',
  'Dumbbell',
  'drills_completed', 10, 50
),

(
  'Speaker Student',
  'You''ve compared your voice against five legendary speakers. The best in the world are now your curriculum.',
  'BookOpen',
  'speakers_compared', 5, 60
),

(
  'Month of Mastery',
  'Thirty consecutive days of deliberate practice. You have crossed the line from resolution to identity. You are now a speaker who practices — not someone who intends to.',
  'Trophy',
  'streak', 30, 70
),

(
  'Level 10',
  'You have reached Level 10. Only a small fraction of people who start this journey ever get here. The gap between you and where you started is permanent.',
  'Crown',
  'level_reached', 10, 80
)

ON CONFLICT DO NOTHING;
