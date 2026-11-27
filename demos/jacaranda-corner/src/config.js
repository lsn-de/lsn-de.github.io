// 蓝花楹街角 · 悉尼微缩景观 —— 全局配置（调色板 / 尺寸 / 时间模式 / 页面背景）
// 配色基调：奶油白（建筑）+ 蓝紫（花冠、长椅、雨棚）+ 暖黄（灯光）

export const PAL = {
  wall: 0xd1c5b0,        // 建筑主体奶油白
  trim: 0xf0e5cf,        // 线脚 / 窗框亮白
  shade: 0xbeb29f,       // 暗部奶油（基座、压顶背光面）
  roof: 0x9d9296,        // 屋顶灰蓝
  iron: 0x2c343d,        // 铁艺（阳台 / 灯柱 / 椅腿）
  wood: 0x7c5a3c,        // 木作
  woodDark: 0x5f4630,    // 深木作（门扇）
  benchA: 0x9d81c6,      // 长椅木条 · 紫
  benchB: 0x8062af,      // 长椅木条 · 深紫
  jac: [0x7561b5, 0x9980d0, 0x8572c7, 0xb09add, 0x6958a5, 0xc1a7e0], // 蓝花楹花色阶
  leaf: 0x5d7a52,        // 少量绿叶
  ground: 0xb8afbc,      // 台座地面
  walk: 0xd2c7cf,        // 人行道
  base: 0x292936,        // 底座侧面
  baseDark: 0x1d1d29,    // 底座底沿
  terracotta: 0xa4634f,  // 烟囱陶土
  awningA: 0xe9e3d4,     // 雨棚条纹 · 米
  awningB: 0x8a6e91,     // 雨棚条纹 · 低饱和紫
};

export const DIM = { base: 14 }; // 方形薄底座边长

// 三种时间模式：光照 / 环境反射 / 窗光 / 路灯 的目标值
export const MODES = {
  day: {
    label: '白天',
    sun: { pos: [9, 15, 7], color: 0xffefd8, intensity: 1.85 },
    hemi: { sky: 0xc5c4dc, ground: 0x8f8390, intensity: 0.78 },
    window: 0.02,
    lamp: 0.0,
    env: { top: 0xa8c6e2, mid: 0xdfe7ec, bot: 0xc9bfa8 },
  },
  dusk: {
    label: '黄昏',
    sun: { pos: [-11, 4.5, 9], color: 0xffddb1, intensity: 1.65 },
    hemi: { sky: 0xaaa3cc, ground: 0x6d6274, intensity: 0.85 },
    window: 0.68,
    lamp: 0.75,
    env: { top: 0x6f7cb0, mid: 0xe0a184, bot: 0x6b5a52 },
  },
  night: {
    label: '夜晚',
    sun: { pos: [7, 12, -6], color: 0xc4c3ff, intensity: 1.6 },
    hemi: { sky: 0x8e85b2, ground: 0x393444, intensity: 0.95 },
    window: 1.0,
    lamp: 1.0,
    env: { top: 0x0c1220, mid: 0x1a2233, bot: 0x14161e },
  },
};

// 页面留白背景（画布透明，渐变作为"展陈空间"）
export const BG = {
 day: 'radial-gradient(ellipse at 62% 42%,#b6adc2 0%,#8e859f 55%,#716b84 100%)',
 dusk: 'radial-gradient(ellipse at 62% 42%,#77718e 0%,#55536e 57%,#3b3b52 100%)',
 night: 'radial-gradient(ellipse at 62% 42%,#57546e 0%,#3d3e55 58%,#2d2e43 100%)',
};
