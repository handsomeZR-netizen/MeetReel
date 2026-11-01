// 主案例“小米汽车安全专场直播”的英文版：转写、条目、章节、编辑官的逐人简报。
// 原始数据在 data/cases/xiaomi-safety/（中文，后端产出的结构），这里按 id 叠一层英文，只在英文界面用。
// 规则和中文一样：每条条目的 quote 必须是所在发言段英文 text 的子串（溯源靠它算位置）。
// 录像本身是中文原声，英文逐字稿相当于字幕翻译。

import { isEn } from '@/lib/i18n'
import briefsJson from '../../../data/cases/xiaomi-safety/briefs.json'

export const XM_EN = {
  title: 'Xiaomi Auto Safety Livestream · Safety System',
  summary: 'Xiaomi Auto’s first full walkthrough of its safety system: the goal is “the safest car in its class”; the Safety Committee is the top safety decision-making body, every step must pass a safety assessment, and safety has veto power; safety-related teams exceed 3,500 people; Full-Domain Safety covers 4 scenarios and 19 safety domains; 484 offline driving-safety sessions with 10,620 people in 2025; new owners earn 4,000 points for a 90-day check-in streak, and the app safety score is at 2.0. This clip is part one only — electronic safety isn’t in it.',
  chapters: ['Perks & opening', 'Meet the experts', 'Safety above all', 'Two lessons from 22 years', 'Goal · Org · Mechanism', 'Safety Committee', 'Veto power', 'Full-Domain Safety', 'Safety prevention team'],
  segments: {
    x01: 'Delivery perks — and we’re also giving away that dash worth ¥699, that, that smart dual display, yes, the smart dual-screen dash, yes.',
    x02: 'It’s a really great perk. If you’re interested, drop by a store to take a look, or read up online about this car.',
    x03: 'Today’s safety livestream has two parts.',
    x04: 'Part one is Xiaomi Auto’s safety system; part two is about electronic safety.',
    x05: 'First, let me properly introduce our first two experts.',
    x06: 'The first is Hou Jinglei, Vice President of Xiaomi Auto and General Manager of our Safety Department.',
    x07: 'He graduated from the School of Traffic and Transportation at Beijing Jiaotong University, with a master’s in safety technology and engineering.',
    x08: 'He studied transportation, and he has 22 years of experience building and running safety systems in industrial safety — a top expert in the field.',
    x09: 'Ding Zhi also has more than 20 years in the auto industry, has been deeply involved in developing several platform architectures and models, and has very deep experience in vehicle performance, simulation analysis and safety engineering.',
    x10: 'So when it comes to car safety, as I said earlier —',
    x11: 'at Xiaomi Auto’s first launch event, back on December 28, 2023,',
    x12: 'we held our first tech launch, and one whole chapter was about safety. We put forward the design philosophy that safety comes above everything.',
    x13: 'And we put 10x the investment into building a good car — and above all, it has to be a safe, good car.',
    x14: 'We believe users are the starting point of everything, safety is the foundation and precondition of everything, and safety comes above everything.',
    x15: 'OK, first a question for Jinglei — he has a ton of experience in safety. You’ve done safety for over 20 years; what’s your biggest takeaway?',
    x16: 'Right, thank you, Lei Jun — yes, I’ve worked in this field for 22 years.',
    x17: 'For me, the two most important things are: first, safety is a complete system and has to be built systematically.',
    x18: 'Second, we have to commit for the long term and keep raising our safety.',
    x19: 'So safety is very complex, it takes a long time, and you never stop pushing it forward, right?',
    x20: 'Exactly — it has to be a long-term commitment.',
    x21: 'Great, so let’s have Jinglei give everyone the first complete, systematic introduction to Xiaomi’s safety system.',
    x22: 'Of course, this stuff is pretty hardcore.',
    x23: 'When I heard him go through it this afternoon, I found it extremely technical and extremely complex.',
    x24: 'I told him that halfway through, the viewers might all fall asleep.',
    x25: 'So I asked Jinglei to explain our safety system in plain terms.',
    x26: 'Sure. On being systematic — I’ll take this livestream as the chance',
    x27: 'to introduce Xiaomi Auto’s safety system in full for the first time.',
    x28: 'So, what does “systematic” mean?',
    x29: 'There’s actually a fairly long definition, but for safety it comes down to three words: first, goal; second, organization; third, mechanism.',
    x30: 'I’m actually curious — why these three, goal, organization, mechanism? How do they relate?',
    x31: 'Good question. A system is a complete concept: interconnected parts that come together into one organic whole to achieve a specific function.',
    x32: 'So the goal is what function we want to achieve, the organization is who takes on the work, and the mechanism is how those organizations work with each other.',
    x33: 'OK, right — so can you walk us through our goal, organization and mechanism one by one?',
    x34: 'Sure. So what is Xiaomi Auto’s safety goal?',
    x35: 'I think Lei Jun put it well just now: building a safe, good car has always been our original intent.',
    x36: 'Our goal is to build the safest car in its class.',
    x37: 'Talking about organization, the first thing to cover is what our safety decision-making body and decision mechanism look like.',
    x38: 'Let me introduce it: Xiaomi Auto’s Safety Committee is Xiaomi Auto’s highest safety decision-making body.',
    x39: 'As everyone knows, Xiaomi Auto invests enormously in safety.',
    x40: 'Just on headcount — I don’t know if Shuang knows — our safety-related teams actually…',
    x41: 'Over 3,500 people.',
    x42: 'Ah, that’s a really huge team.',
    x43: 'Yes. So how do we coordinate all these teams?',
    x44: 'We use the Xiaomi Auto Safety Committee to coordinate what everyone does and get everyone on the same page.',
    x45: 'The committee covers every department — design, R&D, engineering, manufacturing and so on.',
    x46: 'It’s led by the safety team, to make sure every kind of safety decision puts safety first.',
    x47: 'OK, so the first and most important body we’re talking about is the Xiaomi Auto Safety Committee.',
    x48: 'Right — so how does it work?',
    x49: 'Right, here’s how.',
    x50: 'Every step — design, product, engineering, manufacturing — after the business-side assessment, still has to pass the Xiaomi Auto Safety Committee’s safety assessment.',
    x51: 'If it doesn’t pass, nothing can move forward.',
    x52: 'So can I put it this way: design, product, manufacturing, engineering — every development and design step has to clear a safety gate at the final review.',
    x53: 'Yes.',
    x54: 'And within that, safety has veto power.',
    x55: 'A veto — so everything has to go through it, and on top of that there’s a veto.',
    x56: 'Right, that really is a lot of power.',
    x57: 'A lot of power, but also a lot of responsibility and pressure.',
    x58: 'But that’s exactly what fully reflects',
    x59: 'Xiaomi Auto’s philosophy that safety comes above everything.',
    x60: 'Beyond the safety decision-making body, I’d also like to report that we have three accident-prevention teams.',
    x61: 'That’s because safety is very complex — there’s a lot of solid groundwork that people don’t usually notice.',
    x62: 'First, to raise the vehicle’s product safety, we set up the Full-Domain Safety Department.',
    x63: 'So, product safety.',
    x64: 'Right. We do safety engineering from the whole-vehicle perspective and tighten risk control across product development.',
    x65: 'Ding Zhi heads our Full-Domain Safety Department, so let’s have Ding Zhi introduce full-domain safety.',
    x66: 'Sure. Xiaomi Auto’s full-domain safety work spans four major safety scenarios.',
    x67: 'First, safe driving; second, hazard avoidance; third, protection; fourth, emergency response.',
    x68: 'It also covers 19 safety domains.',
    x69: 'The goal is to cut risk at the source.',
    x70: 'That includes the active and passive safety and battery safety people know well, and goes deep into safety details you don’t see but that matter.',
    x71: 'Two small examples: power seats keep gaining functions — could adjusting the seat pinch someone’s hand?',
    x72: 'In a crash, could ecosystem accessories fly up and cause secondary injuries, and so on.',
    x73: 'What full-domain safety does is identify and avoid risks during development, so that what reaches the user is a safe, good car.',
    x74: 'Right. Besides Full-Domain Safety, we have a second team: our user-facing safety prevention team.',
    x75: 'Now, this department — I wonder if Shuang can tell from the name…',
    x76: 'One’s called Full-Domain Safety, right, and one’s called the safety prevention team.',
    x77: 'Right, I know Ding Zhi’s work — it’s more focused on product development, making sure we build a safe product.',
    x78: 'Right, but the safety prevention team — why don’t you introduce it?',
    x79: 'Well, actually,',
    x80: 'building a safe, good car is our first step in car safety.',
    x81: 'Delivering the car isn’t the end of our safety work — it’s the start of the next phase.',
    x82: 'Making owners feel the car is easy and safe to drive is something we keep working on.',
    x83: 'So simply put: Full-Domain Safety builds the car right, and Safety Prevention helps users use the car well and drive safely.',
    x84: 'So the first is building a safe, good car.',
    x85: 'Right, and the second is about how users use the car — kind of from an operations angle, making the car work better for them.',
    x86: 'Safety in use.',
    x87: 'Right, right. In 2025 this team did quite a lot — three examples. Over the past year we ran offline advanced driving-safety training: 484 offline sessions, with more than 10,000 people attending.',
    x88: 'The exact number is actually 10,620 people.',
    x89: 'Xiaomi Auto should be the first automaker in the industry to complete training at the 10,000-person scale.',
    x90: 'Besides offline courses, last year we also encouraged all new owners to take a 90-day safety challenge — check in 90 days in a row and you get 4,000 points.',
    x91: 'Third, beyond that, with users’ consent, we launched a safety score in the app.',
    x92: 'We’ve now rolled out version 2.0.',
  } as Record<string, string>,
  items: {
    xm_01: { title: 'Delivery perk: a free smart dual-screen dash worth ¥699', detail: 'and nudges viewers to visit a store', quote: 'we’re also giving away that dash worth ¥699' },
    xm_02: { title: 'Two parts: the safety system, then electronic safety', detail: 'The recording ends at 09:49 — part one only; electronic safety isn’t in this clip', quote: 'part two is about electronic safety' },
    xm_03: { title: 'Restates the “safety above everything” design philosophy', detail: 'first introduced at the Dec 28, 2023 tech launch', quote: 'We put forward the design philosophy that safety comes above everything' },
    xm_04: { title: '10x the investment to build a safe, good car', detail: 'a line from the 2023 launch event', quote: 'we put 10x the investment into building a good car' },
    xm_05: { title: 'Three pillars of the safety system: goal, organization, mechanism', detail: 'goal = the function to achieve, organization = who owns the work, mechanism = how teams work together; billed as the first full public introduction', quote: 'three words: first, goal; second, organization; third, mechanism' },
    xm_06: { title: 'Safety goal: build the safest car in its class', quote: 'Our goal is to build the safest car in its class' },
    xm_07: { title: 'The Safety Committee is the top safety decision-making body', detail: 'spans design, R&D, engineering and manufacturing; led by the safety team', quote: 'Xiaomi Auto’s Safety Committee is Xiaomi Auto’s highest safety decision-making body' },
    xm_08: { title: 'Safety-related teams: over 3,500 people', detail: 'Shuang supplied the number; Hou Jinglei answered “yes”', quote: 'Over 3,500 people' },
    xm_09: { title: 'After the business review, every step must also pass a Safety Committee assessment', detail: 'design, product, engineering, manufacturing — nothing moves forward without it', quote: 'still has to pass the Xiaomi Auto Safety Committee’s safety assessment' },
    xm_10: { title: 'Safety has veto power in reviews', detail: 'Hou Jinglei: a lot of power, and a lot of responsibility and pressure', quote: 'safety has veto power' },
    xm_11: { title: 'Three accident-prevention teams — only two covered here', detail: 'covered Full-Domain Safety and the safety prevention team; the third wasn’t introduced', quote: 'we have three accident-prevention teams' },
    xm_12: { title: 'A Full-Domain Safety Dept. for whole-vehicle safety engineering', detail: 'tighter risk control during product development; headed by Ding Zhi', quote: 'we set up the Full-Domain Safety Department' },
    xm_13: { title: 'Full-domain safety: 4 scenarios, 19 safety domains', detail: 'safe driving, hazard avoidance, protection, emergency response; cut risk at the source, incl. active/passive and battery safety', quote: 'It also covers 19 safety domains' },
    xm_14: { title: 'Power seat adjustment pinching hands', detail: 'Ding Zhi’s example of a detail to catch and design out during development', quote: 'could adjusting the seat pinch someone’s hand' },
    xm_15: { title: 'Accessories flying up in a crash and causing secondary injury', detail: 'Ding Zhi’s example of a detail to catch and design out during development', quote: 'fly up and cause secondary injuries' },
    xm_16: { title: 'Delivery isn’t the end of safety work — it’s the start of the next phase', detail: 'Full-Domain Safety builds the car right; Safety Prevention helps users use it well and drive safely', quote: 'Delivering the car isn’t the end of our safety work — it’s the start of the next phase' },
    xm_17: { title: '2025: 484 offline advanced driving-safety sessions, 10,620 people', quote: '484 offline sessions, with more than 10,000 people attending' },
    xm_18: { title: 'Claims to be the first automaker to train 10,000+ people', detail: 'said “should be” and gave no source', quote: 'should be the first automaker in the industry to complete training at the 10,000-person scale' },
    xm_19: { title: 'New owners: 90-day safety check-in, 4,000 points for a full streak', quote: 'check in 90 days in a row and you get 4,000 points' },
    xm_20: { title: 'App safety score is at v2.0 (requires user consent)', quote: 'with users’ consent, we launched a safety score in the app' },
  } as Record<string, { title: string; detail?: string; quote: string }>,
  /** 编排里审核官打回的那句“错误原话” */
  badQuote: 'the safety team has 3,500 people',
}

