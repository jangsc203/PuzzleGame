// 소코반 방식 레벨 정의 데이터베이스
// 타일 설명:
// 'W': 벽 (Wall)
// '.': 일반 바닥 (Floor)
// 'I': 얼음 바닥 (Ice)
// 'H': 구멍 (Hole - 상자를 빠뜨려서 메울 수 있음)
// 'S': 일시적 스위치 (Momentary Switch - 밟고 있어야 연결된 문이 열림)
// 'K': 영구적 스위치 (Sticky Switch - 한번 밟으면 문이 계속 열려있음)
// 'D': 문 (Door - 스위치 활성화 전까지는 지나갈 수 없음)
// 'T': 가시 함정 (Spike Trap - 활성화된 가시를 밟으면 즉시 게임오버)
// '^', '>', 'v', '<': 일방통행 (One-way - 화살표 방향으로만 진입 가능)
// 'C': 깨지는 바닥 내구도 1 (Crumbling 1)
// 'X': 깨지는 바닥 내구도 2 (Crumbling 2)
// 'G': 상자 목표 지점 (Sokoban Goal Zone - 상자를 밀어 넣어야 하는 곳)
// 'P': 텔레포트 포탈 (Teleport Portal - 초록 세모)

const DEFAULT_LEVELS = [
  // ==================== 챕터 0: 기초 훈련 ====================
  {
    name: "1. 기초 상자 밀기",
    description: "상자(📦)를 밀어서 노란색 목표 지점(🌟) 위에 올려놓으세요. 모든 목표 지점에 상자를 놓으면 클리어됩니다.",
    width: 8,
    height: 7,
    maxAP: 40,
    optimalAP: 21,
    chapter: 0,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", "G", ".", ".", ".", ".", "G", "W"],
      ["W", "W", "W", ".", "W", ".", ".", "W"],
      ["W", ".", ".", ".", ".", ".", ".", "W"],
      ["W", ".", "W", ".", "W", "W", ".", "W"],
      ["W", ".", ".", ".", ".", ".", ".", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { type: "player", x: 3, y: 5 },
      { type: "box", x: 3, y: 3 },
      { type: "box", x: 4, y: 3 }
    ],
    connections: []
  },
  {
    name: "2. 정밀한 가시밭 운송",
    description: "한 칸 움직일 때마다 가시(🔺)가 솟아오르고 내려가기를 반복합니다. 돌출된 가시를 밟으면 즉시 게임오버가 되므로 각별히 주의하세요! 상자(📦)를 목표 구역(🌟)에 배달하되, 가시 위에 섰을 때 함정이 들어간(안전한) 상태가 되도록 이동 횟수 타이밍을 조절하세요.",
    width: 9,
    height: 7,
    maxAP: 45,
    optimalAP: 35,
    chapter: 0,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", ".", "G", ".", "T", ".", "G", ".", "W"],
      ["W", ".", "W", ".", "T", ".", "W", ".", "W"],
      ["W", ".", ".", ".", "T", ".", ".", ".", "W"],
      ["W", ".", ".", ".", ".", ".", ".", ".", "W"],
      ["W", ".", ".", ".", ".", ".", ".", ".", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { type: "player", x: 4, y: 5 },
      { type: "box", x: 2, y: 3 },
      { type: "box", x: 6, y: 3 }
    ],
    connections: []
  },
  {
    name: "3. 다중 게이트 협동 제어",
    description: "노란색 버튼(🔑)은 한 번만 밟으면 영구적으로 문이 열리고, 빨간색 버튼(S)은 누르고 있어야 문이 열립니다. 두 스위치를 적절히 제어하여 잠긴 문들을 순차적으로 해제하고 탈출하세요.",
    width: 8,
    height: 7,
    maxAP: 50,
    optimalAP: 35,
    chapter: 0,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", "G", "G", ".", ".", ".", "K", "W"],
      ["W", ".", ".", ".", ".", ".", ".", "W"],
      ["W", "W", "D", "W", "D", "W", "W", "W"],
      ["W", ".", "S", ".", ".", ".", ".", "W"],
      ["W", ".", ".", ".", ".", ".", ".", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { type: "player", x: 1, y: 4 },
      { type: "box", x: 3, y: 4 },
      { type: "box", x: 5, y: 4 }
    ],
    connections: [
      { switch: { x: 6, y: 1 }, door: { x: 2, y: 3 } },
      { switch: { x: 2, y: 4 }, door: { x: 4, y: 3 } }
    ]
  },
  {
    name: "4. 무너지는 발판의 갈림길",
    description: "깨지는 바닥(🧱)은 한 번 지나가면 구멍으로 변합니다. 모든 상자(📦)를 목표 지점(🌟)에 넣기 위해 내구도를 세밀하게 계산하세요.",
    width: 9,
    height: 7,
    maxAP: 45,
    optimalAP: 26,
    chapter: 0,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", ".", ".", ".", ".", ".", "G", ".", "W"],
      ["W", ".", ".", "C", "W", ".", ".", ".", "W"],
      ["W", ".", ".", ".", "W", "G", "C", "W", "W"],
      ["W", ".", ".", "W", "W", ".", ".", ".", "W"],
      ["W", "W", "C", ".", "X", "X", "W", "W", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { type: "player", x: 7, y: 4 },
      { type: "box", x: 5, y: 4 },
      { type: "box", x: 4, y: 1 }
    ],
    connections: []
  },
  {
    name: "5. 서리 낀 지하 미로",
    description: "빙판(❄️) 위에서는 벽이나 장애물에 부딪힐 때까지 미끄러집니다. 미끄러지는 관성을 이용하여 상자들을 골인 지점에 안착시키세요.",
    width: 9,
    height: 7,
    maxAP: 35,
    optimalAP: 20,
    chapter: 0,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", "I", "H", "G", ".", ".", ".", "I", "W"],
      ["W", "W", "G", ".", "I", ".", "I", ".", "W"],
      ["W", "I", ".", "I", "I", ".", ".", "H", "W"],
      ["W", "I", ".", "W", "I", "W", "I", "W", "W"],
      ["W", "I", "I", "W", ".", "W", ".", "I", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { type: "player", x: 3, y: 2 },
      { type: "box", x: 5, y: 3 },
      { type: "box", x: 5, y: 2 }
    ],
    connections: []
  },

  // ==================== 챕터 1: 박스 창고 ====================
  {
    name: "1-1. 홀수 격자의 장벽",
    description: "좌표의 합(x+y)이 홀수인 칸에 상자가 존재합니다. 맨 왼쪽 아래(1,1)에서 시작해 보세요!",
    width: 13,
    height: 13,
    maxAP: 80,
    optimalAP: 63,
    chapter: 1,
    locked: false,
    grid: [
      ["G", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "G"],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", "G", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "G"]
    ],
    entities: [
      { type: "player", x: 0, y: 12 },
      // Row 0 (r=0, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 0 }, { type: "box", x: 3, y: 0 }, { type: "box", x: 5, y: 0 }, { type: "box", x: 7, y: 0 }, { type: "box", x: 9, y: 0 }, { type: "box", x: 11, y: 0 },
      // Row 1 (r=1, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 1 }, { type: "box", x: 2, y: 1 }, { type: "box", x: 4, y: 1 }, { type: "box", x: 6, y: 1 }, { type: "box", x: 8, y: 1 }, { type: "box", x: 10, y: 1 }, { type: "box", x: 12, y: 1 },
      // Row 2 (r=2, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 2 }, { type: "box", x: 3, y: 2 }, { type: "box", x: 5, y: 2 }, { type: "box", x: 7, y: 2 }, { type: "box", x: 9, y: 2 }, { type: "box", x: 11, y: 2 },
      // Row 3 (r=3, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 3 }, { type: "box", x: 2, y: 3 }, { type: "box", x: 4, y: 3 }, { type: "box", x: 6, y: 3 }, { type: "box", x: 8, y: 3 }, { type: "box", x: 10, y: 3 }, { type: "box", x: 12, y: 3 },
      // Row 4 (r=4, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 4 }, { type: "box", x: 3, y: 4 }, { type: "box", x: 5, y: 4 }, { type: "box", x: 7, y: 4 }, { type: "box", x: 9, y: 4 }, { type: "box", x: 11, y: 4 },
      // Row 5 (r=5, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 5 }, { type: "box", x: 2, y: 5 }, { type: "box", x: 4, y: 5 }, { type: "box", x: 6, y: 5 }, { type: "box", x: 8, y: 5 }, { type: "box", x: 10, y: 5 }, { type: "box", x: 12, y: 5 },
      // Row 6 (r=6, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 6 }, { type: "box", x: 3, y: 6 }, { type: "box", x: 5, y: 6 }, { type: "box", x: 7, y: 6 }, { type: "box", x: 9, y: 6 }, { type: "box", x: 11, y: 6 },
      // Row 7 (r=7, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 7 }, { type: "box", x: 2, y: 7 }, { type: "box", x: 4, y: 7 }, { type: "box", x: 6, y: 7 }, { type: "box", x: 8, y: 7 }, { type: "box", x: 10, y: 7 }, { type: "box", x: 12, y: 7 },
      // Row 8 (r=8, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 8 }, { type: "box", x: 3, y: 8 }, { type: "box", x: 5, y: 8 }, { type: "box", x: 7, y: 8 }, { type: "box", x: 9, y: 8 }, { type: "box", x: 11, y: 8 },
      // Row 9 (r=9, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 9 }, { type: "box", x: 2, y: 9 }, { type: "box", x: 4, y: 9 }, { type: "box", x: 6, y: 9 }, { type: "box", x: 8, y: 9 }, { type: "box", x: 10, y: 9 }, { type: "box", x: 12, y: 9 },
      // Row 10 (r=10, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 10 }, { type: "box", x: 3, y: 10 }, { type: "box", x: 5, y: 10 }, { type: "box", x: 7, y: 10 }, { type: "box", x: 9, y: 10 }, { type: "box", x: 11, y: 10 },
      // Row 11 (r=11, odd): cols 0, 2, 4, 6, 8, 10, 12
      { type: "box", x: 0, y: 11 }, { type: "box", x: 2, y: 11 }, { type: "box", x: 4, y: 11 }, { type: "box", x: 6, y: 11 }, { type: "box", x: 8, y: 11 }, { type: "box", x: 10, y: 11 }, { type: "box", x: 12, y: 11 },
      // Row 12 (r=12, even): cols 1, 3, 5, 7, 9, 11
      { type: "box", x: 1, y: 12 }, { type: "box", x: 3, y: 12 }, { type: "box", x: 5, y: 12 }, { type: "box", x: 7, y: 12 }, { type: "box", x: 9, y: 12 }, { type: "box", x: 11, y: 12 }
    ],
    connections: []
  },
  {
    name: "1-2. 순간이동 관문",
    description: "초록색 세모(▲) 포탈을 밟으면 반대편 포탈로 즉시 이동합니다. 상자(📦)는 포탈 안으로 밀어 넣을 수 없습니다.",
    width: 16,
    height: 10,
    maxAP: 62,
    optimalAP: 47,
    chapter: 1,
    locked: false,
    grid: [
      ["P", ".", ".", ".", "G", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", "H", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "P", ".", ".", "G"]
    ],
    entities: [
      { type: "player", x: 0, y: 9 },
      // Row 10 (y=0)
      { type: "box", x: 3, y: 0 },
      { type: "box", x: 5, y: 0 },
      { type: "box", x: 6, y: 0 },
      { type: "box", x: 8, y: 0 },
      { type: "box", x: 11, y: 0 },
      { type: "box", x: 15, y: 0 },
      // Row 9 (y=1)
      { type: "box", x: 0, y: 1 },
      { type: "box", x: 2, y: 1 },
      { type: "box", x: 4, y: 1 },
      { type: "box", x: 6, y: 1 },
      { type: "box", x: 8, y: 1 },
      { type: "box", x: 11, y: 1 },
      { type: "box", x: 13, y: 1 },
      // Row 8 (y=2)
      { type: "box", x: 0, y: 2 },
      { type: "box", x: 1, y: 2 },
      { type: "box", x: 4, y: 2 },
      { type: "box", x: 5, y: 2 },
      { type: "box", x: 9, y: 2 },
      { type: "box", x: 10, y: 2 },
      { type: "box", x: 11, y: 2 },
      { type: "box", x: 14, y: 2 },
      // Row 7 (y=3)
      { type: "box", x: 1, y: 3 },
      { type: "box", x: 2, y: 3 },
      { type: "box", x: 3, y: 3 },
      { type: "box", x: 4, y: 3 },
      { type: "box", x: 5, y: 3 },
      { type: "box", x: 6, y: 3 },
      { type: "box", x: 8, y: 3 },
      { type: "box", x: 12, y: 3 },
      { type: "box", x: 14, y: 3 },
      { type: "box", x: 15, y: 3 },
      // Row 6 (y=4)
      { type: "box", x: 5, y: 4 },
      { type: "box", x: 7, y: 4 },
      { type: "box", x: 8, y: 4 },
      { type: "box", x: 12, y: 4 },
      { type: "box", x: 13, y: 4 },
      // Row 5 (y=5)
      { type: "box", x: 0, y: 5 },
      { type: "box", x: 3, y: 5 },
      { type: "box", x: 5, y: 5 },
      { type: "box", x: 6, y: 5 },
      { type: "box", x: 8, y: 5 },
      { type: "box", x: 10, y: 5 },
      { type: "box", x: 11, y: 5 },
      { type: "box", x: 12, y: 5 },
      { type: "box", x: 14, y: 5 },
      { type: "box", x: 15, y: 5 },
      // Row 4 (y=6)
      { type: "box", x: 1, y: 6 },
      { type: "box", x: 2, y: 6 },
      { type: "box", x: 4, y: 6 },
      { type: "box", x: 6, y: 6 },
      { type: "box", x: 8, y: 6 },
      { type: "box", x: 11, y: 6 },
      { type: "box", x: 12, y: 6 },
      // Row 3 (y=7)
      { type: "box", x: 3, y: 7 },
      { type: "box", x: 5, y: 7 },
      { type: "box", x: 7, y: 7 },
      { type: "box", x: 9, y: 7 },
      { type: "box", x: 10, y: 7 },
      { type: "box", x: 12, y: 7 },
      { type: "box", x: 13, y: 7 },
      // Row 2 (y=8)
      { type: "box", x: 0, y: 8 },
      { type: "box", x: 1, y: 8 },
      { type: "box", x: 3, y: 8 },
      { type: "box", x: 5, y: 8 },
      { type: "box", x: 7, y: 8 },
      { type: "box", x: 10, y: 8 },
      { type: "box", x: 12, y: 8 },
      { type: "box", x: 14, y: 8 },
      { type: "box", x: 15, y: 8 },
      // Row 1 (y=9)
      { type: "box", x: 2, y: 9 },
      { type: "box", x: 6, y: 9 },
      { type: "box", x: 8, y: 9 },
      { type: "box", x: 10, y: 9 },
      { type: "box", x: 11, y: 9 },
      { type: "box", x: 13, y: 9 }
    ],
    connections: [],
    portalConnections: [
      { p1: { x: 0, y: 0 }, p2: { x: 12, y: 9 } }
    ]
  },
  {
    name: "1-3. 압력 감지실",
    description: "잠긴문을 열어 목적지에 도달하세요",
    width: 10,
    height: 10,
    maxAP: 95,
    optimalAP: 73,
    chapter: 1,
    locked: false,
    grid: [
      [".", ".", ".", "W", ".", ".", "H", "K", "W", "G"],
      [".", "H", "H", "H", "H", "H", "H", "H", "H", "."],
      [".", "H", ".", ".", ".", ".", "I", "W", "H", "D"],
      ["S", "H", ".", ".", ".", ".", ".", ".", "H", "D"],
      ["W", "H", "I", "I", "I", ".", ".", ".", "H", "D"],
      ["S", "H", ".", "I", ".", ".", ".", ".", "H", "."],
      [".", "H", ".", "I", ".", ".", "I", "I", "H", "W"],
      ["H", "H", ".", "I", ".", ".", ".", ".", "H", "."],
      [".", "H", "H", "H", "H", "H", "H", "W", "H", "."],
      [".", ".", ".", "W", "S", ".", "D", ".", ".", "."]
    ],
    entities: [
      { x: 2, y: 5, type: "box" },
      { x: 2, y: 7, type: "box" },
      { x: 4, y: 7, type: "box" },
      { x: 7, y: 7, type: "box" },
      { x: 7, y: 5, type: "box" },
      { x: 2, y: 2, type: "box" },
      { x: 4, y: 2, type: "box" },
      { x: 0, y: 2, type: "box" },
      { x: 0, y: 8, type: "box" },
      { x: 0, y: 6, type: "box" },
      { x: 5, y: 0, type: "box" },
      { x: 5, y: 9, type: "box" },
      { x: 9, y: 1, type: "box" },
      { x: 5, y: 4, type: "player" }
    ],
    connections: [
      { door: { x: 6, y: 9 }, switch: { x: 7, y: 0 } },
      { door: { x: 9, y: 2 }, switch: { x: 0, y: 3 } },
      { door: { x: 9, y: 3 }, switch: { x: 0, y: 5 } },
      { door: { x: 9, y: 4 }, switch: { x: 4, y: 9 } }
    ]
  },
  {
    name: "1-4. 새로운 퍼즐",
    description: "관리자가 제작한 대형 특수 미로입니다. 엇박 가시와 수많은 상자, 그리고 포탈을 활용하여 전진하세요.",
    width: 15,
    height: 15,
    maxAP: 130,
    optimalAP: 105,
    chapter: 1,
    locked: false,
    grid: [
      ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", "S", ".", ".", ".", "W", ".", "S", ".", "W", "t", ".", "t", "P", "W"],
      ["W", ".", ".", ".", ".", "W", ".", ".", ".", "W", ".", "T", ".", "T", "W"],
      ["W", ".", ".", ".", ".", "W", ".", ".", ".", "W", ".", "t", ".", "t", "W"],
      ["W", "T", ".", "T", ".", "D", ".", ".", ".", "W", "T", ".", "T", ".", "W"],
      ["W", ".", "t", ".", "t", "W", "W", "W", "W", "W", "t", ".", "t", ".", "W"],
      ["W", ".", ".", ".", ".", "W", ".", ".", ".", "W", ".", "T", ".", "T", "W"],
      ["W", ".", ".", ".", ".", "W", ".", "G", ".", "D", ".", ".", ".", ".", "W"],
      ["W", "t", ".", "t", ".", "W", ".", ".", ".", "W", "P", "W", ".", ".", "W"],
      ["W", ".", "T", ".", "T", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W"],
      ["W", ".", ".", ".", ".", ".", ".", "t", "t", "D", ".", ".", "t", "T", "W"],
      ["W", ".", ".", ".", ".", "W", "T", "I", "I", "W", ".", ".", "T", "t", "W"],
      ["W", ".", ".", ".", ".", "W", "I", "I", ".", "W", ".", ".", "W", ".", "W"],
      ["W", ".", ".", ".", "P", "W", ".", "P", ".", "W", ".", ".", "W", "S", "W"],
      ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W", "W"]
    ],
    entities: [
      { x: 1, y: 13, type: "player" },
      { x: 6, y: 3, type: "box" },
      { x: 7, y: 4, type: "box" },
      { x: 8, y: 3, type: "box" },
      { x: 7, y: 2, type: "box" },
      { x: 8, y: 1, type: "box" },
      { x: 6, y: 1, type: "box" },
      { x: 8, y: 7, type: "box" },
      { x: 7, y: 6, type: "box" },
      { x: 6, y: 7, type: "box" },
      { x: 7, y: 8, type: "box" },
      { x: 11, y: 6, type: "box" },
      { x: 13, y: 6, type: "box" },
      { x: 10, y: 4, type: "box" },
      { x: 12, y: 4, type: "box" },
      { x: 11, y: 2, type: "box" },
      { x: 13, y: 2, type: "box" },
      { x: 5, y: 10, type: "box" },
      { x: 11, y: 12, type: "box" }
    ],
    connections: [
      { door: { x: 5, y: 4 }, switch: { x: 1, y: 1 } },
      { door: { x: 9, y: 10 }, switch: { x: 7, y: 1 } },
      { door: { x: 9, y: 7 }, switch: { x: 13, y: 13 } }
    ],
    portalConnections: [
      { p1: { x: 4, y: 13 }, p2: { x: 13, y: 1 } },
      { p1: { x: 7, y: 13 }, p2: { x: 10, y: 8 } }
    ]
  },
  {
    name: "1-5. 심연의 심장",
    chapter: 1,
    locked: true,
    grid: [["."]],
    entities: []
  },

  // ==================== 챕터 2: 서리의 요새 ====================
  {
    name: "2-1. 얼어붙은 통로",
    description: "얼어붙은 빙판과 부서지는 바닥, 그리고 숨겨진 관문을 넘어 목표지점에 상자를 옮기세요.",
    width: 15,
    height: 15,
    maxAP: 73,
    optimalAP: 73,
    chapter: 2,
    locked: false,
    grid: [
      ["I","C","I","I","I","C","C"," ","C","C","I","I","I","I","I"],
      ["C","C","I","C","C","C",".",  "H",".",  "C","I","I","I","C","C"],
      ["C","I","I","C","I","C","C"," ","C","C","C","C","C","C","K"],
      ["C","C","C","C","I","I","I"," ","I","I","C","I","I","C","C"],
      ["I","I","I","C","I","I","I"," ","I","I","C","I","I","I","I"],
      ["I","I","C","C","C","I","I"," ","C","C","C","I","I","I","I"],
      ["I","I","C",".",  "C","I","I","H",".",  "C","I","I","I","I","I"],
      [" "," "," ","H"," "," "," "," ","H"," "," "," "," "," "," "],
      ["I","I","C",".",  "C","I","I"," ","I","I","I","I","I","I","G"],
      ["I","I","C","C","C","I","I"," ","I","I","I","I","I","I","I"],
      ["I","I","I","C","I","I","I"," ","I","I","I","I","I","I","I"],
      ["I","C","C","C","W","W","W","W","W","W","W",".",  "W","W","W"],
      ["C","C","I","I","I","I","I"," ","I","I","I","I","I","C","C"],
      ["C","I","I","I","I","C","C"," ","I","I",">","I","I","C","."],
      ["C","C","C","C","C","C",".",  "H","D","I","I","I","I","C","G"]
    ],
    entities: [
      { x: 0,  y: 0,  type: "player" },
      { x: 14, y: 13, type: "box" },
      { x: 3,  y: 6,  type: "box" },
      { x: 3,  y: 8,  type: "box" },
      { x: 6,  y: 1,  type: "box" },
      { x: 8,  y: 1,  type: "box" },
      { x: 8,  y: 6,  type: "box" },
      { x: 6,  y: 14, type: "box" },
      { x: 13, y: 3,  type: "box" },
      { x: 14, y: 3,  type: "box" },
      { x: 11, y: 11, type: "box" },
      { x: 11, y: 10, type: "box" }
    ],
    connections: [
      { door: { x: 8, y: 14 }, switch: { x: 14, y: 2 } }
    ],
    portalConnections: []
  },
  {
    name: "2-2. 차가운 바람",
    chapter: 2,
    locked: true,
    grid: [["."]],
    entities: []
  },
  {
    name: "2-3. 미끄러지는 관성",
    chapter: 2,
    locked: true,
    grid: [["."]],
    entities: []
  },
  {
    name: "2-4. 서리 낀 감옥",
    chapter: 2,
    locked: true,
    grid: [["."]],
    entities: []
  },
  {
    name: "2-5. 영원한 겨울의 방",
    chapter: 2,
    locked: true,
    grid: [["."]],
    entities: []
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_LEVELS };
}
