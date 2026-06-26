-- ============================================================
-- BIG SPEAKING — Complete Seed Data v2
-- Run AFTER 001_initial_schema.sql
--
-- WARNING: Clears and replaces all reference data (speakers,
-- drills, badges, random_topics). User progress rows in
-- user_drill_completions and user_badges are removed via CASCADE.
-- Only run on a fresh project or dev environment.
-- ============================================================


-- ============================================================
-- 0. CLEAR EXISTING REFERENCE DATA
-- (ON DELETE rules handle cascades gracefully)
-- ============================================================

DELETE FROM public.badges;
DELETE FROM public.drills;
DELETE FROM public.speakers;


-- ============================================================
-- 1. RANDOM TOPICS TABLE
-- Created here so this seed is self-contained.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.random_topics (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL
);

ALTER TABLE public.random_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "random_topics: select authenticated" ON public.random_topics;
CREATE POLICY "random_topics: select authenticated"
  ON public.random_topics FOR SELECT
  USING (auth.role() = 'authenticated');

DELETE FROM public.random_topics;


-- ============================================================
-- 2. SPEAKERS (10)
-- WPM ranges based on speech transcript analysis.
-- ============================================================

INSERT INTO public.speakers
  (name, monogram, specialty, signature_trait, bio,
   ideal_wpm_min, ideal_wpm_max, ideal_pause_frequency, energy_profile,
   famous_speeches, learnings, sort_order)
VALUES

-- 1 · Steve Jobs ─────────────────────────────────────────────
(
  'Steve Jobs', 'SJ',
  'Keynote Legend',
  'Master of the Pause',
  'Jobs speaks at a measured 130 to 145 WPM — far slower than most assume — deploying silence as a weapon, his pauses lasting two to four seconds and always preceding the single most important word in the sentence. His structures are short and declarative: subject, verb, impact — never a dependent clause when a period will do. He avoids jargon entirely, which forces the audience to engage with ideas rather than decode terminology. Every Jobs keynote is constructed as a story arc with a villain (the old, broken world), a hero (Apple), and a moment of revelation the audience feels they arrived at themselves.',
  130, 145, 'high', 'calm-authoritative',
  '[{"title": "Stanford Commencement Address 2005", "url": "#"}, {"title": "Original iPhone Keynote 2007", "url": "#"}, {"title": "WWDC 1997 — The Crazy Ones", "url": "#"}]'::jsonb,
  '["Mastering the dramatic pause before a key word", "Building narrative tension before a reveal", "Stripping language to its most powerful minimum"]'::jsonb,
  1
),

-- 2 · Barack Obama ───────────────────────────────────────────
(
  'Barack Obama', 'BO',
  'Political Orator',
  'King of Cadence',
  'Obama speaks at 110 to 130 WPM with a deeply rhythmic cadence drawn equally from the Black Baptist preaching tradition and classical American political oratory. His signature move is the tricolon — three parallel phrases that rise in intensity and volume — deployed at key emotional peaks to produce natural applause and lasting memorability. He uses silence generously, often pausing two to three seconds mid-sentence to signal that the next word carries unusual weight. His emotional register ranges from cool professorial analysis to warm personal confession to soaring collective aspiration, sometimes across a single paragraph.',
  110, 130, 'high', 'warm-deliberate',
  '[{"title": "2004 Democratic National Convention Keynote", "url": "#"}, {"title": "Yes We Can — New Hampshire Victory Speech 2008", "url": "#"}, {"title": "Selma 50th Anniversary Address 2015", "url": "#"}]'::jsonb,
  '["Structuring arguments with tricolon rhythm", "Modulating emotional register across a speech arc", "Building shared identity through inclusive language"]'::jsonb,
  2
),

