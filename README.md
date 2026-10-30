# BEC 高级 180 突围营 · C1 Business Higher

> 从 175 (B2) 到 180+ (Grade C)。一切训练围绕唯一短板：**听力 158 → 175+**。

**在线站点**：https://tanyaqiongcode.github.io/bec-higher-180/

一个纯静态的个人备考站，围绕一条算术目标函数设计：官方换算锚点下，其余三科稳在 ~181 时，听力从 11-12/30 提到 20-21/30，总分即过 180（Grade C）。

## 站点结构

| 页面 | 内容 |
|---|---|
| `index.html` | 诊断（四科成绩条）、200 天倒计时、每日打卡、关键节点 |
| `listening.html` | 听力三 Part 拆解、官方锚点换算器、精听四步法、A-B 循环精听工作台 |
| `practice.html` | 七源商务播客每日动态（页内可播放）、美剧/播客选材指南、使用节奏 |
| `materials.html` | 剑桥官方免费样题/手册、真题辑 1-5 辑纪律、可可英语/沪江/B站、GitHub 开源项目清单 |
| `exam.html` | 四科版式、Cambridge English Scale 分数带、NEEA 报名（¥910、一年一考、窗口约一周）、FAQ |
| `roadmap.html` | 四阶段计划（地基→真题→模考→考试）、每周日程、听力题数里程碑 |

## 动态机制

- `scripts/update_feeds.py`：抓取 7 个商务播客 RSS（BBC Business Daily、FT News Briefing、Marketplace、HBR IdeaCast、BBC Global News、The Intelligence、Skills 360），生成 `data/latest.json`
- `.github/workflows/update-feeds.yml`：每日 UTC 00:50（北京 08:50）自动运行并提交
- 打卡/精听笔记/听力时长存 localStorage（`bec180-*`）

## 关键情报（2026-10 核查）

- BEC 已于 2024 年 6 月全球停考，仅中国大陆保留；官方名 **C1 Business Higher**
- 中国区 2025 年起**一年一考**：2025-09（上海）、2026-05 已过；下次预计 **2027-05 中下旬**
- 报名：教育部教育考试院 [bec.neea.cn](https://bec.neea.cn/)，高级 **¥910**（含口试），窗口仅约一周
- 听力换算锚点（官方）：12/30≈160 · 17/30≈170 · 21/30≈180 · 25/30≈190

## License

MIT（代码与文案）。剑桥考试材料版权归属 Cambridge University Press & Assessment，本站仅链接官方渠道，不存储真题。