// ---------- 编辑官的逐人简报 ----------

type Facts = { who?: string; what?: string; when?: string }
type EntryEn = { why: string; forYou: string; facts?: Facts }

const BRIEFS_EN: Record<string, { headline: string; entries: Record<string, EntryEn> }> = {
  hanzong: {
    headline: 'Xiaomi Auto laid out its full safety system for the first time: the goal is “safest in class”, safety has veto power, and safety-related teams exceed 3,500 people.',
    entries: {
      xm_06: { why: 'Manager rule: competitor goals', forYou: 'They set their safety goal as “build the safest car in its class” — a direct comparison against cars at the same price.' },
      xm_10: { why: 'Manager rule: competitor org & mechanisms', forYou: 'Design, product, engineering and manufacturing all pass a safety assessment, and safety has a veto — nothing moves on without it.' },
      xm_07: { why: 'Manager rule: competitor org & mechanisms', forYou: 'Their top safety decision-making body is the Safety Committee, spanning design, R&D, engineering and manufacturing, led by the safety team.' },
      xm_08: { why: 'Manager rule: competitor investment scale', forYou: 'How big their safety-related teams are.', facts: { what: 'Safety-related teams: 3,500+ people' } },
      xm_04: { why: 'Manager rule: competitor investment scale', forYou: 'Restating the 2023 launch line: 10x the investment, and first of all a safe, good car.' },
    },
  },
  songlan: {
    headline: 'They made their safety system public in full for the first time: the committee is the top decision body, every step passes a safety assessment, and safety has veto power; only two of the three accident-prevention teams were covered.',
    entries: {
      xm_07: { why: 'You own the Safety Committee', forYou: 'Their Safety Committee is the top safety decision-making body, spanning design, R&D, engineering and manufacturing and led by the safety team — worth checking item by item against our committee’s scope.' },
      xm_09: { why: 'You own the safety review process', forYou: 'After the business-side review, everything goes through a separate committee safety assessment; fail it and the work can’t move forward.' },
      xm_10: { why: 'You own the safety review process', forYou: 'Safety holds a veto in reviews; Hou Jinglei said it’s a lot of power, with a lot of responsibility and pressure.' },
      xm_05: { why: 'You own the safety system build-out', forYou: 'They break the safety system into three words: the goal is the function to achieve, the organization is who owns it, and the mechanism is how teams work together.' },
      xm_08: { why: 'You follow “Safety org”', forYou: 'Safety-related teams exceed 3,500 people — Shuang supplied the number and Hou Jinglei replied “yes”.', facts: { what: '3,500+ people' } },
      xm_11: { why: 'You follow “Competitor safety system”', forYou: 'Hou Jinglei mentioned three accident-prevention teams; this clip only covers Full-Domain Safety and the safety prevention team — the third comes in a later segment.' },
    },
  },
  weiran: {
    headline: 'Full-Domain Safety covers 4 scenarios and 19 safety domains; the two details they called out were seat adjustment pinching hands and accessories flying up in a crash.',
    entries: {
      xm_14: { why: 'You own seat safety', forYou: 'Ding Zhi’s first example: as power seats gain functions, could adjusting them pinch a hand? They catch and design it out during development.' },
      xm_15: { why: 'You own crash safety', forYou: 'Second example: could ecosystem accessories in the car fly up in a crash and cause secondary injury?' },
      xm_12: { why: 'You own vehicle safety engineering', forYou: 'They set up a dedicated Full-Domain Safety Dept. that does safety engineering from a whole-vehicle view, headed by Ding Zhi.' },
      xm_13: { why: 'You own vehicle safety engineering', forYou: 'It spans safe driving, hazard avoidance, protection and emergency response, aiming to cut risk at the source; active/passive and battery safety are all in scope.', facts: { what: '4 scenarios · 19 safety domains' } },
    },
  },
  chengcheng: {
    headline: 'Two owner-ops moves: a 90-day safety check-in for new owners, worth 4,000 points for a full streak; the app safety score is already at 2.0.',
    entries: {
      xm_19: { why: 'You own the owner points program', forYou: 'They push every new owner to do a 90-day safety-challenge check-in, using points to build lasting safe-driving habits.', facts: { what: '90-day streak → 4,000 points' } },
      xm_20: { why: 'You own the owner app', forYou: 'The app now has a safety score, gated on user consent; it’s on version 2.0.', facts: { what: 'Safety score 2.0', when: 'Live' } },
      xm_16: { why: 'You follow “Safety in use”', forYou: 'They treat delivery as the start of the next phase of safety work; a dedicated safety prevention team owns safety after delivery.' },
    },
  },
  gaoyuan: {
    headline: 'In 2025 they ran 484 offline advanced driving-safety sessions with 10,620 attendees; after delivery, a dedicated safety prevention team takes over.',
    entries: {
      xm_17: { why: 'You own owner driver training', forYou: 'The scale of their offline advanced driving-safety training; Hou Jinglei gave the exact headcount in the next sentence.', facts: { what: '484 sessions · 10,620 people', when: '2025' } },
      xm_16: { why: 'You own the delivery experience', forYou: 'Hou Jinglei said delivery isn’t the end of safety work but the start of the next phase: Full-Domain Safety builds the car right, Safety Prevention helps users use it well.' },
      xm_18: { why: 'You follow “Owner training”', forYou: 'They said they “should be” the first automaker to train 10,000+ people — no source given.' },
      xm_19: { why: 'You follow “Owner incentives”', forYou: 'Beyond offline training, new owners who check in 90 days straight get 4,000 points.' },
    },
  },
  jiangwan: {
    headline: 'Their safety line is “build the safest car in its class”; “first in the industry to train 10,000 people” is an unsourced absolute claim — verify before quoting it.',
    entries: {
      xm_06: { why: 'You own brand positioning', forYou: 'Their public safety goal is “build the safest car in its class” — positioning that compares head-to-head within a price band.' },
      xm_18: { why: 'Brand & marketing rule: unsourced absolute claims', forYou: 'The exact words were “should be the first … in the industry”, with no evidence; if our materials cite or respond to it, verify the source first.' },
      xm_03: { why: 'You follow “Safety philosophy”', forYou: '“Safety above everything” was introduced at the first tech launch on Dec 28, 2023 — this is a restatement, not new messaging.' },
    },
  },
  dengkai: {
    headline: 'Their delivery perks now include a free smart dual-screen dash worth ¥699, and they’re steering viewers to stores; store customers may ask about “safest in class” and the “safety veto”.',
    entries: {
      xm_01: { why: 'You own the perk comparison', forYou: 'A delivery perk from the stream’s opening, with a push to visit a store or look online — worth adding to the perk comparison sheet.', facts: { what: 'Smart dual-screen dash (¥699 value)' } },
      xm_06: { why: 'You follow “Competitor selling points”', forYou: 'They say they’ll “build the safest car in its class” — customers may use that line to compare.' },
      xm_10: { why: 'You follow “Competitor selling points”', forYou: 'They say safety holds a veto at every development step — worth preparing our own line on safety reviews.' },
    },
  },
}

