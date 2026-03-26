const coinBtn = document.getElementById("coinBtn");
const bulb = document.getElementById("bulb");
const status = document.getElementById("status");
const panel = document.getElementById("panel");
const inside = document.getElementById("inside");
const log = document.getElementById("log");
const character = document.getElementById("character");
const coinHit = document.getElementById("coinHit");
const speakerHit = document.getElementById("speakerHit");
const panelHit = document.getElementById("panelHit");
const testSearchBtn = document.getElementById("testSearchBtn");
const searchInput = document.getElementById("searchInput");
const talkBtn = document.getElementById("talkBtn");
const coinSound = new Audio("coin.mp3");
const panelSound = new Audio("kerchunk.mp3");
const startupVoice = new Audio("startup.mp3");
const speakVoice = new Audio("speak.mp3");
const thinkingVoice = { play: () => {} };
const holdonVoice = { play: () => {} };
const holdonTwoVoice = { play: () => {} };
const letsseeVoice = { play: () => {} };
const notsureVoice = new Audio("notsure.mp3");
let started = false;
let opened = false;
let hasUsedTalk = false;
let isBusy = false;

/* ENTER KEY SUPPORT */
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    testSearchBtn.click();
  }
});
coinHit.onclick = () => {
  coinBtn.click();
};
panelHit.onclick = () => {
  panel.click();
};

/* COIN INSERT */
coinBtn.onclick = () => {
  if (started) return;

 started = true;
document.querySelector(".light").classList.add("on");
document.querySelector(".window").classList.add("lit");
coinSound.play();
  status.innerText = "...";

  flickerBulb();

  setTimeout(() => {
  document.querySelector(".head").classList.add("wake");
}, 180);

  setTimeout(() => {
    startupVoice.play();
    status.innerText = "Well, howdy partner...";
  }, 500);

  setTimeout(() => {
   const head = document.querySelector(".head");
head.classList.remove("wake");
head.classList.add("settle");
    speakVoice.play();
    status.innerText = "Go on now, speak your mind.";
  }, 2200);
};

/* PANEL OPEN */
panel.onclick = () => {
  if (opened) return;

  opened = true;

  panelSound.currentTime = 0;
  panelSound.play();

  setTimeout(() => {
    document.querySelector(".door").style.display = "none";
  }, 600);
};

/* BULB FLICKER */
function flickerBulb() {
  let count = 0;

  const flicker = setInterval(() => {
    bulb.classList.toggle("on");
    count++;

    if (count > 5) {
      clearInterval(flicker);
      bulb.classList.add("on");
    }
  }, 120);
}

/* FAKE BOOT SEQUENCE */
function simulateSearch() {
  const lines = [
    'QUERY: "what\'s happening today"',
    "SOURCE: news",
    "CONNECTING...",
    "FETCHING DATA...",
    "PARSING RESULTS...",
    "READY"
  ];

  log.innerText = "";

  let i = 0;

  setTimeout(() => {
    const interval = setInterval(() => {
      log.innerText += lines[i] + "\n";
      i++;

      if (i >= lines.length) {
        clearInterval(interval);
      }
    }, 650);
  }, 400);
}

async function askMachine(queryOverride) {
  if (!started) {
    status.innerText = "Insert coin first.";
    return;
  }

  if (isBusy) {
    return;
  }

  isBusy = true;
document.getElementById("thinkingLight").classList.add("on");
  const query = queryOverride || searchInput.value.trim() || "latest news about AI";

  inside.classList.add("open");
  status.innerText = "Thinking...";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (!response.ok) {
      log.innerText = JSON.stringify(data, null, 2);
      return;
    }

    renderSearchResults(data.search);
    status.innerText = data.answer;
console.log("audio payload preview", data.audio?.slice(0, 40));
    if (data.audio) {
  const audioSrc = data.audio.startsWith("data:audio")
    ? data.audio
    : "data:audio/mpeg;base64," + data.audio;

  const audio = new Audio(audioSrc);

  audio.play().catch((err) => {
    console.error("answer audio failed", err, audioSrc.slice(0, 80));
  });
}

  } catch (error) {
    log.innerText += "ERROR: request failed\n";
    console.error(error);
  } finally {
  document.getElementById("thinkingLight").classList.remove("on");
  isBusy = false;
}
}
testSearchBtn.onclick = () => {
  askMachine();
};
 