-- 3 · Martin Luther King Jr. ─────────────────────────────────
(
  'Martin Luther King Jr.', 'MK',
  'Prophetic Preacher',
  'Voice of Fire',
  'King speaks at 100 to 115 WPM with a rhythmic, almost musical delivery rooted in the Black church sermon tradition — pace and register used as instruments of emotion, not just conveyance of information. His most powerful technique is anaphora: the repetition of an opening phrase such as "I have a dream" builds a cumulative emotional wave that carries audiences into a state of collective conviction logic alone could never produce. He is a master of the crescendo — speeches begin in measured, academic argument and end in soaring prophetic declaration, rising in pace, volume, and pitch as emotional stakes increase. Every King speech earns its peak through the careful construction of moral logic that precedes it.',
  100, 115, 'high', 'preacher-prophetic',
  '[{"title": "I Have a Dream — March on Washington 1963", "url": "#"}, {"title": "I''ve Been to the Mountaintop 1968", "url": "#"}, {"title": "Letter from Birmingham Jail (read aloud)", "url": "#"}]'::jsonb,
  '["The emotional power of anaphora and deliberate repetition", "Building from logical argument to emotional crescendo", "Using vocal pitch and tempo as storytelling instruments"]'::jsonb,
  3
),

-- 4 · Tony Robbins ───────────────────────────────────────────
(
  'Tony Robbins', 'TR',
  'Motivational Powerhouse',
  'State Shatterer',
  'Robbins speaks at 150 to 180 WPM and almost never pauses, maintaining relentless forward momentum that keeps audiences in a heightened state of alertness and prevents the mind from finding an exit. His primary tool is state management — he moves physically across stage, shifts vocal pitch dramatically, and uses specific word patterns to change audience psychology from passive reception to active transformation. Robbins delivers information in compressed bursts separated by rhetorical questions that force the listener to participate, making a talk to 15,000 people feel interactive. His energy rarely drops below a nine out of ten for the duration of a multi-hour event.',
  150, 180, 'low', 'explosive',
  '[{"title": "Why We Do What We Do — TED 2006", "url": "#"}, {"title": "Date With Destiny — Live Event", "url": "#"}, {"title": "Unleash the Power Within — Keynote", "url": "#"}]'::jsonb,
  '["Sustaining audience energy over long speaking durations", "Using rhetorical questions to force active participation", "Physical movement and stage presence as communication tools"]'::jsonb,
  4
),

-- 5 · Simon Sinek ────────────────────────────────────────────
(
  'Simon Sinek', 'SS',
  'Leadership Thinker',
  'The Why Whisperer',
  'Sinek speaks at a deliberate 130 to 150 WPM with an unhurried confidence that signals he is completely certain of his ideas and sees no need to rush them past the audience. His most distinctive habit is the pause of comprehension — he stops after a key insight and waits visibly while the idea settles, treating silence as a delivery mechanism rather than dead air. Sinek constructs arguments with the precision of a mathematician: establish a framework, define terms clearly, then apply it consistently to examples the audience already knows, making the logic feel inevitable in retrospect. His emotional register is warm and inclusive — he speaks as if the audience is already on his side, and that generosity tends to make it true.',
  130, 150, 'medium', 'cerebral-warm',
  '[{"title": "How Great Leaders Inspire Action — TED 2009", "url": "#"}, {"title": "Leaders Eat Last — Full Keynote", "url": "#"}, {"title": "Millennials in the Workplace", "url": "#"}]'::jsonb,
  '["Building a speech around a single clear conceptual framework", "The pause of comprehension as an active rhetorical device", "Making complex logic feel obvious and inevitable"]'::jsonb,
  5
),

-- 6 · Les Brown ──────────────────────────────────────────────
(
  'Les Brown', 'LB',
  'Voice of the People',
  'Permission Giver',
  'Brown speaks at 140 to 160 WPM with a delivery that oscillates dramatically between intimate confessional slowness and explosive preacher-style declaration — sometimes within the same sentence. His rhetorical DNA is the Black church: he builds emotional pressure gradually through story, reaches a breaking point where the story becomes a universal truth, then releases the audience into collective catharsis through volume and repetition. His signature technique is the permission statement — he explicitly tells audiences they are allowed to want more, to try again, to believe — and his own biography gives those permissions the weight of earned testimony. Brown is among the world''s greatest practitioners of the emotional resurrection arc.',
  140, 160, 'medium', 'revival-passionate',
  '[{"title": "It''s Possible — Full Keynote", "url": "#"}, {"title": "You Gotta Be Hungry", "url": "#"}, {"title": "Live Your Dreams — Classic Recording", "url": "#"}]'::jsonb,
  '["The emotional arc from vulnerability to declaration", "Using personal testimony as universal permission", "Volume and pacing contrast as emotional delivery tools"]'::jsonb,
  6
),