const QUIET_EN: Record<string, string> = {
  xunuo: 'This part of the stream only covers the safety system; the “Electronic safety” you follow is in part two, which isn’t in this recording. Nothing must-read, so no ping — we’ll send it once part two comes in.',
}

const HOST_EN = 'Publisher version: 20 items sent to 7 people; Xu Nuo has nothing must-read and wasn’t pinged; 2 gaps not covered in this clip (electronic safety, the third accident-prevention team) and 1 absolute claim to verify.'

type BriefJson = {
  briefs: { person: string; headline: string; entries: { item: string; why: string; forYou: string; facts?: Facts }[] }[]
  quiet: { person: string; headline: string }[]
  hostBrief: { person: string; headline: string }
}

/** 编辑官产出的简报（briefs.json），英文界面换成英文版 */
export const XM_BRIEFS: typeof briefsJson = (() => {
  if (!isEn) return briefsJson
  const bj = structuredClone(briefsJson) as unknown as BriefJson
  for (const b of bj.briefs) {
    const en = BRIEFS_EN[b.person]
    if (!en) continue
    b.headline = en.headline
    for (const e of b.entries) {
      const x = en.entries[e.item]
      if (!x) continue
      e.why = x.why
      e.forYou = x.forYou
      if (x.facts) e.facts = x.facts
    }
  }
  for (const q of bj.quiet) q.headline = QUIET_EN[q.person] ?? q.headline
  bj.hostBrief.headline = HOST_EN
  return bj as unknown as typeof briefsJson
})()
