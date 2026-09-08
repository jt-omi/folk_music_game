# 俚濮彝族“五音初识”乐器示例音频来源

本目录用于 `古乐寻声·五器合奏` 第一环节“五音初识”。游戏播放逻辑会按配置中的 `maxDuration: 10` 自动停止，因此学生每次点击最多听 10 秒。

## 已接入文件

| 乐器 | 本地文件 | 来源与授权 | 备注 |
|---|---|---|---|
| 竹笛 | `zhudi.mp3` | Freesound / Openverse：CarlosCarty, “DIZI FLUTE 01.wav”, CC0 1.0；https://freesound.org/people/CarlosCarty/sounds/339341 | 真实竹笛示例音频 |
| 三弦 | `sanxian.mp3` | Freesound / Openverse：Vanyamba, “Analog Shamisen 1 Stereo D2-D6”, CC0 1.0；https://freesound.org/people/Vanyamba/sounds/525281 | 临时相近三弦类弹拨音色；待替换为正式三弦独奏开放音频 |
| 月琴 | `yueqin.mp3` | Freesound / Openverse：selfdestructbutton, “lil pipa riff”, CC0 1.0；https://freesound.org/people/selfdestructbutton/sounds/569572 | 临时相近中国弹拨音色；待替换为正式月琴独奏开放音频 |
| 响篾 / 口弦 | `xiangmie.mp3` | Freesound / Openverse：Octorez, “Jaw Harp”, CC0 1.0；https://freesound.org/people/Octorez/sounds/591160 | 口弦类音色示例 |
| 树叶 | `shuye-placeholder.wav` | 本地生成临时占位音效 | 原计划使用 Wikimedia Commons “Phlom Slek”（CC0），但下载时 Commons 对当前网络返回 429 限流；待可下载后替换 |

## 后续替换方法

保持文件名不变即可直接替换：

- `zhudi.mp3`
- `sanxian.mp3`
- `yueqin.mp3`
- `xiangmie.mp3`
- `shuye-placeholder.wav`，也可以改为 `shuye.mp3` 后同步修改 `outputs/lipuo-music-level.json`

如果替换为更长音频，不需要裁剪，配置里的 `maxDuration: 10` 会限制游戏内播放时长。