-- 7 · David Goggins ──────────────────────────────────────────
(
  'David Goggins', 'DG',
  'Mental Toughness Coach',
  'Comfort Killer',
  'Goggins speaks at 155 to 180 WPM with a barely-controlled urgency that signals he finds the material not motivational but urgent — more warning than encouragement, more diagnosis than inspiration. He never softens delivery for audience comfort, which creates a rare form of authority: the sense this man has no agenda except to tell you the truth you have been avoiding. His rhetorical structure is confrontation, evidence, challenge — he names a human avoidance behavior, provides specific documented evidence from his own extreme experience, then directly challenges the listener to face the same pattern in themselves. Profanity in his delivery functions not as color but as a deliberate signal that he is operating outside polished-presentation conventions.',
  155, 180, 'low', 'raw-relentless',
  '[{"title": "Joe Rogan Experience #1080 — David Goggins", "url": "#"}, {"title": "The Most Motivational Speech Ever", "url": "#"}, {"title": "Can''t Hurt Me — Book Tour Keynote", "url": "#"}]'::jsonb,
  '["The authority that comes from radical, documented personal honesty", "Confrontational directness without audience management or softening", "Building credibility through specific evidence rather than credentials"]'::jsonb,
  7
),

-- 8 · Jordan Peterson ────────────────────────────────────────
(
  'Jordan Peterson', 'JP',
  'Philosophical Challenger',
  'Precision Architect',
  'Peterson speaks at 110 to 135 WPM with long, structurally complex sentences that build arguments through layered qualifications — he says precisely what he means, no more and no less, creating the impression of a mind that respects both the subject and the listener with equal seriousness. His most distinctive habit is the productive pause: he stops mid-sentence, visibly searches for exactly the right word, and then finds it, modeling rigorous real-time thinking in a way no rehearsed speech can replicate. Peterson draws connections across evolutionary biology, Jungian psychology, biblical narrative, and clinical practice to produce insights that feel simultaneously discovered and ancient. His emotional authenticity — including visible tears about suffering and responsibility — creates a depth of audience trust that formal rhetoric cannot manufacture.',
  110, 135, 'high', 'cerebral-precise',
  '[{"title": "Maps of Meaning — University of Toronto Lectures", "url": "#"}, {"title": "Biblical Series: Genesis", "url": "#"}, {"title": "12 Rules for Life — Live Talk", "url": "#"}]'::jsonb,
  '["Building credibility through intellectual precision and exactness", "Using visible reasoning as a performance of authenticity", "Connecting abstract frameworks to universal human experience"]'::jsonb,
  8
),

-- 9 · Mel Robbins ────────────────────────────────────────────
(
  'Mel Robbins', 'MR',
  'Habit Activation Expert',
  'The Activator',
  'Robbins speaks at 145 to 165 WPM with the infectious pace of someone who genuinely cannot believe she gets to share what she knows — one of the most effective forms of authentic enthusiasm a speaker can project. Her signature opening is radical personal vulnerability: she routinely confesses to not wanting to get out of bed, being nearly bankrupt, or dreading her own life, which makes every subsequent piece of advice feel earned rather than theoretical. She is a master of behavioral specificity, never giving advice at the level of principle when she can give it at the level of a single specific action the listener can execute on the drive home. Her tone moves fluidly between warm confessional, precise scientific explanation, and urgent direct challenge.',
  145, 165, 'medium', 'energetic-direct',
  '[{"title": "How to Stop Screwing Yourself Over — TEDx 2011", "url": "#"}, {"title": "The 5 Second Rule — Full Keynote", "url": "#"}, {"title": "The High 5 Habit — Live Event", "url": "#"}]'::jsonb,
  '["Opening with radical personal vulnerability to earn immediate trust", "Making advice specific and actionable rather than principled", "Moving fluidly between personal, scientific, and urgent delivery registers"]'::jsonb,
  9
),

