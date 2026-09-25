/* Original StudyMates characters. Add new buddies here — the engine, UI and
   settings all read from this registry, so no other file must change. */
export const CHARACTERS = {
  milo: {
    id: "milo",
    name: "Milo",
    tag: "calm · loves tea",
    desc: "A cozy, slightly sleepy buddy. Milo studies in quiet bursts, gets distracted by the window, and believes every problem is easier with tea.",
    traits: ["calm", "tea lover", "daydreamer", "gentle"],
    drink: "tea",
    concept: "assets/concept-milo.png",
    weights: { write: 5, read: 4, type: 2, think: 3, drink: 4, look: 3.5, window: 3, stretch: 2.5, yawn: 2, music: 1.5, exercise: 0.6, plant: 2, phone: 1, nap: 2.5 },
    bubbles: {
      greet: ["Let's study together.", "Ready when you are.", "Notebooks out…"],
      study: ["This chapter is interesting.", "Hmm, let me re-read that.", "Slow and steady.", "Tea would be nice right now…", "Almost got it."],
      drink: ["Tea break. Just a sip.", "Ahh. Much better."],
      break: ["Stretching is important.", "I'll just look outside a moment.", "Be right back!"],
      complete: ["We did it! Small stretch time.", "Timer's done. Nice work, you."],
      goal: ["You hit your goal! Proud of you.", "Goal complete! *quiet cheer*"],
      boop: ["Oh! Hi!", "Hehe. Back to studying.", "You got this."],
      washroom: ["Be right back!", "Nature calls…"],
    },
  },
  momo: {
    id: "momo",
    name: "Momo",
    tag: "energetic · loves music",
    desc: "A bouncy, cheerful buddy. Momo speed-reads, stretches like it's a sport, hydrates constantly, and studies best with a beat.",
    traits: ["energetic", "cheerful", "stretchy", "music fan"],
    drink: "water",
    concept: "assets/concept-momo.png",
    weights: { write: 3.5, read: 3, type: 4, think: 2, drink: 5, look: 3, window: 2, stretch: 5, yawn: 1, music: 4.5, exercise: 4, plant: 2, phone: 2, nap: 0.8 },
    bubbles: {
      greet: ["Let's GOOO!", "Study party! You're invited!", "I stretched already. Ready!"],
      study: ["This is actually fun!", "Speed-round: this page!", "Hydration check!", "Love this song… I mean, chapter!", "We are CRUSHING it."],
      drink: ["Water break! Glug glug.", "Stay hydrated, bestie!"],
      break: ["Dance-stretch time!", "Jumping jacks, let's go!", "Ooh, what's outside?!"],
      complete: ["DONE! You were amazing!", "Timer's up! Victory stretch!"],
      goal: ["GOAL SMASHED! So proud!!", "You did it!! *happy dance*"],
      boop: ["Hiii!!", "Hehe! That tickles!", "Best study partner ever. (You.)"],
      washroom: ["Quick break, back in a flash!", "BRB!"],
    },
  },
};

export const charIds = () => Object.keys(CHARACTERS);
export const getChar = (id) => CHARACTERS[id] || CHARACTERS.milo;

export function applyCharacter(id) {
  const c = getChar(id);
  document.body.dataset.char = c.id;
  const name = document.querySelector("#buddyName");
  const tag = document.querySelector("#buddyTag");
  if (name) name.textContent = c.name;
  if (tag) tag.textContent = c.tag;
  document.querySelectorAll("#charCards .char-card").forEach((el) => {
    el.classList.toggle("sel", el.dataset.char === c.id);
    const b = el.querySelector("button");
    if (b) { b.textContent = el.dataset.char === c.id ? "Studying with you ✓" : `Study with ${CHARACTERS[el.dataset.char].name}`; b.disabled = el.dataset.char === c.id; }
  });
  const sel = document.querySelector("#setChar");
  if (sel) sel.value = c.id;
}
