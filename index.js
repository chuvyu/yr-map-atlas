/**
 * yr-map-atlas — Host half.
 *
 * 红警地图册 / Red Alert 2 & Yuri's Revenge map atlas.
 * Author: 一尾醋醋鱼 (bilibili)
 * Repo:   https://github.com/chuvyu/yr-map-atlas
 *
 * Owns the Red Alert 2 / Yuri's Revenge map library at `libraryRoot`:
 *   - scans map files, parses their INI metadata, decodes the embedded
 *     [PreviewPack] image (base64 -> LZO1X -> BGR888) into a cached PNG
 *   - keeps per-map records (stars, tags, notes, plays, crashes)
 *   - draws a map from the waiting pool, deploys it into the game folder with
 *     the play-mode extension, launches the game, times the session and turns
 *     the outcome into a pending settlement
 *   - detects crashes through the game's own except.txt
 *
 * The client half (client.js) never touches the filesystem: it talks to this
 * half over the HTTP prefix below.
 */
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync,
  copyFileSync, renameSync, unlinkSync, rmSync, openSync, readSync, closeSync,
} from "node:fs";
import { spawn, execFile, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { deflateSync, deflateRawSync, inflateRawSync } from "node:zlib";

export const name = "yr-map-atlas";
export const inject = ["webServer"];

const API_PREFIX = "/yr-map-atlas/api";
const PARSE_VERSION = 3;   // bump when entry parsing changes, to invalidate the index cache
const DATA_VERSION = 1;    // bump when `.atlas` data needs a migration
const CONFIG_SCHEMA = 1;   // bump when the exported config pack changes shape
const PLUGIN_VERSION = "0.2.0";
const AUTHOR = "一尾醋醋鱼";
const GITHUB_USER = "chuvyu";
const GITHUB = "https://github.com/" + GITHUB_USER;
const HOMEPAGE = GITHUB + "/yr-map-atlas";
// A map's own [Basic] Name is often a placeholder ("$$$$$10", "$qiao$", "try").
// Only trust it when it carries a real title.
const PLACEHOLDER_NAME = /^(no\s*name|noname|untitled|无标题|无名|none|null|\?+|-+)$/i;
function usableName(s) {
  const v = String(s || "").trim();
  if (!v || PLACEHOLDER_NAME.test(v)) return false;
  if (/(.)\1{4,}/.test(v)) return false;                  // shassssssss
  if (!/[A-Za-z\u4e00-\u9fff]/.test(v)) return false;
  const core = v.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, "");
  if (/[\u4e00-\u9fff]/.test(v)) return core.length >= 1;  // 墙 / 暗夜 / 一块地
  return core.length >= 5 || (/\s/.test(v) && core.length >= 4);
}
const MAP_EXT = new Set([".yrm", ".map", ".mpr", ".mmx", ".yro"]);
const THEATER_TAG = {
  SNOW: "雪地", TEMPERATE: "草地", URBAN: "城市", NEWURBAN: "城市", DESERT: "沙漠", LUNAR: "月球",
};

/* ------------------------------------------------------------------ utils */
const log = (...a) => {
  try { console.log("[yr-map-atlas]", ...a); } catch { /* ignore */ }
};

function md5File(path) {
  const h = createHash("md5");
  h.update(readFileSync(path));
  return h.digest("hex");
}

function safeName(s) {
  return String(s || "").replace(/[\\/:*?"<>|\r\n\t]/g, "_").replace(/\s+/g, " ").trim().slice(0, 90);
}

function stripExt(p) { return p.slice(0, p.length - extname(p).length); }

function readHead(path, n) {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(n);
    const got = readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, got);
  } finally { closeSync(fd); }
}

/* ------------------------------------------------------------- LZO1X ---- */
class LzoError extends Error {}

function lzo1xDecompress(src) {
  let out = new Uint8Array(1 << 16);
  let op = 0;
  const grow = (need) => {
    if (op + need <= out.length) return;
    let cap = out.length;
    while (cap < op + need) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(out.subarray(0, op));
    out = nb;
  };
  let ip = 0;
  const n = src.length;
  let trailing = 0;

  const readBytes = (len) => {
    if (ip + len > n) throw new LzoError("unexpected EOF");
    const s = src.subarray(ip, ip + len);
    ip += len;
    return s;
  };
  const copyLiteral = (len) => {
    if (!len) return;
    const s = readBytes(len);
    grow(len);
    out.set(s, op);
    op += len;
  };
  const copyBlock = (length, distance, tr) => {
    if (distance > op || distance <= 0) throw new LzoError("bad distance");
    grow(length);
    let from = op - distance;
    for (let i = 0; i < length; i++) out[op + i] = out[from + i];
    op += length;
    copyLiteral(tr);
    trailing = tr;
  };
  const countZeroes = () => {
    let len = 0;
    let v = readBytes(1)[0];
    while (v === 0) { len += 255; v = readBytes(1)[0]; if (len > (1 << 20)) throw new LzoError("too many zeroes"); }
    return len + v;
  };
  const process = (val) => {
    if (val <= 0xf) {
      if (!trailing) {
        if (val === 0) copyLiteral(countZeroes() + 18);
        else copyLiteral(val + 3);
      } else {
        const h = readBytes(1)[0];
        copyBlock(2, (h << 2) + (val >> 2) + 1, val & 3);
      }
    } else if (val <= 0x1f) {
      let length;
      if ((val & 7) === 0) length = 9 + countZeroes();
      else length = (val & 7) + 2;
      const b = readBytes(2);
      const ds = b[0] | (b[1] << 8);
      const dist = 16384 + ((val & 8) >> 3) + (ds >> 2);
      if (dist === 16384) return false;
      copyBlock(length, dist, ds & 3);
    } else if (val <= 0x3f) {
      let length = val & 31;
      if (length === 0) length = countZeroes() + 31;
      length += 2;
      const b = readBytes(2);
      const ds = b[0] | (b[1] << 8);
      copyBlock(length, 1 + (ds >> 2), ds & 3);
    } else {
      const length = val <= 0x7f ? 3 + ((val >> 5) & 1) : 5 + ((val >> 5) & 3);
      const h = readBytes(1)[0];
      copyBlock(length, (h << 3) + ((val >> 2) & 7) + 1, val & 3);
    }
    return true;
  };

  let first = readBytes(1)[0];
  if (first === 0x10) throw new LzoError("LZOv1 unsupported");
  if (first < 0x12) {
    if (!process(first)) return out.subarray(0, op);
  } else {
    copyLiteral(first - 0x11);
  }
  while (process(readBytes(1)[0])) { /* keep going */ }
  return out.subarray(0, op);
}

/* -------------------------------------------------------------- PNG ----- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

/** Letterbox an arbitrary w:h BGR image onto an exact 2:1 canvas (no scaling, no cropping). */
function letterbox2to1(w, h, bgr) {
  const H = Math.max(h, Math.ceil(w / 2));
  const W = H * 2;
  const out = Buffer.alloc(W * H * 3, 0x22);
  const ox = (W - w) >> 1;
  const oy = (H - h) >> 1;
  for (let y = 0; y < h; y++) {
    const src = y * w * 3;
    out.set(bgr.subarray(src, src + w * 3), ((y + oy) * W + ox) * 3);
  }
  return { W, H, buf: out };
}

/** Encode raw BGR888 (stride = 3*width) into a PNG buffer. */
function encodePngBgr(w, h, bgr) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (w * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < w; x++) {
      const s = y * w * 3 + x * 3;
      const d = rowStart + 1 + x * 3;
      raw[d] = bgr[s + 2];      // R
      raw[d + 1] = bgr[s + 1];  // G
      raw[d + 2] = bgr[s];      // B
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- INI --- */
// Map files are latin1-safe, but [Basic] Name values written by Chinese tools
// are GBK bytes. Recover them: try strict UTF-8 first, then GBK.
const GBK = (() => { try { return new TextDecoder("gbk"); } catch { return null; } })();

function fixText(s) {
  if (!s || !/[\u0080-\u00ff]/.test(s)) return s;
  const bytes = Buffer.from(s, "latin1");
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { /* not utf8 */ }
  if (GBK) { try { return GBK.decode(bytes); } catch { /* not gbk */ } }
  return s;
}

function parseIniText(text) {
  const out = {};
  let cur = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line[0] === ";" || line[0] === "#") continue;
    const m = /^\[([^\]]+)\]$/.exec(line);
    if (m) {
      cur = m[1].trim();
      if (!out[cur]) out[cur] = {};
      continue;
    }
    if (cur && line.indexOf("=") > 0) {
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (!(k in out[cur])) out[cur][k] = v;
    }
  }
  out.__text = text;
  return out;
}

function parseIni(path, limit = 8 << 20) {
  let buf;
  try {
    const st = statSync(path);
    buf = readHead(path, Math.min(st.size, limit));
  } catch { return {}; }
  return parseIniText(buf.toString("latin1"));
}

function sectionText(text, name) {
  const re = new RegExp("\\[" + name + "\\]\\s*\\n([\\s\\S]*?)(?:\\n\\s*\\n\\[|$)");
  const m = re.exec(text);
  return m ? m[1] : "";
}

function decodePreview(text) {
  const pm = /\[Preview\]\s*\n\s*Size\s*=\s*([\d\s,]+)/.exec(text);
  if (!pm) return null;
  const parts = pm[1].split(",").map((v) => parseInt(v.trim(), 10));
  if (parts.length < 4) return null;
  const [, , w, h] = parts;
  if (!(w > 0 && h > 0 && w <= 1024 && h <= 1024)) return null;
  const block = sectionText(text, "PreviewPack");
  if (!block) return null;
  let b64 = "";
  for (const line of block.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) b64 += line.slice(i + 1).trim();
  }
  let data;
  try { data = Buffer.from(b64, "base64"); } catch { return null; }
  const chunks = [];
  let off = 0;
  while (off + 4 <= data.length) {
    const csize = data.readUInt16LE(off);
    const usize = data.readUInt16LE(off + 2);
    off += 4;
    if (!csize) break;
    if (off + csize > data.length) break;
    try {
      const dec = lzo1xDecompress(data.subarray(off, off + csize));
      chunks.push(Buffer.from(dec));
    } catch { break; }
    off += csize;
    if (usize === 0) break;
  }
  const px = Buffer.concat(chunks);
  const need = w * h * 3;
  if (px.length < need) return null;
  return { w, h, bgr: px.subarray(0, need) };
}

/* -------------------------------------------------------------- repair -- */
const HEX_ID = /^[0-9A-Fa-f]{8}$/;

function splitSections(text) {
  const marks = [];
  const re = /^\[([^\]]+)\][ \t]*\r?$/gm;
  let m;
  while ((m = re.exec(text))) {
    marks.push({ name: m[1].trim(), start: m.index, bodyStart: m.index + m[0].length });
  }
  for (let i = 0; i < marks.length; i++) {
    marks[i].end = i + 1 < marks.length ? marks[i + 1].start : text.length;
  }
  return marks;
}

/** Count the seats a map really offers. */
function seatCount(text, sections) {
  const header = sections.find((s) => s.name === "Header");
  if (!header) return 0;
  const body = text.slice(header.bodyStart, header.end);
  const m = /^[ \t]*NumberStartingPoints[ \t]*=[ \t]*(\d+)/mi.exec(body);
  if (m && parseInt(m[1], 10) > 0) return parseInt(m[1], 10);
  let n = 0;
  for (const line of body.split(/\r?\n/)) {
    const w = /^[ \t]*Waypoint(\d)[ \t]*=[ \t]*(-?\d+)[ \t]*,[ \t]*(-?\d+)/i.exec(line);
    if (w && !(Number(w[2]) === 0 && Number(w[3]) === 0)) n++;
  }
  return n;
}

/**
 * Structural repair. Only the provably-wrong classes are rewritten:
 *   - MaxPlayer larger than the number of real seats
 *   - a team owned by "<Player @ X>" where seat X does not exist
 * Everything else is reported, never guessed at.
 */