-- 10 · Gary Vaynerchuk ───────────────────────────────────────
(
  'Gary Vaynerchuk', 'GV',
  'Hustle Evangelist',
  'The Unfiltered Truth',
  'GaryVee speaks at 160 to 185 WPM with no pauses except those created by his own racing thoughts outrunning his mouth — which produces the sensation of watching someone''s real-time thinking rather than a prepared performance. His primary rhetorical device is the radical naming of the lie: he identifies the specific self-deception his audience is running and names it without apology or softening, creating a confrontational intimacy that polished speakers cannot replicate. His content model is deliberate volume over perfection: he makes twelve claims per minute, some wrong, some redundant, and a few genuinely world-altering — and the ratio works. The unpolished delivery is not a lack of skill but a calculated signal that the message matters more than the messenger.',
  160, 185, 'low', 'stream-of-consciousness',
  '[{"title": "Do What You Love — Keynote", "url": "#"}, {"title": "Self Awareness — 2018 Keynote", "url": "#"}, {"title": "The Thank You Economy — Full Talk", "url": "#"}]'::jsonb,
  '["The disarming power of unfiltered, unpolished authenticity", "Naming the audience''s self-deception directly and without apology", "Building authority through documented business results rather than credentials"]'::jsonb,
  10
);


-- ============================================================
-- 3. DRILLS (15 across 5 categories)
-- xp_reward scales with difficulty: 15 / 20 / 25 / 30 / 40
-- ============================================================

INSERT INTO public.drills
  (title, category, difficulty, description, content, instructions, target_skill, xp_reward, sort_order)
VALUES

-- ── TONGUE-TWISTERS (3) ────────────────────────────────────

(
  'Peter Piper Gauntlet',
  'tongue-twister', 2,
  'The classic P and K consonant stress test. Sounds easy; collapses at speed.',
  'Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where''s the peck of pickled peppers Peter Piper picked? Peter Piper picked a peck of pickled peppers, again and again and again and again.',
  'Run through it once at half speed to set the muscle memory, once at medium pace, then once at full speed. Record your fastest clean run. "Clean" means every P, K, and hard consonant is fully articulated — no blurring. Speed with slurring is a zero.',
  'Plosive consonant articulation and lip agility',
  15, 10
),

(
  'Red Lorry Yellow Lorry',
  'tongue-twister', 2,
  'The definitive British L/R trainer. The most deceptively brutal two-word sequence in English.',
  'Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry.',
  'Ten repetitions. Start at a pace where you know you can stay clean, then accelerate on each repetition. A fail is defined as L and R blurring into each other. Target: all ten repetitions clean. Record and listen back at 1.5x playback speed to catch subtle slurs.',
  'L/R distinction and rhythmic consistency under pressure',
  15, 20
),

(
  'She Sells Seashells Speedrun',
  'tongue-twister', 3,
  'The S vs SH battle — two different mouth positions, one brutal drill. Target: under 12 seconds, zero blurs.',
  'She sells seashells by the seashore. The shells she sells are surely seashells. So if she sells shells on the seashore, I''m sure she sells seashore shells. She sells seashells, she sells seashells, she sells seashells by the shore.',
  'The S and SH sounds are produced in different places in the mouth — S uses the tip of the tongue, SH uses the blade. If they blur, you are not moving your tongue. Time your run. Target: under 12 seconds with clean distinction throughout. Record multiple takes and use your cleanest, not your fastest.',
  'Sibilant distinction and anterior tongue precision',
  20, 30
),


-- ── PITCH DRILLS (3) ───────────────────────────────────────

(
  'Sell Me This Pen',
  'pitch', 3,
  'The pressure test for vocal selling. Not about the pen — about finding need, building desire, and closing. Banned word: "write."',
  'You are a salesperson. The interviewer slides a pen across the table and says: "Sell me this pen." You have 60 seconds. You cannot use the word "write" or "writing" at any point. Make me need this pen before you tell me its price.',
  'Great pen pitches ask a question in the first 15 seconds to establish need. Then they build desire by painting a world where the pen solves something. Then they close with a specific offer. Record your pitch and evaluate: Did you ask a question? Did you create desire? Did you close with a specific number or call to action?',
  'Persuasive vocal framing and pitch structure under time pressure',
  25, 40
),

