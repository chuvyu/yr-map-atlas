/**
 * yr-map-atlas — Client half (Web UI).
 *
 * 红警地图册 / Red Alert 2 & Yuri's Revenge map atlas.
 * Author: 一尾醋醋鱼 (bilibili)
 * Repo:   https://github.com/chuvyu/yr-map-atlas
 *
 * A full main panel (sidebar icon + page) for the Red Alert 2 / Yuri's Revenge
 * map library owned by the Host half: browse with the map's own embedded
 * preview, rate a map (which physically moves it into its star folder), tag it,
 * write notes, launch a game from the pool, and settle the session when you
 * come back.
 */
window.__ModuleLoader__.load({
  id: '@local/yr-map-atlas',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef, useMemo } = React;

    const NS = 'yr-map-atlas';
    const API = '/yr-map-atlas/api';
    // Reverse lookup: keep the Chinese literal inline, swap it at render time.
    let curLocale = 'zh';
    const EN_UI = {"红警地图册": "Map Atlas", "待整理": "Pool", "已整理": "Owned", "抽一张": "Draw", "重新扫描": "Rescan", "确认归位": "Save", "再来一局": "Play again", "删除": "Delete", "加载更多": "Load more", "打开文件夹": "Open folder", "正在建立索引": "Indexing", "没有匹配的地图": "No matching maps", "搜索地图名、文件名、心得": "Search map name, file name or notes", "首次设置": "First-time setup", "三步完成，之后可在设置里修改": "Three steps. You can change everything later in Settings.", "① 地图库放在哪里": "1  Where should the library live?", "所有地图、星级文件夹和笔记都会放在这里": "Maps, star folders and notes all live here", "选择文件夹": "Choose folder", "重新检测": "Re-check", "中文（00-待整理 / 1人 / 0星）": "Chinese (00-待整理 / 1人 / 0星)", "Chinese (00-待整理 / 1人 / 0星)": "English (00-Inbox / 1P / 0Star)", "目录命名": "Folder naming", "② 游戏目录（可跳过）": "2  Game folder (optional)", "跳过": "Skip", "开始建立": "Build library", "正在建立…": "Building…", "目录可写": "folder is writable", "⚠ 这个目录不可写": "⚠ folder is not writable", "目录已存在": "folder exists", "目录不存在，将自动创建": "will be created", "检测到已有地图库，将直接使用": "Existing library found — it will be used as is", "张地图": "maps found", "找到启动程序": "launchers found", "没找到启动程序，可稍后在设置里指定": "No launcher found — you can set it later in Settings", "界面语言": "Language", "请先选择地图库文件夹": "Choose the library folder first", "建立失败": "Setup failed", "无法打开目录选择器：": "Folder picker failed: ", "插件未就绪": "Plugin not ready", "无法打开会话": "Could not open a conversation", "导入": "Import", "导入地图": "Import maps", "把旧文件夹里的地图和压缩包收进地图库": "Bring maps and archives from an old folder into the library", "关闭": "Close", "① 选择要导入的文件夹": "1  Choose the folder to import", "选原来的地图目录，或放着压缩包的下载文件夹": "Pick your old map folder, or the folder holding the archives", "粘贴路径或点右边选择": "paste a path or pick on the right", "开始扫描": "Scan", "扫描中…": "Scanning…", "正在扫描…": "Scanning…", "正在导入…": "Importing…", "取消": "Cancel", "② 扫描结果": "2  Scan result", "③ 处理方式": "3  How to handle", "重复地图（与库里内容相同的）": "Duplicate maps (same content as the library)", "只留一份": "Keep one", "移到 _重复": "Move to _Duplicates", "全都保留": "Keep all", "文件名": "File name", "用地图内部名": "Use the map title", "保持原文件名": "Keep the original", "压缩包": "Archives", "解压后归档": "Extract, then archive", "原样归档": "Archive as-is", "预览图": "Preview images", "归档": "Archive", "开始导入": "Start import", "④ 完成": "4  Done", "撤销这次导入": "Undo this import", "把这次导入的文件全部搬回原处？": "Move every file from this import back?", "撤销失败": "Undo failed", "请先选择文件夹": "Choose a folder first", "扫描失败": "Scan failed", "导入失败": "Import failed", "地图库位置": "Library folder", "游戏目录（留空 = 纯收藏）": "Game folder (blank = collection only)", "不填就不启动游戏": "leave blank to never launch the game", "保存": "Save", "保存中…": "Saving…", "尚未初始化": "not configured", "维护": "Maintenance", "检查地图": "Check maps", "检查并修复": "Check and fix", "重建索引": "Rebuild index", "导出诊断包": "Export diagnostics", "打包中…": "Packing…", "已保存，正在重建索引": "Saved, rebuilding the index", "开始检查": "Check started", "检查并修复已开始": "Check & fix started", "诊断包已生成：": "Diagnostics written: ", "导出失败": "Export failed", "检查中 ": "Checking ", "✔ 正常 ": "✔ healthy ", " · 可修复 ": " · fixable ", " · 已隔离 ": " · quarantined ", " · 格式异常 ": " · odd format ", "无预览": "no preview", "未评分": "unrated", "点击取消": "click to remove", "自定义标签，回车添加": "custom tag, Enter to add", "添加": "Add", "温带": "Temperate", "雪地": "Snow", "沙漠": "Desert", "城市": "Urban", "月球": "Lunar", "默认": "Default", "名称": "Name", "星级": "Stars", "最近游玩": "Recent", "人数": "Players", "玩得多": "Most played", "筛选": "Filter", "地形": "Terrain", "排序": "Sort", "清空筛选": "Clear filters", "无筛选": "No filters", "收起": "Done", "已保存": "Saved", "保存失败": "Save failed", "网络错误": "Network error", "手工指定": "Set by hand", "地图内部": "Map file", "文件": "File", "位置": "Path", "名称来源": "Name from", "尺寸": "Size", "游玩": "Played", "崩溃": "Crashes", "标签": "Tags", "心得": "Notes", "对局记录": "Sessions", "已收藏": "Favorited", "收藏": "Favorite", "取消收藏": "Remove from favorites", "加入收藏": "Add to favorites", "未评级的地图留在待整理": "Unrated maps stay in the pool", "记录打法和注意事项…": "How it plays, what to avoid…", "官方图 · 只读": "official · read-only", "处理中…": "Working…", "删除失败": "Delete failed", "确定删除「": "Delete \"", "」？文件会被直接删除。": "\"? The file is removed.", "交给 AI": "Ask AI", "一键修复": "Auto-fix", "交给 AI 修复": "Ask AI to fix", "检查中…": "Checking…", "生成工单…": "Preparing…", "修复失败": "Repair failed", "生成工单失败": "Could not build the brief", "检查完成，没有需要修复的问题": "Checked — nothing to fix", "这一局异常结束": "This session ended abnormally", "上一局还没有评级": "The last session is not rated yet", "不评级也可以归位，记为 0 星": "You can file it without rating — it counts as 0 stars.", "这张图会被直接删除，确定？": "This map will be deleted. Continue?", "删除这张图": "Delete this map", "已生成修复版：": "Repaired copy: ", "检查结果": "Check result", "没有发现问题": "No problems found", "直接启动修复版": "Launch the repaired copy", "简单写写就行，也可以跳过": "A line or two is fine — or skip it", "抽到「": "Drew \"", "抽图失败": "Draw failed", "游戏已启动，打完后回来记录": "Game started. Come back here when you are done.", "已复制到游戏目录，启动失败：": "Copied to the game folder but the launch failed: ", "游戏已重启": "Game restarted", "已归位": "Filed", "已删除": "Deleted", "待整理 ": "Pool ", "已整理 ": "Owned ", "官方 ": "Official ", "官方": "official", "红警2": "RA2", "尤里": "YR", "尤里的复仇": "Yuri's Revenge", "修复工单已放进新对话的输入框，按回车开始": "Brief placed in a new conversation — press Enter", "修复工单已复制到剪贴板": "Brief copied to the clipboard", "修复工单已复制到剪贴板：": "Brief copied to the clipboard: ", "工单已填入新对话，按回车开始": "Brief placed in a new conversation — press Enter", "工单已复制到剪贴板": "Brief copied to the clipboard", "已发到地图修复对话": "Sent to the repair conversation", "启动中…": "Starting…", "启动失败": "Launch failed", "启动失败：": "Launch failed: ", "部署失败": "Deploy failed", "未知原因": "unknown reason", "未知": "unknown", "人": "P", "星": " star", "张": "", "次": "", "秒": "s", " 张 · 与库重复 ": " maps · duplicate ", " · 可新增 ": " · new ", " 个文件，": " files, ", " 个官方图包混在待整理里": " official packs sit in the pool", "发现 ": "Found ", " 待整理 · ": " pool · ", " 已整理": " owned", " 小时 ": " h ", " 分": " m", " 分 ": " m ", "，最近": ", last", " 个文件处理失败：": " files failed: ", "已还原 ": "Restored ", " 个文件": " files", "地图 ": "Maps ", "压缩包 ": "Archives ", " · 图片 ": " · images ", " · 其它 ": " · other ", "✔ 新增地图 ": "✔ added ", "· 跳过重复 ": "· skipped ", " · 移到 _重复 ": " · moved to _Duplicates ", "· 归档压缩包 ": "· archived ", " · 解出地图 ": " · extracted ", " · 归档图片 ": " · images ", "① 扫描": "1 scan", "编辑": "Edit", "改名失败": "Rename failed", "已打开所在文件夹": "Opened the containing folder", "打开失败": "Could not open", "这张图没有崩溃记录，仍要生成修复工单吗？": "This map has no crash record. Create a repair brief anyway?", "异常修复": "Fix issue", "深度修复": "Deep repair", "整理崩溃现场与结构检查，交给 AI 分析": "Collect the crash context and a structure check for the AI", "自动修复已知问题（座位数不符、MaxPlayer 越界）": "Fix known problems automatically (seat count, MaxPlayer overflow)", "把崩溃现场交给 AI 分析": "Hand the crash context to the AI", "抽图后会启动游戏。留空就只做收藏。": "Draw will launch the game. Leave blank for a collection only.", "保存后会归位到对应星级文件夹": "Saving files it into the matching star folder", " 人": " players", " 次": " times", " 星": " stars", "，最近 ": ", last ", "新城市": "New Urban", "开始检查并修复": "Check and fix started", "使用说明与常见问题": "Guide and FAQ", "它是什么": "What it is", "把散落的地图整理成库，抽一张进游戏，打完按星级归位，顺手记下心得。": "Turn a pile of map files into a library: draw one, play it, file it by rating, keep a note.", "地图文件内容不动，只按你的评价换文件夹；所有记录存在库里的 .atlas 目录。": "Map files are never edited — only moved between folders. Records live in .atlas inside the library.", "怎么用": "How to use it", "1 放地图": "1  Add maps", "把地图文件放进 00-待整理\\遭遇战，或点右上「导入」批量收进来": "Drop map files into the pool folder, or use Import to bring in a whole folder", "2 抽图": "2  Draw", "点「抽一张」，选尤里或红警2，地图会复制进游戏目录并启动游戏": "Draw copies the map into the game folder and starts the game", "3 打完": "3  Settle", "回到面板点「确认归位」，给星级、选标签、写几句心得": "Come back and press Save: rate it, tag it, write a line or two", "4 归位": "4  File it", "文件自动移到 01-遭遇战\\N人\\N星，之后抽图不会再抽到已评价的图": "The file moves into its player/star folder and will not be drawn again", "5 找图": "5  Find it", "按人数、地形、星级、标签筛选；已整理的地图可以点星收藏": "Filter by players, terrain, stars or tag; star the ones you like", "目录说明": "Folders", "还没评价的图，抽图从这里取": "Unrated maps; the draw pulls from here", "已归位的对战图，按人数和星级分层": "Filed maps, split by players and stars", "战役和任务包": "Campaigns and mission packages", "压缩包、预览图等原始素材": "Archives, previews and other source material", "索引、缩略图、记录；跟着库走，换电脑拷过去即可": "Index, thumbnails, records — travels with the library", "常见问题": "FAQ", "改名会丢记录吗？": "Does renaming lose my record?", "不会。记录按文件内容（MD5）认，改名、移动都不影响。": "No. Records are keyed by file content (MD5), so renaming and moving are safe.", "星级为什么存两处？": "Why are stars stored twice?", "文件夹代表位置，记录代表分数；在面板里评级时两者一起改。": "The folder is where it lives, the record is the score; rating in the panel updates both.", "官方图能评价吗？": "Can I rate official maps?", "能评分、能写心得，但文件是游戏自带的，不会移动或改名。": "Yes, but the files ship with the game: they are never moved or renamed.", "地图一进就崩？": "The map crashes on load?", "结算卡先点「一键修复」，修不了再点「异常修复」，把崩溃现场交给 AI 分析。": "Try Auto-fix first; if that fails use Fix issue to hand the crash context to the AI.", "换电脑怎么搬？": "How do I move to another PC?", "设置里「导出配置」，新机器「导入配置」，再把整个地图库文件夹拷过去。": "Export config on the old machine, import it on the new one, and copy the library folder over.", "导出的是地图吗？": "Does the export include the maps?", "不是。只有星级、标签、心得、收藏和手工命名，地图文件请自行拷贝。": "No. Only stars, tags, notes, favourites and names. Copy the map files yourself.", "导入会覆盖吗？": "Will importing overwrite anything?", "默认合并，只补本地没有的记录；想全部覆盖选「覆盖」模式。": "Merge is the default and only fills gaps. Choose Replace to overwrite.", "能同时用多个库吗？": "Can I use several libraries?", "一次一个库。换库在设置里改路径，旧库的数据留在旧文件夹里。": "One at a time. Switch in Settings; the old library keeps its own data.", "关于": "About", "作者": "Author", "一尾醋醋鱼": "一尾醋醋鱼", "配置格式": "Config format", "配置备份": "Config backup", "只有评价记录，不含地图文件。": "Ratings and notes only — no map files.", "导出配置": "Export config", "刷新列表": "Refresh", "还没有备份": "No backups yet", "条记录": " records", "个命名": " names", "合并导入": "Merge", "覆盖导入": "Replace", "读取失败": "Could not read", "已导出：": "Exported: ", "已导入 ": "Imported ", " 条（跳过 ": " (skipped ", " 条，": ", ", " 条在库里找不到对应地图）": " have no matching map in this library)", "确定用「": "Import this backup using \"", "」方式导入这份配置？": "\"?", "合并": "merge", "覆盖": "replace", "评级已保存，文件仍留在待整理；打完「确认归位」才归档": "Rating saved. The file stays in the pool until the session is settled.", "保存后会移动到对应星级文件夹": "Saving moves it into the matching star folder", "归档到已整理": "File it", "归档失败": "Could not file it", "不需要真的打一局，直接移动到已整理": "Skip playing — move it into the owned set right away", "不用真打一局，点上面就能归档。": "No need to play it — press the button above.", "已归档到 ": "Filed at ", "加载中…": "Loading…", "条件抽取": "Draw by filter", "从哪儿抽": "Draw from", "抽取": "Draw", "抽取中…": "Drawing…", "符合条件 ": "Matching: ", " 张": "", "只看收藏": "Favourites only", "还没有任何标签": "No tags yet", "作战配置": "Gameplay options", "启动游戏前自动写入，第一次会备份原文件。": "Written before each launch; the original is backed up once.", "起始资金": "Starting credits", "游戏速度": "Game speed", "单位数": "Unit count", "科技等级": "Tech level", "快速游戏": "Short game", "超级武器": "Superweapons", "箱子": "Crates", "盟友建造": "Build off ally", "MCV 重部署": "MCV re-deploy", "迷雾": "Fog of war", "多工程师": "Multi engineer", "可摧毁桥梁": "Destructible bridges", "自定义参数": "Custom keys", "每行一个 key=value。": "One key=value per line.", "启动游戏前自动应用": "Apply before launch", "立即写入": "Write now", "还原备份": "Restore backup", "还原中…": "Restoring…", "已写入游戏配置": "Written into the game config", "已还原原始配置": "Original config restored", "还原失败": "Restore failed", "找不到文件：": "File not found: ", "开": "On", "关": "Off", "游戏模式": "Game mode", "作战": "Battle", "自由交战": "Free-for-all", "合作模式": "Co-op", "邪恶联盟": "Evil alliance", "巨富": "Rich", "抢地盘": "Land grab", "生死斗": "Deathmatch", "海战": "Naval war", "小队联盟": "Squad alliance", "所有电脑围攻你一个": "Every AI attacks you", "大乱斗": "Everyone against everyone", "和小队协作": "Team up with a squad", "可发展所有国家的科技": "Build every side's tech", "无矿场，只能靠占油井收入": "No ore drills — income comes from oil derricks", "开局几条狗，地盘全靠抢": "Start with a few dogs; grab ground fast", "无高科技": "No high tech", "无坦克": "No tanks", "和电脑一起打电脑": "Fight the AI alongside an AI", "当前：": "Current: ", "当前未设置，游戏默认是 1 作战": "Not set — the game defaults to 1 Battle", "游戏开着时改了会被覆盖，先关游戏。": "A running game overwrites this — close it first.", "地图库设置": "Library setup", "作战配置、配置备份、体检、导入，都在「设置 → 红警地图册」里": "Gameplay options, backup, health check and import all live in Settings → Map Atlas", "插件设置": "Plugin settings", "配置备份、体检、诊断包在「设置 → 红警地图册」里": "Config backup, health check and diagnostics live in Settings → Map Atlas", "搜索标签，或输入新名字回车创建": "Search tags, or type a new one and press Enter", "没有这个标签，回车新建": "No such tag — press Enter to create it", "新建": "Create", "已放回待整理": "Returned to the pool", "已移出游戏目录，原图留在库里": "Removed from the game folder; the library copy is untouched", "放回待整理": "Return to pool", "操作失败": "That did not work", "未设置游戏目录，不能启动": "No game folder set — cannot launch", "检查游戏目录残留": "Check game folder for strays", "重建缩略图": "Rebuild thumbnails", "游戏目录很干净，没有库外的地图": "The game folder is clean — no stray maps", "游戏目录里有 ": "There are ", " 张库外的地图：\\n\\n": " maps in the game folder that are not in the library:\\n\\n", "\\n\\n要把它们移回待整理吗？": "\\n\\nMove them back to the pool?", "已移回待整理 ": "Moved back: ", "重建全部缩略图？地图多的话会跑一会儿。": "Rebuild every thumbnail? Large libraries take a while.", "已清空 ": "Cleared ", " 张缩略图，正在后台重新生成": " thumbnails; regenerating in the background", "选中以批量操作": "Select for batch actions", "已选 ": "Selected: ", "输入标签": "tag name", "加标签": "Add tag", "移回待整理": "Return to pool", "已加标签 ": "Tagged ", "把选中的 ": "Move ", " 张移回待整理？": " selected maps back to the pool?", "删除选中的 ": "Delete ", " 张？文件会从硬盘移除，不可恢复。": " selected maps? Files are removed from disk, no undo.", "已删除 ": "Deleted ", "打开地图库": "Open library folder", "避开最近抽过的": "Skip recently drawn", "统计": "Stats", "总对局": "Sessions", "总时长": "Total time", "近 7 天": "Last 7 days", "星级分布": "Rating spread", "地形（已整理）": "Terrain (owned)", "人数（待整理 + 已整理）": "Players (pool + owned)", "玩得最多": "Most played", " 局": " plays", " 分钟": " min", "还没有已整理的图": "No owned maps yet", "删除「": "Delete \"", "」？\\n\\n文件会从硬盘移除，不能撤销。配置备份里不含地图文件。": "\"?\\n\\nThe file is removed from disk. This cannot be undone; the config backup does not contain map files.", "」？\\n\\n文件会从硬盘移除，不能撤销。": "\"?\\n\\nThe file is removed from disk and cannot be recovered.", " 张？\\n\\n文件会从硬盘移除，不能撤销。": " maps?\\n\\nFiles are removed from disk and cannot be recovered.", "还原到首次写入前的原始配置？当前游戏设置会被覆盖。": "Restore the config from before the first write? Current game settings will be overwritten.", "平均星级": "Avg rating", "最长一局": "Longest session", "官方图": "Official", "近 7 天对局": "Sessions in the last 7 days", "打开这张地图": "Open this map", "抽图偏好": "Draw options", "按星级加权": "Weight by rating", "跳过最近 20 次抽到的图": "Skips the last 20 drawn maps", "5 星图的抽中概率是 0 星的 3 倍": "A 5-star map is 3x as likely as an unrated one", "名称已更新为 ": "Renamed to ", "改名": "Rename", "同时修改文件名和显示名": "Renames both the file and the title"};
    function T(s) {
      const loc = curLocale || 'zh';
      if (loc.indexOf('en') === 0) return EN_UI[s] || s;
      return s;
    }

    function useLocaleTick() {
      const [, bump] = useState(0);
      useEffect(() => {
        try { return hostCtx.locale.subscribe(() => bump((n) => n + 1)); }
        catch { return undefined; }
      }, []);
      return null;
    }

    function readLocale(ctx) {
      try {
        const s = ctx.locale.getLocale();
        return String((s && (s.id || s.locale || s.language)) || 'zh').toLowerCase();
      } catch { return 'zh'; }
    }

    const TAGS_SKIRMISH = [
      '海战', '陆战', '岛屿', '桥梁', '峡谷', '城市', '乡村', '雪地', '沙漠',
      '黑夜', '雾天', '大图', '小图', '速攻', '慢热', '防守', '偷家', '超武',
      '合作', '混战', '奇葩', '经典',
    ];
    const TAGS_MISSION = [
      '战役', '单关', '多关', '防守', '进攻', '潜行', '护送', '限时',
      '解谜', '超长', '超难', '剧情向', '中文', '需要MOD',
    ];

    const zh = {
      title: '红警地图册',
      'zone.pool': '待整理', 'zone.owned': '已整理', 'zone.official': '官方',
      'btn.draw': '抽一张', 'btn.rescan': '重新扫描', 'btn.settle': '确认归位',
      'btn.replay': '再来一局', 'btn.later': '放回待整理', 'btn.delete': '删除',
      'btn.more': '加载更多', 'btn.open': '打开文件夹', 'btn.close': '关闭',
      'scan.scanning': '正在建立索引', empty: '没有匹配的地图',
      'search.placeholder': '搜索地图名、文件名、心得',
      'setup.title': '首次设置',
      'setup.sub': '三步完成，之后可在设置里修改',
      'setup.lib': '① 地图库放在哪里',
      'setup.libHint': '所有地图、星级文件夹和笔记都会放在这里',
      'setup.choose': '选择文件夹',
      'setup.recheck': '重新检测',
      'setup.pathPlaceholder': '也可以直接粘贴路径，例如 D:\\Games\\RA2Maps',
      'setup.layout': '目录命名',
      'setup.layoutZh': '中文（00-待整理 / 1人 / 0星）',
      'setup.layoutEn': 'English（00-Inbox / 1P / 0Star）',
      'setup.game': '② 游戏目录（可跳过）',
      'setup.gameHint': '抽图后会启动游戏。留空就只做收藏。',
      'setup.skip': '跳过',
      'setup.start': '开始建立',
      'setup.building': '正在建立…',
      'setup.okWrite': '目录可写',
      'setup.noWrite': '⚠ 这个目录不可写',
      'setup.exists': '目录已存在',
      'setup.willCreate': '目录不存在，将自动创建',
      'setup.hasAtlas': '检测到已有地图库，将直接使用',
      'setup.mapsFound': '张地图',
      'setup.exeFound': '找到启动程序',
      'setup.exeNone': '没找到启动程序，可稍后在设置里指定',
      'setup.lang': '界面语言',
    };
    const en = {
      title: 'Map Atlas',
      'zone.pool': 'Pool', 'zone.owned': 'Owned', 'zone.official': 'Official',
      'btn.draw': 'Draw', 'btn.rescan': 'Rescan', 'btn.settle': 'Save',
      'btn.replay': 'Play again', 'btn.later': 'Later', 'btn.delete': 'Delete',
      'btn.more': 'Load more', 'btn.open': 'Open folder', 'btn.close': 'Close',
      'scan.scanning': 'Indexing', empty: 'Nothing matches',
      'search.placeholder': 'Search name, file or notes…',
      'setup.title': 'First-time setup',
      'setup.sub': 'Three steps — you can change all of it later in Settings',
      'setup.lib': '1  Where should the library live?',
      'setup.libHint': 'Maps, star folders and notes all live here',
      'setup.choose': 'Choose folder',
      'setup.recheck': 'Re-check',
      'setup.pathPlaceholder': 'or paste a path, e.g. D:\\Games\\RA2Maps',
      'setup.layout': 'Folder naming',
      'setup.layoutZh': 'Chinese (00-待整理 / 1人 / 0星)',
      'setup.layoutEn': 'English (00-Inbox / 1P / 0Star)',
      'setup.game': '2  Game folder (optional)',
      'setup.gameHint': 'Needed to launch a map; skip for a pure collection',
      'setup.skip': 'Skip',
      'setup.start': 'Build library',
      'setup.building': 'Building…',
      'setup.okWrite': 'folder is writable',
      'setup.noWrite': '⚠ folder is not writable',
      'setup.exists': 'folder exists',
      'setup.willCreate': 'will be created',
      'setup.hasAtlas': 'existing library detected — will adopt it',
      'setup.mapsFound': 'maps found',
      'setup.exeFound': 'launchers found',
      'setup.exeNone': 'no known launcher here — set it later in Settings',
      'setup.lang': 'Language',
    };

    let tr = (k) => zh[k] || k;

    const get = (p) => fetch(API + p, { cache: 'no-store' })
      .then((r) => r.json()).catch(() => ({ ok: false, error: T('网络错误') }));
    const post = (action, payload) => fetch(API + '/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...(payload || {}) }),
    }).then((r) => r.json()).catch(() => ({ ok: false, error: T('网络错误') }));

    const thumbUrl = (id) => API + '/thumb/' + encodeURIComponent(id) + '.png';

    function fmtDur(ms) {
      if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
      const s = Math.round(ms / 1000);
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      if (hh) return hh + T(' 小时 ') + mm + T(' 分');
      if (mm) return mm + T(' 分 ') + (s % 60) + T(' 秒');
      return s + T(' 秒');
    }

    const THEATER_ZH = {
      TEMPERATE: '温带', SNOW: '雪地', URBAN: '城市', NEWURBAN: '新城市', DESERT: '沙漠', LUNAR: '月球',
    };
    function theaterText(v) {
      if (!v) return '';
      const zh = THEATER_ZH[String(v).toUpperCase()];
      return zh ? T(zh) : String(v);
    }

    function fmtDate(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      const p = (n) => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /* ------------------------------------------------------------- icons -- */
    const Ico = (parts) => (props) => h('svg', {
      width: (props && props.size) || 14, height: (props && props.size) || 14,
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      style: { flex: '0 0 auto', ...((props && props.style) || {}) },
    }, ...parts.map((p, i) => h(p[0], { key: i, ...p[1] })));

    const IconSearch = Ico([['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'm20 20-3.5-3.5' }]]);
    const IconDice = Ico([['rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 4 }],
      ['circle', { cx: 8.5, cy: 8.5, r: 1.2, fill: 'currentColor', stroke: 'none' }],
      ['circle', { cx: 15.5, cy: 15.5, r: 1.2, fill: 'currentColor', stroke: 'none' }],
      ['circle', { cx: 12, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }]]);
    const IconRefresh = Ico([['path', { d: 'M20 11a8 8 0 1 0-2.3 5.7' }], ['path', { d: 'M20 4v7h-7' }]]);
    const IconPlay = Ico([['path', { d: 'M8 5.5v13l11-6.5-11-6.5Z' }]]);
    const IconAgain = Ico([['path', { d: 'M4 12a8 8 0 1 0 8-8' }], ['path', { d: 'M4 4v8h8' }]]);
    const IconTrash = Ico([['path', { d: 'M4 7h16' }], ['path', { d: 'M9 7V5h6v2' }],
      ['path', { d: 'M6.5 7 7.5 20h9l1-13' }]]);
    const IconFolder = Ico([['path', { d: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h5l2 2.5h8A1.5 1.5 0 0 1 21 10v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17Z' }]]);
    const IconClose = Ico([['path', { d: 'm6 6 12 12M18 6 6 18' }]]);
    const IconWarn = Ico([['path', { d: 'M12 4 2.8 20h18.4L12 4Z' }], ['path', { d: 'M12 10v4.5' }],
      ['circle', { cx: 12, cy: 17.4, r: 0.9, fill: 'currentColor', stroke: 'none' }]]);
    const IconFilter = Ico([['path', { d: 'M3.5 6h17l-6.6 8v5.4l-3.8 1.9V14L3.5 6Z' }]]);
    const IconCheck = Ico([['circle', { cx: 12, cy: 12, r: 8 }], ['path', { d: 'm8.5 12 2.5 2.5 4.5-5' }]]);
    const IconStar = (props) => h('svg', {
      width: (props && props.size) || 14, height: (props && props.size) || 14,
      viewBox: '0 0 24 24', fill: props && props.filled ? 'currentColor' : 'none',
      stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round',
      'aria-hidden': true, style: { flex: '0 0 auto' },
    }, h('path', { d: 'M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6Z' }));
    const IconSpark = Ico([['path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4' }],
      ['path', { d: 'm6.4 6.4 2.1 2.1M15.5 15.5l2.1 2.1M17.6 6.4l-2.1 2.1M8.5 15.5l-2.1 2.1' }]]);

    /* --------------------------------------------------- AI hand-off ----- */
    // A dedicated conversation keeps every repair in one place. Its id lives in
    // localStorage; when it is gone we open a new one with the brief typed in.
    let hostCtx = null;
    const REPAIR_KEY = 'yr-atlas.repair-session';

    function storedRepairId() {
      try { return localStorage.getItem(REPAIR_KEY); } catch { return null; }
    }
    function rememberRepairId(id) {
      try { localStorage.setItem(REPAIR_KEY, id); } catch { /* ignore */ }
    }

    function sessionIds() {
      try {
        const snap = hostCtx && hostCtx.sessions && hostCtx.sessions.list
          ? hostCtx.sessions.list.getSnapshot() : null;
        return snap && Array.isArray(snap.ids) ? snap.ids.slice() : [];
      } catch { return []; }
    }

    async function sendToRepairSession(text) {
      const ctx = hostCtx;
      if (!ctx) throw new Error(T('插件未就绪'));
      const ui = ctx.uiWorkspace;
      const sessions = ctx.sessions;

      const known = storedRepairId();
      let reuse = known && sessionIds().includes(known) ? known : null;

      // fall back to finding the earlier repair conversation by its title
      if (!reuse && sessions && sessions.list) {
        try {
          const snap = sessions.list.getSnapshot();
          const byId = (snap && snap.byId) || {};
          for (const id of (snap.ids || [])) {
            const s = byId[id] || {};
            const title = String(s.title || s.name || s.summary || '');
            if (title.indexOf('红警地图崩溃修复') >= 0) { reuse = id; rememberRepairId(id); break; }
          }
        } catch { /* ignore */ }
      }

      if (reuse && sessions && sessions.using) {
        await sessions.using(reuse, { source: 'controllerOperation' }, async (ref) => {
          const binding = await ref.ready;
          await binding.session.prompt([{ type: 'text', text }], 'queue');
        });
        if (ui && ui.openSession) ui.openSession(reuse);
        return 'sent';
      }

      if (ui && typeof ui.startSession === 'function') {
        const before = new Set(sessionIds());
        ui.startSession(undefined, { prompt: text, whenDraftExists: 'replace' });
        // remember whichever session this created, so the next crash reuses it
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 400));
          const fresh = sessionIds().find((x) => !before.has(x));
          if (fresh) { rememberRepairId(fresh); break; }
        }
        return 'draft';
      }
      throw new Error(T('无法打开会话'));
    }


    /* ------------------------------------------------------------- style -- */
    const CSS = `
.yma-root{--yma-bg:var(--dsw-alias-bg-base);--yma-s1:var(--dsw-alias-bg-layer-1);--yma-s2:var(--dsw-alias-bg-layer-2);
 --yma-l1:var(--dsw-alias-border-l1);--yma-l2:var(--dsw-alias-border-l2);
 --yma-fg:var(--dsw-alias-label-primary);--yma-fg2:var(--dsw-alias-label-secondary);
 --yma-brand:var(--dsw-alias-brand-primary);--yma-err:var(--dsw-alias-state-error-primary);
 --yma-r-sm:9px;--yma-r:13px;--yma-r-lg:18px;
 --yma-sh1:0 1px 2px rgba(0,0,0,.05),0 3px 10px -8px rgba(0,0,0,.22);
 --yma-sh2:0 8px 22px -12px rgba(0,0,0,.3),0 2px 8px -6px rgba(0,0,0,.15);
 --yma-sh3:0 28px 56px -30px rgba(0,0,0,.55),0 10px 24px -16px rgba(0,0,0,.3);
 --yma-ease:cubic-bezier(.22,.61,.36,1);--yma-t:170ms;
 display:flex;flex-direction:column;height:100%;min-height:0;position:relative;color:var(--yma-fg);
 background:var(--yma-bg);font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased;
 animation:ymaFade .26s var(--yma-ease) both}
.yma-root ::-webkit-scrollbar{width:10px;height:10px}
.yma-root ::-webkit-scrollbar-thumb{background:var(--yma-l2);border-radius:99px;border:3px solid transparent;background-clip:content-box}
.yma-root ::-webkit-scrollbar-thumb:hover{background:var(--yma-l1);background-clip:content-box}
.yma-root ::-webkit-scrollbar-track{background:transparent}

/* ---------------------------------------------------------------- head -- */
.yma-head{display:flex;align-items:center;gap:12px;padding:18px 24px 14px;flex:0 0 auto;position:relative;z-index:6}
.yma-brandmark{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;color:#fff;flex:0 0 auto;
 background:var(--yma-brand);
 background-image:linear-gradient(150deg,rgba(255,255,255,.28),rgba(0,0,0,.14));
 box-shadow:0 10px 22px -14px var(--yma-brand),inset 0 1px 0 rgba(255,255,255,.35);
 transition:transform var(--yma-t) var(--yma-ease)}
.yma-brandmark:hover{transform:rotate(-4deg) scale(1.04)}
.yma-h1{font-size:16.5px;font-weight:680;letter-spacing:.2px;margin:0;line-height:1.25}
.yma-h1sub{font-size:11.5px;color:var(--yma-fg2);margin-top:2px;letter-spacing:.1px}
.yma-pills{display:flex;gap:6px;margin-left:8px;flex-wrap:wrap}
.yma-pill{display:inline-flex;align-items:center;gap:5px;height:25px;padding:0 10px;border-radius:99px;
 background:var(--yma-s1);border:1px solid var(--yma-l1);color:var(--yma-fg2);font-size:11.5px;
 font-variant-numeric:tabular-nums;transition:border-color var(--yma-t),background var(--yma-t)}
.yma-pill:hover{background:var(--yma-s2)}
.yma-pill b{color:var(--yma-fg);font-weight:660}
.yma-grow{flex:1}

/* --------------------------------------------------------------- bars --- */
.yma-bar{display:flex;align-items:center;gap:10px;padding:0 24px 14px;flex:0 0 auto;flex-wrap:wrap}
.yma-seg{display:inline-flex;gap:2px;padding:3px;border-radius:12px;background:var(--yma-s1);border:1px solid var(--yma-l1)}
.yma-seg button{height:28px;padding:0 14px;border:0;border-radius:9px;background:transparent;color:var(--yma-fg2);
 font-size:12.5px;font-weight:500;cursor:pointer;transition:background var(--yma-t),color var(--yma-t),box-shadow var(--yma-t)}
.yma-seg button:hover{color:var(--yma-fg)}
.yma-seg button.on{background:var(--yma-s2);color:var(--yma-fg);font-weight:620;
 box-shadow:var(--yma-sh1),inset 0 1px 0 rgba(255,255,255,.06)}
.yma-search{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:11px;
 background:var(--yma-s1);border:1px solid var(--yma-l1);color:var(--yma-fg2);
 transition:border-color var(--yma-t),box-shadow var(--yma-t),background var(--yma-t)}
.yma-search:focus-within{border-color:var(--yma-brand);background:var(--yma-s2);
 box-shadow:0 0 0 3px rgba(127,127,127,.14)}
.yma-search .yma-input{border:0!important;background:transparent!important;height:30px;padding:0!important;
 box-shadow:none!important;width:220px}
.yma-count{font-size:11.5px;color:var(--yma-fg2);margin-left:auto;font-variant-numeric:tabular-nums}

/* --------------------------------------------------------------- body --- */
.yma-body{flex:1;display:flex;min-height:0;position:relative}
.yma-main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:auto;padding-bottom:12px}
.yma-grid{display:grid;gap:14px;padding:2px 24px 18px;
 grid-template-columns:repeat(auto-fill,minmax(196px,1fr));align-content:start}

/* --------------------------------------------------------------- card --- */
.yma-card{position:relative;display:flex;flex-direction:column;overflow:hidden;cursor:pointer;
 border-radius:var(--yma-r);background:var(--yma-s1);border:1px solid var(--yma-l1);
 box-shadow:var(--yma-sh1);
 transition:transform var(--yma-t) var(--yma-ease),box-shadow var(--yma-t) var(--yma-ease),
            border-color var(--yma-t),background var(--yma-t);
 animation:ymaUp .34s var(--yma-ease) both}
.yma-card:hover{transform:translateY(-3px);box-shadow:var(--yma-sh2);border-color:var(--yma-l2);background:var(--yma-s2)}
.yma-card:active{transform:translateY(-1px) scale(.995)}
.yma-card:focus-visible{outline:2px solid var(--yma-brand);outline-offset:2px}
.yma-card.on{border-color:var(--yma-brand);box-shadow:0 0 0 2px var(--yma-brand),var(--yma-sh2)}
.yma-card.on .yma-cname{color:var(--yma-fg)}
.yma-shot{position:relative;display:block;width:100%;padding-top:50%;overflow:hidden;background:var(--yma-s2)}
.yma-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#0c0c0d;
 transition:transform .5s var(--yma-ease),filter var(--yma-t)}
.yma-card:hover .yma-shot img{transform:scale(1.045)}
.yma-noimg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
 color:var(--yma-fg2);font-size:11px;letter-spacing:.3px;
 background:linear-gradient(110deg,var(--yma-s2) 30%,var(--yma-s1) 50%,var(--yma-s2) 70%);
 background-size:220% 100%;animation:ymaShimmer 2.4s linear infinite}
.yma-cbody{padding:10px 12px 12px;display:flex;flex-direction:column;gap:7px;min-width:0}
.yma-cname{font-size:12.5px;font-weight:600;line-height:1.35;color:var(--yma-fg);
 display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;min-height:2.7em}
.yma-cmeta{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.yma-chip{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:6px;
 background:var(--yma-s2);color:var(--yma-fg2);font-size:10.5px;font-variant-numeric:tabular-nums;
 border:1px solid transparent;transition:border-color var(--yma-t)}
.yma-card:hover .yma-chip{border-color:var(--yma-l1)}
.yma-chip--pin{background:var(--yma-brand);color:#fff;font-weight:600}
.yma-chip--pin::before{content:"";width:5px;height:5px;border-radius:50%;background:#fff;margin-right:5px;
 animation:ymaPulse 1.6s ease-in-out infinite}
.yma-stars{color:var(--yma-brand);letter-spacing:.5px;font-size:11px}
.yma-fav{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:9px;border:0;
 background:rgba(0,0,0,.44);color:#fff;display:grid;place-items:center;cursor:pointer;
 opacity:0;transform:scale(.9);transition:opacity var(--yma-t),transform var(--yma-t) var(--yma-ease),background var(--yma-t)}
.yma-card:hover .yma-fav{opacity:1;transform:scale(1)}
.yma-fav.on{opacity:1;transform:scale(1);background:rgba(255,255,255,.94);color:var(--yma-brand)}
.yma-fav:hover{background:rgba(255,255,255,.98);color:var(--yma-brand)}
.yma-check{position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:8px;padding:0;
 border:1.5px solid rgba(255,255,255,.85);background:rgba(0,0,0,.38);color:#fff;font-size:13px;line-height:1;
 display:grid;place-items:center;cursor:pointer;opacity:0;transform:scale(.9);
 transition:opacity var(--yma-t),transform var(--yma-t) var(--yma-ease),background var(--yma-t)}
.yma-card:hover .yma-check,.yma-check.on{opacity:1;transform:scale(1)}
.yma-check.on{background:var(--yma-brand);border-color:var(--yma-brand);color:#fff}
.yma-morepad{padding:6px 24px 28px;display:flex;justify-content:center}
.yma-empty{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
 padding:72px 20px;color:var(--yma-fg2);font-size:12.5px}

/* --------------------------------------------------------------- side --- */
.yma-side{width:376px;flex:0 0 376px;border-left:1px solid var(--yma-l1);display:flex;flex-direction:column;
 min-height:0;background:var(--yma-s1);animation:ymaSlideIn .28s var(--yma-ease) both}
.yma-sidehead{display:flex;align-items:flex-start;gap:8px;padding:16px 16px 12px;border-bottom:1px solid var(--yma-l1)}
.yma-sidename{font-size:14.5px;font-weight:660;margin:0;line-height:1.35;flex:1;word-break:break-word}
.yma-sidebody{flex:1;overflow:auto;padding:14px 16px 24px;display:block}
.yma-sidebody>*+*{margin-top:16px}
.yma-preview{display:block;width:100%;border-radius:var(--yma-r);overflow:hidden;
 border:1px solid var(--yma-l1);background:var(--yma-s2);box-shadow:var(--yma-sh1)}
.yma-kv{display:grid;grid-template-columns:70px 1fr;gap:8px 12px;margin:0;font-size:12px}
.yma-sidebody>.yma-kv{margin-top:18px}
.yma-kv dt{color:var(--yma-fg2)}
.yma-kv dd{margin:0;color:var(--yma-fg);word-break:break-all}
.yma-sect{display:flex;flex-direction:column;gap:9px;padding-top:14px;border-top:1px dashed var(--yma-l2)}
.yma-lbl{font-size:11.5px;color:var(--yma-fg2);letter-spacing:.4px;text-transform:none}
.yma-note{font-size:11.5px;color:var(--yma-fg2);line-height:1.6}

/* --------------------------------------------------------- form bits ---- */
.yma-input{width:100%;height:32px;padding:0 11px;border-radius:10px;background:var(--yma-s1);color:var(--yma-fg);
 border:1px solid var(--yma-l1);font-size:12.5px;font-family:inherit;outline:none;box-sizing:border-box;
 transition:border-color var(--yma-t),box-shadow var(--yma-t),background var(--yma-t)}
.yma-input::placeholder{color:var(--yma-fg2)}
.yma-input:hover{border-color:var(--yma-l2)}
.yma-input:focus{border-color:var(--yma-brand);background:var(--yma-s2);box-shadow:0 0 0 3px rgba(127,127,127,.14)}
.yma-input--sm{height:27px;font-size:12px}
.yma-ta{width:100%;min-height:96px;max-height:320px;resize:none;overflow-y:auto;border:1px solid var(--yma-l1);
 border-radius:var(--yma-r);background:var(--yma-s1);color:var(--yma-fg);padding:11px 13px;font-size:12.5px;
 line-height:1.7;font-family:inherit;outline:none;box-sizing:border-box;
 transition:border-color var(--yma-t),box-shadow var(--yma-t),height .08s,background var(--yma-t)}
.yma-ta:hover{border-color:var(--yma-l2)}
.yma-ta:focus{border-color:var(--yma-brand);background:var(--yma-s2);box-shadow:0 0 0 3px rgba(127,127,127,.14)}
.yma-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.yma-field{display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap}
.yma-field .yma-input{flex:1;min-width:240px}

/* ------------------------------------------------------------ buttons --- */
.yma-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;
 border-radius:10px;border:1px solid var(--yma-l2);background:var(--yma-s1);color:var(--yma-fg);
 font-size:12.5px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;
 transition:transform var(--yma-t) var(--yma-ease),background var(--yma-t),border-color var(--yma-t),
            box-shadow var(--yma-t),color var(--yma-t)}
.yma-btn:hover{background:var(--yma-s2);border-color:var(--yma-l1);box-shadow:var(--yma-sh1)}
.yma-btn:active{transform:translateY(1px) scale(.99)}
.yma-btn:focus-visible{outline:2px solid var(--yma-brand);outline-offset:2px}
.yma-btn:disabled{opacity:.42;cursor:not-allowed;transform:none;box-shadow:none}
.yma-btn--primary{color:#fff;border-color:transparent;background-color:var(--yma-brand);
 background-image:linear-gradient(180deg,rgba(255,255,255,.17),rgba(0,0,0,.1));
 box-shadow:0 10px 22px -14px var(--yma-brand),inset 0 1px 0 rgba(255,255,255,.24)}
.yma-btn--primary:hover{background-color:var(--yma-brand);border-color:transparent;
 box-shadow:0 12px 26px -14px var(--yma-brand),inset 0 1px 0 rgba(255,255,255,.3)}
.yma-btn--ghost{background:transparent;border-color:transparent;color:var(--yma-fg2)}
.yma-btn--ghost:hover{background:var(--yma-s2);color:var(--yma-fg);border-color:var(--yma-l1);box-shadow:none}
.yma-btn--danger{color:var(--yma-err);border-color:var(--yma-l2);background:var(--yma-s1)}
.yma-btn--danger:hover{background:var(--yma-s2);border-color:var(--yma-err)}
.yma-btn--sm{height:28px;padding:0 11px;font-size:12px;border-radius:9px}
.yma-iconbtn{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;border:0;
 background:transparent;color:var(--yma-fg2);cursor:pointer;
 transition:background var(--yma-t),color var(--yma-t),transform var(--yma-t)}
.yma-iconbtn:hover{background:var(--yma-s2);color:var(--yma-fg);transform:rotate(90deg)}
.yma-mini{border:1px solid var(--yma-l2);background:transparent;color:var(--yma-brand);border-radius:8px;
 font-size:11px;padding:3px 8px;cursor:pointer;margin-left:6px;white-space:nowrap;font-family:inherit;
 transition:background var(--yma-t),border-color var(--yma-t)}
.yma-mini:hover{background:var(--yma-s2);border-color:var(--yma-brand)}
.yma-mini--warn{color:var(--yma-err);border-color:var(--yma-err)}

/* -------------------------------------------------------------- tags ---- */
.yma-opts{display:flex;flex-direction:column;margin-top:8px;border:1px solid var(--yma-l1);
 border-radius:var(--yma-r);overflow:hidden;background:var(--yma-s1)}
.yma-opt{display:flex;align-items:flex-start;gap:10px;width:100%;padding:11px 13px;border:0;
 background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;
 transition:background var(--yma-t)}
.yma-opt + .yma-opt{border-top:1px solid var(--yma-l1)}
.yma-opt:hover{background:var(--yma-s2)}
.yma-opt-box{flex:0 0 18px;width:18px;height:18px;margin-top:1px;border-radius:5px;
 border:1.5px solid var(--yma-l2);display:grid;place-items:center;font-size:12px;line-height:1;
 color:transparent;transition:background var(--yma-t),border-color var(--yma-t),color var(--yma-t)}
.yma-opt.on .yma-opt-box{background:var(--yma-brand);border-color:var(--yma-brand);color:#fff}
.yma-opt-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.yma-opt-t{font-size:12.5px;font-weight:530;color:var(--yma-fg)}
.yma-opt-h{font-size:11px;color:var(--yma-fg2)}
.yma-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
/* adjacency: keep consecutive blocks from touching */
.yma-tags + .yma-row{margin-top:10px}
.yma-row + .yma-tags{margin-top:10px}
.yma-tags + .yma-note{margin-top:8px}
.yma-note + .yma-tags{margin-top:8px}
.yma-row + .yma-note{margin-top:8px}
.yma-starrow + .yma-row{margin-top:14px}
.yma-note + .yma-starrow{margin-top:10px}
.yma-sgrid > div > .yma-starrow{margin-top:2px}
.yma-note + .yma-row{margin-top:8px}
.yma-input + .yma-btn,.yma-btn + .yma-btn{margin-left:0}
.yma-tag{height:25px;padding:0 10px;border-radius:99px;border:1px solid var(--yma-l2);background:transparent;
 color:var(--yma-fg2);font-size:11.5px;cursor:pointer;font-family:inherit;
 transition:background var(--yma-t),color var(--yma-t),border-color var(--yma-t),transform var(--yma-t) var(--yma-ease)}
.yma-tag:hover{background:var(--yma-s2);color:var(--yma-fg);border-color:var(--yma-l1)}
.yma-tag:active{transform:scale(.96)}
.yma-tag.on{background:var(--yma-brand);border-color:transparent;color:#fff;font-weight:560;
 box-shadow:0 6px 14px -10px var(--yma-brand)}

/* ----------------------------------------------------------- star row --- */
.yma-starrow{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.yma-sh{width:22px;height:22px;padding:0;border:0;background:transparent;color:var(--yma-l2);
 font-size:15px;line-height:1;cursor:pointer;border-radius:6px;
 transition:color var(--yma-t),transform var(--yma-t) var(--yma-ease)}
.yma-sh:hover{transform:scale(1.18);color:var(--yma-brand)}
.yma-sh.on{color:var(--yma-brand)}
.yma-shval{font-size:11.5px;color:var(--yma-fg2);margin-left:8px;font-variant-numeric:tabular-nums}

/* ------------------------------------------------------------ settle ---- */
.yma-settle{margin:0 24px 13px;padding:16px 18px;border-radius:var(--yma-r-lg);
 background:var(--yma-s1);border:1px solid var(--yma-l1);box-shadow:var(--yma-sh2);
 animation:ymaUp .3s var(--yma-ease) both}
.yma-settle.warn{border-color:var(--yma-err);box-shadow:0 0 0 1px var(--yma-err),var(--yma-sh2)}
.yma-shead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.yma-stitle{font-size:13px;font-weight:640}
.yma-sdur{font-size:11.5px;color:var(--yma-fg2);margin-left:auto;font-variant-numeric:tabular-nums}
.yma-sgrid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(260px,1fr);gap:20px;margin-top:12px}
.yma-sname-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.yma-sname-row .yma-sname{margin-bottom:0}
.yma-sname-row .yma-input{flex:1;min-width:120px}
.yma-sname{font-size:14px;font-weight:660;margin-bottom:6px;word-break:break-word}
.yma-history{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.yma-hrow{display:flex;gap:8px;font-size:11.5px;color:var(--yma-fg2);justify-content:space-between}

/* ------------------------------------------------------- dialogs etc ---- */
.yma-overlay{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;
 background:rgba(0,0,0,.42);backdrop-filter:blur(3px);animation:ymaFade .18s var(--yma-ease) both}
.yma-dlg{width:560px;max-width:100%;max-height:84vh;overflow:auto;border-radius:var(--yma-r-lg);
 background:var(--yma-bg);border:1px solid var(--yma-l1);box-shadow:var(--yma-sh3);
 animation:ymaPop .24s var(--yma-ease) both}
.yma-dlg-head{display:flex;align-items:center;gap:8px;padding:16px 18px 12px;font-size:14px;font-weight:660;
 border-bottom:1px solid var(--yma-l1)}
.yma-dlg-body{padding:14px 18px 4px}
.yma-dlg-foot{display:flex;align-items:center;gap:8px;padding:12px 18px 16px;margin-top:12px;
 border-top:1px solid var(--yma-l1)}
.yma-toast{position:absolute;left:50%;bottom:88px;transform:translateX(-50%);z-index:20;max-width:70%;
 text-align:center;padding:9px 16px;border-radius:99px;font-size:12.5px;color:var(--yma-fg);
 background:var(--yma-s1);border:1px solid var(--yma-l2);box-shadow:var(--yma-sh2);pointer-events:none;
 animation:ymaToast .24s var(--yma-ease) both}
.yma-toast.err{border-color:var(--yma-err);color:var(--yma-err)}
.yma-prog{height:4px;border-radius:99px;background:var(--yma-s2);overflow:hidden;margin-top:8px}
.yma-prog i{display:block;height:100%;border-radius:99px;background:var(--yma-brand);
 transition:width .35s var(--yma-ease)}
.yma-batchbar{position:absolute;left:20px;bottom:20px;z-index:12;display:flex;gap:8px;align-items:center;
 flex-wrap:wrap;padding:10px 12px;border-radius:var(--yma-r);max-width:calc(100% - 440px);
 background:var(--yma-s1);border:1px solid var(--yma-l2);box-shadow:var(--yma-sh3);
 animation:ymaUp .22s var(--yma-ease) both}
.yma-batchbar .yma-input{height:28px;width:150px}

/* -------------------------------------------------------------- misc ---- */
.yma-author{font-size:11px;color:var(--yma-fg2);padding:16px 0 4px;text-align:center;letter-spacing:.2px}
.yma-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.yma-stat{position:relative;display:flex;flex-direction:column;gap:3px;padding:12px 13px;border-radius:var(--yma-r);
 background:var(--yma-s1);border:1px solid var(--yma-l1);overflow:hidden;
 transition:border-color var(--yma-t),transform var(--yma-t),box-shadow var(--yma-t)}
.yma-stat::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;
 background:linear-gradient(90deg,var(--yma-brand),transparent);opacity:.55}
.yma-stat:hover{border-color:var(--yma-l2);transform:translateY(-1px)}
.yma-stat b{font-size:17px;font-weight:680;color:var(--yma-fg);font-variant-numeric:tabular-nums}
.yma-stat span{font-size:11px;color:var(--yma-fg2)}
.yma-bar-k{flex:0 0 72px;color:var(--yma-fg2)}
.yma-bar-track{flex:1;height:8px;border-radius:99px;background:var(--yma-s2);overflow:hidden}
.yma-bar-track i{display:block;height:100%;border-radius:99px;
 background:linear-gradient(90deg,rgba(127,127,127,.35),var(--yma-brand));
 transition:width .5s var(--yma-ease)}
.yma-bar-v{flex:0 0 42px;text-align:right;color:var(--yma-fg);font-variant-numeric:tabular-nums}
.yma-bar .yma-bar-k,.yma-bar .yma-bar-v{font-size:11.5px}

.yma-trend{display:flex;gap:6px;align-items:flex-end;height:76px;margin-top:8px;padding:0 2px}
.yma-trend-day{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}
.yma-trend-v{font-size:10px;color:var(--yma-fg2);font-variant-numeric:tabular-nums;height:12px}
.yma-trend-bar{width:100%;min-height:3px;border-radius:5px 5px 2px 2px;
 background:linear-gradient(180deg,var(--yma-brand),rgba(127,127,127,.25));
 transition:height .5s var(--yma-ease)}
.yma-trend-lb{font-size:10px;color:var(--yma-fg2);font-variant-numeric:tabular-nums}
.yma-rank-row{display:flex;align-items:center;gap:10px;width:100%;padding:8px 8px;margin:0 -8px;
 border:0;border-bottom:1px dashed var(--yma-l2);background:transparent;color:inherit;
 font-family:inherit;text-align:left;cursor:pointer;border-radius:8px;
 transition:background var(--yma-t),transform var(--yma-t) var(--yma-ease)}
.yma-rank-row:hover{background:var(--yma-s2);transform:translateX(2px)}
.yma-rank-row:active{transform:translateX(0) scale(.995)}
.yma-rank-row:last-child{border-bottom:0}
.yma-rank{flex:0 0 20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:11px;
 font-weight:660;background:var(--yma-s2);color:var(--yma-fg2)}
.yma-rank-row:first-child .yma-rank{background:var(--yma-brand);color:#fff}
.yma-rank-name{flex:1;font-size:12.5px;word-break:break-word}
.yma-rank-meta{font-size:11.5px;color:var(--yma-fg2);font-variant-numeric:tabular-nums;white-space:nowrap}
.yma-help{flex:1;overflow:auto;padding:6px 24px 40px;max-width:900px}
.yma-help-sec{margin-bottom:26px}
.yma-help-h{font-size:13px;font-weight:660;margin-bottom:10px;color:var(--yma-fg)}
.yma-help-p{font-size:12.5px;line-height:1.9;color:var(--yma-fg2)}
.yma-help-row{display:flex;gap:14px;padding:7px 0;border-bottom:1px dashed var(--yma-l2);
 font-size:12.5px;line-height:1.7}
.yma-help-k{flex:0 0 150px;color:var(--yma-fg2)}
.yma-help-v{flex:1;color:var(--yma-fg)}
.yma-help-about{font-size:12.5px;line-height:2;color:var(--yma-fg2)}
.yma-help-mark{margin-top:10px;font-size:11.5px;color:var(--yma-fg2);letter-spacing:.3px}
.yma-setup{flex:1;overflow:auto;padding:6px 24px 28px;max-width:860px}
.yma-setup-step{border:1px solid var(--yma-l1);border-radius:var(--yma-r-lg);background:var(--yma-s1);
 padding:18px;margin-bottom:14px;box-shadow:var(--yma-sh1)}
.yma-setup-title{font-size:14px;font-weight:660}
.yma-setup-notes{margin-top:10px;font-size:11.5px;line-height:1.9}
.yma-filecell{display:block}
.yma-filerow{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.yma-filename{word-break:break-all}
.yma-nameerr{color:var(--yma-err);font-size:11.5px;margin-top:5px;line-height:1.5}
.yma-go-row{display:flex;gap:10px;align-items:flex-start;margin-top:9px}
.yma-settings{padding:2px 0 14px}
.yma-settings .yma-lbl{margin-bottom:2px}
.yma-settings .yma-row{margin-top:12px}
.yma-settings .yma-tags{margin-top:6px}
.yma-go-k{flex:0 0 84px;font-size:12px;color:var(--yma-fg2);padding-top:4px}
.yma-go-row .yma-tags{margin-top:0;flex:1}
.yma-backuprow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;
 border-bottom:1px dashed var(--yma-l2)}
.yma-backupmeta{flex:1;font-size:11.5px;color:var(--yma-fg2);word-break:break-all}

/* ---------------------------------------------------------- keyframes --- */
@keyframes ymaFade{from{opacity:0}to{opacity:1}}
@keyframes ymaUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes ymaPop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
@keyframes ymaSlideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
@keyframes ymaToast{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes ymaShimmer{from{background-position:120% 0}to{background-position:-120% 0}}
@keyframes ymaPulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){
  .yma-root *,.yma-card,.yma-side,.yma-dlg,.yma-toast,.yma-noimg{animation:none!important;transition:none!important}
}
@media (max-width:1100px){
  .yma-sgrid{grid-template-columns:1fr}
  .yma-side{width:330px;flex:0 0 330px}
}`;

    let injected = null;
    function injectStyle() {
      if (injected) return () => {};
      const el = document.createElement('style');
      el.setAttribute('data-yr-map-atlas', '');
      el.textContent = CSS;
      document.head.appendChild(el);
      injected = el;
      return () => { try { el.remove(); } catch { /* ignore */ } injected = null; };
    }

    /* -------------------------------------------------------- components -- */
    function SetupPage(props) {
      const seed = props.initial || {};
      const [lib, setLib] = useState(seed.lib || '');
      const [libInfo, setLibInfo] = useState(null);
      const [game, setGame] = useState(seed.game || '');
      const [gameInfo, setGameInfo] = useState(null);
      const [layout, setLayout] = useState(seed.layout || 'zh');
      const [lang, setLang] = useState('zh');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');

      const applyPick = async (which, dir) => {
        if (which === 'lib') { setLib(dir); setLibInfo(null); } else { setGame(dir); setGameInfo(null); }
        const r = await post('probe', { path: dir });
        if (!r.ok) return;
        if (which === 'lib') setLibInfo(r.result); else setGameInfo(r.result);
      };

      const pick = async (which) => {
        setErr('');
        try {
          const dir = await hostCtx.uiWorkspace.pickDirectory();
          if (dir) await applyPick(which, dir);
        } catch (e) { setErr(T('无法打开目录选择器：') + (e?.message || e)); }
      };

      const recheck = async () => {
        if (!lib) return;
        const r = await post('probe', { path: lib });
        if (r.ok) setLibInfo(r.result);
      };

      const switchLang = (id) => {
        setLang(id);
        try { hostCtx.locale.setLocale(id); } catch { /* ignore */ }
      };

      const start = async () => {
        if (!lib.trim()) { setErr(T('请先选择地图库文件夹')); return; }
        setBusy(true); setErr('');
        const r = await post('configure', {
          libraryRoot: lib.trim(),
          gameDir: game.trim() ? game.trim() : null,
          layout,
        });
        setBusy(false);
        if (!r.ok) { setErr(r.error || T('建立失败')); return; }
        if (props.onDone) props.onDone(r.result);
      };

      const libLines = [];
      if (libInfo) {
        if (!libInfo.exists) libLines.push(['muted', '· ' + tr('setup.willCreate')]);
        else {
          libLines.push(['ok', '✔ ' + tr('setup.exists') + (libInfo.writable ? ' · ' + tr('setup.okWrite') : ' · ' + tr('setup.noWrite'))]);
          if (libInfo.mapCount) libLines.push(['ok', '✔ ' + libInfo.mapCount + ' ' + tr('setup.mapsFound')]);
        }
        if (libInfo.hasAtlas) libLines.push(['ok', '✔ ' + tr('setup.hasAtlas')]);
      }

      const gameLines = [];
      if (gameInfo) {
        gameLines.push(gameInfo.gameExe.length
          ? ['ok', '✔ ' + tr('setup.exeFound') + '：' + gameInfo.gameExe.join(' · ')]
          : ['muted', '· ' + tr('setup.exeNone')]);
      }

      const row = (which, value, info, placeholderLabel) => h('div', { className: 'yma-field' },
        h('input', {
          className: 'yma-input', value, placeholder: tr('setup.pathPlaceholder'),
          onChange: (e) => { if (which === 'lib') { setLib(e.target.value); setLibInfo(null); } else { setGame(e.target.value); setGameInfo(null); } },
          onBlur: () => { if (value.trim()) applyPick(which, value.trim()); },
        }),
        h('button', { type: 'button', className: 'yma-btn', onClick: () => pick(which) }, tr('setup.choose')),
        which === 'lib'
          ? h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: recheck }, tr('setup.recheck'))
          : h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: () => { setGame(''); setGameInfo(null); } }, tr('setup.skip')));

      const lines = (arr) => h('div', { className: 'yma-setup-notes' },
        arr.map(([kind, text], i) => h('div', {
          key: i,
          style: { color: kind === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)' },
        }, text)));

      return h('div', { className: 'yma-root' },
        h('div', { className: 'yma-head' },
          h('div', { className: 'yma-brandmark' }, h(PanelIcon, { size: 18, active: false })),
          h('div', null,
            h('h1', { className: 'yma-h1' }, tr('title')),
            h('div', { className: 'yma-h1sub' },
              (props.initial ? T('插件设置') : tr('setup.title')) + ' · ' + tr('setup.sub'))),
          h('div', { className: 'yma-grow' }),
          h('div', { className: 'yma-seg' },
            [['zh', '中文'], ['en', 'English']].map(([id, label]) => h('button', {
              key: id, type: 'button', className: lang === id ? 'on' : '', onClick: () => switchLang(id),
            }, label)))),

        h('div', { className: 'yma-setup' },
          h('div', { className: 'yma-setup-step' },
            h('div', { className: 'yma-setup-title' }, tr('setup.lib')),
            h('div', { className: 'yma-lbl', style: { marginTop: 4 } }, tr('setup.libHint')),
            row('lib', lib, libInfo),
            lines(libLines),
            h('div', { className: 'yma-lbl', style: { marginTop: 16 } }, tr('setup.layout')),
            h('div', { className: 'yma-tags' },
              [['zh', tr('setup.layoutZh')], ['en', tr('setup.layoutEn')]].map(([id, label]) => h('button', {
                key: id, type: 'button', className: 'yma-tag' + (layout === id ? ' on' : ''),
                onClick: () => setLayout(id),
              }, label)))),

          h('div', { className: 'yma-setup-step' },
            h('div', { className: 'yma-setup-title' }, tr('setup.game')),
            h('div', { className: 'yma-lbl', style: { marginTop: 4 } }, tr('setup.gameHint')),
            row('game', game, gameInfo),
            lines(gameLines)),

          props.onCancel
            ? h('div', { className: 'yma-setup-step' }, h(GameOptions, null))
            : null,

          h('div', { className: 'yma-row', style: { marginTop: 22 } },
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--primary',
              disabled: busy || !lib.trim(), onClick: start,
            }, busy ? tr('setup.building') : tr('setup.start')),
            props.onCancel
              ? h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: props.onCancel }, tr('btn.close'))
              : null),
          err ? h('div', { className: 'yma-note', style: { color: 'var(--dsw-alias-state-error-primary)' } }, err) : null,
          props.onCancel
            ? h('div', { className: 'yma-note', style: { marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--yma-l2)' } },
              T('配置备份、体检、诊断包在「设置 → 红警地图册」里'))
            : null));
    }

    function ImportPage(props) {
      const im = props.imp || { status: 'idle' };
      const [source, setSource] = useState('');
      const [opts, setOpts] = useState({ duplicates: 'skip', naming: 'map', archives: 'extract', images: 'archive' });
      const [err, setErr] = useState('');
      const running = im.status === 'scanning' || im.status === 'running';
      const pct = im.total ? Math.round((im.done / im.total) * 100) : 0;

      const pick = async () => {
        setErr('');
        try {
          const dir = await hostCtx.uiWorkspace.pickDirectory();
          if (dir) setSource(dir);
        } catch (e) { setErr(T('无法打开目录选择器：') + (e?.message || e)); }
      };

      const doScan = async () => {
        if (!source.trim()) { setErr(T('请先选择文件夹')); return; }
        setErr('');
        const r = await post('importScan', { source: source.trim() });
        if (!r.ok) setErr(r.error || T('扫描失败'));
        else if (props.onRefresh) props.onRefresh();
      };

      const doRun = async () => {
        setErr('');
        const r = await post('importRun', { options: opts });
        if (!r.ok) setErr(r.error || T('导入失败'));
        else if (props.onRefresh) props.onRefresh();
      };

      const chip = (group, value, label) => h('button', {
        key: value, type: 'button',
        className: 'yma-tag' + (opts[group] === value ? ' on' : ''),
        onClick: () => setOpts({ ...opts, [group]: value }),
      }, label);

      const sum = im.summary;
      const res = im.result;

      return h('div', { className: 'yma-root' },
        h('div', { className: 'yma-head' },
          h('div', { className: 'yma-brandmark' }, h(PanelIcon, { size: 18, active: false })),
          h('div', null,
            h('h1', { className: 'yma-h1' }, T('导入地图')),
            h('div', { className: 'yma-h1sub' }, T('把旧文件夹里的地图和压缩包收进地图库'))),
          h('div', { className: 'yma-grow' }),
          h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: props.onClose }, T('关闭'))),

        h('div', { className: 'yma-setup' },
          h('div', { className: 'yma-setup-step' },
            h('div', { className: 'yma-setup-title' }, T('① 选择要导入的文件夹')),
            h('div', { className: 'yma-lbl', style: { marginTop: 4 } }, T('选原来的地图目录，或放着压缩包的下载文件夹')),
            h('div', { className: 'yma-field' },
              h('input', {
                className: 'yma-input', value: source,
                placeholder: T('粘贴路径或点右边选择'),
                onChange: (e) => setSource(e.target.value),
              }),
              h('button', { type: 'button', className: 'yma-btn', onClick: pick }, T('选择文件夹')),
              h('button', {
                type: 'button', className: 'yma-btn yma-btn--primary',
                disabled: running || !source.trim(), onClick: doScan,
              }, running && im.status === 'scanning' ? T('扫描中…') : T('开始扫描')))),

          running
            ? h('div', { className: 'yma-setup-step' },
              h('div', { className: 'yma-setup-title' },
                (im.status === 'scanning' ? T('正在扫描…') : T('正在导入…')) + '  ' + im.done + ' / ' + im.total),
              h('div', { className: 'yma-prog', style: { marginTop: 10 } }, h('i', { style: { width: pct + '%' } })),
              h('div', { className: 'yma-row' },
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--danger',
                  onClick: () => post('importCancel', {}),
                }, T('取消'))))
            : null,

          sum
            ? h('div', { className: 'yma-setup-step' },
              h('div', { className: 'yma-setup-title' }, T('② 扫描结果')),
              h('div', { className: 'yma-setup-notes', style: { marginTop: 8 } },
                h('div', null, sum.total + T(' 个文件，') + (sum.bytes / 1048576 / 1024).toFixed(2) + ' GB'),
                h('div', null, T('地图 ') + sum.maps + T(' 张 · 与库重复 ') + sum.dup + T(' · 可新增 ') + sum.fresh),
                h('div', null, T('压缩包 ') + sum.archives + T(' · 官方图包 ') + sum.containers
                  + T(' · 图片 ') + sum.images + T(' · 其它 ') + sum.other)))
            : null,

          sum
            ? h('div', { className: 'yma-setup-step' },
              h('div', { className: 'yma-setup-title' }, T('③ 处理方式')),
              h('div', { className: 'yma-lbl', style: { marginTop: 12 } }, T('重复地图（与库里内容相同的）')),
              h('div', { className: 'yma-tags' },
                chip('duplicates', 'skip', T('只留一份')),
                chip('duplicates', 'move', T('移到 _重复')),
                chip('duplicates', 'all', T('全都保留'))),
              h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('文件名')),
              h('div', { className: 'yma-tags' },
                chip('naming', 'map', T('用地图内部名')),
                chip('naming', 'keep', T('保持原文件名'))),
              h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('压缩包')),
              h('div', { className: 'yma-tags' },
                chip('archives', 'extract', T('解压后归档')),
                chip('archives', 'archive', T('原样归档'))),
              h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('预览图')),
              h('div', { className: 'yma-tags' },
                chip('images', 'archive', T('归档')),
                chip('images', 'skip', T('跳过'))),
              h('div', { className: 'yma-row', style: { marginTop: 18 } },
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--primary', disabled: running, onClick: doRun,
                }, T('开始导入'))))
            : null,

          res
            ? h('div', { className: 'yma-setup-step' },
              h('div', { className: 'yma-setup-title' }, T('④ 完成')),
              h('div', { className: 'yma-setup-notes', style: { marginTop: 8 } },
                h('div', null, T('✔ 新增地图 ') + res.moved + T(' 张')),
                h('div', null, T('· 跳过重复 ') + res.skipped + T(' · 移到 _重复 ') + res.duped),
                h('div', null, T('· 归档压缩包 ') + res.archived + T(' · 解出地图 ') + res.extracted),
                h('div', null, T('· 归档图片 ') + res.images + T(' · 官方图包 ') + res.containers),
                res.errors.length
                  ? h('div', { style: { color: 'var(--dsw-alias-state-warn-primary)' } },
                    '⚠ ' + res.errors.length + T(' 个文件处理失败：') + res.errors.slice(0, 3).join('；'))
                  : null),
              im.manifestPath
                ? h('div', { className: 'yma-row' },
                  h('button', {
                    type: 'button', className: 'yma-btn',
                    onClick: async () => {
                      if (!window.confirm(T('把这次导入的文件全部搬回原处？'))) return;
                      const r = await post('importUndo', { manifest: im.manifestPath });
                      if (r.ok) { setErr(T('已还原 ') + r.result.restored + T(' 个文件')); if (props.onRefresh) props.onRefresh(); }
                      else setErr(r.error || T('撤销失败'));
                    },
                  }, T('撤销这次导入')))
                : null)
            : null,

          im.error ? h('div', { className: 'yma-note', style: { color: 'var(--dsw-alias-state-error-primary)' } }, im.error) : null,
          err ? h('div', { className: 'yma-note', style: { color: 'var(--dsw-alias-state-error-primary)' } }, err) : null));
    }

    function SettingsPage() {
      const [st, setSt] = useState(null);
      const [lib, setLib] = useState('');
      const [game, setGame] = useState('');
      const [layout, setLayout] = useState('zh');
      const [busy, setBusy] = useState('');
      const [msg, setMsg] = useState('');
      const [backups, setBackups] = useState(null);
      const [cfgMsg, setCfgMsg] = useState('');

      const loadBackups = async () => {
        const r = await post('listConfigs', {});
        if (r.ok) setBackups(r.result); else setCfgMsg(r.error || T('读取失败'));
      };

      const refresh = async () => {
        const r = await get('/state');
        if (r.ok) {
          setSt(r.result);
          setLib((v) => v || r.result.libraryRoot || '');
          setGame((v) => v || r.result.gameDir || '');
          setLayout(r.result.layoutId || 'zh');
        }
      };
      useEffect(() => { refresh(); loadBackups(); }, []);
      useEffect(() => {
        const hp0 = st && st.health;
        if (!hp0 || hp0.status !== 'running') return undefined;
        const t = setInterval(refresh, 1200);
        return () => clearInterval(t);
      }, [st]);

      const save = async () => {
        setBusy('save'); setMsg('');
        const r = await post('configure', {
          libraryRoot: lib.trim(), gameDir: game.trim() || null, layout,
        });
        setBusy('');
        setMsg(r.ok ? T('已保存，正在重建索引') : (r.error || T('保存失败')));
        refresh();
      };

      const health = async (apply) => {
        setBusy('health'); setMsg('');
        const r = await post('healthRun', { apply });
        setBusy('');
        setMsg(r.ok ? (apply ? T('检查并修复已开始') : T('开始检查')) : (r.error || T('启动失败')));
        refresh();
      };

      const diag = async () => {
        setBusy('diag'); setMsg('');
        const r = await post('exportDiagnostics', {});
        setBusy('');
        setMsg(r.ok ? T('诊断包已生成：') + r.result.path : (r.error || T('导出失败')));
      };

      const strays = async () => {
        setBusy("strays"); setMsg("");
        const r = await post("gameStrays", {});
        setBusy("");
        if (!r.ok) { setMsg(r.error || T("操作失败")); return; }
        const items = (r.result && r.result.items) || [];
        if (!items.length) { setMsg(T("游戏目录很干净，没有库外的地图")); return; }
        const names = items.map((x) => x.file).join("\n");
        if (!window.confirm(T("游戏目录里有 ") + items.length + T(" 张库外的地图：\n\n") + names
          + T("\n\n要把它们移回待整理吗？"))) return;
        const m = await post("gameStraysMove", { files: items.map((x) => x.file) });
        setMsg(m.ok ? T("已移回待整理 ") + m.result.done + T(" 张") : (m.error || T("操作失败")));
      };

      const rebuildThumbs = async () => {
        if (!window.confirm(T("重建全部缩略图？地图多的话会跑一会儿。"))) return;
        setBusy("thumbs"); setMsg("");
        const r = await post("rebuildThumbs", {});
        setBusy("");
        setMsg(r.ok ? T("已清空 ") + r.result.removed + T(" 张缩略图，正在后台重新生成") : (r.error || T("操作失败")));
      };

      const doExport = async () => {
        setBusy('cfg'); setCfgMsg('');
        const r = await post('exportConfig', {});
        setBusy('');
        if (!r.ok) { setCfgMsg(r.error || T('导出失败')); return; }
        setCfgMsg(T('已导出：') + r.result.records + T(' 条记录、') + r.result.names + T(' 个命名'));
        loadBackups();
      };

      const doImport = async (path, mode) => {
        const label = mode === 'replace' ? T('覆盖') : T('合并');
        if (!window.confirm(T('确定用「') + label + T('」方式导入这份配置？'))) return;
        setBusy('cfg'); setCfgMsg('');
        const r = await post('importConfig', { path, mode });
        setBusy('');
        if (!r.ok) { setCfgMsg(r.error || T('导入失败')); return; }
        setCfgMsg(T('已导入 ') + r.result.applied + T(' 条（跳过 ') + r.result.skipped
          + T(' 条，') + r.result.orphan + T(' 条在库里找不到对应地图）'));
        refresh();
      };

      const hp = st && st.health;
      const running = hp && hp.status === 'running';
      const pct = hp && hp.total ? Math.round((hp.done / hp.total) * 100) : 0;

      return h('div', { className: 'yma-root', style: { height: 'auto', background: 'transparent' } },
        h('div', { className: 'yma-settings' },
          h('div', { className: 'yma-lbl' }, T('地图库位置')),
          h('div', { className: 'yma-field' },
            h('input', { className: 'yma-input', value: lib, onChange: (e) => setLib(e.target.value) })),
          h('div', { className: 'yma-lbl', style: { marginTop: 12 } }, T('游戏目录（留空 = 纯收藏）')),
          h('div', { className: 'yma-field' },
            h('input', {
              className: 'yma-input', value: game, placeholder: T('不填就不启动游戏'),
              onChange: (e) => setGame(e.target.value),
            })),
          h('div', { className: 'yma-lbl', style: { marginTop: 12 } }, T('目录命名')),
          h('div', { className: 'yma-tags' },
            [['zh', '中文'], ['en', 'English']].map(([id, label]) => h('button', {
              key: id, type: 'button', className: 'yma-tag' + (layout === id ? ' on' : ''),
              onClick: () => setLayout(id),
            }, label))),
          h('div', { className: 'yma-row', style: { marginTop: 18 } },
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--primary', disabled: !!busy, onClick: save,
            }, busy === 'save' ? T('保存中…') : T('保存')),
            st && st.configured
              ? h('span', { className: 'yma-chip' }, st.counts.pool + T(' 待整理 · ') + st.counts.owned + T(' 已整理'))
              : h('span', { className: 'yma-chip' }, T('尚未初始化'))),

          h('div', { className: 'yma-lbl', style: { marginTop: 26 } }, T('维护')),
          h('div', { className: 'yma-row', style: { marginTop: 4 } },
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy || running,
              onClick: () => health(false),
            }, T('检查地图')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy || running,
              onClick: () => health(true),
            }, T('检查并修复')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy,
              onClick: async () => {
              const r = await post('rescan', {});
              if (!r.ok) setMsg(r.error || T('操作失败'));
              else refresh();
            },
            }, T('重建索引')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy, onClick: diag,
            }, busy === 'diag' ? T('打包中…') : T('导出诊断包')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy, onClick: strays,
            }, busy === 'strays' ? T('检查中…') : T('检查游戏目录残留')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy, onClick: rebuildThumbs,
            }, busy === 'thumbs' ? T('处理中…') : T('重建缩略图'))),

          h('div', { className: 'yma-lbl', style: { marginTop: 26 } }, T('配置备份')),
          h('div', { className: 'yma-note' },
            T('只有评价记录，不含地图文件。')),
          h('div', { className: 'yma-row', style: { marginTop: 4 } },
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm yma-btn--primary',
              disabled: !!busy, onClick: doExport,
            }, busy === 'cfg' ? T('处理中…') : T('导出配置')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy, onClick: loadBackups,
            }, T('刷新列表'))),
          cfgMsg ? h('div', { className: 'yma-note', style: { marginTop: 8 } }, cfgMsg) : null,
          backups && backups.items && backups.items.length
            ? h('div', { style: { marginTop: 8 } },
              backups.items.slice(0, 5).map((b, i) => h('div', { key: i, className: 'yma-backuprow' },
                h('span', { className: 'yma-backupmeta' },
                  (b.exportedAt ? String(b.exportedAt).replace('T', ' ').slice(0, 16) : b.name)
                  + ' · ' + b.records + T(' 条记录') + ' · ' + b.names + T(' 个命名')
                  + ' · schema ' + b.schema),
                h('button', {
                  type: 'button', className: 'yma-mini', disabled: !!busy,
                  onClick: () => doImport(b.path, 'merge'),
                }, T('合并导入')),
                h('button', {
                  type: 'button', className: 'yma-mini yma-mini--warn', disabled: !!busy,
                  onClick: () => doImport(b.path, 'replace'),
                }, T('覆盖导入')))))
            : h('div', { className: 'yma-note', style: { marginTop: 8 } }, T('还没有备份')),

          running
            ? h('div', { style: { marginTop: 10 } },
              h('div', { className: 'yma-h1sub' }, T('检查中 ') + hp.done + ' / ' + hp.total),
              h('div', { className: 'yma-prog' }, h('i', { style: { width: pct + '%' } })))
            : null,

          hp && hp.status === 'done' && hp.report
            ? h('div', { className: 'yma-setup-notes', style: { marginTop: 10 } },
              h('div', null, T('✔ 正常 ') + hp.report.ok + T(' · 可修复 ') + hp.report.fixed
                + T(' · 已隔离 ') + hp.report.broken + T(' · 格式异常 ') + hp.report.noted),
              hp.report.changes.slice(0, 3).map((c, i) => h('div', { key: i },
                '· ' + c.file + '：' + (c.issues[0] || ''))))
            : null,

          msg ? h('div', { className: 'yma-note' }, msg) : null,
          h('div', { className: 'yma-author' },
            T('红警地图册') + ' v' + ((st && st.pluginVersion) || '0.2.0')
            + ' · ' + T('一尾醋醋鱼') + ' · bilibili · GitHub/chuvyu')));
    }

    function HelpPage(props) {
      useLocaleTick();
      const st = props.state || {};
      const V = st.pluginVersion || '0.2.0';
      const sec = (title, body) => h('div', { className: 'yma-help-sec' },
        h('div', { className: 'yma-help-h' }, title), body);
      const row = (k, v) => h('div', { className: 'yma-help-row' },
        h('span', { className: 'yma-help-k' }, k), h('span', { className: 'yma-help-v' }, v));

      return h('div', { className: 'yma-root' },
        h('div', { className: 'yma-head' },
          h('div', { className: 'yma-brandmark' }, h(PanelIcon, { size: 18, active: false })),
          h('div', null,
            h('h1', { className: 'yma-h1' }, T('红警地图册')),
            h('div', { className: 'yma-h1sub' }, T('使用说明与常见问题'))),
          h('div', { className: 'yma-grow' }),
          h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: props.onClose }, T('关闭'))),

        h('div', { className: 'yma-help' },
          sec(T('它是什么'), h('div', { className: 'yma-help-p' },
            T('把散落的地图整理成库，抽一张进游戏，打完按星级归位，顺手记下心得。'),
            h('br'),
            T('地图文件内容不动，只按你的评价换文件夹；所有记录存在库里的 .atlas 目录。'))),

          sec(T('怎么用'), h('div', null,
            row(T('1 放地图'), T('把地图文件放进 00-待整理\\遭遇战，或点右上「导入」批量收进来')),
            row(T('2 抽图'), T('点「抽一张」，选尤里或红警2，地图会复制进游戏目录并启动游戏')),
            row(T('3 打完'), T('回到面板点「确认归位」，给星级、选标签、写几句心得')),
            row(T('4 归位'), T('文件自动移到 01-遭遇战\\N人\\N星，之后抽图不会再抽到已评价的图')),
            row(T('5 找图'), T('按人数、地形、星级、标签筛选；已整理的地图可以点星收藏')))),

          sec(T('目录说明'), h('div', null,
            row('00-待整理', T('还没评价的图，抽图从这里取')),
            row('01-遭遇战', T('已归位的对战图，按人数和星级分层')),
            row('02-任务图', T('战役和任务包')),
            row('03-源文件', T('压缩包、预览图等原始素材')),
            row('.atlas', T('索引、缩略图、记录；跟着库走，换电脑拷过去即可')))),

          sec(T('常见问题'), h('div', null,
            row(T('改名会丢记录吗？'), T('不会。记录按文件内容（MD5）认，改名、移动都不影响。')),
            row(T('星级为什么存两处？'), T('文件夹代表位置，记录代表分数；在面板里评级时两者一起改。')),
            row(T('官方图能评价吗？'), T('能评分、能写心得，但文件是游戏自带的，不会移动或改名。')),
            row(T('地图一进就崩？'), T('结算卡先点「一键修复」，修不了再点「异常修复」，把崩溃现场交给 AI 分析。')),
            row(T('换电脑怎么搬？'), T('设置里「导出配置」，新机器「导入配置」，再把整个地图库文件夹拷过去。')),
            row(T('导出的是地图吗？'), T('不是。只有星级、标签、心得、收藏和手工命名，地图文件请自行拷贝。')),
            row(T('导入会覆盖吗？'), T('默认合并，只补本地没有的记录；想全部覆盖选「覆盖」模式。')),
            row(T('能同时用多个库吗？'), T('一次一个库。换库在设置里改路径，旧库的数据留在旧文件夹里。')))),

          sec(T('关于'), h('div', { className: 'yma-help-about' },
            h('div', null, T('红警地图册') + ' v' + V),
            h('div', null, T('作者') + '：' + T('一尾醋醋鱼') + '（bilibili）'),
            h('div', null, 'GitHub：https://github.com/chuvyu/yr-map-atlas'),
            h('div', null, T('配置格式') + ' schema ' + (st.configSchema || 1)),
            h('div', { className: 'yma-help-mark' }, '© ' + T('一尾醋醋鱼') + ' · bilibili · GitHub/chuvyu')))));
    }

    function DrawDialog(props) {
      useLocaleTick();
      const st = props.state || {};
      const [zone, setZone] = useState('pool');
      const [players, setPlayers] = useState([]);
      const [theaters, setTheaters] = useState([]);
      const [stars, setStars] = useState([]);
      const [tags, setTags] = useState([]);
      const [onlyFav, setOnlyFav] = useState(false);
      const [avoidRecent, setAvoidRecent] = useState(true);
      const [weighted, setWeighted] = useState(false);
      const [count, setCount] = useState(null);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');

      const owned = zone === 'owned';
      const query = () => ({
        zone,
        players,
        theaters,
        stars: owned ? stars : [],
        tags: owned ? tags : [],
        fav: owned && onlyFav,
        avoidRecent,
        weighted,
      });

      useEffect(() => {
        let dead = false;
        const t = setTimeout(async () => {
          const r = await post('drawCount', query());
          if (!dead && r.ok) setCount(r.result.count);
        }, 160);
        return () => { dead = true; clearTimeout(t); };
      }, [zone, players, theaters, stars, tags, onlyFav]);

      const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat([v]));
      const chip = (label, on, fn, key) => h('button', {
        key: key || label, type: 'button', className: 'yma-tag' + (on ? ' on' : ''), onClick: fn,
      }, label);

      const draw = async () => {
        setBusy(true); setErr('');
        const r = await post('draw', query());
        setBusy(false);
        if (!r.ok) { setErr(r.error || T('抽图失败')); return; }
        props.onDrawn(r.result, r.matched);
      };

      return h('div', { className: 'yma-overlay', onClick: (e) => { if (e.target === e.currentTarget) props.onClose(); } },
        h('div', { className: 'yma-dlg' },
          h('div', { className: 'yma-dlg-head' },
            h(IconFilter, { size: 15 }), T('条件抽取'), h('div', { className: 'yma-grow' }),
            h('button', {
              type: 'button', className: 'yma-iconbtn', onClick: props.onClose, 'aria-label': T('关闭'),
            }, h(IconClose, { size: 14 }))),
          h('div', { className: 'yma-dlg-body' },
            h('div', { className: 'yma-lbl' }, T('从哪儿抽')),
            h('div', { className: 'yma-tags' },
              chip(T('待整理'), !owned, () => setZone('pool')),
              chip(T('已整理'), owned, () => setZone('owned'))),

            h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('人数')),
            h('div', { className: 'yma-tags' },
              [2, 3, 4, 5, 6, 7, 8].map((n) => chip(n + T('人'), players.includes(n),
                () => toggle(players, setPlayers, n), 'p' + n))),

            h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('地形')),
            h('div', { className: 'yma-tags' },
              TERRAIN.map((t) => chip(t.label, theaters.includes(t.values[0]),
                () => toggle(theaters, setTheaters, t.values[0]), 't' + t.label))),

            owned ? h('div', null,
              h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('星级')),
              h('div', { className: 'yma-tags' },
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => chip(n + T(' 星'), stars.includes(n),
                  () => toggle(stars, setStars, n), 's' + n))),

              h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('标签')),
              (st.tags && st.tags.length
                ? h('div', { className: 'yma-tags' },
                  st.tags.slice(0, 24).map((t) => chip(t.tag, tags.includes(t.tag),
                    () => toggle(tags, setTags, t.tag), 'g' + t.tag)))
                : h('div', { className: 'yma-note' }, T('还没有任何标签'))),

              h('div', { className: 'yma-tags', style: { marginTop: 14 } },
                chip(T('只看收藏'), onlyFav, () => setOnlyFav(!onlyFav), 'fav')))
              : null,

            h('div', { className: 'yma-lbl', style: { marginTop: 16 } }, T('抽图偏好')),
            h('div', { className: 'yma-opts' },
              h('button', {
                type: 'button', role: 'checkbox', 'aria-checked': avoidRecent,
                className: 'yma-opt' + (avoidRecent ? ' on' : ''),
                onClick: () => setAvoidRecent(!avoidRecent),
              },
              h('span', { className: 'yma-opt-box' }, avoidRecent ? '✓' : ''),
              h('span', { className: 'yma-opt-txt' },
                h('span', { className: 'yma-opt-t' }, T('避开最近抽过的')),
                h('span', { className: 'yma-opt-h' }, T('跳过最近 20 次抽到的图')))),
              h('button', {
                type: 'button', role: 'checkbox', 'aria-checked': weighted,
                className: 'yma-opt' + (weighted ? ' on' : ''),
                onClick: () => setWeighted(!weighted),
              },
              h('span', { className: 'yma-opt-box' }, weighted ? '✓' : ''),
              h('span', { className: 'yma-opt-txt' },
                h('span', { className: 'yma-opt-t' }, T('按星级加权')),
                h('span', { className: 'yma-opt-h' }, T('5 星图的抽中概率是 0 星的 3 倍')))))),

          h('div', { className: 'yma-dlg-foot' },
            h('span', { className: 'yma-note', style: { margin: 0 } },
              count === null ? '' : (count ? T('符合条件 ') + count + T(' 张') : T('没有符合条件的图'))),
            h('div', { className: 'yma-grow' }),
            h('button', { type: 'button', className: 'yma-btn yma-btn--ghost', onClick: props.onClose }, T('取消')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--primary', disabled: busy || count === 0, onClick: draw,
            }, busy ? T('抽取中…') : T('抽取')))),
        err ? h('div', { className: 'yma-note', style: { color: 'var(--yma-err)', padding: '0 18px 12px' } }, err) : null);
    }

    function GameOptions() {
      useLocaleTick();
      const [mode, setMode] = useState('yr');
      const [info, setInfo] = useState(null);
      const [vals, setVals] = useState({});
      const [custom, setCustom] = useState('');
      const [applyOn, setApplyOn] = useState(false);
      const [busy, setBusy] = useState('');
      const [msg, setMsg] = useState('');

      const load = async (m) => {
        const r = await post('getGameOptions', { mode: m });
        if (!r.ok) { setMsg(r.error || T('读取失败')); return; }
        setInfo(r.result);
        setVals(r.result.values || {});
        setCustom(r.result.custom || '');
        setApplyOn(!!r.result.applyOnLaunch);
        setMsg('');
      };
      useEffect(() => { load(mode); /* eslint-disable-next-line */ }, [mode]);

      const set = (k, v) => setVals({ ...vals, [k]: v });
      const pick = (k, v) => setVals({
        ...vals,
        // clicking the active value clears the key; the host then removes it from the INI
        [k]: String(vals[k]) === String(v) ? '' : String(v),
      });

      const save = async (applyNow) => {
        setBusy('save'); setMsg('');
        const r = await post('saveGameOptions', {
          values: vals, custom, applyOnLaunch: applyOn, applyNow, mode,
        });
        setBusy('');
        if (!r.ok) { setMsg(r.error || T('保存失败')); return; }
        setMsg(applyNow ? T('已写入游戏配置') : T('已保存'));
        load(mode);
      };

      const restore = async () => {
        if (!window.confirm(T('还原到首次写入前的原始配置？当前游戏设置会被覆盖。'))) return;
        setBusy('restore'); setMsg('');
        const r = await post('restoreGameIni', { mode });
        setBusy('');
        setMsg(r.ok ? T('已还原原始配置') : (r.error || T('还原失败')));
        load(mode);
      };

      const MODES = [
        ['1', '作战', '所有电脑围攻你一个'],
        ['2', '自由交战', '大乱斗'],
        ['3', '合作模式', '和小队协作'],
        ['4', '邪恶联盟', '可发展所有国家的科技'],
        ['5', '巨富', '无矿场，只能靠占油井收入'],
        ['6', '抢地盘', '开局几条狗，地盘全靠抢'],
        ['7', '生死斗', '无高科技'],
        ['8', '海战', '无坦克'],
        ['9', '小队联盟', '和电脑一起打电脑'],
      ];

      const row = (label, options, key) => h('div', { className: 'yma-go-row' },
        h('span', { className: 'yma-go-k' }, label),
        h('div', { className: 'yma-tags' },
          options.map(([v, text]) => h('button', {
            key: v, type: 'button',
            className: 'yma-tag' + (String(vals[key]) === String(v) ? ' on' : ''),
            onClick: () => pick(key, v),
          }, text))));

      const yesNo = (label, key) => row(label, [['yes', T('开')], ['no', T('关')]], key);

      return h('div', null,
        h('div', { className: 'yma-lbl', style: { marginTop: 18 } }, T('作战配置')),
        h('div', { className: 'yma-note' },
          T('启动游戏前自动写入，第一次会备份原文件。')),

        h('div', { className: 'yma-tags', style: { marginTop: 6 } },
          [['yr', T('尤里的复仇') + ' (RA2MD.INI)'], ['ra2', T('红警2') + ' (RA2.INI)']].map(([m, text]) => h('button', {
            key: m, type: 'button', className: 'yma-tag' + (mode === m ? ' on' : ''),
            onClick: () => setMode(m),
          }, text))),

        info && !info.exists
          ? h('div', { className: 'yma-note', style: { color: 'var(--yma-err)' } },
            T('找不到文件：') + info.path)
          : null,

        info && info.exists ? h('div', null,
          h('div', { className: 'yma-go-row' },
            h('span', { className: 'yma-go-k' }, T('游戏模式')),
            h('div', { className: 'yma-tags' },
              MODES.map(([v, name, desc]) => h('button', {
                key: v, type: 'button', title: desc,
                className: 'yma-tag' + (String(vals.GameMode) === v ? ' on' : ''),
                onClick: () => pick('GameMode', v),
              }, v + ' ' + T(name))))),
          h('div', { className: 'yma-note' },
            vals.GameMode
              ? T('当前：') + T((MODES.find((m) => m[0] === String(vals.GameMode)) || [0, '未知'])[1])
                + ' — ' + T((MODES.find((m) => m[0] === String(vals.GameMode)) || [0, '', ''])[2] || '')
              : T('当前未设置，游戏默认是 1 作战')),
          h('div', { className: 'yma-note', style: { color: 'var(--yma-err)' } },
            T('游戏开着时改了会被覆盖，先关游戏。')),

          row(T('起始资金'), [['10000', '10000'], ['20000', '20000'], ['50000', '50000']], 'Credits'),
          row(T('游戏速度'), [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], 'GameSpeed'),
          row(T('单位数'), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((n) => [n, n]), 'UnitCount'),
          yesNo(T('快速游戏'), 'ShortGame'),
          yesNo(T('超级武器'), 'SuperWeaponsAllowed'),
          yesNo(T('箱子'), 'CratesAppear'),
          yesNo(T('盟友建造'), 'BuildOffAlly'),
          yesNo(T('MCV 重部署'), 'MCVRepacks'),
          yesNo(T('迷雾'), 'FogOfWar'),
          yesNo(T('多工程师'), 'MultiEngineer'),
          yesNo(T('可摧毁桥梁'), 'BridgeDestruction')) : null,

        h('div', { className: 'yma-lbl', style: { marginTop: 14 } }, T('自定义参数')),
        h('div', { className: 'yma-note' }, T('每行一个 key=value。')),
        h('textarea', {
          className: 'yma-ta', value: custom, spellCheck: false,
          placeholder: 'FogOfWar=yes\nHarvesterTruce=yes',
          onChange: (e) => setCustom(e.target.value),
        }),

        h('div', { className: 'yma-tags', style: { marginTop: 8 } },
          h('button', {
            type: 'button', className: 'yma-tag' + (applyOn ? ' on' : ''),
            onClick: () => setApplyOn(!applyOn),
          }, T('启动游戏前自动应用'))),

        h('div', { className: 'yma-row', style: { marginTop: 10 } },
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--sm yma-btn--primary', disabled: !!busy,
            onClick: () => save(false),
          }, busy === 'save' ? T('保存中…') : T('保存')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--sm', disabled: !!busy,
            onClick: () => save(true),
          }, T('立即写入')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost', disabled: !!busy,
            onClick: restore,
          }, busy === 'restore' ? T('还原中…') : T('还原备份'))),

        msg ? h('div', { className: 'yma-note', style: { marginTop: 6 } }, msg) : null);
    }

    function StatsDialog(props) {
      useLocaleTick();
      const [st, setSt] = useState(null);
      useEffect(() => { post('stats', {}).then((r) => { if (r.ok) setSt(r.result); }); }, []);
      const s = st || {};
      const dur = (ms) => {
        const m = Math.round((ms || 0) / 60000);
        return m < 60 ? m + T(' 分钟') : Math.floor(m / 60) + T(' 小时 ') + (m % 60) + T(' 分');
      };
      const card = (v, k, key) => h('div', { className: 'yma-stat', key },
        h('b', null, v), h('span', null, k));
      const bar = (label, n, max, key) => h('div', { className: 'yma-bar', key },
        h('span', { className: 'yma-bar-k' }, label),
        h('span', { className: 'yma-bar-track' },
          h('i', { style: { width: (max ? Math.max(4, Math.round((n / max) * 100)) : 0) + '%' } })),
        h('span', { className: 'yma-bar-v' }, n));

      const stars = s.starDist || [];
      const starMax = Math.max(1, ...stars);
      const theaters = Object.entries(s.byTheater || {}).sort((a, b) => b[1] - a[1]);
      const thMax = Math.max(1, ...theaters.map((x) => x[1]));
      const players = Object.entries(s.byPlayers || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
      const plMax = Math.max(1, ...players.map((x) => x[1]));
      const days = s.days || [];
      const dayMax = Math.max(1, ...days.map((x) => x.count));

      return h('div', {
        className: 'yma-overlay',
        onClick: (e) => { if (e.target === e.currentTarget) props.onClose(); },
      },
      h('div', { className: 'yma-dlg', style: { width: 620 } },
        h('div', { className: 'yma-dlg-head' },
          T('统计'), h('div', { className: 'yma-grow' }),
          h('button', {
            type: 'button', className: 'yma-iconbtn', onClick: props.onClose, 'aria-label': T('关闭'),
          }, h(IconClose, { size: 14 }))),
        h('div', { className: 'yma-dlg-body' },
          !st ? h('div', { className: 'yma-note' }, T('加载中…')) : h('div', null,
            h('div', { className: 'yma-stat-grid' },
              card(s.pool || 0, T('待整理'), 'a'),
              card(s.owned || 0, T('已整理'), 'b'),
              card(s.favorites || 0, T('收藏'), 'c'),
              card(s.plays || 0, T('总对局'), 'd'),
              card(dur(s.totalMs), T('总时长'), 'e'),
              card(s.recent || 0, T('近 7 天'), 'f'),
              card(s.avgStars ? s.avgStars + T(' 星') : '—', T('平均星级'), 'g'),
              card(s.longest ? dur(s.longest.ms) : '—', T('最长一局'), 'h'),
              card(s.official || 0, T('官方图'), 'i')),

            h('div', { className: 'yma-lbl', style: { marginTop: 20 } }, T('近 7 天对局')),
            h('div', { className: 'yma-trend' },
              days.map((d, i) => h('div', { className: 'yma-trend-day', key: 'd' + i },
                h('span', { className: 'yma-trend-v' }, d.count || ''),
                h('i', {
                  className: 'yma-trend-bar',
                  style: { height: Math.round((d.count / dayMax) * 46) + 'px' },
                }),
                h('span', { className: 'yma-trend-lb' }, d.label)))),

            h('div', { className: 'yma-lbl', style: { marginTop: 20 } }, T('星级分布')),
            h('div', null, stars.map((n, i) => bar(i + T(' 星'), n, starMax, 's' + i))),

            h('div', { className: 'yma-lbl', style: { marginTop: 18 } }, T('地形（已整理）')),
            h('div', null, theaters.length
              ? theaters.map(([k, n]) => bar(theaterText(k), n, thMax, 't' + k))
              : h('div', { className: 'yma-note' }, T('还没有已整理的图'))),

            h('div', { className: 'yma-lbl', style: { marginTop: 18 } }, T('人数（待整理 + 已整理）')),
            h('div', null, players.map(([k, n]) => bar(k + T('人'), n, plMax, 'p' + k))),

            s.top && s.top.length
              ? h('div', null,
                h('div', { className: 'yma-lbl', style: { marginTop: 18 } }, T('玩得最多')),
                h('div', null, s.top.map((x, i) => h('button', {
                  type: 'button', className: 'yma-rank-row', key: 'top' + i,
                  title: T('打开这张地图'),
                  onClick: () => { if (props.onOpenMap) props.onOpenMap(x.id, x.zone); },
                },
                h('span', { className: 'yma-rank' }, i + 1),
                h('span', { className: 'yma-rank-name' }, x.name),
                h('span', { className: 'yma-rank-meta' }, x.plays + T(' 局') + ' · ' + x.stars + T(' 星'))))))
              : null))));
    }

    function PanelIcon(props) {
      const size = (props && props.size) || 20;
      const active = !!(props && props.active);
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M3 6.2 8.6 4l6.8 2.4L21 4.2v13.6L15.4 20l-6.8-2.4L3 19.8V6.2Z',
        stroke: 'currentColor', strokeWidth: active ? 2 : 1.6, strokeLinejoin: 'round',
        fill: active ? 'currentColor' : 'none', fillOpacity: active ? 0.14 : 0,
      }),
      h('path', { d: 'M8.6 4v13.6M15.4 6.4V20', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
      h('circle', { cx: 12, cy: 11.6, r: 2, fill: 'currentColor' }));
    }

    function Shot(props) {
      const [bad, setBad] = useState(false);
      useEffect(() => { setBad(false); }, [props.id]);
      return h('div', { className: 'yma-shot' },
        props.id && !bad
          ? h('img', {
            src: thumbUrl(props.id), loading: 'lazy', alt: '',
            onError: () => setBad(true),
          })
          : h('div', { className: 'yma-noimg' }, T('无预览')));
    }

    function StarRow(props) {
      const value = props.value || 0;
      const cells = [];
      for (let i = 1; i <= 10; i++) {
        cells.push(h('button', {
          key: i, type: 'button',
          className: 'yma-sh' + (i <= value ? ' on' : ''),
          title: i + T(' 星'), 'aria-label': i + T(' 星'),
          onClick: () => props.onChange(i === value ? 0 : i),
        }, i <= value ? '★' : '☆'));
      }
      return h('div', { className: 'yma-starrow' }, cells,
        h('span', { className: 'yma-shval' }, value ? value + T(' 星') : T('未评分')));
    }

    function AutoTextarea(props) {
      const ref = useRef(null);
      const min = props.min || 96;
      const max = props.max || 300;
      useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(Math.max(el.scrollHeight, min), max) + 'px';
        el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
      }, [props.value, min, max]);
      return h('textarea', {
        ref,
        className: 'yma-ta',
        value: props.value || '',
        placeholder: props.placeholder,
        spellCheck: false,
        style: props.style,
        onChange: props.onChange,
        onBlur: props.onBlur,
      });
    }

    function TagCloud(props) {
      const chosen = props.value || [];
      const [query, setQuery] = useState('');
      const library = props.library || [];
      const toggle = (t) => props.onChange(chosen.includes(t) ? chosen.filter((x) => x !== t) : chosen.concat([t]));

      // pool = built-ins, then tags already on this map, then everything used anywhere
      const seen = new Set();
      const pool = [];
      const push = (t) => { if (t && !seen.has(t)) { seen.add(t); pool.push(t); } };
      (props.presets || []).forEach(push);
      chosen.forEach(push);
      library.forEach((x) => push(x.tag));

      const q = query.trim().toLowerCase();
      const matched = q ? pool.filter((t) => t.toLowerCase().includes(q)) : pool;
      const shown = matched.slice(0, 60);
      const exact = pool.find((t) => t.toLowerCase() === q);

      const submit = () => {
        const t = query.trim();
        if (!t) return;
        if (exact) { toggle(exact); setQuery(''); return; }
        if (!chosen.includes(t)) props.onChange(chosen.concat([t]));
        setQuery('');
      };

      return h('div', null,
        h('div', { className: 'yma-tags' },
          shown.map((t) => h('button', {
            key: t, type: 'button',
            className: 'yma-tag' + (chosen.includes(t) ? ' on' : ''),
            title: chosen.includes(t) ? T('点击取消') : '',
            onClick: () => toggle(t),
          }, t))),
        q && !matched.length
          ? h('div', { className: 'yma-note' }, T('没有这个标签，回车新建'))
          : null,
        h('div', { className: 'yma-row' },
          h('input', {
            className: 'yma-input', style: { flex: 1, minWidth: 120, height: 30 }, value: query,
            placeholder: T('搜索标签，或输入新名字回车创建'),
            onChange: (e) => setQuery(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
          }),
          h('button', { type: 'button', className: 'yma-btn yma-btn--sm', onClick: submit },
            exact && !chosen.includes(exact) ? T('添加') : (q ? T('新建') : T('添加')))));
    }

    const TERRAIN = [
      { label: T('温带'), values: ['TEMPERATE'] },
      { label: T('雪地'), values: ['SNOW'] },
      { label: T('沙漠'), values: ['DESERT'] },
      { label: T('城市'), values: ['URBAN', 'NEWURBAN'] },
      { label: T('月球'), values: ['LUNAR'] },
    ];
    const SORTS = [
      ['default', T('默认')], ['name', T('名称')], ['stars', T('星级')],
      ['recent', T('最近游玩')], ['players', T('人数')], ['played', T('玩得多')],
    ];

    function FilterMenu(props) {
      const f = props.value;
      const [open, setOpen] = useState(false);
      const rootRef = useRef(null);
      useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', onDoc);
          document.removeEventListener('keydown', onKey);
        };
      }, [open]);

      const active = f.players.length + f.stars.length + f.theaters.length + (f.sort !== 'default' ? 1 : 0);
      const toggleNum = (key, v) => props.onChange({
        ...f,
        [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : f[key].concat([v]).sort((a, b) => a - b),
      });
      const toggleTerrain = (values) => {
        const has = values.every((v) => f.theaters.includes(v));
        props.onChange({
          ...f,
          theaters: has
            ? f.theaters.filter((v) => !values.includes(v))
            : Array.from(new Set(f.theaters.concat(values))),
        });
      };
      const reset = () => props.onChange({ players: [], stars: [], theaters: [], sort: 'default' });
      const chip = (label, on, onClick, key) => h('button', {
        key, type: 'button', className: 'yma-tag' + (on ? ' on' : ''), onClick,
      }, label);

      return h('div', { ref: rootRef, style: { position: 'relative' } },
        h('button', {
          type: 'button', className: 'yma-btn' + (active ? ' yma-btn--primary' : ''),
          onClick: () => setOpen((v) => !v), 'aria-expanded': open,
        }, h(IconFilter), T('筛选') + (active ? ' · ' + active : ''), ' ▾'),

        open ? h('div', {
          style: {
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 378, zIndex: 40,
            background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l2)',
            borderRadius: 14, padding: 16, boxShadow: '0 22px 54px -26px rgba(0,0,0,.85)',
          },
        },
        h('div', { className: 'yma-lbl' }, T('人数')),
        h('div', { className: 'yma-tags', style: { marginBottom: 14 } },
          [2, 3, 4, 5, 6, 7, 8].map((n) => chip(n + T('人'), f.players.includes(n), () => toggleNum('players', n), 'p' + n))),

        h('div', { className: 'yma-lbl' }, T('星级')),
        h('div', { className: 'yma-tags', style: { marginBottom: 14 } },
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => chip(String(n), f.stars.includes(n), () => toggleNum('stars', n), 's' + n))),

        h('div', { className: 'yma-lbl' }, T('地形')),
        h('div', { className: 'yma-tags', style: { marginBottom: 14 } },
          TERRAIN.map((t) => chip(t.label, t.values.every((v) => f.theaters.includes(v)),
            () => toggleTerrain(t.values), 't' + t.label))),

        h('div', { className: 'yma-lbl' }, T('排序')),
        h('div', { className: 'yma-tags' },
          SORTS.map(([k, label]) => chip(label, f.sort === k, () => props.onChange({ ...f, sort: k }), 'o' + k))),

        h('div', { className: 'yma-row', style: { justifyContent: 'space-between' } },
          h('button', { type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost', onClick: reset },
            active ? T('清空筛选') : T('无筛选')),
          h('button', { type: 'button', className: 'yma-btn yma-btn--sm', onClick: () => setOpen(false) }, T('收起'))))
        : null);
    }

    function MapCard(props) {
      const it = props.item;
      const canFav = it.zone === 'skirmish' || it.zone === 'mission';
      return h('div', {
        className: 'yma-card' + (props.selected ? ' on' : ''),
        style: { animationDelay: Math.min(props.idx || 0, 10) * 24 + 'ms' },
        role: 'button', tabIndex: 0, 'data-mid': it.id,
        onClick: () => props.onOpen(it),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onOpen(it); } },
      },
      canFav ? h('button', {
        type: 'button',
        className: 'yma-fav' + (it.fav ? ' on' : ''),
        title: it.fav ? T('取消收藏') : T('加入收藏'),
        'aria-label': it.fav ? T('取消收藏') : T('加入收藏'),
        onClick: (e) => { e.stopPropagation(); props.onToggleFav(it); },
      }, h(IconStar, { size: 14, filled: it.fav })) : null,
      props.onCheck ? h('button', {
        type: 'button',
        className: 'yma-check' + (props.checked ? ' on' : ''),
        title: T('选中以批量操作'),
        'aria-label': T('选中以批量操作'),
        onClick: (e) => { e.stopPropagation(); props.onCheck(it); },
      }, props.checked ? '✓' : '') : null,
      h(Shot, { id: it.hasThumb ? it.id : null }),
      h('div', { className: 'yma-cbody' },
        h('div', { className: 'yma-cname', title: it.name || it.file }, it.name || it.file),
        h('div', { className: 'yma-cmeta' },
          props.pinned ? h('span', { className: 'yma-chip yma-chip--pin' }, T('刚抽到')) : null,
          it.maxP ? h('span', { className: 'yma-chip' }, it.maxP + T('人')) : null,
          it.theater ? h('span', { className: 'yma-chip' }, theaterText(it.theater)) : null,
          it.official ? h('span', { className: 'yma-chip' }, T('官方')) : null,
          !it.official && it.zone === 'skirmish' && it.stars !== null
            ? h('span', { className: 'yma-chip' }, it.stars + T('星')) : null,
          it.tags && it.tags.length ? h('span', { className: 'yma-chip' }, '#' + it.tags[0]) : null)));
    }

    function Detail(props) {
      const it = props.item;
      const [rating, setRating] = useState(it.rating || 0);
      const [tags, setTags] = useState(it.tags || []);
      const [notes, setNotes] = useState(it.notes || '');
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState('');
      const [editName, setEditName] = useState(null);
      const [nameErr, setNameErr] = useState('');
      useEffect(() => {
        setRating(it.rating || 0); setTags(it.tags || []); setNotes(it.notes || ''); setMsg('');
        setEditName(null); setNameErr('');
      }, [it.id]);

      const stemOf = (f) => String(f || '').replace(/\.[^.]+$/, '');

      const doRename = async () => {
        if (editName === null) return;
        const r = await post('renameMap', { id: it.id, name: editName });
        if (!r.ok) { setNameErr(r.error || T('改名失败')); return; }
        setEditName(null);
        setNameErr('');
        setMsg(r.result.renamed || r.result.renamedTitle
          ? T('名称已更新为 ') + (r.result.file || editName)
          : '');
        props.onChanged();
      };

      const save = async (patch, quiet) => {
        setBusy(true);
        const r = await post('save', { id: it.id, ...patch });
        setBusy(false);
        if (!r.ok) setMsg(r.error || T('保存失败'));
        else if (!quiet) setMsg(T('已保存'));
        if (r.ok) props.onChanged();
      };

      const presets = it.kind === 'mission' ? TAGS_MISSION : TAGS_SKIRMISH;
      const srcLabel = it.nameSource === 'manual' ? T('手工指定')
        : it.nameSource === 'file' ? T('文件名') : T('地图内部');

      return h('aside', { className: 'yma-side' },
        h('div', { className: 'yma-sidehead' },
          h('h2', { className: 'yma-sidename' }, it.name || it.file),
          h('button', {
            type: 'button', className: 'yma-iconbtn', title: tr('btn.close'),
            onClick: props.onClose, 'aria-label': tr('btn.close'),
          }, h(IconClose, { size: 15 }))),
        h('div', { className: 'yma-sidebody' },
          h('div', { className: 'yma-preview' }, h(Shot, { id: it.hasThumb ? it.id : null })),
          h('dl', { className: 'yma-kv' },
            h('dt', null, T('文件')),
            h('dd', { className: 'yma-filecell' },
              editName === null
                ? h('div', { className: 'yma-filerow' },
                  h('span', { className: 'yma-filename', title: it.file }, it.file),
                  it.official ? null : h('button', {
                    type: 'button', className: 'yma-mini',
                    onClick: () => { setEditName(stemOf(it.file)); setNameErr(''); },
                  }, T('编辑')))
                : h('div', { className: 'yma-filerow' },
                  h('input', {
                    className: 'yma-input yma-input--sm', value: editName, autoFocus: true,
                    onChange: (e) => { setEditName(e.target.value); setNameErr(''); },
                    onKeyDown: (e) => {
                      if (e.key === 'Enter') doRename();
                      if (e.key === 'Escape') { setEditName(null); setNameErr(''); }
                    },
                  }),
                  h('button', { type: 'button', className: 'yma-btn yma-btn--sm', onClick: doRename }, T('保存')),
                  h('button', {
                    type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost',
                    onClick: () => { setEditName(null); setNameErr(''); },
                  }, T('取消'))),
              nameErr ? h('div', { className: 'yma-nameerr' }, nameErr) : null),
            h('dt', null, T('位置')), h('dd', null, String(it.rel || '').split(/[\\/]/).slice(0, -1).join('\\')),
            h('dt', null, T('名称来源')), h('dd', null, srcLabel),
            h('dt', null, T('人数')), h('dd', null, it.maxP ? it.maxP + T(' 人') : T('未知')),
            h('dt', null, T('地形')), h('dd', null, theaterText(it.theater) || T('未知')),
            h('dt', null, T('尺寸')), h('dd', null, it.width ? it.width + ' × ' + it.height : '—'),
            h('dt', null, T('游玩')), h('dd', null, (it.plays || 0) + T(' 次')
              + (it.lastPlayed ? T('，最近 ') + fmtDate(it.lastPlayed) : '')),
            it.crashes ? [
              h('dt', { key: 'ck' }, T('崩溃')),
              h('dd', { key: 'cv', style: { color: 'var(--yma-err)' } }, it.crashes + T(' 次')),
            ] : null),

          h('div', { className: 'yma-sect' },
            h('div', { className: 'yma-lbl' }, T('星级')),
            h(StarRow, { value: rating, onChange: (v) => { setRating(v); save({ stars: v }); } }),
            it.zone === 'pool'
              ? h('div', { className: 'yma-row', style: { marginTop: 8 } },
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--sm yma-btn--primary',
                  disabled: busy || !rating,
                  title: T('不需要真的打一局，直接移动到已整理'),
                  onClick: async () => {
                    const r = await post('fileMap', { id: it.id, stars: rating });
                    if (!r.ok) { setMsg(r.error || T('归档失败')); return; }
                    if (props.onFiled) props.onFiled(r.result);
                  },
                }, T('归档到已整理')))
              : null,
            h('div', { className: 'yma-note' },
              it.zone === 'pool'
                ? (rating ? T('不用真打一局，点上面就能归档。') : T('未评级的地图留在待整理'))
                : (rating ? T('保存后会移动到对应星级文件夹') : T('未评级的地图留在待整理')))),

          h('div', { className: 'yma-sect' },
            h('div', { className: 'yma-lbl' }, T('标签')),
            h(TagCloud, {
              value: tags,
              presets,
              library: props.tagLibrary || [],
              onChange: (v) => { setTags(v); save({ tags: v }, true); },
            })),

          h('div', { className: 'yma-sect' },
            h('div', { className: 'yma-lbl' }, T('心得')),
            h(AutoTextarea, {
              value: notes,
              placeholder: T('记录打法和注意事项…'),
              min: 96,
              max: 320,
              onChange: (e) => setNotes(e.target.value),
              onBlur: () => save({ notes }, true),
            })),

          it.playsHistory && it.playsHistory.length
            ? h('div', { className: 'yma-sect' },
              h('div', { className: 'yma-lbl' }, T('对局记录')),
              h('div', { className: 'yma-history' },
                it.playsHistory.map((p, i) => h('div', { key: i, className: 'yma-hrow' },
                  h('span', null, fmtDate(p.at)),
                  h('span', null, fmtDur(p.ms) + ' · ' + (p.mode === 'ra2' ? T('红警2') : T('尤里')))))))
            : null,

          h('div', { className: 'yma-row' },
            (it.zone === 'skirmish' || it.zone === 'mission')
              ? h('button', {
                type: 'button',
                className: 'yma-btn yma-btn--sm' + (it.fav ? ' yma-btn--primary' : ''),
                onClick: async () => {
                const r = await post('save', { id: it.id, fav: !it.fav });
                if (!r.ok) { setMsg(r.error || T('保存失败')); return; }
                props.onChanged();
              },
              }, h(IconStar, { size: 12, filled: it.fav }), it.fav ? T('已收藏') : T('收藏'))
              : null,
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm',
              onClick: async () => {
                const r = await post('openFolder', { id: it.id });
                setMsg(r.ok ? T('已打开所在文件夹') : (r.error || T('打开失败')));
              },
            }, h(IconFolder), tr('btn.open')),
            it.official ? null : h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: busy,
              title: T('整理崩溃现场与结构检查，交给 AI 分析'),
              onClick: async () => {
                if (!it.crashes && !window.confirm(T('这张图没有崩溃记录，仍要生成修复工单吗？'))) return;
                setBusy(true);
                setMsg('');
                const r = await post('handoff', { id: it.id });
                if (!r.ok) { setBusy(false); setMsg(r.error || T('生成工单失败')); return; }
                try {
                  const how = await sendToRepairSession(r.result.prompt);
                  setBusy(false);
                  setMsg(how === 'sent' ? T('已发到地图修复对话')
                    : how === 'draft' ? T('工单已填入新对话，按回车开始') : T('工单已复制到剪贴板'));
                } catch {
                  try { await navigator.clipboard.writeText(r.result.prompt); } catch { /* ignore */ }
                  setBusy(false);
                  setMsg(T('工单已复制到剪贴板'));
                }
              },
            }, h(IconSpark), T('异常修复')),
            it.official
              ? h('span', { className: 'yma-chip' }, T('官方图 · 只读'))
              : h('button', {
                type: 'button', className: 'yma-btn yma-btn--sm yma-btn--danger',
                onClick: async () => {
                  if (!window.confirm(T('删除「') + (it.name || it.file)
                    + T('」？\n\n文件会从硬盘移除，不能撤销。配置备份里不含地图文件。'))) return;
                  setBusy(true);
                  const r = await post('remove', { id: it.id });
                  setBusy(false);
                  if (r.ok) props.onDeleted(); else setMsg(r.error || T('删除失败'));
                },
              }, h(IconTrash), tr('btn.delete'))),

          (busy || msg) ? h('div', { className: 'yma-note' }, busy ? T('处理中…') : msg) : null));
    }

    function SettleCard(props) {
      const p = props.pending;
      const [rating, setRating] = useState(0);
      const [tags, setTags] = useState([]);
      const [notes, setNotes] = useState('');
      const [busy, setBusy] = useState('');
      const [msg, setMsg] = useState('');
      const [repair, setRepair] = useState(null);
      const [editName, setEditName] = useState(null);
      const [nameErr, setNameErr] = useState('');
      const crashed = p.outcome === 'crash';

      const doRename = async () => {
        if (editName === null) return;
        const r = await post('renameMap', { id: p.id, name: editName });
        if (!r.ok) { setNameErr(r.error || T('改名失败')); return; }
        setEditName(null);
        setNameErr('');
        setMsg(T('名称已更新为 ') + (r.result.file || editName));
        if (props.onChanged) props.onChanged();
      };
      const dur = p.ended ? p.durationMs : (Date.now() - p.startedAt);

      const submit = async (extra) => {
        setBusy('settle');
        const r = await post('settle', { stars: rating, tags, notes, ...(extra || {}) });
        setBusy('');
        if (!r.ok) setMsg(r.error || T('保存失败'));
        else props.onDone();
      };

      const replay = async () => {
        setBusy('replay');
        const r = await post('replay', {});
        setBusy('');
        if (!r.ok) setMsg(r.error || T('启动失败'));
        else if (props.onReplay) props.onReplay();
      };

      const doRepair = async () => {
        setBusy('repair');
        setMsg('');
        const r = await post('repair', { id: p.id });
        setBusy('');
        if (!r.ok) { setMsg(r.error || T('修复失败')); return; }
        setRepair(r.result);
        if (!r.result.changed) setMsg(T('检查完成，没有需要修复的问题'));
      };

      const playRepaired = async () => {
        setBusy('repairstart');
        const d = await post('deploy', { id: repair.id, mode: p.mode });
        if (!d.ok) { setBusy(''); setMsg(d.error || T('部署失败')); return; }
        const l = await post('launch', { mode: p.mode });
        setBusy('');
        if (!l.ok) setMsg(T('启动失败：') + (l.error || T('未知原因')));
        else if (props.onReplay) props.onReplay();
      };

      const aiRepair = async () => {
        setBusy('ai');
        setMsg('');
        const r = await post('handoff', { id: p.id });
        if (!r.ok) { setBusy(''); setMsg(r.error || T('生成工单失败')); return; }
        try {
          const how = await sendToRepairSession(r.result.prompt);
          setBusy('');
          setMsg(how === 'sent' ? T('已发到地图修复对话')
            : how === 'draft' ? T('修复工单已放进新对话的输入框，按回车开始')
              : T('修复工单已复制到剪贴板'));
        } catch (e) {
          try { await navigator.clipboard.writeText(r.result.prompt); } catch { /* ignore */ }
          setBusy('');
          setMsg(T('修复工单已复制到剪贴板：') + r.result.path);
        }
      };

      return h('div', { className: 'yma-settle' + (crashed ? ' warn' : '') },
        h('div', { className: 'yma-shead' },
          crashed ? h(IconWarn, { size: 15, style: { color: 'var(--yma-err)' } }) : null,
          h('span', { className: 'yma-stitle' }, crashed ? T('这一局异常结束') : T('上一局还没有评级')),
          crashed && p.durationMs
            ? h('span', { className: 'yma-pill' }, Math.max(1, Math.round(p.durationMs / 1000)) + T(' 秒'))
            : null,
          h('span', { className: 'yma-pill' }, p.mode === 'ra2' ? T('红警2') : T('尤里')),
          p.players ? h('span', { className: 'yma-pill' }, p.players + T('人')) : null,
          crashed && p.crash
            ? h('span', { className: 'yma-pill' }, (p.crash.code || T('崩溃')) + ' @ ' + (p.crash.eip || '?'))
            : null,
          h('span', { className: 'yma-grow' }),
          h('span', { className: 'yma-sdur' }, fmtDur(dur))),

        h('div', { className: 'yma-sgrid' },
          h('div', null,
            editName === null
              ? h('div', { className: 'yma-sname-row' },
                h('div', { className: 'yma-sname' }, p.name || p.file),
                h('button', {
                  type: 'button', className: 'yma-mini',
                  title: T('同时修改文件名和显示名'),
                  onClick: () => { setEditName(p.name || p.file); setNameErr(''); },
                }, T('改名')))
              : h('div', { className: 'yma-sname-row' },
                h('input', {
                  className: 'yma-input yma-input--sm', value: editName, autoFocus: true,
                  onChange: (e) => setEditName(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); doRename(); }
                    if (e.key === 'Escape') { setEditName(null); setNameErr(''); }
                  },
                }),
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--sm yma-btn--primary', onClick: doRename,
                }, T('保存')),
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost',
                  onClick: () => { setEditName(null); setNameErr(''); },
                }, T('取消'))),
            nameErr ? h('div', { className: 'yma-nameerr' }, nameErr) : null,
            h('div', { className: 'yma-note', style: { margin: '0 0 10px' } },
              rating ? '将归位到 01-遭遇战\\' + (p.players || p.maxP || 8) + '人\\' + rating + T('星')
                : T('不评级也可以归位，记为 0 星')),
            h(StarRow, { value: rating, onChange: setRating }),
            h('div', { className: 'yma-row', style: { marginTop: 14 } },
              h('button', {
                type: 'button', className: 'yma-btn yma-btn--primary', disabled: !!busy,
                onClick: () => submit(),
              }, tr('btn.settle')),
              h('button', {
                type: 'button', className: 'yma-btn', disabled: !!busy, onClick: replay,
              }, h(IconAgain), busy === 'replay' ? T('启动中…') : tr('btn.replay')),
              crashed ? h('button', {
                type: 'button', className: 'yma-btn', disabled: !!busy, onClick: doRepair,
                title: T('自动修复已知问题（座位数不符、MaxPlayer 越界）'),
              }, h(IconCheck), busy === 'repair' ? T('检查中…') : T('一键修复')) : null,
              crashed ? h('button', {
                type: 'button', className: 'yma-btn yma-btn--primary', disabled: !!busy, onClick: aiRepair,
                title: T('把崩溃现场交给 AI 分析'),
              }, h(IconSpark), busy === 'ai' ? T('生成工单…') : T('异常修复')) : null,
              h('button', {
                type: 'button', className: 'yma-btn yma-btn--ghost', disabled: !!busy,
                onClick: async () => {
                  const r = await post('discard', {});
                  props.onLater(r.ok ? r.result : null);
                },
              }, tr('btn.later')),
              h('button', {
                type: 'button', className: 'yma-btn yma-btn--danger', disabled: !!busy,
                onClick: () => {
                  if (!window.confirm(T('删除「') + (p.name || p.file)
                    + T('」？\n\n文件会从硬盘移除，不能撤销。'))) return;
                  submit({ remove: true });
                },
              }, h(IconTrash), T('删除这张图'))),

            repair
              ? h('div', {
                style: {
                  marginTop: 12, padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-2)',
                  fontSize: 12,
                },
              },
              h('div', { style: { fontWeight: 600, marginBottom: 6 } },
                repair.changed ? T('已生成修复版：') + repair.file : T('检查结果')),
              repair.issues.length
                ? repair.issues.map((x, i) => h('div', {
                  key: i,
                  style: { color: x.fixed ? 'inherit' : 'var(--dsw-alias-label-secondary)', marginBottom: 3 },
                }, (x.fixed ? '✓ ' : '· ') + x.detail))
                : h('div', null, T('没有发现问题')),
              repair.changed
                ? h('div', { className: 'yma-row' },
                  h('button', {
                    type: 'button', className: 'yma-btn yma-btn--sm yma-btn--primary',
                    disabled: !!busy, onClick: playRepaired,
                  }, h(IconPlay), busy === 'repairstart' ? T('启动中…') : T('直接启动修复版')))
                : null)
              : null),

          h('div', null,
            h('div', { className: 'yma-lbl' }, T('标签')),
            h(TagCloud, { value: tags, presets: TAGS_SKIRMISH, onChange: setTags }),
            h('div', { className: 'yma-sect' },
              h('div', { className: 'yma-lbl' }, T('心得')),
              h(AutoTextarea, {
                value: notes, min: 70, max: 260,
                placeholder: T('简单写写就行，也可以跳过'),
                onChange: (e) => setNotes(e.target.value),
              })))),

        msg ? h('div', { className: 'yma-note', style: { color: 'var(--yma-err)' } }, msg) : null);
    }

    function AtlasPage() {
      const [state, setState] = useState(null);
      const [zone, setZone] = useState('pool');
      const [q, setQ] = useState('');
      const [filters, setFilters] = useState({ players: [], stars: [], theaters: [], sort: 'default' });
      const [list, setList] = useState({ total: 0, items: [] });
      const [offset, setOffset] = useState(0);
      const [selected, setSelected] = useState(null);
      const [busy, setBusy] = useState('');
      const [toast, setToast] = useState(null);
      const [showSetup, setShowSetup] = useState(false);
      const [showImport, setShowImport] = useState(false);
      const [showHelp, setShowHelp] = useState(false);
      const [showDraw, setShowDraw] = useState(false);
      const [showStats, setShowStats] = useState(false);
      const [scrollTarget, setScrollTarget] = useState(null);
      const [aroundId, setAroundId] = useState(null);
      const [aroundTried, setAroundTried] = useState(false);
      const [picked, setPicked] = useState([]);
      const [pendingOpen, setPendingOpen] = useState(null);
      const [batchTag, setBatchTag] = useState('');
      const [loadingMore, setLoadingMore] = useState(false);
      const loadingRef = useRef(false);
      const noMoreRef = useRef(false);
      const sentinelRef = useRef(null);
      const searchRef = useRef(null);
      const loadMoreRef = useRef(null);
      const lastMoreAt = useRef(0);

      const refreshState = useCallback(async () => {
        const r = await get('/state');
        if (r.ok) setState(r.result);
      }, []);

      const load = useCallback(async (reset) => {
        if (!reset) {
          if (loadingRef.current || noMoreRef.current) return;
          if (list.items.length >= list.total) return;
          loadingRef.current = true;
          setLoadingMore(true);
        }
        const off = reset ? 0 : offset;
        const params = new URLSearchParams({ zone, q, offset: String(off), limit: '120' });
        if (filters.players.length) params.set('players', filters.players.join(','));
        if (filters.stars.length) params.set('stars', filters.stars.join(','));
        if (filters.theaters.length) params.set('theater', filters.theaters.join(','));
        if (filters.sort !== 'default') params.set('sort', filters.sort);
        if (reset && aroundId) params.set('around', aroundId);
        const r = await get('/maps?' + params.toString());
        if (!reset) { loadingRef.current = false; setLoadingMore(false); }
        if (!r.ok) { if (reset) setAroundTried(true); return; }
        if (reset) noMoreRef.current = false;
        if (!r.result.items.length) noMoreRef.current = true;
        const startOff = reset ? (r.result.offset || 0) : off;
        setList((prev) => (reset ? r.result : { total: r.result.total, items: prev.items.concat(r.result.items) }));
        setOffset(startOff + r.result.items.length);
        if (reset) setAroundTried(true);
      }, [zone, q, filters, offset, aroundId, list]);

      const hasMore = list.items.length > 0 && list.total > list.items.length;
      loadMoreRef.current = () => load(false);

      useEffect(() => { refreshState(); }, [refreshState]);
      useEffect(() => { load(true); /* eslint-disable-next-line */ }, [zone, q, filters, aroundId]);
      // Infinite scroll. The observer must NOT be rebuilt per page: a fresh
      // observer reports intersection immediately and would chain-load the
      // whole library. It is created once per `hasMore` transition and calls
      // through a ref, so it always sees the latest fetch logic.
      useEffect(() => {
        if (!hasMore) return undefined;
        const el = sentinelRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          const now = Date.now();
          if (now - lastMoreAt.current < 500) return;   // throttle runaway chaining
          lastMoreAt.current = now;
          if (loadMoreRef.current) loadMoreRef.current();
        }, { rootMargin: '240px 0px' });
        io.observe(el);
        return () => io.disconnect();
      }, [hasMore]);
      // After a draw, bring the matching card into view. The list is replaced
      // asynchronously, so keep retrying instead of guessing a single delay.
      useEffect(() => {
        if (!scrollTarget || typeof document === 'undefined') return undefined;
        let done = false;
        const find = () => {
          const el = document.querySelector('[data-mid="' + scrollTarget + '"]');
          if (!el || typeof el.scrollIntoView !== 'function') return false;
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          done = true;
          setScrollTarget(null);
          return true;
        };
        if (find()) return undefined;
        const iv = setInterval(() => { if (find()) clearInterval(iv); }, 150);
        const stop = setTimeout(() => {
          clearInterval(iv);
          if (!done) setScrollTarget(null);
        }, 3000);
        return () => { clearInterval(iv); clearTimeout(stop); };
      }, [scrollTarget, list]);
      useEffect(() => {
        const busyScan = !!(state && state.scan.status !== 'ready');
        const busyImport = !!(state && state.import
          && (state.import.status === 'scanning' || state.import.status === 'running'));
        if (!busyScan && !busyImport) return undefined;
        const t = setInterval(refreshState, 1200);
        return () => clearInterval(t);
      }, [state, refreshState]);
      useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(t);
      }, [toast]);
      // Esc closes the detail panel, Ctrl+F jumps to search
      useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onKey = (e) => {
          if (e.key === 'Escape' && selected) { setSelected(null); return; }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();
            if (searchRef.current) searchRef.current.focus();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [selected]);

      const pending = state && state.pending;      const scanning = state && state.scan.status === 'scanning';
      const counts = state ? state.counts : { pool: 0, owned: 0, official: 0 };

      // The drawn map may sit on a page far from the one currently loaded.
      // If the around-page did not bring it in, pin it to the top so the card is
      // always visible and highlighted; it disappears as soon as the user
      // navigates (aroundId is cleared by every zone/search/filter change).
      const gridItems = useMemo(() => {
        if (!aroundTried || !aroundId || !selected || selected.id !== aroundId) return list.items;
        if (list.items.some((x) => x.id === aroundId)) return list.items;
        return [selected].concat(list.items);
      }, [list.items, selected, aroundId, aroundTried]);

      const doDraw = async () => {
        setBusy('draw');
        const r = await post('draw', {});
        setBusy('');
        if (r.ok) {
          if (zone !== 'pool') setZone('pool');
          setAroundTried(false);
          setSelected(r.result);
          setScrollTarget(r.result.id);
          setAroundId(r.result.id);
          setToast({ text: T('抽到「') + (r.result.name || r.result.file) + '」' });
        } else setToast({ text: r.error || T('抽图失败'), err: true });
      };

      const openFromStats = (id, zone) => {
        setShowStats(false);
        const z = (zone === 'skirmish' || zone === 'mission') ? 'owned' : 'pool';
        if (zone !== z) { /* noop */ }
        setZone(z);
        setAroundTried(false);
        setAroundId(id);
        setScrollTarget(id);
        setPicked([]);
        setPendingOpen(id);
      };

      // After a rename or a move the panel would keep showing the old object.
      useEffect(() => {
        if (!selected) return;
        const fresh = list.items.find((x) => x.id === selected.id);
        if (!fresh) return;
        if (fresh.file !== selected.file || fresh.name !== selected.name
          || fresh.rel !== selected.rel || fresh.rating !== selected.rating) {
          setSelected(fresh);
        }
      }, [list, selected]);

      useEffect(() => {
        if (!pendingOpen) return;
        const found = list.items.find((x) => x.id === pendingOpen);
        if (found) { setSelected(found); setPendingOpen(null); }
      }, [list, pendingOpen]);

      const runBatch = async (op, extra) => {
        const r = await post('batch', { ids: picked, op, ...(extra || {}) });
        if (!r.ok) { setToast({ text: r.error || T('操作失败'), err: true }); return null; }
        setPicked([]);
        refreshState();
        load(true);
        return r.result;
      };

      const doBatchTag = async () => {
        const t = batchTag.trim();
        if (!t) return;
        const res = await runBatch('tag', { add: [t] });
        if (res) { setBatchTag(''); setToast({ text: T('已加标签 ') + res.done + T(' 张') }); }
      };
      const doBatchPool = async () => {
        if (!window.confirm(T('把选中的 ') + picked.length + T(' 张移回待整理？'))) return;
        const res = await runBatch('pool');
        if (res) setToast({ text: T('已移回待整理 ') + res.done + T(' 张') });
      };
      const doBatchDelete = async () => {
        if (!window.confirm(T('删除选中的 ') + picked.length + T(' 张？\n\n文件会从硬盘移除，不能撤销。'))) return;
        const res = await runBatch('delete');
        if (res) setToast({ text: T('已删除 ') + res.done + T(' 张') });
      };

      const handleDrawn = (item) => {
        setShowDraw(false);
        const z = (item.zone === 'skirmish' || item.zone === 'mission') ? 'owned' : 'pool';
        if (zone !== z) setZone(z);
        setAroundTried(false);
        setSelected(item);
        setScrollTarget(item.id);
        setAroundId(item.id);
        setToast({ text: T('抽到「') + (item.name || item.file) + '」' });
      };

      const doStart = async (mode) => {
        if (!selected) return;
        setBusy('start');
        const d = await post('deploy', { id: selected.id, mode });
        if (!d.ok) { setBusy(''); setToast({ text: d.error || T('部署失败'), err: true }); return; }
        const l = await post('launch', { mode });
        setBusy('');
        refreshState();
        setToast(l.ok
          ? { text: T('游戏已启动，打完后回来记录') }
          : { text: T('已复制到游戏目录，启动失败：') + (l.error || T('未知原因')), err: true });
      };

      if (state && !state.configured) {
        return h(SetupPage, {
          onDone: () => { refreshState(); load(true); },
        });
      }

      if (showSetup && state) {
        return h(SetupPage, {
          initial: { lib: state.libraryRoot, game: state.gameDir || '', layout: state.layoutId },
          onCancel: () => setShowSetup(false),
          onDone: () => { setShowSetup(false); refreshState(); load(true); },
        });
      }

      if (showHelp) {
        return h(HelpPage, { state, onClose: () => setShowHelp(false) });
      }

      if (showImport && state) {
        return h(ImportPage, {
          imp: state.import,
          onClose: () => { setShowImport(false); refreshState(); load(true); },
          onRefresh: refreshState,
        });
      }

      return h('div', { className: 'yma-root' },
        h('div', { className: 'yma-head' },
          h('div', { className: 'yma-brandmark' }, h(PanelIcon, { size: 18, active: false })),
          h('div', null,
            h('h1', { className: 'yma-h1' }, tr('title')),
            h('div', { className: 'yma-h1sub' }, 'Red Alert 2 · Yuri\u0027s Revenge')),
          h('div', { className: 'yma-pills' },
            h('span', { className: 'yma-pill' }, T('待整理 '), h('b', null, counts.pool)),
            h('span', { className: 'yma-pill' }, T('已整理 '), h('b', null, counts.owned)),
            h('span', { className: 'yma-pill' }, '★ ', h('b', null, counts.favorites || 0)),
            h('span', { className: 'yma-pill' }, T('官方 '), h('b', null, counts.official))),
          h('div', { className: 'yma-grow' }),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--primary', onClick: doDraw,
            disabled: busy === 'draw',
          }, h(IconDice), tr('btn.draw')),
          h('button', {
            type: 'button', className: 'yma-btn',
            onClick: () => setShowDraw(true),
          }, h(IconFilter), T('条件抽取')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--ghost',
            onClick: () => setShowStats(true),
          }, T('统计')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--ghost',
            onClick: async () => {
            const r = await post('rescan', {});
            if (!r.ok) setToast({ text: r.error || T('操作失败'), err: true });
            else refreshState();
          },
          }, h(IconRefresh), tr('btn.rescan')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--ghost',
            onClick: () => setShowImport(true),
          }, T('导入')),
          h('button', {
            type: 'button', className: 'yma-btn yma-btn--ghost',
            onClick: () => setShowSetup(true), title: tr('setup.title'),
          }, '⚙')),

        scanning
          ? h('div', { style: { padding: '0 24px 8px' } },
            h('div', { className: 'yma-h1sub' },
              tr('scan.scanning') + ' · ' + state.scan.done + ' / ' + state.scan.total),
            h('div', { className: 'yma-prog' },
              h('i', { style: { width: (state.scan.total ? (state.scan.done / state.scan.total) * 100 : 0) + '%' } })))
          : null,

        pending
          ? h(SettleCard, {
            pending,
            onChanged: () => refreshState(),
            onDone: () => { refreshState(); load(true); setSelected(null); setToast({ text: T('已归位') }); },
            onLater: (res) => {
              refreshState();
              load(true);
              setToast({
                text: res && res.returned ? T('已放回待整理')
                  : res && res.copied ? T('已移出游戏目录，原图留在库里')
                    : T('已放回待整理'),
              });
            },
            onReplay: () => { refreshState(); setToast({ text: T('游戏已重启') }); },
          })
          : null,

        state && state.strayContainers > 0
          ? h('div', { style: { padding: '0 24px 10px', display: 'flex', gap: 10, alignItems: 'center' } },
            h('span', { className: 'yma-h1sub' }, T('发现 ') + state.strayContainers + T(' 个官方图包混在待整理里')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm',
              onClick: async () => {
            const r = await post('tidyContainers', {});
            if (!r.ok) setToast({ text: r.error || T('操作失败'), err: true });
            refreshState();
            load(true);
          },
            }, '移到 03-源文件\\_官方图'))
          : null,

        h('div', { className: 'yma-bar' },
          h('div', { className: 'yma-seg' },
            [['pool', tr('zone.pool')], ['owned', tr('zone.owned')],
              ['fav', T('收藏')], ['official', tr('zone.official')]]
              .map(([k, label]) => h('button', {
                key: k, type: 'button', className: zone === k ? 'on' : '',
                onClick: () => { setAroundId(null); setPicked([]); setZone(k); setSelected(null); },
              }, label))),
          h('div', { className: 'yma-search' },
            h(IconSearch, { size: 14 }),
            h('input', {
              ref: searchRef,
              className: 'yma-input', placeholder: tr('search.placeholder'), value: q,
              onChange: (e) => { setAroundId(null); setPicked([]); setQ(e.target.value); },
            })),
          h(FilterMenu, { value: filters, onChange: (v) => { setAroundId(null); setFilters(v); } }),
          h('span', { className: 'yma-count' }, list.total + T(' 张'))),

        h('div', { className: 'yma-body' },
          h('div', { className: 'yma-main' },
            gridItems.length
              ? h('div', { className: 'yma-grid' },
                gridItems.map((it, idx) => h(MapCard, {
                  key: it.id, item: it, idx,
                  selected: !!(selected && selected.id === it.id),
                  checked: picked.includes(it.id),
                  pinned: it.id === aroundId && !list.items.some((x) => x.id === it.id),
                  onCheck: (x) => setPicked((p) => (p.includes(x.id) ? p.filter((y) => y !== x.id) : p.concat([x.id]))),
                  onOpen: (x) => setSelected(x),
                  onToggleFav: async (x) => {
                    const r = await post('save', { id: x.id, fav: !x.fav });
                    if (!r.ok) { setToast({ text: r.error || T('保存失败'), err: true }); return; }
                    refreshState();
                    load(true);
                  },
                })))
              : h('div', { className: 'yma-grid' },
                h('div', { className: 'yma-empty' },
                  h('div', { key: 't' }, scanning ? tr('scan.scanning') : tr('empty')),
                  scanning ? null : h('div', { key: 'a', className: 'yma-row' },
                    h('button', {
                      type: 'button', className: 'yma-btn yma-btn--sm', onClick: () => setShowImport(true),
                    }, T('导入地图')),
                    h('button', {
                      type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost',
                      onClick: async () => {
                        const r = await post('openFolder', { dir: (state && state.libraryRoot) || '' });
                        if (!r.ok) setToast({ text: r.error || T('打开失败'), err: true });
                      },
                    }, T('打开地图库'))))),
            list.items.length && list.total > list.items.length
              ? h('div', { className: 'yma-morepad', ref: sentinelRef },
                h('button', {
                  type: 'button', className: 'yma-btn yma-btn--ghost',
                  disabled: loadingMore, onClick: () => load(false),
                }, loadingMore ? T('加载中…') : tr('btn.more')))
              : null),
          selected
            ? h(Detail, {
              item: selected,
              tagLibrary: (state && state.tags) || [],
              onChanged: () => { refreshState(); load(true); },
              onFiled: (res) => {
                setSelected(null);
                refreshState();
                load(true);
                setToast({ text: T('已归档到 ') + res.stars + T(' 星') });
              },
              onDeleted: () => { setSelected(null); refreshState(); load(true); setToast({ text: T('已删除') }); },
              onClose: () => setSelected(null),
            })
            : null),

        selected && !pending
          ? h('div', {
            style: {
              position: 'absolute', right: 396, bottom: 20, display: 'flex', gap: 8, padding: 8,
              borderRadius: 12, background: 'var(--dsw-alias-bg-overlay)',
              border: '1px solid var(--dsw-alias-border-l2)', zIndex: 8,
              boxShadow: '0 14px 34px -20px rgba(0,0,0,.75)',
            },
          },
          (state && state.hasGame === false)
            ? h('span', { className: 'yma-note', style: { margin: 0, alignSelf: 'center' } },
              T('未设置游戏目录，不能启动'))
            : [
              h('button', {
                key: 'yr', type: 'button', className: 'yma-btn yma-btn--primary', disabled: busy === 'start',
                onClick: () => doStart('yr'),
              }, h(IconPlay, { size: 13 }), busy === 'start' ? T('启动中…') : T('尤里的复仇')),
              h('button', {
                key: 'ra2', type: 'button', className: 'yma-btn', disabled: busy === 'start',
                onClick: () => doStart('ra2'),
              }, T('红警2')),
            ])
          : null,

        picked.length
          ? h('div', { className: 'yma-batchbar' },
            h('span', { style: { fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' } },
              T('已选 ') + picked.length + T(' 张')),
            h('input', {
              className: 'yma-input', value: batchTag, placeholder: T('输入标签'),
              onChange: (e) => setBatchTag(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); doBatchTag(); } },
            }),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm', disabled: !batchTag.trim(), onClick: doBatchTag,
            }, T('加标签')),
            h('button', { type: 'button', className: 'yma-btn yma-btn--sm', onClick: doBatchPool }, T('移回待整理')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm yma-btn--danger', onClick: doBatchDelete,
            }, T('删除')),
            h('button', {
              type: 'button', className: 'yma-btn yma-btn--sm yma-btn--ghost', onClick: () => setPicked([]),
            }, T('取消')))
          : null,
        toast ? h('div', { className: 'yma-toast' + (toast.err ? ' err' : '') }, toast.text) : null,
        showDraw ? h(DrawDialog, { state, onClose: () => setShowDraw(false), onDrawn: handleDrawn }) : null,
        showStats ? h(StatsDialog, { onClose: () => setShowStats(false), onOpenMap: openFromStats }) : null);
    }

    function apply(ctx) {
      hostCtx = ctx;
      curLocale = readLocale(ctx);
      ctx.effect(() => injectStyle(), 'yr-map-atlas: styles');
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'yr-map-atlas: dictionaries');
      try {
        const bound = ctx.locale.bind(NS);
        if (typeof bound === 'function') tr = (k) => bound(k);
      } catch { /* keep the local fallback */ }

      ctx.slots.inject('sidebar.panellist', function* () {
        yield ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'yr-atlas',
          order: 55,
          label: () => tr('title'),
          locale: NS,
        }, PanelIcon);
      });

      ctx.slots.inject('main', function* () {
        yield ctx.slots.register({ name: 'main', key: 'yr-atlas', locale: NS }, AtlasPage);
      });

      ctx.slots.inject('settings.section', function* () {
        yield ctx.slots.register({
          name: 'settings.section',
          id: 'yr-atlas',
          order: 45,
          label: () => tr('title'),
          locale: NS,
        }, SettingsPage);
      });
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