function repairMapText(text) {
  const issues = [];
  const sections = splitSections(text);
  const starts = seatCount(text, sections);
  const out = [];
  let cursor = 0;
  let changed = false;

  for (const s of sections) {
    out.push(text.slice(cursor, s.start));
    out.push(text.slice(s.start, s.bodyStart));
    let body = text.slice(s.bodyStart, s.end);

    if (s.name === "Basic" && starts > 0) {
      if (/^[ \t]*MaxPlayer[ \t]*=/mi.test(body)) {
        body = body.replace(/^([ \t]*MaxPlayer[ \t]*=[ \t]*)(\d+)/mi, (all, p1, p2) => {
          const v = parseInt(p2, 10);
          if (v > starts) {
            changed = true;
            issues.push({
              code: "maxplayer-mismatch", fixed: true,
              detail: `MaxPlayer=${v}，但地图只有 ${starts} 个出生点；已改为 ${starts}（否则大厅能选到空座位）`,
            });
            return p1 + starts;
          }
          return all;
        });
      } else {
        // no MaxPlayer at all: the lobby would let players pick seats that do not exist
        const mm = /^([ \t]*MinPlayer[ \t]*=[ \t]*\d+[ \t]*\r?\n)/mi.exec(body);
        const pos = mm ? mm.index + mm[0].length : (body.indexOf("\n") >= 0 ? body.indexOf("\n") + 1 : body.length);
        body = body.slice(0, pos) + "MaxPlayer=" + starts + "\r\n" + body.slice(pos);
        changed = true;
        issues.push({ code: "maxplayer-missing", fixed: true, detail: `地图没写 MaxPlayer，已补上 ${starts}` });
      }
    }

    if (HEX_ID.test(s.name) && /^[ \t]*House[ \t]*=/mi.test(body)) {
      body = body.replace(/^([ \t]*House[ \t]*=[ \t]*)<Player @ ([A-H])>[ \t]*$/mi, (all, p1, letter) => {
        const idx = letter.charCodeAt(0) - 65 + 1;
        if (starts > 0 && idx > starts) {
          changed = true;
          issues.push({
            code: "seat-overflow", fixed: true,
            detail: `队伍 ${s.name} 绑定了 ${letter} 号座位，但地图只有 ${starts} 个座位；已改为中立`,
          });
          return p1 + "Neutral";
        }
        return all;
      });
    }
    out.push(body);
    cursor = s.end;
  }
  out.push(text.slice(cursor));

  const ids = new Set(sections.map((x) => x.name).filter((n) => HEX_ID.test(n)));
  for (const s of sections) {
    if (!HEX_ID.test(s.name)) continue;
    const body = text.slice(s.bodyStart, s.end);
    const tf = /^[ \t]*TaskForce[ \t]*=[ \t]*(\S+)/mi.exec(body);
    const sc = /^[ \t]*Script[ \t]*=[ \t]*(\S+)/mi.exec(body);
    if (tf && !ids.has(tf[1])) issues.push({ code: "dangling-taskforce", fixed: false, detail: `队伍 ${s.name} 引用的编队 ${tf[1]} 不存在` });
    if (sc && !ids.has(sc[1])) issues.push({ code: "dangling-script", fixed: false, detail: `队伍 ${s.name} 引用的脚本 ${sc[1]} 不存在` });
  }
  const actions = sections.find((s) => s.name === "Actions");
  if (actions) {
    for (const line of text.slice(actions.bodyStart, actions.end).split(/\r?\n/)) {
      const m = /^\s*([0-9A-Fa-f]{8})\s*=\s*(.+)$/.exec(line);
      if (!m) continue;
      const parts = m[2].split(",").map((x) => x.trim());
      if (parts[1] === "80" && parts[3] && !ids.has(parts[3])) {
        issues.push({ code: "dead-wave", fixed: false, detail: `触发器 ${m[1]} 要刷新的编队 ${parts[3]} 不存在` });
      }
    }
  }
  return { text: out.join(""), changed, issues, starts };
}

/** true = terrain consistent, false = corrupt, null = unknown. */
/** ['ok'|'count-mismatch'|'decode-fail'|'no-iso'|'unknown', detail] */
function checkTerrain(text) {
  try {
    const mapSec = splitSections(text).find((s) => s.name === "Map");
    if (!mapSec) return ["unknown", "没有 [Map] 段"];
    const sizeM = /^[ \t]*Size[ \t]*=[ \t]*(-?\d+)[ \t]*,[ \t]*(-?\d+)[ \t]*,[ \t]*(\d+)[ \t]*,[ \t]*(\d+)/mi
      .exec(text.slice(mapSec.bodyStart, mapSec.end));
    if (!sizeM) return ["unknown", "没有 [Map] Size"];
    const sw = Number(sizeM[3]);
    const sh = Number(sizeM[4]);
    const iso = splitSections(text).find((s) => s.name === "IsoMapPack5");
    if (!iso) return ["no-iso", "没有 [IsoMapPack5] 地形段"];
    let b64 = "";
    for (const line of text.slice(iso.bodyStart, iso.end).split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0) b64 += line.slice(i + 1).trim();
    }
    const data = Buffer.from(b64, "base64");
    const chunks = [];
    let off = 0;
    while (off + 4 <= data.length) {
      const csize = data.readUInt16LE(off);
      off += 4;
      if (!csize || off + csize > data.length) break;
      chunks.push(Buffer.from(lzo1xDecompress(data.subarray(off, off + csize))));
      off += csize;
    }
    const n = Buffer.concat(chunks).length;
    const expect = sh * (2 * sw - 1);
    const ok = ((n / 11) | 0) === expect || (((n - 4) / 11) | 0) === expect;
    return [ok ? "ok" : "count-mismatch", `记录数 ${(n / 11) | 0}，预期 ${expect}（${sw}x${sh}）`];
  } catch (e) {
    if (e instanceof LzoError) return ["decode-fail", "地形数据解压失败：" + String(e.message || e).slice(0, 60)];
    return ["unknown", "地形数据无法解析"];
  }
}

/* ------------------------------------------------------------- layout --- */
// Two folder dialects. classifyDir and every path builder read from here, so a
// library created in one language keeps working after switching the UI.
const LAYOUTS = {
  zh: {
    id: "zh",
    pool: "00-待整理", skirmish: "01-遭遇战", missions: "02-任务图", sources: "03-源文件",
    poolPlain: "遭遇战", poolMissions: "任务", poolPacks: "_地图包",
    poolBroken: "_无法修复", poolDupes: "_重复",
    officialPacks: "_官方图",
    playerDir: (n) => n + "人",
    starDir: (n) => n + "星",
    factions: ["苏军", "盟军", "尤里"],
    repairedSuffix: "（修复版）",
  },
  en: {
    id: "en",
    pool: "00-Inbox", skirmish: "01-Skirmish", missions: "02-Missions", sources: "03-Sources",
    poolPlain: "Maps", poolMissions: "Missions", poolPacks: "_Packs",
    poolBroken: "_Broken", poolDupes: "_Duplicates",
    officialPacks: "_OfficialPacks",
    playerDir: (n) => n + "P",
    starDir: (n) => n + "Star",
    factions: ["Soviet", "Allied", "Yuri"],
    repairedSuffix: " (repaired)",
  },
};

function layoutOf(id) {
  return LAYOUTS[id] || LAYOUTS.zh;
}

/* ------------------------------------------------------------- library -- */
function classifyDir(relDir, layout) {
  const L = layout || LAYOUTS.zh;
  const parts = relDir.split(/[\\/]+/).filter(Boolean);
  const top = parts[0] || "";
  if (top === L.pool) {
    const sub = parts[1] || "";
    if (sub === L.poolMissions) return { zone: "missionPool" };
    if (sub === L.poolPacks) return { zone: "packPool" };
    if (sub.startsWith("_")) return { zone: "other" };   // quarantined, never drawn
    return { zone: "pool" };
  }
  if (top === L.skirmish) {
    const pm = /^(\d)\D+$/.exec(parts[1] || "");
    const sm = /^(\d+)\D*$/.exec(parts[2] || "");
    return { zone: "skirmish", players: pm ? Number(pm[1]) : null, stars: sm ? Number(sm[1]) : null };
  }
  if (top === L.missions) {
    const sm = /^(\d+)\D*$/.exec(parts[2] || "");
    return { zone: "mission", faction: parts[1] || null, stars: sm ? Number(sm[1]) : null };
  }
  return { zone: "other" };
}

/* -------------------------------------------------------------- import -- */
const ARCHIVE_EXT = new Set([".zip", ".rar", ".7z"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp"]);

/** Read a zip central directory. Names are UTF-8 when flagged, GBK otherwise. */
function readZipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("不是有效的 zip 文件");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count && off + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const flags = buf.readUInt16LE(off + 8);
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28);
    const elen = buf.readUInt16LE(off + 30);
    const clen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const raw = buf.subarray(off + 46, off + 46 + nlen);
    let name = raw.toString("utf8");
    if (!(flags & 0x800)) {
      try { name = new TextDecoder("gbk").decode(raw); } catch { /* keep utf8 */ }
    }
    out.push({ name, flags, method, csize, lho });
    off += 46 + nlen + elen + clen;
  }
  return out;
}

function unzipTo(zipPath, outDir) {
  const buf = readFileSync(zipPath);
  let n = 0;
  for (const e of readZipEntries(buf)) {
    if (e.name.endsWith("/")) continue;
    if (e.flags & 1) throw new Error("压缩包有密码");
    const parts = e.name.split(/[\\/]+/).filter((p) => p && p !== "." && p !== "..");
    if (!parts.length) continue;
    const dest = join(outDir, ...parts);
    mkdirSync(dirname(dest), { recursive: true });
    const lho = e.lho;
    if (buf.readUInt32LE(lho) !== 0x04034b50) continue;
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + e.csize);
    writeFileSync(dest, e.method === 0 ? data : e.method === 8 ? inflateRawSync(data) : Buffer.alloc(0));
    n++;
  }
  return n;
}

function find7z() {
  for (const c of [
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    "C:\\Program Files\\NanaZip\\7z.exe",
  ]) if (existsSync(c)) return c;
  return null;
}

/** Extract any supported archive into outDir. Returns the number of files. */
function extractArchive(path, outDir) {
  const ext = extname(path).toLowerCase();
  mkdirSync(outDir, { recursive: true });
  if (ext === ".zip") return unzipTo(path, outDir);
  const seven = find7z();
  if (!seven) throw new Error("需要 7-Zip 才能解压 " + ext + "，未检测到");
  const r = spawnSync(seven, ["x", "-y", "-o" + outDir, path], { windowsHide: true });
  if (r.status !== 0) throw new Error("7-Zip 解压失败");
  let n = 0;
  const stack = [outDir];
  while (stack.length) {
    const d = stack.pop();
    let ents = [];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.isDirectory()) stack.push(join(d, e.name));
      else n++;
    }
  }
  return n;
}