(
  'Explain Crypto to Your Grandma',
  'pitch', 3,
  'Clarity under constraint. If you cannot explain it simply, you do not understand it simply. Zero technical jargon allowed.',
  'Explain what cryptocurrency is and why anyone cares about it to someone who does not use the internet for banking. You have 60 seconds. Banned terms: blockchain, decentralized, hash, node, ledger, protocol, consensus, peer-to-peer. If you use a banned term without a plain-language explanation first, start over.',
  'Analogies are your only tool. "It''s like a receipt that nobody can forge" beats any technical explanation. Record your explanation and apply the grandma test: would a non-technical 70-year-old understand what it is and why it matters by the end of 60 seconds? Be honest with yourself.',
  'Concept simplification and analogy-driven communication',
  25, 50
),

(
  'Startup Pitch in 30 Seconds',
  'pitch', 4,
  'An elevator pitch for a business you''d start. Three questions, 30 seconds, one shot. Clarity over cleverness.',
  'Describe a business you would start — real or imagined — in exactly 30 seconds. You are in an elevator with an investor who has 10 million dollars to deploy. You must cover: what the business does, who it is for, and why now is the right time. The elevator doors open at 30 seconds.',
  'A great elevator pitch answers three questions and nothing else: What is it? Who is it for? Why now? Anything beyond that is noise in 30 seconds. Record yourself and verify: are all three answered clearly? Does the investor know what to do next? Brevity is a signal of clarity — if you need 60 seconds, you do not know your business yet.',
  'Message compression, pitch structure, and vocal authority',
  30, 60
),


-- ── STORYTELLING (3) ───────────────────────────────────────

(
  'Tell Me About Your Biggest Failure',
  'storytelling', 3,
  'Your failure story, uncut. The emotional detail is the entire point — do not rush to the lesson.',
  'In 90 seconds, tell the story of your biggest professional or personal failure. Do not skip to the lesson. You must spend at least 40 seconds on what actually happened and what it felt like in the body. The lesson, if you include one, should be the last 15 seconds — not the first 15.',
  'The failure must be real. Audiences can detect fabricated vulnerability immediately. Record yourself and ask: did you rush to the redemption? Did you let the listener feel the failure before explaining it? The weight of the story lives in the middle — not the end. Your willingness to stay in the uncomfortable detail is what makes it credible.',
  'Authentic vulnerability, narrative pacing, and earned insight delivery',
  25, 70
),

(
  'The Moment Everything Changed',
  'storytelling', 3,
  'Ground-level storytelling from a single turning-point moment. Present tense. Specific place and time. Before and after must be felt.',
  'In 90 seconds, describe the single moment in your life when you knew things would never be the same. It can be positive or negative. Tell us: exactly where you were when it happened, what occurred in that specific moment — not the context around it — and who you became because of it.',
  'Ground the story in one specific place and time. Use present tense for the moment itself — "I am standing in the kitchen and the phone rings" creates immediacy that past tense cannot. The listener must feel two distinct emotional realities: who you were before the moment and who you are after. If the before and after blur together, you have not found the real moment yet.',
  'Scene specificity, present-tense immediacy, and narrative turning-point craft',
  25, 80
),

(
  'Why I Do What I Do',
  'storytelling', 4,
  'Simon Sinek''s most dangerous question. Not what, not how — why. Most people have never answered it out loud.',
  'In 60 seconds, answer this question: why do you do what you do? Not what you do. Not how you do it. Why — the belief, cause, or purpose that drives the work. The answer must go deeper than "to help people" or "to make money." What specifically do you believe about the world that makes this work necessary?',
  'Vague purpose statements ("I want to make a difference") are the enemy of this drill. Specific beats general every time. Record your answer and evaluate with a critical ear: did you actually answer the question, or did you drift into describing what you do instead of why? A genuine why usually contains a belief about how the world should be different.',
  'Purpose articulation, self-knowledge under pressure, and specific belief communication',
  30, 90
),


