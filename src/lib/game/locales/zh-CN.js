export default {
  meta: {
    title: 'NEON CYBER // 霓虹游戏厅'
  },
  header: {
    title: 'NEON CYBER',
    typing: [
      '欢迎来到霓虹赛博世界',
      '反应、速度、精准的终极挑战',
      '准备就绪，按下开始',
      '系统已激活，享受游戏'
    ]
  },
  warningBar: '// SYSTEM ONLINE // 霓虹游戏终端已启动 // 准备进入虚拟世界 //',
  cards: [
    {
      icon: '🎯',
      title: '反应训练',
      desc: '点击按钮挑战反应极限，刷新你的最高记录。',
      tag: 'SOLO',
      id: 'reaction',
      rating: 4.8,
      players: '1.2k',
      difficulty: 'EASY'
    },
    {
      icon: '🎮',
      title: '霓虹竞技',
      desc: '在赛博空间中与对手一决高下，挑战你的反应极限。',
      tag: 'PVP',
      id: 'neon-arena',
      rating: 4.9,
      players: '3.4k',
      difficulty: 'HARD',
      featured: true
    },
    {
      icon: '⚡',
      title: '闪电射击',
      desc: '高速目标训练，提升你的精准度与手速。',
      tag: 'SOLO',
      id: 'lightning-shooter',
      rating: 4.7,
      players: '2.1k',
      difficulty: 'NORMAL'
    },
    {
      icon: '🌟',
      title: '星海探险',
      desc: '穿越霓虹星河，解锁未知的虚拟领域与奖励。',
      tag: 'RPG',
      id: 'star-ocean',
      rating: 4.8,
      players: '1.8k',
      difficulty: 'NORMAL'
    },
    {
      icon: '🤖',
      title: '机械对战',
      desc: '操控未来机甲，在废土世界中称霸战场。',
      tag: 'PVE',
      id: 'mech-battle',
      rating: 4.9,
      players: '2.6k',
      difficulty: 'HARD'
    },
    {
      icon: '🌀',
      title: '维度迷宫',
      desc: '多重维度交织的迷宫挑战，考验你的智慧与直觉。',
      tag: 'PUZZLE',
      id: 'dimension-maze',
      rating: 4.6,
      players: '980',
      difficulty: 'NORMAL'
    },
    {
      icon: '🛡️',
      title: '霓虹防线',
      desc: '在赛博网格上部署防御塔，抵御病毒入侵核心。',
      tag: 'TD',
      id: 'neon-defense',
      rating: 4.7,
      players: '1.5k',
      difficulty: 'HARD'
    }
  ],
  sections: {
    featured: '// 本周精选 //',
    games: '// 热门游戏 //',
    platform: '// 平台数据 //',
    features: '// 核心特性 //'
  },
  featured: {
    badge: 'EDITOR’S PICK',
    cta: '立即开战',
    stats: '在线 {players} · 评分 {rating}',
    note: '双人对决 · 格斗 / 竞速 / 射击 / PVE 四种模式'
  },
  platform: {
    players: '在线玩家',
    games: '游戏总数',
    battles: '累计对战',
    achievements: '成就总数',
    suffix: ''
  },
  features: [
    {
      icon: '⚔️',
      title: '多人对决',
      desc: '本地双人同屏，格斗竞速射击一应俱全。'
    },
    {
      icon: '🏆',
      title: '成就系统',
      desc: '解锁里程碑，记录你的赛博征途。'
    },
    {
      icon: '📡',
      title: '实时数据',
      desc: '平台总分与记录全量可视化追踪。'
    },
    {
      icon: '🌐',
      title: '跨端畅玩',
      desc: '键盘手柄触屏，任意设备即开即玩。'
    }
  ],
  lobby: {
    totalScore: '平台总分：{score}',
    achievements: '已解锁成就：{count}/{total}',
    play: '开始游戏',
    toggleStats: '查看统计',
    hideStats: '隐藏统计'
  },
  stats: {
    overview: '// 总览 //',
    games: '// 各游戏记录 //',
    recent: '// 最近游玩 //',
    achievements: '// 成就 //',
    totalScore: '平台总分',
    totalPlayCount: '总游玩次数',
    totalPlayTime: '累计时长',
    gameName: '游戏',
    playCount: '次数',
    playTime: '时长',
    highScore: '最高分',
    noRecent: '暂无最近游玩记录',
    recentItem: '{game} · {score}分 · {time} · {date}',
    timeSeconds: '{s}秒',
    timeMinutes: '{m}分{s}秒',
    timeHours: '{h}时{m}分{s}秒'
  },
  controlPanel: {
    title: '// 控制面板 //',
    buttons: {
      cyan: '青色模式',
      pink: '粉色模式',
      purple: '紫色模式',
      grid: '切换网格',
      time: '显示时间',
      cursor: '光标开关',
      reducedMotion: '减少动画',
      themeLight: '浅色主题',
      themeDark: '深色主题'
    },
    themeMode: '明暗',
    themeAccent: '霓虹色'
  },
  status: {
    waiting: '// 等待指令... //',
    mode: '// 霓虹模式已切换为：{mode} //',
    gridOn: '// 网格背景：开启 //',
    gridOff: '// 网格背景：关闭 //',
    time: '// 当前时间：{date} {time} //'
  },
  game: {
    title: '// 游戏 //',
    instruction: '点击按钮获得分数，挑战最高记录',
    targetBtn: '点击得分',
    highScore: '最高记录：{score}',
    newRecord: '新纪录！{score}分',
    milestone: '已达到{score}分！',
    timeLeft: '剩余时间：{time}s',
    timeUp: '时间到！',
    backToLobby: '返回大厅',
    pause: '暂停',
    resume: '继续',
    restart: '重新开始',
    score: '分数：{score}',
    gameOver: '游戏结束：{score}分',
    placeholder: '// 开发中 // 敬请期待完整版本',
    unknown: '未知游戏',
    enterTagline: '系统启动中…准备接入',
    resultRestart: '再来一局',
    missionComplete: '任务完成',
    newRecordFlag: '新纪录',
    firstClear: '首次通关',
    ratingLabel: '评级',
    scoreLabel: '得分',
    bestLabel: '最佳 {score}',
    beatBest: '超越最佳 +{score}',
    lightningShooter: {
      instruction:
        '拖动鼠标/手指控制战机，自动射击敌机，躲避撞击！拾取道具获得护盾、火力提升或清屏效果。',
      score: '击落：{score}',
      skinLabel: '战机皮肤：',
      skins: {
        cyan: '霓虹青',
        pink: '霓虹粉',
        purple: '霓虹紫',
        gold: '霓虹金'
      },
      powerups: {
        shield: '护盾',
        fire: '火力',
        clear: '清屏'
      }
    },
    neonArena: {
      instruction:
        'P1：A/D 移动、W 跳跃、S 下蹲、J 攻击、Q 冲刺/H 护盾/K 震荡波/L 时间过载；P2：方向键移动、↑ 跳跃、↓ 下蹲、1 攻击、0 冲刺/2 护盾/3 震荡波/4 时间过载。',
      raceInstruction:
        'P1：A/D 移动、W 跳跃、S 滑铲、Q 冲刺/H 护盾/K 震荡波/L 时间过载；P2：方向键移动、↑ 跳跃、↓ 滑铲、0 冲刺/2 护盾/3 震荡波/4 时间过载。先冲过终点者获胜。',
      shootingInstruction:
        '1v1 狙击对决：按住 J/1 蓄力，弹道随蓄力向上抬升，松开发射抛物线子弹。先命中 {hits} 次者赢得本回合，3 局 2 胜。',
      shootingRoundWinner: '{player} 本回合命中 {hits} 次',
      shootingFinalWinner: '{player} 赢得狙击总冠军',
      pveInstruction:
        'PVE 挑战：选择无尽挑战或闯关挑战。AI 拥有进攻/均衡/防御三种风格，波次越高敌人越强。',
      pveEndless: '无尽挑战',
      pveLevels: '闯关挑战',
      pveWave: '第 {wave} 波',
      pveLevel: '第 {level} 关',
      pveHighestWave: '最高 {wave} 波',
      pveLevelProgress: '{current}/{total}',
      pveWaveComplete: '第 {wave} 波 完成',
      pveLevelComplete: '第 {level} 关 通过',
      pveGameOver: '挑战结束：通过 {wave} 波',
      pveAllLevelsComplete: '恭喜通关全部 {total} 关！',
      pveLevelFailed: '在第 {level} 关失败',
      pveFinalResult: 'PVE 挑战完成',
      score: 'P1 {p1Score} : {p2Score} P2',
      roundStart: 'ROUND {round} - FIGHT!',
      raceRoundStart: 'ROUND {round} - READY? GO!',
      roundWinner: '{player} 赢得第 {round} 回合',
      finalWinner: '{player} 获得总冠军',
      raceRoundWinner: '{player} 率先冲线',
      raceFinalWinner: '{player} 赢得竞速总冠军',
      restart: '再来一局',
      singleMode: '单人模式',
      doubleMode: '双人模式',
      modeSwitchSingle: '切换单人',
      modeSwitchDouble: '切换双人',
      player1: 'P1',
      player2: 'P2',
      hp: '生命',
      energy: '能量',
      modes: {
        fighting: '格斗',
        racing: '竞速',
        shooting: '射击',
        pve: 'PVE'
      },
      skills: {
        dash: '冲刺',
        shield: '护盾',
        shockwave: '震荡波',
        timeOverload: '过载'
      },
      aiTypes: {
        balanced: '均衡型',
        aggressive: '进攻型',
        defensive: '防御型'
      }
    },
    dimensionMaze: {
      instruction:
        'WASD / 方向键移动，空格或按钮切换维度（有冷却）。踩到紫色裂隙会强制切换维度。收集全部能量碎片后出口开启，在限时内找到出口进入下一关。',
      level: '第 {level}/{total} 关',
      fragments: '碎片 {current}/{total}',
      steps: '步数 {steps}',
      time: '时间 {time}s',
      timeLeft: '剩余 {time}s',
      dimension: '维度：{dimension}',
      dimensionCyan: '青维度',
      dimensionPink: '粉维度',
      switchDimension: '切换维度',
      switchCooldown: '冷却 {time}s',
      levelComplete: '第 {level} 关完成！',
      allLevelsComplete: '全部 {total} 关通关！',
      finalStats: '总用时 {time}s，总步数 {steps}',
      finalStatsWithBest: '总用时 {time}s，总步数 {steps}，最佳 {best}',
      levelStatsWithBest: '用时 {time}s，步数 {steps}，最佳 {best}',
      restart: '再玩一次',
      nextLevel: '下一关',
      gameOver: '迷宫探索完成',
      timeUp: '时间耗尽！',
      locked: '出口锁定：收集全部碎片',
      gatedFragmentHint:
        '部分能量碎片带维度标记，仅在对应维度可收集（错误维度下以半透明幽灵提示）。',
      buffFreeze: '🧊冻结 {time}s',
      buffShield: '🛡护盾 {time}s',
      combo: '连击 x{n}',
      comboPeak: '连击峰值 x{n}',
      stars: '星级 {stars}'
    },
    starOcean: {
      instruction:
        'WASD / 方向键控制飞船移动，也可拖动鼠标/手指。收集星星碎片获得经验升级，躲避陨石与敌机，拾取能量/倍分/清屏道具，能量耗尽则游戏结束。',
      level: '第 {level}/{total} 关',
      fragments: '碎片 {current}/{total}',
      energy: '能量 {current}%',
      score: '分数 {score}',
      playerLevel: '等级 {level} ({exp}/{required})',
      scoreMultiplier: '倍分 {time}s',
      levelComplete: '第 {level} 关完成！',
      allLevelsComplete: '全部 {total} 关通关！',
      gameOver: '飞船损毁：{score}分',
      finalStats: '最终得分 {score}，到达第 {level} 关',
      restart: '再次启航',
      nextLevel: '下一关',
      powerupShield: '护盾',
      powerupMagnet: '磁铁',
      powerupSlow: '减速',
      powerupEnergy: '能量',
      powerupMultiplier: '倍分',
      powerupClear: '清屏',
      powerupActive: '道具：{name} {time}s'
    },
    neonDefense: {
      instruction:
        '点击空地放置防御塔，数字键 1-8 快速选择塔类型。点击已建塔可升级或出售（U 升级 / X 出售）。阻止敌人抵达核心，能量耗尽则游戏结束。Q/W/E 释放全局技能，空格进入无尽模式，P 键暂停，右下角可切换 1x / 2x / 3x 游戏速度。',
      wave: '第 {current}/{total} 波',
      endlessWave: '无尽第 {wave} 波',
      energy: '核心能量 {current}/{max}',
      coins: '数据币 {coins}',
      score: '分数 {score}',
      startWave: '开始波次',
      nextEndlessWave: '下一波无尽',
      waveComplete: '第 {wave} 波完成！',
      allWavesComplete: '全部 {total} 波防御成功！',
      gameOver: '核心被突破：{score}分',
      finalStats: '最终得分 {score}，抵御 {wave} 波',
      restart: '重新部署',
      endlessMode: '无尽模式',
      towerLaser: '激光塔',
      towerPulse: '脉冲塔',
      towerIce: '冰冻塔',
      towerBlast: '爆破塔',
      towerSniper: '狙击塔',
      towerPoison: '毒液塔',
      cost: '造价 {cost}',
      selected: '已选择：{name}',
      skillAirstrike: '精准空袭',
      skillEmp: 'EMP 脉冲',
      skillRepair: '核心修复',
      upgrade: '升级',
      sell: '出售',
      nextLevel: '下一级花费',
      coinsShort: '数据币',
      maxLevel: '已满级',
      milestone: '里程碑',
      pause: '暂停',
      resume: '继续'
    },
    mechBattle: {
      instruction:
        'P1：A/D 移动、W 跳跃、S 下蹲、J 攻击、Q/H/K/L 技能；P2：方向键移动、↑ 跳跃、↓ 下蹲、1 攻击、0/2/3/4 技能。',
      skinLabel: '机甲皮肤：',
      skins: {
        cyan: '霓虹青',
        pink: '霓虹粉',
        purple: '霓虹紫',
        gold: '霓虹金'
      },
      enemyTypes: {
        drone: '无人机',
        tank: '坦克',
        shooter: '射手',
        archer: '弓箭手'
      },
      score: '歼灭：{score}',
      hp: '生命',
      energy: '能量',
      gameOver: '机甲损毁：{score}分',
      restart: '再次出战',
      singleMode: '单人模式',
      doubleMode: '双人模式',
      modeSwitchSingle: '切换单人',
      modeSwitchDouble: '切换双人',
      player1: 'P1',
      player2: 'P2',
      skills: {
        shield: '护盾',
        missile: '导弹',
        emp: 'EMP',
        slash: '斩击'
      }
    }
  },
  games: {
    reaction: {
      title: '// 反应训练 //',
      desc: '点击按钮挑战反应极限，刷新你的最高记录。'
    },
    neonArena: {
      title: '// 霓虹竞技 //',
      desc: '在赛博空间中与对手一决高下，挑战你的反应极限。'
    },
    lightningShooter: {
      title: '// 闪电射击 //',
      desc: '高速目标训练，提升你的精准度与手速。'
    },
    starOcean: {
      title: '// 星海探险 //',
      desc: '穿越霓虹星河，解锁未知的虚拟领域与奖励。'
    },
    mechBattle: {
      title: '// 机械对战 //',
      desc: '驾驶霓虹机甲，释放高能技能，抵御敌军入侵。'
    },
    dimensionMaze: {
      title: '// 维度迷宫 //',
      desc: '多重维度交织的迷宫挑战，考验你的智慧与直觉。'
    },
    neonDefense: {
      title: '// 霓虹防线 //',
      desc: '在赛博网格上部署防御塔，抵御病毒入侵核心。'
    }
  },
  achievements: {
    firstGame: {
      name: '初次启动',
      desc: '完成第一场游戏'
    },
    score100: {
      name: '百分突破',
      desc: '在任意游戏中获得 100 分'
    },
    score500: {
      name: '五百传奇',
      desc: '在任意游戏中获得 500 分'
    },
    playAll: {
      name: '全平台玩家',
      desc: '尝试过所有游戏'
    },
    collector: {
      name: '千分收藏家',
      desc: '平台总分达到 1000 分'
    },
    marathon: {
      name: '马拉松选手',
      desc: '累计游戏时长达到 10 分钟'
    }
  },
  settings: {
    theme: '主题',
    reducedMotion: '减少动画',
    cursor: '自定义光标',
    particles: '粒子效果'
  },
  router: {
    unknown: '// 未知路径 // 已返回大厅 //'
  },
  footer: {
    contact: '遇到问题联系我们：',
    email: '3062949899@qq.com',
    copy: '// © 2026 NEON CYBER // ALL RIGHTS RESERVED //'
  },
  toast: {
    welcome: '欢迎进入霓虹赛博世界',
    mode: '霓虹模式：{mode}',
    gridOn: '网格已开启',
    gridOff: '网格已关闭',
    time: '系统时间已更新',
    cardSelected: '已选择：{title}',
    easterEgg: '🎉 隐藏彩蛋已解锁！',
    themeLight: '已切换至浅色主题',
    themeDark: '已切换至深色主题',
    accent: '霓虹主题色已更新'
  },
  accessibility: {
    cursorOn: '自定义光标：开启',
    cursorOff: '自定义光标：关闭',
    reducedMotionOn: '减少动画：开启',
    reducedMotionOff: '减少动画：关闭'
  },
  announceTag: '// 公告 //',
  announcements: [
    {
      title: '// 系统公告 // 赛季 S3「霓虹黎明」',
      body: '新赛季现已开启，登录即领限定头像框与专属霓虹拖尾特效。完成任意 3 场对战可解锁赛季通行证前 5 级奖励。'
    },
    {
      title: '// 活动 // 周末双倍积分',
      body: '每周六、日 20:00-22:00 全平台积分收益翻倍。组队参与「霓虹竞技」额外再 +20% 团队加成。'
    },
    {
      title: '// 维护 // 底层链路升级',
      body: '08-10 02:00 将进行底层链路升级，预计暂停服务 30 分钟。维护期间正在进行中的对局将自动保存进度。'
    },
    {
      title: '// 排行 // 星海传奇',
      body: '「星海探险」全球榜首已突破 99999 分，距离登顶仅一步之遥——你的舰队准备好了吗？'
    },
    {
      title: '// 新游 // 维度迷宫 · 无尽',
      body: '「维度迷宫」无尽模式正式上线，维度裂隙会随层数加速切换，看看你能走到第几层。'
    }
  ],
  profile: {
    name: 'NEON 特工',
    editBtn: '✎ 编辑资料',
    rankNewbie: '// 新兵 //',
    rankRookie: '// 见习特工 //',
    rankVeteran: '// 资深特工 //',
    rankElite: '// 精英特工 //',
    rankAce: '// 王牌特工 //',
    rankLegend: '// 霓虹传奇 //',
    level: '等级',
    totalScore: '平台总分',
    totalPlays: '总游玩',
    playTime: '累计时长',
    achievements: '成就徽章',
    achTitle: '// 成就徽章 //',
    achUnlocked: '已解锁',
    achLocked: '未解锁',
    recentTitle: '// 最近游玩 //',
    leaderboardTitle: '// 最高分榜 //',
    noRecent: '暂无最近游玩记录',
    lbEmpty: '暂无游戏记录',
    recentItem: '{game} · {score}分',
    recentTime: '{time}',
    itemAvatar: '头像',
    itemFrame: '头像框',
    rewardUnlocked: '🎁 解锁{type}：{name}',
    unlockFrom: {
      season: '战令 Lv.{lv} 解锁',
      daily: '每日任务：{name}',
      achievement: '成就：{name}',
      unknown: '任务解锁'
    }
  },
  announceModal: {
    title: '// 公告详情 //',
    close: '关闭',
    hint: '点击空白处或按 ESC 关闭'
  },
  side: {
    toggle: '‹',
    seasonTitle: '// 赛季通行证 //',
    seasonName: '霓虹黎明 · S3',
    seasonXp: '赛季经验 {cur} / {next}',
    seasonLevel: '等级',
    dailiesTitle: '// 每日任务 //',
    claim: '领取',
    done: '已完成',
    claimed: '已领取',
    battlePassGot: '🎖 战令奖励已领取：{items}',
    battlePassMany: '🎖 战令新奖励已入库（共 {n} 项）',
    dailyGot: '🎖 每日任务奖励已领取：{items}',
    dailyMany: '🎖 每日任务新奖励已入库（共 {n} 项）',
    reward: {
      tier4: '🤖 机甲 头像',
      tier8: '◫ 黄金辉光 头像框',
      tier14: '🦊 数据狐 头像',
      tier22: '⬡ 六边形 头像框'
    },
    daily: {
      play3: {
        title: '完成 3 场游戏',
        progress: '今日已游玩 {n}/3 场'
      },
      score800: {
        title: '今日累计 800 分',
        progress: '今日已获得 {n}/800 分'
      },
      ach1: {
        title: '解锁 1 个成就',
        progress: '今日已解锁 {n}/1 个'
      },
      score1500: {
        title: '今日累计 1500 分',
        progress: '今日已获得 {n}/1500 分'
      }
    }
  }
};