/** Filesystem-safe map title: quotes dropped, colon becomes a dash. */
function importSafeName(s) {
  let v = String(s || "").replace(/"/g, "");
  v = v.replace(/:\s+/g, " - ").replace(/:/g, " ");
  v = v.replace(/[\\/*?<>|\r\n\t]/g, "_");
  v = v.replace(/\s+/g, " ").replace(/_{2,}/g, "_");
  v = v.replace(/^[ ._-]+/, "").replace(/[ ._-]+$/, "");
  return v.slice(0, 90);
}

/** Map name → a filesystem-safe file name, following the library's conventions. */
function importTargetName(fileStem, iniText) {
  const ini = parseIniText(iniText);
  const raw = fixText(((ini.Basic || {}).Name || "").trim());
  let base = usableName(raw) ? raw : "";
  if (!base) {
    base = fileStem.replace(/^\d{2,3}[ _.\-]*/, "").replace(/^(红警2?地图|红警2?任务|尤里地图|尤里任务|红警地图)[\-_－— ]*/, "");
    if (!/[A-Za-z\u4e00-\u9fff]/.test(base)) base = fileStem;
  }
  const safe = importSafeName(base);
  return safe || importSafeName(fileStem) || safeName(fileStem);
}

function walkFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    let ents = [];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const full = join(d, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function makeService(config) {
  // exe entries accept "NAME.EXE" or { file, args }
  const asLauncher = (v, fallbackFile, fallbackArgs) => {
    if (typeof v === "string" && v.trim()) return { file: v.trim(), args: fallbackArgs };
    if (v && typeof v === "object" && typeof v.file === "string") {
      return { file: v.file, args: Array.isArray(v.args) ? v.args : fallbackArgs };
    }
    return { file: fallbackFile, args: fallbackArgs };
  };
  const rawExe = config?.exe && typeof config.exe === "object" ? config.exe : {};

  // Settings live outside the library: at first run we do not know where the
  // library is yet. `%LOCALAPPDATA%\yr-map-atlas\settings.json`.
  const settingsDir = join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "yr-map-atlas");
  const settingsPath = join(settingsDir, "settings.json");

  function readSettings() {
    try { return JSON.parse(readFileSync(settingsPath, "utf8")) || {}; }
    catch { return {}; }
  }
  function writeSettings(patch) {
    const next = { ...readSettings(), ...patch, updatedAt: Date.now() };
    try {
      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(settingsPath, JSON.stringify(next, null, 1), "utf8");
    } catch (e) { log("settings write failed", e?.message); }
    return next;
  }

  let saved = readSettings();
  // An install configured through the old bundle patch has no settings yet:
  // adopt it instead of dropping the user into the setup wizard.
  if (!saved.libraryRoot && config?.libraryRoot && existsSync(join(config.libraryRoot, ".atlas"))) {
    try {
      saved = writeSettings({
        libraryRoot: config.libraryRoot,
        gameDir: config?.gameDir || null,
        layout: "zh",
      });
      log("adopted existing library:", config.libraryRoot);
    } catch { /* keep going unconfigured */ }
  }
  const cfg = {
    get libraryRoot() { return saved.libraryRoot || config?.libraryRoot || ""; },
    get gameDir() { return saved.gameDir !== undefined ? saved.gameDir : (config?.gameDir ?? null); },
    get layoutId() { return saved.layout || "zh"; },
    get configured() { return !!saved.libraryRoot; },
    get exe() {
      return {
        yr: asLauncher(saved.exe?.yr ?? rawExe.yr, "RA2MD.EXE", ["-speedcontrol"]),
        ra2: asLauncher(saved.exe?.ra2 ?? rawExe.ra2, "RA2.EXE", []),
      };
    },
  };
  let layout = layoutOf(cfg.layoutId);

  let dataDir = join(cfg.libraryRoot, ".atlas");
  let thumbDir = join(dataDir, "thumbs");
  let crashDir = join(dataDir, "crashes");
  let repairDir = join(dataDir, "repair");
  let indexPath = join(dataDir, "index.json");
  let statePath = join(dataDir, "state.json");

  function recomputePaths() {
    layout = layoutOf(cfg.layoutId);
    dataDir = join(cfg.libraryRoot, ".atlas");
    thumbDir = join(dataDir, "thumbs");
    crashDir = join(dataDir, "crashes");
    repairDir = join(dataDir, "repair");
    indexPath = join(dataDir, "index.json");
    statePath = join(dataDir, "state.json");
  }

  /** Create the whole folder tree for the active layout. */
  function initTree() {
    const L = layout;
    const mk = (p) => { try { mkdirSync(p, { recursive: true }); } catch { /* ignore */ } };
    const root = cfg.libraryRoot;
    mk(join(root, L.pool));
    mk(join(root, L.pool, L.poolPlain));
    mk(join(root, L.pool, L.poolMissions));
    mk(join(root, L.pool, L.poolPacks));
    mk(join(root, L.pool, L.poolBroken));
    mk(join(root, L.pool, L.poolDupes));
    for (let n = 2; n <= 8; n++) {
      for (let s = 0; s <= 10; s++) mk(join(root, L.skirmish, L.playerDir(n), L.starDir(s)));
    }
    for (const f of L.factions) {
      for (let s = 0; s <= 5; s++) mk(join(root, L.missions, f, L.starDir(s)));
    }
    mk(join(root, L.sources));
    mk(join(root, L.sources, L.officialPacks));
  }

  // ids may contain ':' (official:…), which NTFS treats as a stream separator
  const thumbName = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, "_") + ".png";
  const thumbPathOf = (id) => join(thumbDir, thumbName(id));

  const state = {
    scan: { status: "idle", done: 0, total: 0, startedAt: null, finishedAt: null, error: null },
    index: [],            // array of entries
    byId: new Map(),
    pending: null,        // active/parked play session
    records: {},          // id -> record
    version: 0,
  };
  const strayContainers = [];   // official MIX packs found inside the library
  let nameTable = new Map();    // md5 -> hand-picked name (.atlas/names.json)

  function ensureDirs() {
    for (const d of [dataDir, thumbDir, crashDir, repairDir, cfg.libraryRoot]) {
      if (d && !existsSync(d)) mkdirSync(d, { recursive: true });
    }
    // version stamp: future releases migrate `.atlas` data through this number
    try {
      const vp = join(dataDir, "version");
      const cur = existsSync(vp) ? parseInt(readFileSync(vp, "utf8").trim(), 10) || 0 : 0;
      if (cur !== DATA_VERSION) writeFileSync(vp, String(DATA_VERSION), "utf8");
    } catch { /* ignore */ }
  }

  function loadState() {
    try {
      const raw = JSON.parse(readFileSync(statePath, "utf8"));
      state.records = raw.records || {};
      state.pending = raw.pending || null;
    } catch { /* first run */ }
    loadNames();
    try {
      const idx = JSON.parse(readFileSync(indexPath, "utf8"));
      if (idx.v === PARSE_VERSION && Array.isArray(idx.entries)) {
        state.index = idx.entries;
        state.byId = new Map(state.index.map((e) => [e.id, e]));
        state.scan = { ...state.scan, status: "ready", done: idx.entries.length, total: idx.entries.length, finishedAt: idx.at };
      }
    } catch { /* first run */ }
  }

  function loadNames() {
    try {
      const nt = JSON.parse(readFileSync(join(dataDir, "names.json"), "utf8"));
      nameTable = new Map(Object.entries(nt || {}));
    } catch { nameTable = new Map(); }
  }

  function saveNames() {
    try {
      writeFileSync(join(dataDir, "names.json"),
        JSON.stringify(Object.fromEntries(nameTable), null, 1), "utf8");
    } catch (e) { log("saveNames failed", e?.message); }
  }

  let saveTimer = null;
  // The state file is small and losing the last rating because the app was
  // killed inside a debounce window is not acceptable — write straight away.
  function saveStateSoon() {
    if (saveTimer) return;
    try {
      writeFileSync(statePath, JSON.stringify({ records: state.records, pending: state.pending }, null, 1), "utf8");
    } catch (e) { log("save failed", e?.message); }
  }

  function recordOf(id) {
    if (!state.records[id]) {
      state.records[id] = { stars: 0, tags: [], notes: "", status: "new", plays: [], crashes: [], addedAt: Date.now() };
    }
    return state.records[id];
  }

  /* ---------------------------------------------------------- scanning */
  function walkMaps(root) {
    const out = [];
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const ent of entries) {
        if (ent.name === ".atlas") continue;
        if (ent.isDirectory() && ent.name === layout.sources) continue;   // archives / images, not playable items
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
          stack.push(full);
        } else {
          const ext = extname(ent.name).toLowerCase();
          if (MAP_EXT.has(ext)) out.push(full);
        }
      }
    }
    return out;
  }

  function isMixContainer(path) {
    let head;
    try { head = readHead(path, 4); } catch { return false; }
    if (head.length < 4) return false;
    if (head[0] === 0x5b || head[0] === 0x3b) return false; // '[' or ';'
    const magic = head.readUInt32LE(0);
    return magic === 0x00010000 || magic === 0x00020000 || magic === 0x00030000;
  }

  function buildEntry(path, cache) {
    let st;
    try { st = statSync(path); } catch { st = null; }
    if (cache) {
      const hit = cache.get(path);
      if (hit && st && hit.mtime === st.mtimeMs && hit.size === st.size && existsSync(thumbPathOf(hit.id))) {
        return hit;
      }
    }
    const rel = relative(cfg.libraryRoot, path);
    const relDir = dirname(rel);
    const loc = classifyDir(relDir, layout);
    const ini = parseIni(path);
    const basic = ini.Basic || {};
    const map = ini.Map || {};
    const header = ini.Header || {};
    const text = ini.__text || "";
    let id;
    try { id = md5File(path); } catch { id = createHash("md5").update(rel).digest("hex"); }
    const rawName = fixText((basic.Name || "").trim());
    const fileStem = fixText(stripExt(basename(path)));
    let name = rawName;
    let nameSource = "map";
    if (nameTable.has(id)) { name = nameTable.get(id); nameSource = "manual"; }
    else if (!usableName(rawName) && usableName(fileStem)) { name = fileStem; nameSource = "file"; }
    else if (!usableName(rawName)) { name = rawName || fileStem; nameSource = "raw"; }
    const maxp = parseInt(basic.MaxPlayer || basic.MaxPlayers || "", 10);
    const minp = parseInt(basic.MinPlayer || basic.MinPlayers || "", 10);
    const gms = String(basic.GameMode || "").split(",").map((s) => s.trim()).filter(Boolean);
    const entry = {
      id,
      path,
      rel,
      file: basename(path),
      kind: loc.zone === "mission" || loc.zone === "missionPool" ? "mission" : "map",
      zone: loc.zone,
      players: loc.players ?? (Number.isFinite(maxp) ? Math.min(8, Math.max(2, maxp)) : null),
      stars: loc.stars ?? null,
      faction: loc.faction ?? null,
      name: name || fileStem,
      nameSource,
      displayNameMissing: nameSource === "raw",
      minP: Number.isFinite(minp) ? minp : null,
      maxP: Number.isFinite(maxp) ? maxp : null,
      theater: (map.Theater || "").toUpperCase() || null,
      width: parseInt(header.Width || "", 10) || null,
      height: parseInt(header.Height || "", 10) || null,
      gameModes: gms,
      official: false,
      size: 0,
      mtime: 0,
      hasThumb: false,
      scannedAt: Date.now(),
    };
    try { entry.size = st.size; entry.mtime = st.mtimeMs; } catch { /* ignore */ }
    // thumbnail
    const thumbPath = thumbPathOf(id);
    if (existsSync(thumbPath)) {
      entry.hasThumb = true;
    } else if (text) {
      try {
        const prev = decodePreview(text);
        if (prev) {
          const box = letterbox2to1(prev.w, prev.h, prev.bgr);
          writeFileSync(thumbPath, encodePngBgr(box.W, box.H, box.buf));
          entry.hasThumb = true;
        }
      } catch { /* no preview */ }
    }
    return entry;
  }

  async function scan() {
    if (!cfg.libraryRoot) return;
    if (state.scan.status === "scanning") return;
    ensureDirs();
    state.scan = { status: "scanning", done: 0, total: 0, startedAt: Date.now(), finishedAt: null, error: null };
    state.version++;
    try {
      const files = walkMaps(cfg.libraryRoot);
      state.scan.total = files.length;
      const prevCache = new Map(state.index.map((e) => [e.path, e]));
      const entries = [];
      strayContainers.length = 0;
      for (const f of files) {
        try {
          if (isMixContainer(f)) { strayContainers.push(f); state.scan.done++; continue; }
          entries.push(buildEntry(f, prevCache));
        } catch (e) { log("entry failed", f, e?.message); }
        state.scan.done++;
        if (state.scan.done % 50 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      // official maps: read-only view of the game folder's own packs
      try {
        for (const n of readdirSync(cfg.gameDir)) {
          const ext = extname(n).toLowerCase();
          if (!MAP_EXT.has(ext)) continue;
          const full = join(cfg.gameDir, n);
          if (!isMixContainer(full)) continue;
          const id = "official:" + createHash("md5").update(n).digest("hex").slice(0, 16);
          const o = {
            id, path: full, rel: n, file: n, kind: "official", zone: "official",
            players: null, stars: null, faction: null,
            name: stripExt(n), displayNameMissing: true,
            minP: null, maxP: null, theater: null, width: null, height: null,
            gameModes: [], official: true, size: 0, mtime: 0, hasThumb: false,
            scannedAt: Date.now(),
          };
          // a MIX pack stores its .MAP uncompressed inside: pull the preview and the player count out of it
          try {
            const text = readHead(full, 8 << 20).toString("latin1");
            const ini = parseIniText(text);
            for (const v of Object.values(ini)) {
              if (v && v.MaxPlayers) {
                const mp = parseInt(v.MaxPlayers, 10);
                if (Number.isFinite(mp)) { o.maxP = mp; o.players = Math.min(8, Math.max(2, mp)); }
                const np = parseInt(v.MinPlayers || "", 10);
                if (Number.isFinite(np)) o.minP = np;
                break;
              }
            }
            const thumbPath = thumbPathOf(id);
            if (!existsSync(thumbPath)) {
              const prev = decodePreview(text);
              if (prev) {
                const box = letterbox2to1(prev.w, prev.h, prev.bgr);
                writeFileSync(thumbPath, encodePngBgr(box.W, box.H, box.buf));
              }
            }
            o.hasThumb = existsSync(thumbPath);
          } catch { /* keep the plain entry */ }
          entries.push(o);
        }
      } catch { /* no game dir */ }

      state.index = entries;
      state.byId = new Map(entries.map((e) => [e.id, e]));
      state.scan.status = "ready";
      state.scan.finishedAt = Date.now();
      writeFileSync(indexPath, JSON.stringify({ v: PARSE_VERSION, at: Date.now(), entries }), "utf8");
      state.version++;
      log("scan done", entries.length);
    } catch (e) {
      state.scan.status = "error";
      state.scan.error = String(e?.message || e);
      state.version++;
      log("scan failed", e?.message);
    }
  }

  /* ------------------------------------------------------------ import -- */
  const imp = {
    status: "idle", phase: "", done: 0, total: 0, error: null,
    source: null, summary: null, result: null, manifestPath: null,
  };
  let importPlan = null;
  let importCancel = false;

  const impDir = () => join(dataDir, "imports");
  const poolDir = () => join(cfg.libraryRoot, layout.pool, layout.poolPlain);
  const sourcesDir = () => join(cfg.libraryRoot, layout.sources);
  const dupesDir = () => join(cfg.libraryRoot, layout.pool, layout.poolDupes);
  const brokenDir = () => join(cfg.libraryRoot, layout.pool, layout.poolBroken);
  const packsDir = () => join(cfg.libraryRoot, layout.pool, layout.poolPacks);

  function classifyFile(p) {
    const ext = extname(p).toLowerCase();
    if (MAP_EXT.has(ext)) return isMixContainer(p) ? "container" : "map";
    if (ARCHIVE_EXT.has(ext)) return "archive";
    if (IMAGE_EXT.has(ext)) return "image";
    return "other";
  }

  async function importScan(root) {
    if (!root || !existsSync(root)) throw new Error("找不到这个文件夹");
    const files = walkFiles(root);
    imp.status = "scanning";
    imp.phase = "扫描";
    imp.done = 0;
    imp.total = files.length;
    imp.error = null;
    imp.source = root;
    importPlan = { root, items: [] };

    const have = new Set(state.index.map((e) => e.id).filter(Boolean));
    const seen = new Set();
    const summary = { total: files.length, maps: 0, dup: 0, fresh: 0, containers: 0, archives: 0, images: 0, other: 0, bytes: 0 };

    for (const p of files) {
      if (importCancel) break;
      const kind = classifyFile(p);
      let md5 = null;
      try { summary.bytes += statSync(p).size; } catch { /* ignore */ }
      if (kind === "map") {
        summary.maps++;
        try { md5 = md5File(p); } catch { /* ignore */ }
        if (md5 && (have.has(md5) || seen.has(md5))) summary.dup++;
        else { summary.fresh++; if (md5) seen.add(md5); }
      } else if (kind === "container") summary.containers++;
      else if (kind === "archive") summary.archives++;
      else if (kind === "image") summary.images++;
      else summary.other++;
      importPlan.items.push({ path: p, kind, md5 });
      imp.done++;
      if (imp.done % 100 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    imp.summary = summary;
    imp.status = importCancel ? "cancelled" : "ready";
    imp.phase = "";
    state.version++;
  }

  async function importRun(options) {
    if (!importPlan) throw new Error("还没有扫描");
    const opt = {
      duplicates: options?.duplicates === "all" ? "all" : options?.duplicates === "move" ? "move" : "skip",
      naming: options?.naming === "keep" ? "keep" : "map",
      archives: options?.archives === "archive" ? "archive" : "extract",
      images: options?.images === "skip" ? "skip" : "archive",
    };
    importCancel = false;
    imp.status = "running";
    imp.phase = "导入";
    imp.done = 0;
    imp.total = importPlan.items.length;
    imp.error = null;
    imp.result = { moved: 0, skipped: 0, duped: 0, archived: 0, images: 0, containers: 0, extracted: 0, errors: [] };
    const manifest = [];
    const have = new Set(state.index.map((e) => e.id).filter(Boolean));
    const tmpRoot = join(dataDir, "imports", "tmp-" + Date.now());
    try { mkdirSync(tmpRoot, { recursive: true }); } catch { /* ignore */ }

    const takeMap = (src, md5) => {
      if (md5 && have.has(md5)) {
        if (opt.duplicates === "skip") { imp.result.skipped++; return; }
        if (opt.duplicates === "move") {
          const t = moveInto(src, dupesDir(), basename(src));
          manifest.push({ from: src, to: t });
          imp.result.duped++;
          return;
        }
      }
      let name = basename(src);
      if (opt.naming === "map") {
        try {
          const head = readHead(src, 4 << 20).toString("latin1");
          name = importTargetName(stripExt(name), head) + extname(name);
        } catch { /* keep original */ }
      }
      const t = moveInto(src, poolDir(), name);
      manifest.push({ from: src, to: t });
      if (md5) have.add(md5);
      imp.result.moved++;
    };

    for (const item of importPlan.items) {
      if (importCancel) { imp.status = "cancelled"; break; }
      try {
        if (item.kind === "map") {
          takeMap(item.path, item.md5);
        } else if (item.kind === "container") {
          const t = moveInto(item.path, join(sourcesDir(), layout.officialPacks), basename(item.path));
          manifest.push({ from: item.path, to: t });
          imp.result.containers++;
        } else if (item.kind === "image") {
          if (opt.images === "archive") {
            const t = moveInto(item.path, join(sourcesDir(), "_图片备份"), basename(item.path));
            manifest.push({ from: item.path, to: t });
            imp.result.images++;
          }
        } else if (item.kind === "other") {
          const t = moveInto(item.path, join(sourcesDir(), "_杂项"), basename(item.path));
          manifest.push({ from: item.path, to: t });
        } else if (item.kind === "archive") {
          let handled = false;
          if (opt.archives === "extract") {
            const out = join(tmpRoot, String(imp.done));
            let maps = [];
            try {
              extractArchive(item.path, out);
              const inner = walkFiles(out);
              maps = inner.filter((f) => MAP_EXT.has(extname(f).toLowerCase()));
              const resFiles = inner.filter((f) => [".csf", ".fnt", ".shp", ".pal", ".mix"].includes(extname(f).toLowerCase()));
              const isPackage = maps.length > 1 || resFiles.length > 0;
              if (isPackage) {
                const stem = safeName(stripExt(basename(item.path))) || "package";
                const dest = join(cfg.libraryRoot, layout.pool, layout.poolMissions, stem);
                try { mkdirSync(dest, { recursive: true }); } catch { /* ignore */ }
                for (const f of inner) {
                  const rel = relative(out, f);
                  const t = join(dest, rel);
                  mkdirSync(dirname(t), { recursive: true });
                  try { renameSync(f, t); } catch { try { copyFileSync(f, t); unlinkSync(f); } catch { /* ignore */ } }
                }
                imp.result.extracted++;
                handled = true;
              } else {
                for (const f of maps) {
                  let md5 = null;
                  try { md5 = md5File(f); } catch { /* ignore */ }
                  takeMap(f, md5);
                  imp.result.extracted++;
                }
                handled = true;
              }
            } catch (e) {
              imp.result.errors.push(basename(item.path) + "：" + (e?.message || e));
            }
          }
          const destRel = relative(importPlan.root, item.path);
          const t = moveInto(item.path, join(sourcesDir(), dirname(destRel)), basename(item.path));
          manifest.push({ from: item.path, to: t });
          imp.result.archived++;
          if (!handled && opt.archives === "extract") { /* extraction failed: archive kept */ }
        }
      } catch (e) {
        imp.result.errors.push(basename(item.path) + "：" + (e?.message || e));
      }
      imp.done++;
      if (imp.done % 25 === 0) {
        state.version++;
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
    try {
      mkdirSync(impDir(), { recursive: true });
      const mp = join(impDir(), "import-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json");
      writeFileSync(mp, JSON.stringify({ at: Date.now(), root: importPlan.root, options: opt, moves: manifest }, null, 1), "utf8");
      imp.manifestPath = mp;
    } catch (e) { imp.result.errors.push("写清单失败：" + (e?.message || e)); }

    if (imp.status !== "cancelled") { imp.status = "done"; imp.phase = ""; }
    importPlan = null;
    state.version++;
    scan();
    return imp.result;
  }

  function importUndo(manifestPath) {
    let data;
    try { data = JSON.parse(readFileSync(manifestPath, "utf8")); }
    catch (e) { throw new Error("读不到清单：" + (e?.message || e)); }
    let back = 0, skipped = 0;
    for (const mv of (data.moves || []).slice().reverse()) {
      try {
        if (!existsSync(mv.to)) { skipped++; continue; }
        if (existsSync(mv.from)) { skipped++; continue; }
        mkdirSync(dirname(mv.from), { recursive: true });
        renameSync(mv.to, mv.from);
        back++;
      } catch { skipped++; }
    }
    scan();
    return { restored: back, skipped };
  }

  /* ------------------------------------------------------------- health -- */
  const health = { status: "idle", done: 0, total: 0, report: null, error: null };

  async function healthRun(apply) {
    const targets = state.index.filter((e) => e.zone === "pool");
    health.status = "running";
    health.done = 0;
    health.total = targets.length;
    health.error = null;
    health.report = { ok: 0, fixed: 0, broken: 0, noted: 0, quarantined: [], changes: [] };
    state.version++;
    for (const e of targets) {
      try {
        const raw = readFileSync(e.path);
        const text = raw.toString("latin1");
        const [tkind, tdetail] = checkTerrain(text);
        if (tkind === "decode-fail" || tkind === "no-iso") {
          health.report.broken++;
          try {
            const t = moveInto(e.path, brokenDir(), basename(e.path));
            health.report.quarantined.push({ file: basename(e.path), why: tdetail, to: t });
          } catch { /* ignore */ }
        } else {
          if (tkind === "count-mismatch") health.report.noted++;
          const rep = repairMapText(text);
          if (rep.changed) {
            if (apply) {
              try { writeFileSync(e.path, Buffer.from(rep.text, "latin1")); } catch { /* ignore */ }
            }
            health.report.fixed++;
            if (health.report.changes.length < 50) {
              health.report.changes.push({
                file: basename(e.path),
                issues: rep.issues.filter((x) => x.fixed).map((x) => x.detail).slice(0, 3),
              });
            }
          } else {
            health.report.ok++;
          }
        }
      } catch { health.report.ok++; }
      health.done++;
      if (health.done % 50 === 0) {
        state.version++;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    health.status = "done";
    state.version++;
    scan();
    return health.report;
  }

  /* --------------------------------------------------------- diagnostics -- */
  function writeZipFile(zipPath, entries) {
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const e of entries) {
      const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), "utf8");
      const comp = deflateRawSync(data);
      const nameBuf = Buffer.from(e.name, "utf8");
      const crc = crc32(data);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x800, 6);
      local.writeUInt16LE(8, 8);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(comp.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      chunks.push(local, nameBuf, comp);
      central.push({ nameBuf, crc, csize: comp.length, usize: data.length, offset });
      offset += 30 + nameBuf.length + comp.length;
    }
    const cdStart = offset;
    let cdSize = 0;
    for (const c of central) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE(20, 4);
      h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x800, 8);
      h.writeUInt16LE(8, 10);
      h.writeUInt32LE(c.crc, 16);
      h.writeUInt32LE(c.csize, 20);
      h.writeUInt32LE(c.usize, 24);
      h.writeUInt16LE(c.nameBuf.length, 28);
      h.writeUInt32LE(c.offset, 42);
      chunks.push(h, c.nameBuf);
      cdSize += 46 + c.nameBuf.length;
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cdSize, 12);
    end.writeUInt32LE(cdStart, 16);
    chunks.push(end);
    writeFileSync(zipPath, Buffer.concat(chunks));
  }

  function exportDiagnostics() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const out = join(settingsDir, "diagnostics-" + stamp + ".zip");
    const entries = [];
    const add = (name, path) => {
      try { entries.push({ name, data: readFileSync(path) }); } catch { /* skip */ }
    };
    add("settings.json", settingsPath);
    add("atlas/index.json", indexPath);
    add("atlas/state.json", statePath);
    add("atlas/names.json", join(dataDir, "names.json"));
    add("atlas/repair-kb.json", join(dataDir, "repair-kb.json"));
    try {
      for (const f of readdirSync(crashDir).slice(-5)) add("crashes/" + f, join(crashDir, f));
    } catch { /* none */ }
    try {
      for (const f of readdirSync(join(cfg.gameDir, "")) ) { /* no-op guard */ }
    } catch { /* ignore */ }
    add("game/except.txt", join(cfg.gameDir, "except.txt"));
    entries.push({
      name: "summary.txt",
      data: [
        "yr-map-atlas diagnostics",
        "at: " + new Date().toISOString(),
        "layout: " + layout.id,
        "library: " + cfg.libraryRoot,
        "game: " + (cfg.gameDir || "(none)"),
        "entries: " + state.index.length,
        "pool: " + state.index.filter((e) => e.zone === "pool").length,
        "owned: " + state.index.filter((e) => e.zone === "skirmish" || e.zone === "mission").length,
        "official: " + state.index.filter((e) => e.zone === "official").length,
        "scan: " + state.scan.status,
      ].join("\n"),
    });
    try { mkdirSync(settingsDir, { recursive: true }); } catch { /* ignore */ }
    writeZipFile(out, entries);
    return out;
  }

  /* -------------------------------------------------------- game options -- */
  function iniFileFor(mode) {
    return join(cfg.gameDir, mode === "ra2" ? "RA2.INI" : "RA2MD.INI");
  }

  function readIniSection(file, section) {
    const text = readFileSync(file, "latin1");
    const lines = text.split(/\r?\n/);
    const values = {};
    let inside = false;
    for (const line of lines) {
      const h = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      if (h) { inside = h[1].trim().toLowerCase() === section.toLowerCase(); continue; }
      if (!inside) continue;
      const kv = /^\s*([^=;]+?)\s*=\s*(.*)$/.exec(line);
      if (kv) values[kv[1].trim()] = kv[2].trim();
    }
    return values;
  }

  /** Merge keys into one INI section, leaving everything else untouched. */
  function writeIniSection(file, section, entries, removeKeys) {
    const text = readFileSync(file, "latin1");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    let start = -1, end = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const h = /^\s*\[([^\]]+)\]\s*$/.exec(lines[i]);
      if (!h) continue;
      if (h[1].trim().toLowerCase() === section.toLowerCase()) start = i;
      else if (start >= 0 && i > start) { end = i; break; }
    }
    if (start < 0) {
      lines.push("", "[" + section + "]");
      start = lines.length - 1;
      end = lines.length;
    }
    const keys = Object.keys(entries);
    const del = new Set((removeKeys || []).map((k) => k.toLowerCase()));
    const done = new Set();
    const drop = [];
    for (let i = start + 1; i < end; i++) {
      const kv = /^\s*([^=;]+?)\s*=/.exec(lines[i]);
      if (!kv) continue;
      const k = kv[1].trim();
      if (del.has(k.toLowerCase())) { drop.push(i); continue; }
      const hit = keys.find((x) => x.toLowerCase() === k.toLowerCase());
      if (hit) { lines[i] = hit + "=" + entries[hit]; done.add(hit); }
    }
    for (let i = drop.length - 1; i >= 0; i--) { lines.splice(drop[i], 1); end--; }
    const extra = keys.filter((k) => !done.has(k)).map((k) => k + "=" + entries[k]);
    if (extra.length) lines.splice(end, 0, ...extra);
    const bak = file + ".yr-atlas.bak";
    try { if (!existsSync(bak)) copyFileSync(file, bak); } catch { /* ignore */ }
    writeFileSync(file, lines.join(eol), "latin1");
    return entries;
  }

  function parseCustom(text) {
    const out = {};
    for (const line of String(text || "").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith(";") || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (k && /^[A-Za-z0-9_]+$/.test(k)) out[k] = v;
    }
    return out;
  }

  function gameOptionsFor(mode) {
    const file = iniFileFor(mode);
    const exists = existsSync(file);
    return {
      path: file,
      exists,
      backup: existsSync(file + ".yr-atlas.bak"),
      values: (() => {
        if (!exists) return {};
        const ini = readIniSection(file, "Skirmish");
        // saved overrides win; an empty string means "remove this key again"
        for (const [k, v] of Object.entries(saved.gameOptions?.values || {})) {
          if (v === "") delete ini[k];
          else ini[k] = v;
        }
        return ini;
      })(),
      custom: saved.gameOptions?.custom || "",
      applyOnLaunch: !!saved.gameOptions?.applyOnLaunch,
    };
  }

  function applyGameOptions(mode) {
    const g = saved.gameOptions;
    if (!g) throw new Error("还没有保存作战配置");
    const file = iniFileFor(mode);
    if (!existsSync(file)) throw new Error("找不到游戏配置：" + file);
    const entries = { ...parseCustom(g.custom) };
    const remove = [];
    for (const [k, v] of Object.entries(g.values || {})) {
      if (v === "") remove.push(k);
      else entries[k] = v;
    }
    if (!Object.keys(entries).length && !remove.length) throw new Error("没有要写入的配置");
    writeIniSection(file, "Skirmish", entries, remove);
    return { path: file, keys: Object.keys(entries).length, removed: remove.length };
  }

  /* -------------------------------------------------------- config pack -- */
  function repairKbPath() { return join(dataDir, "repair-kb.json"); }
  function readRepairKb() {
    try { return JSON.parse(readFileSync(repairKbPath(), "utf8")); } catch { return []; }
  }
  function backupDir() { return join(settingsDir, "backups"); }

  function exportConfig() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dir = backupDir();
    try { mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    const out = join(dir, "yr-atlas-" + stamp + ".json");
    const pack = {
      app: "yr-map-atlas",
      author: AUTHOR,
      homepage: HOMEPAGE,
      github: GITHUB,
      schema: CONFIG_SCHEMA,
      pluginVersion: PLUGIN_VERSION,
      dataVersion: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      source: {
        library: cfg.libraryRoot,
        layout: layout.id,
        entries: state.index.length,
        pool: state.index.filter((e) => e.zone === "pool").length,
        owned: state.index.filter((e) => e.zone === "skirmish" || e.zone === "mission").length,
      },
      settings: {
        libraryRoot: cfg.libraryRoot,
        gameDir: cfg.gameDir,
        layout: layout.id,
        exe: saved.exe || null,
      },
      records: state.records,
      names: Object.fromEntries(nameTable),
      repairKb: readRepairKb(),
    };
    writeFileSync(out, JSON.stringify(pack, null, 1), "utf8");
    return {
      path: out,
      records: Object.keys(state.records).length,
      names: nameTable.size,
      kb: pack.repairKb.length,
      bytes: Buffer.byteLength(JSON.stringify(pack)),
    };
  }

  function listConfigs() {
    const out = [];
    let files = [];
    try { files = readdirSync(backupDir()); } catch { return out; }
    for (const f of files) {
      if (!/\.json$/i.test(f)) continue;
      const p = join(backupDir(), f);
      let head = null;
      try { head = JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")); } catch { continue; }
      if (head.app !== "yr-map-atlas") continue;
      out.push({
        name: f, path: p,
        exportedAt: head.exportedAt || null,
        schema: head.schema || 0,
        pluginVersion: head.pluginVersion || "",
        library: head.source?.library || "",
        records: Object.keys(head.records || {}).length,
        names: Object.keys(head.names || {}).length,
        bytes: statSync(p).size,
      });
    }
    out.sort((a, b) => String(b.exportedAt).localeCompare(String(a.exportedAt)));
    return out;
  }

  function importConfig(pathArg, mode) {
    const p = String(pathArg || "").trim();
    if (!p) throw new Error("没有选择配置文件");
    if (!existsSync(p)) throw new Error("文件不存在：" + p);
    let pack;
    try { pack = JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")); }
    catch { throw new Error("不是有效的配置包（内容无法解析）"); }
    if (pack.app !== "yr-map-atlas") throw new Error("这不是红警地图册的配置包");
    const schema = Number(pack.schema || 0);
    if (schema > CONFIG_SCHEMA) {
      throw new Error(`配置包版本 ${schema} 高于当前插件支持的 ${CONFIG_SCHEMA}（来自 ${pack.pluginVersion || "更新版本"}），请先升级插件`);
    }
    // schema < CONFIG_SCHEMA: run migrations here as the format evolves
    const replace = mode === "replace";
    const known = new Set(state.index.map((e) => e.id));
    let applied = 0, skipped = 0, orphan = 0, namesAdded = 0;
    for (const [id, rec] of Object.entries(pack.records || {})) {
      const exists = !!state.records[id];
      if (exists && !replace) { skipped++; }
      else { state.records[id] = { ...(state.records[id] || {}), ...rec }; applied++; }
      if (!known.has(id)) orphan++;
    }
    for (const [id, nm] of Object.entries(pack.names || {})) {
      if (typeof nm !== "string" || !nm.trim()) continue;
      if (nameTable.has(id) && !replace) continue;
      nameTable.set(id, nm);
      namesAdded++;
    }
    if (Array.isArray(pack.repairKb) && pack.repairKb.length) {
      const kb = readRepairKb();
      const seen = new Set(kb.map((x) => JSON.stringify(x)));
      for (const item of pack.repairKb) {
        const k = JSON.stringify(item);
        if (!seen.has(k)) { kb.push(item); seen.add(k); }
      }
      try { writeFileSync(repairKbPath(), JSON.stringify(kb, null, 1), "utf8"); } catch { /* ignore */ }
    }
    saveNames();
    saveStateSoon();
    state.version++;
    return {
      applied, skipped, orphan, namesAdded,
      replace,
      source: pack.source || null,
      fromVersion: pack.pluginVersion || "",
      schema,
    };
  }

  /* ------------------------------------------------------------ records */
  function decorate(e) {
    const r = state.records[e.id] || {};
    const history = (r.plays || []).slice(-20).reverse();
    return {
      id: e.id, name: e.name, file: e.file, rel: e.rel, kind: e.kind, zone: e.zone,
      players: e.players, stars: e.stars, faction: e.faction,
      minP: e.minP, maxP: e.maxP, theater: e.theater, width: e.width, height: e.height,
      official: e.official, hasThumb: e.hasThumb, size: e.size, nameSource: e.nameSource,
      rating: r.stars || 0, tags: r.tags || [], status: r.status || "new",
      fav: !!r.fav,
      notes: r.notes || "", plays: (r.plays || []).length, crashes: (r.crashes || []).length,
      lastPlayed: r.lastPlayed || null,
      playsHistory: history,
      autoTags: autoTags(e),
    };
  }

  function autoTags(e) {
    const t = [];
    if (e.theater && THEATER_TAG[e.theater]) t.push(THEATER_TAG[e.theater]);
    if (e.official) t.push("官方");
    if (e.maxP) t.push(e.maxP + "人");
    return t;
  }

  function queryMaps(q) {
    const kw = String(q.q || "").trim().toLowerCase();
    const listOf = (v) => String(v === undefined || v === null ? "" : v)
      .split(",").map((s) => s.trim()).filter((s) => s !== "");
    const players = listOf(q.players).map(Number).filter(Number.isFinite);
    const starList = listOf(q.stars).map(Number).filter(Number.isFinite);
    const theaters = listOf(q.theater).map((s) => s.toUpperCase());
    const items = [];
    for (const e of state.index) {
      if (q.zone && q.zone !== "all") {
        if (q.zone === "pool" && e.zone !== "pool") continue;
        if (q.zone === "owned" && !(e.zone === "skirmish" || e.zone === "mission")) continue;
        if (q.zone === "official" && e.zone !== "official") continue;
        if (q.zone === "skirmish" && e.zone !== "skirmish") continue;
        if (q.zone === "mission" && e.zone !== "mission") continue;
        if (q.zone === "fav" && !(e.zone === "skirmish" || e.zone === "mission")) continue;
      }
      if (q.minP && !(e.maxP >= Number(q.minP))) continue;
      if (q.maxP && !(e.maxP && e.maxP <= Number(q.maxP))) continue;
      if (players.length && !(e.maxP && players.includes(e.maxP))) continue;
      if (theaters.length && !(e.theater && theaters.includes(e.theater))) continue;
      const r = state.records[e.id] || {};
      if (q.zone === "fav" && !r.fav) continue;
      if (q.fav === "1" && !r.fav) continue;
      if (starList.length && !starList.includes(r.stars || 0)) continue;
      if (q.tag) {
        if (!(r.tags || []).includes(q.tag)) continue;
      }
      if (kw) {
        const hay = (e.name + " " + e.file + " " + (r.notes || "") + " " + (r.tags || []).join(" ")).toLowerCase();
        if (!hay.includes(kw)) continue;
      }
      items.push(decorate(e));
    }
    const byName = (a, b) => a.name.localeCompare(b.name, "zh");
    switch (q.sort) {
      case "name": items.sort(byName); break;
      case "stars": items.sort((a, b) => (b.rating - a.rating) || byName(a, b)); break;
      case "recent": items.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || byName(a, b)); break;
      case "players": items.sort((a, b) => (a.maxP || 99) - (b.maxP || 99) || byName(a, b)); break;
      case "played": items.sort((a, b) => (b.plays || 0) - (a.plays || 0) || byName(a, b)); break;
      default: items.sort((a, b) => (b.rating - a.rating) || byName(a, b));
    }
    const offset0 = Math.max(0, Number(q.offset) || 0);
    const limit = Math.min(400, Math.max(1, Number(q.limit) || 120));
    // `around=<id>`: return the page that holds that map, centred where possible,
    // so a freshly drawn map can be shown in its own sort position.
    let offset = offset0;
    let around = null;
    if (q.around) {
      const idx = items.findIndex((x) => x.id === q.around);
      if (idx >= 0) {
        around = { id: q.around, index: idx };
        offset = Math.max(0, Math.min(idx - Math.floor(limit / 2), Math.max(0, items.length - limit)));
      }
    }
    return { total: items.length, offset, limit, around, items: items.slice(offset, offset + limit) };
  }

  /* ------------------------------------------------------------- moving */
  function moveInto(src, dstDir, preferName) {
    if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
    let name = safeName(preferName || basename(src));
    if (!name) name = basename(src);
    let target = join(dstDir, name);
    let i = 2;
    while (existsSync(target) && resolve(target).toLowerCase() !== resolve(src).toLowerCase()) {
      const ext = extname(name);
      target = join(dstDir, stripExt(name) + "~" + i + ext);
      i++;
    }
    if (resolve(target).toLowerCase() !== resolve(src).toLowerCase()) {
      try { renameSync(src, target); } catch { copyFileSync(src, target); unlinkSync(src); }
    }
    return target;
  }

  function destDirForStars(entry, stars) {
    const n = Math.min(8, Math.max(2, entry.players || entry.maxP || 8));
    return join(cfg.libraryRoot, layout.skirmish, layout.playerDir(n), layout.starDir(stars));
  }

  /** Where a filed map belongs. Mission maps keep their faction folder. */
  function fileDirFor(entry, stars) {
    if (entry.zone === "mission" && entry.faction) {
      return join(cfg.libraryRoot, layout.missions, entry.faction, layout.starDir(stars));
    }
    return destDirForStars(entry, stars);
  }

  function extForMode(entry, mode) {
    return mode === "ra2" ? ".map" : ".yrm";
  }

  /* ------------------------------------------------------- play session */
  function findLiveProcess(names) {
    return new Promise((res) => {
      execFile("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true }, (err, stdout) => {
        if (err) return res(null);
        for (const line of String(stdout).split(/\r?\n/)) {
          const m = /^"([^"]+)"/.exec(line.trim());
          if (m && names.includes(m[1].toLowerCase())) return res(m[1]);
        }
        res(null);
      });
    });
  }

  function exceptSignature() {
    const p = join(cfg.gameDir, "except.txt");
    try {
      const st = statSync(p);
      return { path: p, mtime: st.mtimeMs, size: st.size };
    } catch { return { path: p, mtime: 0, size: 0 }; }
  }

  function readExcept() {
    const p = join(cfg.gameDir, "except.txt");
    try {
      const txt = readFileSync(p, "latin1");
      const code = (/Error code:\s*(\S+)/.exec(txt) || [])[1] || null;
      const eip = (/Exception occurred at\s*([0-9A-Fa-f]+)/.exec(txt) || [])[1] || null;
      return { code, eip, head: txt.slice(0, 2000) };
    } catch { return null; }
  }

  let watcher = null;
  function startWatch() {
    if (watcher) return;
    const names = watchNames();
    let misses = 0;
    watcher = setInterval(async () => {
      const p = state.pending;
      if (!p || p.ended) { stopWatch(); return; }
      const live = await findLiveProcess(names);
      if (live) { p.seenAlive = true; misses = 0; return; }
      misses++;
      if (misses >= 2) finishSession();
    }, 3000);
    if (watcher.unref) watcher.unref();
  }
  function stopWatch() {
    if (watcher) { clearInterval(watcher); watcher = null; }
  }

  function finishSession() {
    const p = state.pending;
    if (!p || p.ended) return;
    stopWatch();
    const now = Date.now();
    p.ended = true;
    p.endedAt = now;
    p.durationMs = now - p.startedAt;
    if (!p.seenAlive && p.durationMs < 20000) p.outcome = "early-exit";
    const sig = exceptSignature();
    if (p.exceptBefore && (sig.mtime !== p.exceptBefore.mtime || sig.size !== p.exceptBefore.size)) {
      p.outcome = "crash";
      p.crash = readExcept();
    } else if (p.outcome !== "early-exit") {
      p.outcome = "normal";
    }
    // snapshot the crash log before the game overwrites it next time
    if (p.outcome === "crash") {
      try {
        if (!existsSync(crashDir)) mkdirSync(crashDir, { recursive: true });
        const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
        copyFileSync(sig.path, join(crashDir, stamp + "_" + (p.id || "unknown") + ".txt"));
      } catch { /* ignore */ }
      const r = recordOf(p.id);
      r.crashes = r.crashes || [];
      r.crashes.push({ at: now, stage: p.durationMs < 20000 ? "load" : p.durationMs < 180000 ? "start" : "mid", code: p.crash?.code || null, eip: p.crash?.eip || null });
    }
    saveStateSoon();
  }

  async function deploy(entry, mode) {
    ensureDirs();
    const ext = extForMode(entry, mode);
    const targetName = safeName(entry.name || stripExt(entry.file)) + ext;
    const target = join(cfg.gameDir, targetName);
    const copy = entry.zone === "skirmish" || entry.zone === "mission";
    let removedFrom = null;
    if (existsSync(target)) { try { unlinkSync(target); } catch { /* ignore */ } }
    if (copy) {
      copyFileSync(entry.path, target);
    } else {
      copyFileSync(entry.path, target);
      removedFrom = entry.path;
      try { unlinkSync(entry.path); } catch { removedFrom = null; }
    }
    const exceptBefore = exceptSignature();
    state.pending = {
      id: entry.id, name: entry.name, file: entry.file, fromPath: entry.path,
      fromDir: dirname(entry.path), removedFrom, deployedPath: target,
      mode, startedAt: Date.now(), ended: false, exceptBefore, outcome: null,
      copy, players: entry.players, maxP: entry.maxP, zone: entry.zone,
    };
    saveStateSoon();
    return state.pending;
  }

  /** Every process name that means "the game is running". */
  function watchNames() {
    return Array.from(new Set([
      cfg.exe.yr.file.toLowerCase(),
      cfg.exe.ra2.file.toLowerCase(),
      "gamemd.exe", "game.exe",
    ]));
  }

  /**
   * Start the game. Node's own CreateProcess path is refused for this exe from
   * inside the host process (EACCES), so go through the shell: `start` uses
   * ShellExecute, which launches it normally.
   */
  async function launch(mode) {
    const spec = mode === "ra2" ? cfg.exe.ra2 : cfg.exe.yr;
    const full = join(cfg.gameDir, spec.file);
    if (!existsSync(full)) throw new Error("找不到启动程序：" + full);
    // write the skirmish options before the game reads its INI
    try {
      if (saved.gameOptions && saved.gameOptions.applyOnLaunch) applyGameOptions(mode);
    } catch (e) { log("applyGameOptions failed", e?.message); }
    const child = spawn("cmd.exe", ["/c", "start", "", full, ...(spec.args || [])], {
      cwd: cfg.gameDir, detached: true, stdio: "ignore", windowsHide: true,
    });
    child.on("error", (e) => log("launch error:", e?.message));
    child.unref();

    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const live = await findLiveProcess(watchNames());
      if (live) {
        if (state.pending) {
          state.pending.launched = true;
          state.pending.launchedAt = Date.now();
          state.pending.seenAlive = true;
        }
        startWatch();
        return { exe: spec.file, process: live };
      }
    }
    throw new Error("已执行 " + spec.file + "，但 12 秒内没有检测到游戏进程");
  }

  function returnToPool(p) {
    // an undeployed / replaced map goes back into the waiting pool
    const dir = join(cfg.libraryRoot, layout.pool, layout.poolPlain);
    const from = p.deployedPath && existsSync(p.deployedPath) ? p.deployedPath : p.fromPath;
    if (from && existsSync(from)) moveInto(from, dir, p.file);
  }

  function settle(p, body) {
    const entry = state.byId.get(p.id);
    const rec = recordOf(p.id);
    const stars = Math.max(0, Math.min(10, Number(body.stars) || 0));
    if (Array.isArray(body.tags)) rec.tags = body.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 40);
    if (typeof body.notes === "string") rec.notes = body.notes.slice(0, 20000);
    if (typeof body.name === "string" && body.name.trim()) {
      rec.renameTo = safeName(body.name);
      if (entry) entry.name = rec.renameTo;
    }
    rec.stars = stars;
    rec.status = stars > 0 ? "done" : (rec.status === "new" ? "seen" : rec.status);
    rec.lastPlayed = p.startedAt;
    rec.plays = rec.plays || [];
    rec.plays.push({ at: p.startedAt, ms: p.durationMs || null, mode: p.mode, outcome: p.outcome || "unknown" });

    let moved = null;
    if (body.remove === true) {
      // user asked to drop the map entirely
      const victims = [p.deployedPath, p.removedFrom, entry?.path].filter(Boolean);
      for (const v of victims) { try { if (existsSync(v)) unlinkSync(v); } catch { /* ignore */ } }
      rec.status = "dropped";
    } else if (p.copy) {
      // owned map: drop the copy, then relocate the original if the rating changed
      try { if (existsSync(p.deployedPath)) unlinkSync(p.deployedPath); } catch { /* ignore */ }
      if (entry && entry.path && existsSync(entry.path)) {
        const dir = destDirForStars(entry, stars);
        moved = moveInto(entry.path, dir, entry.name + extname(entry.path));
        if (moved) { entry.path = moved; entry.zone = "skirmish"; entry.stars = stars; }
      }
    } else {
      const from = existsSync(p.deployedPath) ? p.deployedPath : p.removedFrom;
      if (from && existsSync(from)) {
        const dir = destDirForStars({ players: p.players || p.maxP || 8 }, stars);
        moved = moveInto(from, dir, (rec.renameTo || p.name || p.file) + extname(p.file));
      }
      if (entry) {
        entry.path = moved || entry.path;
        entry.zone = "skirmish";
        entry.stars = stars;
        if (moved) entry.rel = relative(cfg.libraryRoot, moved);
        if (rec.renameTo) entry.file = basename(moved || entry.file);
      }
    }
    state.pending = null;
    saveStateSoon();
    return { stars, moved };
  }

  function dropPending(keep) {
    const p = state.pending;
    if (!p) return null;
    stopWatch();
    if (!keep) state.pending = null;
    saveStateSoon();
    return p;
  }

  /* ------------------------------------------------------------ http ---- */
  function sendJson(res, status, obj) {
    const body = Buffer.from(JSON.stringify(obj), "utf8");
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": body.length });
    res.end(body);
  }

  function readBody(req) {
    return new Promise((resolveBody, reject) => {
      const chunks = [];
      req.on("data", (c) => { chunks.push(c); if (chunks.reduce((n, b) => n + b.length, 0) > 4e6) reject(new Error("body too large")); });
      req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  async function handle(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    let path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) : "/";
    if (!path.startsWith("/")) path = "/" + path;

    if (path.startsWith("/thumb/")) {
      const raw = decodeURIComponent(path.slice(7)).replace(/\.png$/i, "");
      const file = thumbPathOf(raw);
      if (!existsSync(file)) { res.writeHead(404).end(); return; }
      const buf = readFileSync(file);
      res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400", "content-length": buf.length });
      res.end(buf);
      return;
    }

    if (req.method === "GET" && path === "/state") {
      const pending = state.pending ? { ...state.pending, exceptBefore: undefined } : null;
      return sendJson(res, 200, {
        ok: true, result: {
          scan: state.scan, version: state.version, pending,
          libraryRoot: cfg.libraryRoot, gameDir: cfg.gameDir,
          configured: cfg.configured,
          layoutId: layout.id,
          pluginVersion: PLUGIN_VERSION,
          configSchema: CONFIG_SCHEMA,
          author: AUTHOR,
          import: imp,
          health,
          tags: (() => {
            const m = new Map();
            for (const r of Object.values(state.records)) {
              for (const t of r.tags || []) m.set(t, (m.get(t) || 0) + 1);
            }
            return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)
              .map(([tag, count]) => ({ tag, count }));
          })(),
          hasGame: !!cfg.gameDir && existsSync(cfg.gameDir),
          exe: { yr: cfg.exe.yr.file, ra2: cfg.exe.ra2.file },
          strayContainers: strayContainers.length,
          counts: {
            pool: state.index.filter((e) => e.zone === "pool").length,
            owned: state.index.filter((e) => e.zone === "skirmish" || e.zone === "mission").length,
            official: state.index.filter((e) => e.zone === "official").length,
            missions: state.index.filter((e) => e.zone === "missionPool" || e.zone === "mission").length,
            favorites: state.index.filter((e) => {
              const r = state.records[e.id];
              return r && r.fav && (e.zone === "skirmish" || e.zone === "mission");
            }).length,
          },
        },
      });
    }

    if (req.method === "GET" && path === "/maps") {
      const q = Object.fromEntries(url.searchParams.entries());
      return sendJson(res, 200, { ok: true, result: queryMaps(q) });
    }

    if (req.method === "GET" && path === "/tags") {
      const counts = {};
      for (const r of Object.values(state.records)) {
        for (const t of r.tags || []) counts[t] = (counts[t] || 0) + 1;
      }
      return sendJson(res, 200, { ok: true, result: { counts } });
    }

    if (req.method === "POST" && path === "/action") {
      let body = {};
      const raw = await readBody(req);
      if (raw.trim()) {
        try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { ok: false, error: "bad json" }); }
      }
      const action = body.action;
      try {
        switch (action) {
          case "probe": {
            // Validate a folder the user picked before anything is written.
            const p = String(body.path || "").trim();
            if (!p) return sendJson(res, 200, { ok: false, error: "没有选择文件夹" });
            const out = {
              path: p, exists: false, isDir: false, writable: false,
              hasAtlas: false, mapCount: 0, gameExe: [], insideLibrary: false,
            };
            out.exists = existsSync(p);
            if (out.exists) {
              try { out.isDir = statSync(p).isDirectory(); } catch { /* ignore */ }
            }
            if (out.isDir) {
              out.hasAtlas = existsSync(join(p, ".atlas"));
              try {
                const probeFile = join(p, ".atlas-write-test-" + Date.now());
                writeFileSync(probeFile, "ok");
                unlinkSync(probeFile);
                out.writable = true;
              } catch { out.writable = false; }
              try {
                out.mapCount = walkMaps(p).length;
                out.insideLibrary = p.toLowerCase().startsWith(cfg.gameDir ? cfg.gameDir.toLowerCase() : "\u0000");
              } catch { /* ignore */ }
              const wanted = ["ra2md.exe", "ra2.exe", "gamemd.exe", "game.exe", "yuri.exe"];
              try {
                const files = readdirSync(p).map((f) => f.toLowerCase());
                out.gameExe = wanted.filter((w) => files.includes(w));
              } catch { /* ignore */ }
            }
            return sendJson(res, 200, { ok: true, result: out });
          }
          case "configure": {
            // First-run setup: remember the paths, build the tree, index it.
            const libraryRoot = String(body.libraryRoot || "").trim();
            if (!libraryRoot) return sendJson(res, 200, { ok: false, error: "请先选择地图库文件夹" });
            if (cfg.gameDir && libraryRoot.toLowerCase().startsWith(String(cfg.gameDir).toLowerCase())) {
              return sendJson(res, 200, { ok: false, error: "地图库不能放在游戏目录里面，否则部署时会自我覆盖" });
            }
            try { mkdirSync(libraryRoot, { recursive: true }); }
            catch (e) { return sendJson(res, 200, { ok: false, error: "无法创建目录：" + (e?.message || e) }); }
            let gameDir = body.gameDir === null || body.gameDir === "" ? null : String(body.gameDir || "").trim();
            if (gameDir && !existsSync(gameDir)) gameDir = null;
            const layoutId = body.layout === "en" ? "en" : "zh";
            const exe = body.exe && typeof body.exe === "object" ? body.exe : undefined;
            saved = writeSettings({ libraryRoot, gameDir, layout: layoutId, ...(exe ? { exe } : {}) });
            recomputePaths();
            state.index = [];
            state.byId = new Map();
            state.records = {};
            state.pending = null;
            state.scan = { status: "idle", done: 0, total: 0, startedAt: null, finishedAt: null, error: null };
            initTree();
            loadState();
            ensureDirs();
            scan();
            log("configured:", libraryRoot, "layout:", layoutId, "game:", gameDir || "(none)");
            return sendJson(res, 200, {
              ok: true,
              result: { libraryRoot, gameDir, layoutId, configured: true },
            });
          }
          case "importScan": {
            const root = String(body.source || "").trim();
            if (!root) return sendJson(res, 200, { ok: false, error: "没有选择要导入的文件夹" });
            if (!existsSync(root)) return sendJson(res, 200, { ok: false, error: "文件夹不存在：" + root });
            imp.status = "scanning";
            imp.error = null;
            imp.summary = null;
            imp.result = null;
            importCancel = false;
            importScan(root).catch((e) => {
              imp.status = "error";
              imp.error = String(e?.message || e);
              state.version++;
            });
            return sendJson(res, 200, { ok: true, result: { started: true } });
          }
          case "importRun": {
            if (!importPlan) return sendJson(res, 200, { ok: false, error: "请先扫描" });
            if (imp.status === "running") return sendJson(res, 200, { ok: false, error: "已经在导入了" });
            importCancel = false;
            importRun(body.options || {}).catch((e) => {
              imp.status = "error";
              imp.error = String(e?.message || e);
              state.version++;
            });
            return sendJson(res, 200, { ok: true, result: { started: true } });
          }
          case "importCancel": {
            importCancel = true;
            return sendJson(res, 200, { ok: true, result: { cancelling: true } });
          }
          case "importUndo": {
            try {
              const r = importUndo(String(body.manifest || imp.manifestPath || ""));
              return sendJson(res, 200, { ok: true, result: r });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "exportConfig": {
            try {
              const r = exportConfig();
              return sendJson(res, 200, { ok: true, result: r });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "listConfigs": {
            return sendJson(res, 200, { ok: true, result: { dir: backupDir(), items: listConfigs() } });
          }
          case "importConfig": {
            try {
              const r = importConfig(body.path, body.mode);
              return sendJson(res, 200, { ok: true, result: r });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "healthRun": {
            if (health.status === "running") return sendJson(res, 200, { ok: false, error: "体检已经在跑了" });
            healthRun(body.apply === true).catch((e) => {
              health.status = "error";
              health.error = String(e?.message || e);
              state.version++;
            });
            return sendJson(res, 200, { ok: true, result: { started: true } });
          }
          case "exportDiagnostics": {
            try {
              const p = exportDiagnostics();
              return sendJson(res, 200, { ok: true, result: { path: p } });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "rescan":
            scan();
            return sendJson(res, 200, { ok: true, result: { started: true } });
          case "getGameOptions": {
            try {
              const mode = body.mode === "ra2" ? "ra2" : "yr";
              return sendJson(res, 200, { ok: true, result: gameOptionsFor(mode) });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "saveGameOptions": {
            try {
              const values = body.values && typeof body.values === "object" ? body.values : {};
              const clean = {};
              for (const [k, v] of Object.entries(values)) {
                // "" is kept on purpose: it means "remove this key again"
                if (!/^[A-Za-z0-9_]+$/.test(k)) continue;
                if (v === null || v === undefined) continue;
                clean[k] = String(v);
              }
              saved = writeSettings({
                gameOptions: {
                  values: clean,
                  custom: String(body.custom || ""),
                  applyOnLaunch: body.applyOnLaunch === true,
                },
              });
              let applied = null;
              if (body.applyNow === true) {
                applied = applyGameOptions(body.mode === "ra2" ? "ra2" : "yr");
              }
              return sendJson(res, 200, { ok: true, result: { saved: true, applied } });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "applyGameOptions": {
            try {
              return sendJson(res, 200, { ok: true, result: applyGameOptions(body.mode === "ra2" ? "ra2" : "yr") });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "restoreGameIni": {
            try {
              const file = iniFileFor(body.mode === "ra2" ? "ra2" : "yr");
              const bak = file + ".yr-atlas.bak";
              if (!existsSync(bak)) return sendJson(res, 200, { ok: false, error: "没有备份可还原" });
              copyFileSync(bak, file);
              return sendJson(res, 200, { ok: true, result: { restored: file } });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
            }
          }
          case "draw": {
            const wantOwned = body.zone === "owned";
            const listOf = (v) => (Array.isArray(v) ? v
              : (typeof v === "string" && v.trim() ? v.split(",") : []));
            const players = listOf(body.players).map(Number).filter(Number.isFinite);
            const theaters = listOf(body.theaters).map((s) => String(s).toUpperCase());
            const stars = listOf(body.stars).map(Number).filter(Number.isFinite);
            const tags = listOf(body.tags).map((s) => String(s).trim()).filter(Boolean);
            const onlyFav = body.fav === true;
            const minP = Number(body.minP) || 0;
            const maxP = Number(body.maxP) || 0;
            const cands = state.index.filter((e) => {
              if (wantOwned) {
                if (e.zone !== "skirmish" && e.zone !== "mission") return false;
              } else if (e.zone !== "pool") return false;
              if (players.length && !players.includes(e.maxP || 8)) return false;
              if (theaters.length && !theaters.includes(String(e.theater || "").toUpperCase())) return false;
              if (!wantOwned) {
                if (minP && (e.maxP || 8) < minP) return false;
                if (maxP && (e.maxP || 8) > maxP) return false;
              }
              const r = state.records[e.id] || {};
              if (stars.length && !stars.includes(r.stars || 0)) return false;
              if (tags.length) {
                const have = new Set((r.tags || []).map(String));
                if (!tags.some((t) => have.has(t))) return false;
              }
              if (onlyFav && !r.fav) return false;
              return true;
            });
            if (!cands.length) {
              return sendJson(res, 200, {
                ok: false,
                error: wantOwned ? "已整理的图里没有符合条件的" : "待整理的图里没有符合条件的",
              });
            }
            const pick = cands[Math.floor(Math.random() * cands.length)];
            return sendJson(res, 200, { ok: true, result: decorate(pick), matched: cands.length });
          }
          case "drawCount": {
            const wantOwned = body.zone === "owned";
            const listOf = (v) => (Array.isArray(v) ? v
              : (typeof v === "string" && v.trim() ? v.split(",") : []));
            const players = listOf(body.players).map(Number).filter(Number.isFinite);
            const theaters = listOf(body.theaters).map((s) => String(s).toUpperCase());
            const stars = listOf(body.stars).map(Number).filter(Number.isFinite);
            const tags = listOf(body.tags).map((s) => String(s).trim()).filter(Boolean);
            const onlyFav = body.fav === true;
            let n = 0;
            for (const e of state.index) {
              if (wantOwned) {
                if (e.zone !== "skirmish" && e.zone !== "mission") continue;
              } else if (e.zone !== "pool") continue;
              if (players.length && !players.includes(e.maxP || 8)) continue;
              if (theaters.length && !theaters.includes(String(e.theater || "").toUpperCase())) continue;
              const r = state.records[e.id] || {};
              if (stars.length && !stars.includes(r.stars || 0)) continue;
              if (tags.length) {
                const have = new Set((r.tags || []).map(String));
                if (!tags.some((t) => have.has(t))) continue;
              }
              if (onlyFav && !r.fav) continue;
              n++;
            }
            return sendJson(res, 200, { ok: true, result: { count: n } });
          }
          case "deploy": {
            const entry = state.byId.get(body.id);
            if (!entry) return sendJson(res, 200, { ok: false, error: "找不到这张图" });
            if (state.pending && !state.pending.ended) {
              return sendJson(res, 200, { ok: false, error: "还有一局没有结算" });
            }
            if (state.pending && state.pending.ended) state.pending = null;
            const p = await deploy(entry, body.mode === "ra2" ? "ra2" : "yr");
            state.version++;
            return sendJson(res, 200, { ok: true, result: { pending: { ...p, exceptBefore: undefined } } });
          }
          case "launch": {
            const r = await launch(body.mode === "ra2" ? "ra2" : "yr");
            return sendJson(res, 200, { ok: true, result: r });
          }
          case "replay": {
            if (!state.pending) return sendJson(res, 200, { ok: false, error: "没有待结算的对局" });
            const p = state.pending;
            if (!existsSync(p.deployedPath)) {
              const entry = state.byId.get(p.id);
              const src = entry && existsSync(entry.path) ? entry.path
                : (p.fromPath && existsSync(p.fromPath) ? p.fromPath : null);
              if (!src) return sendJson(res, 200, { ok: false, error: "这张图已经不在库或游戏目录里了" });
              try { copyFileSync(src, p.deployedPath); }
              catch (e) { return sendJson(res, 200, { ok: false, error: "重新部署失败：" + (e?.message || e) }); }
            }
            p.startedAt = Date.now();
            p.ended = false;
            p.endedAt = null;
            p.durationMs = null;
            p.outcome = null;
            p.seenAlive = false;
            saveStateSoon();
            const rr = await launch(p.mode);
            state.version++;
            return sendJson(res, 200, { ok: true, result: { ...rr, restarted: true } });
          }
          case "settle": {
            if (!state.pending) return sendJson(res, 200, { ok: false, error: "没有待结算的对局" });
            const r = settle(state.pending, body);
            state.version++;
            return sendJson(res, 200, { ok: true, result: r });
          }
          case "fileMap": {
            // File a pool map by hand — no play session needed.
            const entry = state.byId.get(body.id);
            if (!entry) return sendJson(res, 200, { ok: false, error: "找不到这张图" });
            if (entry.zone !== "pool") return sendJson(res, 200, { ok: false, error: "这张图已经在已整理里了" });
            const rec = recordOf(body.id);
            const stars = Math.max(0, Math.min(10, Number(body.stars !== undefined ? body.stars : rec.stars) || 0));
            if (!stars) return sendJson(res, 200, { ok: false, error: "先给一个星级再归档" });
            try {
              const to = moveInto(entry.path, fileDirFor({ ...entry, zone: "skirmish" }, stars), basename(entry.path));
              if (!to) return sendJson(res, 200, { ok: false, error: "移动失败" });
              entry.path = to;
              entry.rel = relative(cfg.libraryRoot, to);
              entry.zone = "skirmish";
              entry.stars = stars;
              rec.stars = stars;
              if (!rec.status || rec.status === "new") rec.status = "filed";
              saveStateSoon();
              state.version++;
              return sendJson(res, 200, { ok: true, result: { rel: entry.rel, stars } });
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: "归档失败：" + (e?.message || e) });
            }
          }
          case "save": {
            const rec = recordOf(body.id);
            if (Array.isArray(body.tags)) rec.tags = body.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 40);
            if (typeof body.notes === "string") rec.notes = body.notes.slice(0, 20000);
            if (typeof body.stars === "number") {
              const v = Math.max(0, Math.min(10, body.stars));
              rec.stars = v;
              // A filed map follows its rating into the matching star folder;
              // a pool map stays put until the session is settled.
              const entry = state.byId.get(body.id);
              if (entry && (entry.zone === "skirmish" || entry.zone === "mission") && entry.stars !== v) {
                try {
                  const to = moveInto(entry.path, fileDirFor(entry, v), basename(entry.path));
                  if (to) {
                    entry.path = to;
                    entry.rel = relative(cfg.libraryRoot, to);
                    entry.stars = v;
                  }
                } catch (e) { log("rating move failed", e?.message); }
              }
            }
            if (typeof body.fav === "boolean") rec.fav = body.fav;
            saveStateSoon();
            state.version++;
            return sendJson(res, 200, { ok: true, result: { saved: true } });
          }
          case "discard": {
            // close the settlement without recording; the deployed map stays put
            const p = dropPending(false);
            state.version++;
            return sendJson(res, 200, { ok: true, result: { discarded: !!p } });
          }
          case "returnToPool": {
            if (!state.pending) return sendJson(res, 200, { ok: false, error: "没有待处理的地图" });
            returnToPool(state.pending);
            state.pending = null;
            state.version++;
            return sendJson(res, 200, { ok: true, result: { returned: true } });
          }
          case "tidyContainers": {
            // official MIX packs that ended up inside the pool: park them with the other official packs
            const dest = join(cfg.libraryRoot, layout.sources, layout.officialPacks);
            let moved = 0;
            for (const f of strayContainers.slice()) {
              try { moveInto(f, dest, basename(f)); moved++; } catch { /* ignore */ }
            }
            strayContainers.length = 0;
            state.version++;
            scan();
            return sendJson(res, 200, { ok: true, result: { moved } });
          }
          case "handoff": {
            // Build a self-contained repair dossier and hand it to an AI session.
            const p = state.pending;
            const entry = (body.id && state.byId.get(body.id))
              || (p && state.byId.get(p.id))
              || null;
            const target = entry || (p ? { id: p.id, name: p.name, file: p.file, path: p.fromPath, zone: "pool" } : null);
            if (!target || !target.path) return sendJson(res, 200, { ok: false, error: "没有可以交给 AI 的地图" });
            if (!existsSync(target.path)) return sendJson(res, 200, { ok: false, error: "地图文件不在了：" + target.path });

            const rawText = readFileSync(target.path).toString("latin1");
            const sections = splitSections(rawText);
            const starts = seatCount(rawText, sections);
            const basic = sections.find((s) => s.name === "Basic");
            const basicText = basic ? rawText.slice(basic.bodyStart, basic.end) : "";
            const maxPlayer = (/^[ \t]*MaxPlayer[ \t]*=[ \t]*(\d+)/mi.exec(basicText) || [])[1] || "?";
            const minPlayer = (/^[ \t]*MinPlayer[ \t]*=[ \t]*(\d+)/mi.exec(basicText) || [])[1] || "?";
            const houseRefs = [];
            for (const s of sections) {
              if (!HEX_ID.test(s.name)) continue;
              const m = /^[ \t]*House[ \t]*=[ \t]*(<Player @ [A-H]>)/mi.exec(rawText.slice(s.bodyStart, s.end));
              if (m) houseRefs.push(s.name + "→" + m[1]);
            }
            const teamCount = sections.filter((s) => HEX_ID.test(s.name) && /^[ \t]*House[ \t]*=/mi.test(rawText.slice(s.bodyStart, s.end))).length;
            let waves = 0;
            const acts = sections.find((s) => s.name === "Actions");
            if (acts) {
              for (const line of rawText.slice(acts.bodyStart, acts.end).split(/\r?\n/)) {
                const m = /^\s*[0-9A-Fa-f]{8}\s*=\s*(.+)$/.exec(line);
                if (m && m[1].split(",")[1] && m[1].split(",")[1].trim() === "80") waves++;
              }
            }
            const audit = repairMapText(rawText);
            const terrain = checkTerrain(rawText);
            const crash = (p && p.crash) ? p.crash : readExcept();
            const exceptPath = join(cfg.gameDir, "except.txt");
            let exceptBody = "";
            try { exceptBody = readFileSync(exceptPath, "latin1").slice(0, 4000); } catch { /* none */ }

            let kb = [];
            try { kb = JSON.parse(readFileSync(join(dataDir, "repair-kb.json"), "utf8")); } catch { kb = []; }

            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            try { mkdirSync(repairDir, { recursive: true }); } catch { /* ignore */ }
            const dossierPath = join(repairDir, stamp + "-" + String(target.id || "map").slice(0, 8) + ".md");

            const lines = [];
            lines.push("# 地图崩溃修复工单");
            lines.push("");
            lines.push("## 1. 地图");
            lines.push("- 名称：" + (target.name || "?"));
            lines.push("- 文件：" + target.path);
            lines.push("- 库里位置：`" + (target.rel || relative(cfg.libraryRoot, target.path)) + "`");
            lines.push("- MD5：" + target.id);
            lines.push("- 大小：" + (statSync(target.path).size) + " 字节");
            lines.push("");
            lines.push("## 2. 崩溃现场");
            const fromPending = !!(p && p.crash);
            if (!fromPending) {
              lines.push("> 注意：这张图当前没有挂着的崩溃记录。下面那份 `except.txt` 只是游戏目录里最近的一份，");
              lines.push("> **不一定属于这张图**，只能当参照。请以第 3、4 节的结构体检为主。");
              lines.push("");
            }
            if (crash) {
              lines.push("- 异常：" + (crash.code || "?"));
              lines.push("- 出错地址：0x" + (crash.eip || "?"));
            } else lines.push("- 没有捕获到 except.txt");
            if (p) {
              lines.push("- 游玩方式：" + (p.mode === "ra2" ? "红色警戒2" : "尤里的复仇"));
              lines.push("- 崩溃前时长：" + Math.round((p.durationMs || 0) / 1000) + " 秒");
            }
            lines.push("");
            lines.push("```");
            lines.push(exceptBody.trim() || "(无)");
            lines.push("```");
            lines.push("");
            lines.push("## 3. 结构画像");
            lines.push("- 出生点（NumberStartingPoints）：" + starts);
            lines.push("- MaxPlayer / MinPlayer：" + maxPlayer + " / " + minPlayer);
            lines.push("- 队伍（TeamTypes）数量：" + teamCount);
            lines.push("- 刷兵波次（Action 80）数量：" + waves);
            lines.push("- 队伍阵营绑定：" + (houseRefs.length ? houseRefs.join("，") : "无"));
            lines.push("- 地形数据："
              + (terrain[0] === "decode-fail" || terrain[0] === "no-iso" ? "❌ " + terrain[1]
                : terrain[0] === "count-mismatch" ? "⚠ " + terrain[1] + "（官方老格式常见，通常能玩）"
                  : terrain[0] === "ok" ? "✅ 结构自洽" : "无法判断"));
            lines.push("");
            lines.push("## 4. 规则引擎已发现的问题");
            if (!audit.issues.length) lines.push("- 无");
            for (const it of audit.issues) lines.push("- [" + it.code + "] " + (it.fixed ? "可自动修：" : "仅报告：") + it.detail);
            lines.push("");
            lines.push("## 5. 已知同类案例（知识库）");
            if (!kb.length) lines.push("- 暂无");
            for (const k of kb) {
              lines.push("### " + k.title);
              lines.push("- 症状：" + k.symptom);
              lines.push("- 成因：" + k.cause);
              lines.push("- 处理：" + k.fix);
              lines.push("");
            }
            lines.push("## 6. 请你做的事");
            lines.push("1. 先判断这份工单里的崩溃是否属于第 5 节的已知类型；是的话优先套用已有处理方式。");
            lines.push("2. 动手前先备份原图；**永远不要直接改原文件**，改动一律写到 `原文件名（修复版）.yrm`。");
            lines.push("3. 只改有把握的地方，改完说明改了哪几行、为什么。");
            lines.push("4. 如果判断是文件损坏或需要 MOD，直接说修不了，不要硬改。");
            lines.push("5. 修完后把这次案例追加到 `" + join(dataDir, "repair-kb.json") + "`，格式同第 5 节。");
            lines.push("6. 插件会自动重新扫描，修复版会出现在同一个文件夹里。");

            writeFileSync(dossierPath, lines.join("\n"), "utf8");

            const prompt = [
              "【红警地图崩溃修复】",
              "有一张地图在游戏里崩溃了，工单在这里：",
              "`" + dossierPath + "`",
              "",
              "工单里包含：地图信息、except.txt 原文、结构画像（出生点/队伍/刷兵波次）、规则引擎已经查出的问题、以及历史案例。",
              "请按工单第 6 节的要求处理：先读工单，再读地图文件，判断成因，然后把修复结果写成一个新副本（不要改原图），最后说明你改了什么。",
              "地图文件：`" + target.path + "`",
            ].join("\n");

            log("handoff ->", dossierPath);
            return sendJson(res, 200, {
              ok: true,
              result: { path: dossierPath, prompt, name: target.name || target.file },
            });
          }
          case "repair": {
            const entry = state.byId.get(body.id);
            if (!entry) return sendJson(res, 200, { ok: false, error: "找不到这张图" });
            if (entry.official) return sendJson(res, 200, { ok: false, error: "官方图包是 MIX 容器，不支持修复" });
            if (isMixContainer(entry.path)) return sendJson(res, 200, { ok: false, error: "这是 MIX 图包，不是普通地图" });
            let raw;
            try { raw = readFileSync(entry.path); }
            catch (e) { return sendJson(res, 200, { ok: false, error: "读取失败：" + (e?.message || e) }); }
            const text = raw.toString("latin1");
            const rep = repairMapText(text);
            const [tkind, tdetail] = checkTerrain(text);
            if (tkind === "decode-fail" || tkind === "no-iso") {
              rep.issues.push({
                code: "terrain-corrupt", fixed: false,
                detail: "地形数据损坏，没法自动修：" + tdetail,
              });
            } else if (tkind === "count-mismatch") {
              rep.issues.push({
                code: "terrain-note", fixed: false,
                detail: "地形记录数与尺寸对不上（" + tdetail + "），官方老格式常见，通常能玩",
              });
            }
            if (!rep.changed) {
              return sendJson(res, 200, { ok: true, result: { changed: false, issues: rep.issues, starts: rep.starts } });
            }
            const dir = dirname(entry.path);
            const ext = extname(entry.path);
            const SUF = layout.repairedSuffix;
            let stem = stripExt(basename(entry.path));
            if (!stem.endsWith(SUF)) stem = stem + SUF;
            let target = join(dir, stem + ext);
            let n = 2;
            while (existsSync(target)) { target = join(dir, stem + n + ext); n++; }
            try { writeFileSync(target, Buffer.from(rep.text, "latin1")); }
            catch (e) { return sendJson(res, 200, { ok: false, error: "写入失败：" + (e?.message || e) }); }
            const newId = md5File(target);
            const display = (entry.name || stripExt(basename(entry.path))) + SUF;
            nameTable.set(newId, display);
            saveNames();
            state.version++;
            scan();
            log("repaired", entry.file, "->", basename(target), "issues:", rep.issues.length);
            return sendJson(res, 200, {
              ok: true,
              result: {
                changed: true, issues: rep.issues, starts: rep.starts,
                id: newId, file: basename(target), name: display, dir: relative(cfg.libraryRoot, dir),
              },
            });
          }
          case "remove": {
            const entry = state.byId.get(body.id);
            if (!entry || entry.official) return sendJson(res, 200, { ok: false, error: "不能删除这张图" });
            try {
              if (existsSync(entry.path)) {
                if (statSync(entry.path).isDirectory()) rmSync(entry.path, { recursive: true, force: true });
                else unlinkSync(entry.path);
              }
            } catch (e) { return sendJson(res, 200, { ok: false, error: String(e?.message || e) }); }
            state.index = state.index.filter((e) => e.id !== entry.id);
            state.byId.delete(entry.id);
            const rec = recordOf(entry.id);
            rec.status = "dropped";
            saveStateSoon();
            state.version++;
            return sendJson(res, 200, { ok: true, result: { removed: true } });
          }
          case "openFolder": {
            const entry = body.id ? state.byId.get(body.id) : null;
            const target = body.dir || (entry ? entry.path : cfg.libraryRoot);
            if (!existsSync(target)) {
              return sendJson(res, 200, { ok: false, error: "路径不存在：" + target });
            }
            // /select, highlights the file — the window is easier to spot than a plain folder
            const arg = entry ? "/select," + target : target;
            try {
              spawn("explorer.exe", [arg], { detached: true, stdio: "ignore", windowsHide: false }).unref();
            } catch (e) {
              return sendJson(res, 200, { ok: false, error: "打不开资源管理器：" + (e?.message || e) });
            }
            return sendJson(res, 200, { ok: true, result: { opened: entry ? dirname(target) : target, selected: !!entry } });
          }
          case "renameMap": {
            const entry = state.byId.get(body.id);
            if (!entry) return sendJson(res, 200, { ok: false, error: "找不到这张图" });
            if (entry.official) return sendJson(res, 200, { ok: false, error: "官方图是只读的，不能改名" });
            const ext = extname(entry.file);
            let stem = String(body.name || "").trim();
            if (ext && stem.toLowerCase().endsWith(ext.toLowerCase())) stem = stem.slice(0, -ext.length);
            stem = safeName(stem);
            if (!stem) return sendJson(res, 200, { ok: false, error: "名字不能为空" });
            if (!/[A-Za-z\u4e00-\u9fff]/.test(stem)) {
              return sendJson(res, 200, { ok: false, error: "名字里至少要有一个字母或汉字" });
            }
            const dir = dirname(entry.path);
            const target = join(dir, stem + ext);
            if (target.toLowerCase() === entry.path.toLowerCase()) {
              return sendJson(res, 200, { ok: true, result: { renamed: false, file: basename(entry.path) } });
            }
            let clash = null;
            try {
              for (const f of readdirSync(dir)) {
                if (f.toLowerCase() === basename(target).toLowerCase()) { clash = f; break; }
              }
            } catch { /* ignore */ }
            if (clash) return sendJson(res, 200, { ok: false, error: "同名文件已存在：" + clash + "，请换一个名字" });
            try { renameSync(entry.path, target); }
            catch (e) { return sendJson(res, 200, { ok: false, error: "改名失败：" + (e?.message || e) }); }
            if (state.pending && state.pending.fromPath === entry.path) state.pending.fromPath = target;
            state.version++;
            scan();
            return sendJson(res, 200, { ok: true, result: { renamed: true, file: basename(target), path: target } });
          }
          default:
            return sendJson(res, 400, { ok: false, error: "unknown action: " + action });
        }
      } catch (e) {
        log("action failed", action, e?.message);
        return sendJson(res, 200, { ok: false, error: String(e?.message || e) });
      }
    }

    return sendJson(res, 404, { ok: false, error: "not found " + req.method + " " + path });
  }

  return {
    cfg, state, ensureDirs, loadState, scan, handle, finishSession, startWatch, stopWatch,
    configured() { return cfg.configured; },
    resumeWatch() {
      // after a restart, a pending session may still be running or already dead
      if (state.pending && !state.pending.ended) {
        findLiveProcess([cfg.exe.yr.toLowerCase(), cfg.exe.ra2.toLowerCase()]).then((live) => {
          if (live) startWatch();
          else finishSession();
        });
      }
    },
  };
}

export function apply(ctx, config) {
  const svc = makeService(config || {});
  // Before first-run setup there is no library yet: touching the filesystem
  // then would create a stray .atlas next to the process working directory.
  const ready = svc.configured();
  if (ready) {
    svc.ensureDirs();
    svc.loadState();
  }

  ctx.effect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => { svc.scan().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, "yr-map-atlas: initial scan");

  ctx.effect(() => {
    const t = setTimeout(() => svc.resumeWatch(), 3000);
    return () => { clearTimeout(t); svc.stopWatch(); };
  }, "yr-map-atlas: session watch");

  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: API_PREFIX,
    handler: (req, res) => svc.handle(req, res).catch((e) => {
      log("handler error", e?.message);
      try { res.writeHead(500).end(); } catch { /* ignore */ }
    }),
  }), "yr-map-atlas: api");

  log("mounted; library =", svc.cfg.libraryRoot);
}