-- ── PACING DRILLS (3) ──────────────────────────────────────

(
  'Gettysburg at 140 WPM',
  'pacing', 4,
  'Lincoln''s address at a controlled 140 WPM. This excerpt is ~100 words. Target finish: 43 seconds.',
  'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.',
  'Target pace: 140 WPM. This excerpt is approximately 100 words — your target finish time is 43 seconds. Set a visible timer before you start. Read once naturally to absorb the material, then record your timed run. Lincoln''s prose rewards deliberate pacing — every clause has weight. If you finish before 38 seconds, you are rushing the words. If you pass 50 seconds, you are dragging.',
  'Precise pace control and maintaining gravitas at target WPM',
  30, 100
),

(
  '120 WPM Control Drill',
  'pacing', 3,
  'Read a paragraph at exactly 120 WPM — the pace of clear, authoritative speech. Passage is ~83 words. Target: 41 seconds.',
  'Success is not a destination, it is a discipline. Every morning, millions of people wake up with the intention to change their lives. They have the desire, they have the dream, and yet something stops them. That something is not a lack of talent. It is not a lack of time. It is not even a lack of opportunity. What stops most people is the gap between knowing what to do and actually doing it — a gap that only daily practice can close.',
  'Target pace: 120 WPM. This passage is 83 words — your target finish time is 41 seconds. Set a stopwatch. Read once naturally, note your time, then adjust on the second read. Slow is harder than fast: slowing down without sounding ponderous is a skill most speakers never develop. At 120 WPM, every word has room to land.',
  'Precise pace calibration and controlled deliberate delivery',
  25, 110
),

(
  'Speed Ramp',
  'pacing', 3,
  'Read a passage at natural pace, then re-read it 20% faster. Compare what you gained and lost. Both recordings matter.',
  'The greatest speakers in history did not speak fast. They spoke with intention. Every word they chose was selected because it earned its place in the sentence. They understood that silence is not the absence of content — it is the delivery vehicle for the content that just landed. When you learn to control your pace, you stop filling air and start shaping moments. That is the difference between talking and speaking.',
  'Record the passage once at your natural pace. Note your finish time. Now record it again targeting 20 percent faster — if your natural read was 30 seconds, target 24. Listen back to both recordings with honest ears. What did you sacrifice for speed? Which words lost their weight? The goal is not to pick one — it is to learn the cost of each choice.',
  'Tempo flexibility and conscious awareness of pace-versus-impact trade-offs',
  25, 120
),


-- ── VOCABULARY (3) ─────────────────────────────────────────

(
  '5 Power Words Argument',
  'vocabulary', 3,
  'Five assigned words. One coherent 30-second argument. All five must land naturally — forced usage is a fail.',
  'Build a coherent 30-second argument or opinion using all five of the following words naturally within your speech. The words are: relentless, ordinary, threshold, compound, silence. Your argument can be about anything — success, leadership, relationships, fitness — as long as it is a real argument, not a list of sentences containing the words.',
  'All five words must appear naturally and add meaning to your argument — if any word feels forced or tacked on, the drill failed. The argument must make logical sense and last a full 30 seconds. Record and verify: Do all five appear? Does the argument hold together? Does it end with a clear position or conclusion?',
  'Vocabulary integration, argument construction, and word deployment under constraint',
  25, 130
),

(
  'Zero Filler Words — 60 Seconds',
  'vocabulary', 4,
  'Speak for 60 seconds on a single topic. Eight words are banned. Replace every filler urge with a clean pause.',
  'Speak for 60 seconds on this question: What makes someone genuinely trustworthy? Banned words and phrases: um, uh, like (when used as a filler), you know, basically, literally (when used for emphasis), sort of, kind of. If you reach for a banned word, stop, pause for one second, then continue. The pause is always better.',
  'Record yourself, then play it back and count every single filler — including ones you barely noticed yourself making. This is the moment most people discover their signature filler word. A well-placed one-second pause carries zero cost and significant authority. A filler costs you credibility on every repetition. Target: zero fillers. Expect failure on the first take. That is the point.',
  'Filler word elimination and authority-building pause substitution',
  35, 140
),

