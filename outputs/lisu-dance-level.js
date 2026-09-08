// 《笙起斑鸠舞》配置文件
// 当前节拍点和动作时间点为占位演示数据，待用户提供正式音乐后重新人工标注。
// 本配置只提供教学化互动流程，不声称自动识别或还原真实斑鸠吃水舞音乐与舞步。
window.banjiuDanceLevel = {
  id: "lisu-banjiu-dance",
  title: "笙起斑鸠舞",
  danceName: "斑鸠吃水舞",
  subtitle: "听葫芦笙、找准节拍，和大家一起体验斑鸠吃水舞！",
  simplifyNotice: "以下动作为根据斑鸠吃水舞文化形象设计的简化互动动作，用于帮助学生感受音乐、动作和队形之间的关系。",
  formationNotice: "当前队形为教学化互动设计，正式舞蹈队形待根据真实资料补充。",
  culture: {
    image: "assets/images/lisu/culture/banjiu-drinking-dance.png",
    introTitle: "新山傈僳族斑鸠吃水舞",
    introLead: "斑鸠吃水舞又名“赶斑鸠”，是四川攀枝花米易县新山傈僳族乡极具代表性的传统舞蹈。舞蹈从山林斑鸠成群到溪边饮水、嬉戏的景象中获得灵感，表现族人热爱自然、团结协作和向往幸福生活的情感。",
    heritage: "2011年，斑鸠吃水舞被列入四川省省级非物质文化遗产保护名录（编号Ⅲ-4）。",
    highlights: [
      { title: "自然灵感", text: "模仿斑鸠飞翔、饮水、嬉戏等形象，体现人与自然和谐共生。" },
      { title: "葫芦笙领舞", text: "舞蹈常由葫芦笙手领舞，大家跟随曲调和节拍变换动作。" },
      { title: "队形变化", text: "舞者会随着音乐靠拢、转向或围成集体队形，表现群鸟同行的灵动。" },
      { title: "文化寓意", text: "舞蹈寄托了自由、美好、团结和乐观生活的愿望。" }
    ],
    keywords: ["葫芦笙", "斑鸠饮水", "集体队形", "省级非遗"],
    roundTips: {
      beat: "文化小提示：先听葫芦笙的稳定节拍，就像观察斑鸠来到溪边前的轻快脚步。",
      action: "文化小提示：跟步、饮水、展翅是教学化简化动作，帮助我们感受斑鸠饮水嬉戏的形象。",
      formation: "文化小提示：队形变化表现的是集体协作，本游戏里的队形为课堂互动设计。"
    }
  },

  musicTitle: "《斑鸠吃水》",
  mainAudio: "assets/audio/lisu/banjiu-chishui.m4a",
  practiceAudio: "assets/audio/lisu/banjiu-chishui.m4a",
  instrumentPreview: "assets/audio/lisu/banjiu-chishui.m4a",
  tapFeedback: "assets/audio/lisu/tap-feedback.mp3",
  fullVideo: "assets/video/lisu/banjiu-dance-full.mp4",

  assets: {
    background: "assets/images/lisu/background/lisu-village-stream.png",
    hulusheng: "assets/images/lisu/instruments/hulusheng.png",
    badge: "assets/images/lisu/badges/hulusheng-dance-badge.png",
    actionIcons: {
      step: "assets/images/lisu/ui/step-icon.png",
      drink: "assets/images/lisu/ui/drink-icon.png",
      wing: "assets/images/lisu/ui/wing-icon.png",
      turn: "assets/images/lisu/ui/turn-icon.png"
    },
    leader: {
      sheet: "assets/characters/lisu-dance/leader/hulusheng-sheet-cutout.png",
      frames: {
        playing: "assets/characters/lisu-dance/leader/frames/leader-1.png",
        idle: "assets/characters/lisu-dance/leader/frames/leader-2.png",
        drink: "assets/characters/lisu-dance/leader/frames/leader-3.png",
        wing: "assets/characters/lisu-dance/leader/frames/leader-4.png",
        stepLeft: "assets/characters/lisu-dance/leader/frames/leader-2.png",
        stepRight: "assets/characters/lisu-dance/leader/frames/leader-2.png",
        turn: "assets/characters/lisu-dance/leader/frames/leader-2.png",
        celebrate: "assets/characters/lisu-dance/leader/frames/leader-4.png"
      },
      idle: "assets/characters/lisu-dance/leader/idle.webp",
      playing: "assets/characters/lisu-dance/leader/playing.webp",
      stepLeft: "assets/characters/lisu-dance/leader/step-left.webp",
      stepRight: "assets/characters/lisu-dance/leader/step-right.webp",
      turn: "assets/characters/lisu-dance/leader/turn.webp",
      celebrate: "assets/characters/lisu-dance/leader/celebrate.webp"
    },
    dancer: {
      sheet: "assets/characters/lisu-dance/dancers/dance-sheet-cutout.png",
      frames: [
        "assets/characters/lisu-dance/dancers/frames/dancer-1.png",
        "assets/characters/lisu-dance/dancers/frames/dancer-2.png",
        "assets/characters/lisu-dance/dancers/frames/dancer-3.png",
        "assets/characters/lisu-dance/dancers/frames/dancer-4.png",
        "assets/characters/lisu-dance/dancers/frames/dancer-5.png",
        "assets/characters/lisu-dance/dancers/frames/dancer-6.png"
      ],
      actionFrames: {
        idle: [0, 1, 2, 3, 4, 5],
        step: [0, 1, 3, 4],
        stepLeft: [0, 3],
        stepRight: [1, 4],
        drink: [2],
        wing: [3, 5],
        turn: [4],
        celebrate: [5]
      },
      idle: "assets/characters/lisu-dance/dancers/idle.webp",
      stepLeft: "assets/characters/lisu-dance/dancers/step-left.webp",
      stepRight: "assets/characters/lisu-dance/dancers/step-right.webp",
      drink: "assets/characters/lisu-dance/dancers/drink.webp",
      wing: "assets/characters/lisu-dance/dancers/wing.webp",
      turn: "assets/characters/lisu-dance/dancers/turn.webp",
      celebrate: "assets/characters/lisu-dance/dancers/celebrate.webp"
    }
  },

  bpm: 80,
  timeSignature: "4/4",
  startTime: 0,
  endTime: 43,
  note: "作者实拍强弱拍",
  targetTimes: [
    1.892, 2.188, 2.536, 3.02, 3.51, 4.023, 4.548, 5.079,
    5.661, 6.164, 6.684, 7.198, 7.707, 8.241, 8.716, 9.241,
    9.795, 10.284, 10.813, 11.312, 11.841, 12.306, 12.858, 13.365,
    13.869, 14.366, 14.818, 15.332, 15.837, 16.372, 16.897, 17.387,
    17.832, 18.336, 18.884, 19.389, 19.902, 20.429, 20.946, 21.435,
    21.965, 22.458, 22.945, 23.452, 23.972, 24.439, 24.931, 25.466,
    25.958, 26.491, 27.008, 27.492, 27.993, 28.492, 29.014, 29.53,
    30.048, 30.563, 31.067, 31.572, 32.094, 32.609, 33.14, 33.618,
    34.147, 34.563, 35.093, 35.642, 36.136, 36.649, 37.167, 37.626,
    38.141, 38.672, 39.192, 39.68, 40.162, 40.698, 41.222, 41.651,
    42.198, 42.692
  ],
  beatStrengths: [
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak", "strong", "weak", "strong", "weak", "strong", "weak",
    "strong", "weak"
  ],
  beatLabels: [
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱", "强", "弱", "强", "弱", "强", "弱",
    "强", "弱"
  ],
  beatTimes: [
    1.892, 2.188, 2.536, 3.02, 3.51, 4.023, 4.548, 5.079,
    5.661, 6.164, 6.684, 7.198, 7.707, 8.241, 8.716, 9.241,
    9.795, 10.284, 10.813, 11.312, 11.841, 12.306, 12.858, 13.365,
    13.869, 14.366, 14.818, 15.332, 15.837, 16.372, 16.897, 17.387,
    17.832, 18.336, 18.884, 19.389, 19.902, 20.429, 20.946, 21.435,
    21.965, 22.458, 22.945, 23.452, 23.972, 24.439, 24.931, 25.466,
    25.958, 26.491, 27.008, 27.492, 27.993, 28.492, 29.014, 29.53,
    30.048, 30.563, 31.067, 31.572, 32.094, 32.609, 33.14, 33.618,
    34.147, 34.563, 35.093, 35.642, 36.136, 36.649, 37.167, 37.626,
    38.141, 38.672, 39.192, 39.68, 40.162, 40.698, 41.222, 41.651,
    42.198, 42.692
  ],
  tolerance: { perfect: 260, good: 420, acceptable: 620 },
  joinEveryHits: 2,

  actionLabels: {
    stepLeft: "跟步",
    stepRight: "跟步",
    step: "跟步",
    drink: "饮水",
    wing: "展翅",
    turn: "转向"
  },
  actionSequence: ["step", "step", "drink", "wing"],
  actionRounds: [
    { name: "第一遍：看完整顺序", showMode: "full" },
    { name: "第二遍：只看下一步", showMode: "next" },
    { name: "第三遍：听音乐和记忆", showMode: "minimal" }
  ],
  actionEvents: [
    { time: 3.0, action: "stepLeft" },
    { time: 3.75, action: "stepRight" },
    { time: 4.5, action: "drink" },
    { time: 5.25, action: "wing" }
  ],

  phraseSequence: ["step", "step", "drink", "wing", "turn"],
  formationStages: ["scattered", "gather", "turnToStream", "semicircle"],
  formations: {
    scattered: [
      { x: 12, y: 63, direction: "front" },
      { x: 26, y: 48, direction: "front" },
      { x: 37, y: 72, direction: "front" },
      { x: 63, y: 72, direction: "front" },
      { x: 74, y: 48, direction: "front" },
      { x: 88, y: 63, direction: "front" }
    ],
    gather: [
      { x: 18, y: 66, direction: "front" },
      { x: 31, y: 50, direction: "front" },
      { x: 40, y: 73, direction: "front" },
      { x: 60, y: 73, direction: "front" },
      { x: 69, y: 50, direction: "front" },
      { x: 82, y: 66, direction: "front" }
    ],
    turnToStream: [
      { x: 18, y: 67, direction: "right" },
      { x: 31, y: 51, direction: "right" },
      { x: 40, y: 74, direction: "right" },
      { x: 60, y: 74, direction: "left" },
      { x: 69, y: 51, direction: "left" },
      { x: 82, y: 67, direction: "left" }
    ],
    semicircle: [
      { x: 16, y: 70, direction: "front" },
      { x: 29, y: 54, direction: "front" },
      { x: 42, y: 35, direction: "front" },
      { x: 58, y: 35, direction: "front" },
      { x: 71, y: 54, direction: "front" },
      { x: 84, y: 70, direction: "front" }
    ]
  }
};