/* FORMAT RESULTS */
function renderSearchResults(data) {
  log.innerText = "";

  const webResults = data?.data?.web || [];
  const newsResults = data?.data?.news || [];

  const lines = [];

  if (newsResults.length) {
    lines.push("NEWS:");
    newsResults.slice(0, 2).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
    lines.push("");
  }

  if (webResults.length) {
    lines.push("WEB:");
    webResults.slice(0, 2).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
  }

  if (!lines.length) {
    lines.push("NO RESULTS FOUND");
  }

  log.innerText = lines.join("\n");

  const query = searchInput.value.trim() || "latest news about AI";

}

/* SHORT CHARACTER RESPONSE */
function generateResponse(query, news, web) {
  const q = query.toLowerCase().trim();
  let response = "Hmm... I’m still sorting through that.";

  // WHERE questions
  if (q.startsWith("where is ")) {
    if (web.length > 0) {
      const title = web[0].title;

      if (title.toLowerCase().includes("wikipedia")) {
        const placeName = title.split(" - ")[0];
        response = `From what I can tell... ${placeName} is a place worth looking into.`;
      } else {
        response = `From what I can tell... ${title}.`;
      }
    } else {
      response = "Hmm... I couldn't pin that place down just yet.";
    }
  }

  // WHO questions
  else if (q.startsWith("who is ") || q.startsWith("who was ")) {
    if (web.length > 0) {
      response = `From what I can tell... ${web[0].title}.`;
    } else {
      response = "Hmm... I couldn't find much on that person.";
    }
  }

  // WHAT / GENERAL QUESTIONS
  else if (q.startsWith("what is ") || q.startsWith("what are ")) {
    if (web.length > 0) {
      response = `From what I can tell... ${web[0].title}.`;
    } else {
      response = "Hmm... I couldn't make much sense of that one.";
    }
  }

  // CURRENT EVENTS / NEWS
  else if (
    q.includes("news") ||
    q.includes("today") ||
    q.includes("latest") ||
    q.includes("current") ||
    q.includes("what's happening")
  ) {
    if (news.length > 0) {
      response = `Well now... looks like ${news[0].title}.`;
    } else if (web.length > 0) {
      response = `From what I can tell... ${web[0].title}.`;
    }
  }

  // DEFAULT
  else {
    if (web.length > 0) {
      response = `From what I can tell... ${web[0].title}.`;
    } else if (news.length > 0) {
      response = `Well now... looks like ${news[0].title}.`;
    } else {
      response = "Hmm... I ain't too sure about that one.";
    }
  }

  setTimeout(() => {
    status.innerText = response;
  }, 1200);
}
function startTalking() {
  if (!started) {
    console.log("startTalking ran", { started, isBusy });
    status.innerText = "Insert coin first.";
    return;
  }

  if (isBusy) {
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  status.innerText = "Listening...";

  if (!hasUsedTalk) {
    thinkingVoice.play();
    hasUsedTalk = true;
  }
console.log("about to start recognition");
  recognition.start();

  recognition.onresult = (event) => {
    console.log("speech result received");
    const transcript = event.results[0][0].transcript;

    searchInput.value = transcript;
    status.innerText = "Heard: " + transcript;

    askMachine(transcript);
  };

  recognition.onerror = (event) => {
  console.log("speech error", event);
  status.innerText = "Didn't catch that.";
};
}

speakerHit.onclick = () => {
  console.log("speaker clicked");
  startTalking();
};


talkBtn.onclick = () => {
  startTalking();
};