(
  'Zero I Statements — 45 Seconds',
  'vocabulary', 5,
  'Speak passionately about something for 45 seconds. The word "I" is completely banned. This is harder than it sounds and more powerful than you expect.',
  'Speak for 45 seconds about something you believe strongly — a principle, a practice, a conviction. The only rule: the word "I" is banned entirely. Restructure every sentence to remove the first-person singular. Not "I believe" but "The evidence suggests." Not "I think success requires" but "Success requires." Not "In my experience" but "In practice."',
  'Record and verify: does the word "I" appear even once? Notice what removing it forces you to do — your language becomes more universal, your claims become more objective, and paradoxically your argument often becomes more persuasive. Most speakers drastically overuse first-person singular. This drill makes visible a habit that was invisible.',
  'Self-referential language reduction and universal argument framing',
  40, 150
);


-- ============================================================
-- 4. BADGES (8)
-- icon_name values are Lucide React component names.
-- ============================================================

INSERT INTO public.badges
  (name, description, icon_name, requirement_type, requirement_value, sort_order)
VALUES

(
  'First Words',
  'You recorded your first session. That first take is the hardest one you will ever do — it only gets better from here.',
  'Zap',
  'total_recordings', 1, 10
),
(
  '3-Day Fire',
  'Three days in a row. The neural pathways are forming and the habit is beginning to take root.',
  'Flame',
  'streak', 3, 20
),
(
  'Week Warrior',
  'Seven consecutive days of practice. You are not dabbling anymore — you are building something that compounds.',
  'Flame',
  'streak', 7, 30
),
(
  'Flawless',
  'You scored 90 or above on a single session. Your delivery touched elite territory — now go live there.',
  'Star',
  'score_threshold', 90, 40
),
(
  'Drill Sergeant',
  'Ten drills completed. You understand that elite speaking is built in the practice room, not on stage.',
  'Target',
  'drills_completed', 10, 50
),
(
  'Speaker Student',
  'You have trained against five different speakers. The world''s greatest communicators are now your faculty.',
  'Users',
  'speakers_compared', 5, 60
),
(
  'Month of Mastery',
  'Thirty consecutive days. You have crossed the line from resolution to identity — you are a speaker who practices.',
  'Crown',
  'streak', 30, 70
),
(
  'Level 10',
  'You reached Level 10. Only a small fraction of people who start this journey ever arrive here.',
  'Trophy',
  'level_reached', 10, 80
);


-- ============================================================
-- 5. RANDOM TOPICS (30)
-- Punchy prompts for the "Random Topic" recording feature.
-- Mix: motivational · philosophical · personal · business
-- ============================================================

INSERT INTO public.random_topics (topic) VALUES

-- Motivational
('Why discipline beats motivation every single time'),
('The moment I stopped waiting to feel ready'),
('What most people get wrong about confidence'),
('Why being uncomfortable is the most productive place to be'),
('The habit that changed everything for me'),
('Why consistency is wildly underrated and talent is wildly overrated'),

-- Philosophical
('What money can buy and what it absolutely cannot'),
('The role of luck in success — an honest accounting'),
('What I believe that almost nobody around me agrees with'),
('Why the long game always defeats the short game'),
('What makes a life genuinely well lived'),
('The thing I used to fear that no longer has power over me'),

-- Personal
('The hardest conversation I ever had — and what I learned'),
('The moment I realized I was the problem'),
('What failure taught me that success never could'),
('The person who shaped how I see the world'),
('What I would tell my 20-year-old self with no softening'),
('The decision that divided my life into before and after'),
('Why I changed my mind about something I held for years'),
('The moment I stopped caring what other people thought'),

-- Business / Leadership
('What leadership actually looks like in practice, not theory'),
('Why the people around you are the ceiling you cannot see'),
('The difference between being busy and being productive'),
('Why saying no is the highest-leverage skill you can build'),
('What most people misunderstand about building trust'),
('Why ego is both your greatest engine and your greatest threat'),
('What I wish I had started ten years earlier'),
('Why most advice is wrong for your specific situation'),
('The thing nobody tells you about starting something from zero'),
('Why self-awareness is the rarest and most valuable skill in any room');
