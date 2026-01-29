// server/services/local-agent.js
// Secure local PC-control agent for Chotu (Windows-first).
// Endpoints:
//   GET  /health
//   POST /tool/run
//
// REQUIRED HEADERS (except /health):
//   x-agent-token: <your_secret_token>
//
// For destructive actions also require:
//   x-confirm: YES
//
// Start:
//   setx CHOTU_AGENT_TOKEN "some-long-random-string"
//   node server/services/local-agent.js

import express from "express";
import cors from "cors";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// =====================
// CONFIG (EDIT THESE)
// =====================

// 1) Token required for /tool/run
const AGENT_TOKEN = process.env.CHOTU_AGENT_TOKEN || "";

// 2) Allowed roots for file/folder operations (sandbox)
const ALLOWED_ROOTS = [
  "C:\\Projects",
  `C:\\Users\\${os.userInfo().username}\\Documents`,
  `C:\\Users\\${os.userInfo().username}\\Desktop`,
].map((p) => path.resolve(p));

// 3) Apps registry (only these can be launched)
const APPS = {
  notepad: { type: "exe", value: "notepad.exe" },
  calc: { type: "exe", value: "calc.exe" },
  vscode: { type: "exe", value: "code" }, // assumes VS Code is in PATH
  chrome: {
    type: "exe_path_candidates",
    value: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
  },
  word: {
    type: "exe_path_candidates",
    value: [
      "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
      "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    ],
  },
  outlook: {
    type: "exe_path_candidates",
    value: [
      "C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE",
      "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE",
    ],
  },
};

// 4) Safe URLs (only these IDs can be opened)
const URLS = {
  gmail: "https://mail.google.com/mail/u/0/#inbox",
  calendar: "https://calendar.google.com/calendar/u/0/r",
  linkedin: "https://www.linkedin.com/feed/",
  github: "https://github.com/",
  // put your org/repo shortcuts here:
  // showman: "https://github.com/your-org/showman",
};

// 5) Projects registry (only these can be opened)
const PROJECTS = {
  chotu: {
    folder: "C:\\Projects\\Chottu AI Assistant",
    open_in_vscode: true,
    open_in_explorer: true,
  },
  careerflow: {
    folder: "C:\\Projects\\job-search-agent",
    open_in_vscode: true,
    open_in_explorer: false,
  },
  // add more projects...
};

// Audit log file
const AUDIT_LOG = path.resolve("./local-agent-audit.log");

// Hard cap for searches to avoid heavy scanning
const SEARCH_MAX_RESULTS = 30;
const SEARCH_MAX_DEPTH = 8;

// =====================
// Helpers
// =====================

function auditLog(toolName, args, status, result) {
  const entry =
    `${new Date().toISOString()} | ${toolName} | ${status} | ` +
    `${safeJson(args)} | ${truncate(String(result ?? ""), 4000)}\n`;
  fs.appendFileSync(AUDIT_LOG, entry);
}

function safeJson(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return '"<unserializable>"';
  }
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…(truncated)" : s;
}

function isWindows() {
  return process.platform === "win32";
}

function requireAuth(req, res, next) {
  if (req.path === "/health") return next();
  const token = req.headers["x-agent-token"];
  if (!AGENT_TOKEN || token !== AGENT_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

function requireConfirm(req) {
  const confirm = String(req.headers["x-confirm"] || "").toUpperCase();
  return confirm === "YES";
}

function assertWindows() {
  if (!isWindows()) throw new Error("This local agent build is Windows-focused");
}

function resolveAllowedPath(p) {
  const full = path.resolve(String(p || ""));
  const ok = ALLOWED_ROOTS.some(
    (root) => full === root || full.startsWith(root + path.sep)
  );
  if (!ok) throw new Error("Path not allowed");
  return full;
}

function validateUrl(u) {
  const url = String(u || "");
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL (must be http/https)");
  return url;
}

function validatePid(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid pid");
  return String(n);
}

function spawnDetached(cmd, args) {
  // No shell; detached; ignore stdio
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function openWithShellStart(target) {
  // Uses Windows 'start' safely via cmd.exe arguments (still no user shell expansion).
  spawnDetached("cmd.exe", ["/c", "start", "", target]);
}

function findFirstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// File search: safe recursive scan limited to allowed roots
async function searchFilesInRoots(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) throw new Error("Missing search query");

  const results = [];
  for (const root of ALLOWED_ROOTS) {
    await walk(root, 0);
    if (results.length >= SEARCH_MAX_RESULTS) break;
  }
  return results;

  async function walk(dir, depth) {
    if (depth > SEARCH_MAX_DEPTH) return;
    if (results.length >= SEARCH_MAX_RESULTS) return;

    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      if (results.length >= SEARCH_MAX_RESULTS) return;

      const full = path.join(dir, ent.name);

      // Skip very noisy/system dirs inside allowed roots if present
      const nameLower = ent.name.toLowerCase();
      if (ent.isDirectory() && (nameLower === "node_modules" || nameLower === ".git")) {
        continue;
      }

      if (ent.name.toLowerCase().includes(q)) {
        results.push(full);
        if (results.length >= SEARCH_MAX_RESULTS) return;
      }

      if (ent.isDirectory()) {
        await walk(full, depth + 1);
      }
    }
  }
}

// =====================
// Middleware
// =====================
app.use(requireAuth);

// =====================
// Routes
// =====================

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "local-agent",
    platform: process.platform,
    allowed_roots: ALLOWED_ROOTS,
  });
});

app.post("/tool/run", async (req, res) => {
  const { tool_name, args } = req.body || {};
  const auditId = Date.now().toString();

  try {
    assertWindows();

    if (!tool_name) throw new Error("Missing tool_name");

    let result;

    switch (tool_name) {
      // -------------------------
      // SAFE WEB OPENING
      // -------------------------
      case "open_url": {
        const url = validateUrl(args?.url);
        openWithShellStart(url);
        result = "URL opened";
        break;
      }

      case "open_url_id": {
        const id = String(args?.id || "").toLowerCase();
        const url = URLS[id];
        if (!url) throw new Error("Unknown url id");
        openWithShellStart(url);
        result = `Opened URL id: ${id}`;
        break;
      }

      // -------------------------
      // SAFE APP OPENING
      // -------------------------
      case "open_app": {
        const appId = String(args?.app_id || "").toLowerCase();
        const spec = APPS[appId];
        if (!spec) throw new Error("App not allowed");

        if (spec.type === "exe") {
          // exe in PATH
          spawnDetached(spec.value, []);
          result = `Opened ${appId}`;
        } else if (spec.type === "exe_path_candidates") {
          const exe = findFirstExisting(spec.value);
          if (!exe) throw new Error(`Executable not found for ${appId}`);
          spawnDetached(exe, []);
          result = `Opened ${appId}`;
        } else {
          throw new Error("Invalid app spec");
        }
        break;
      }

      // -------------------------
      // PROJECT OPENING
      // -------------------------
      case "open_project": {
        const projectId = String(args?.project_id || "").toLowerCase();
        const proj = PROJECTS[projectId];
        if (!proj) throw new Error("Unknown project");

        const folder = resolveAllowedPath(proj.folder);

        if (proj.open_in_explorer) {
          openWithShellStart(folder);
        }
        if (proj.open_in_vscode) {
          // 'code <folder>' if VS Code is in PATH
          spawnDetached("cmd.exe", ["/c", "code", folder]);
        }

        result = `Opened project ${projectId}`;
        break;
      }

      // -------------------------
      // FILE/FOLDER OPS (SANDBOXED)
      // -------------------------
      case "reveal_file": {
        const target = resolveAllowedPath(args?.path);
        spawnDetached("explorer.exe", ["/select,", target]);
        result = "File revealed";
        break;
      }

      case "create_file": {
        const filePath = resolveAllowedPath(args?.path);
        const content = String(args?.content || "");
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, content, "utf8");
        result = "File created";
        break;
      }

      case "create_folder": {
        const folderPath = resolveAllowedPath(args?.path);
        await fsp.mkdir(folderPath, { recursive: true });
        result = "Folder created";
        break;
      }

      case "delete_file": {
        if (!requireConfirm(req)) throw new Error("Confirmation required (x-confirm: YES)");
        const filePath = resolveAllowedPath(args?.path);
        await fsp.unlink(filePath);
        result = "File deleted";
        break;
      }

      case "delete_folder": {
        if (!requireConfirm(req)) throw new Error("Confirmation required (x-confirm: YES)");
        const folderPath = resolveAllowedPath(args?.path);
        await fsp.rm(folderPath, { recursive: true, force: true });
        result = "Folder deleted";
        break;
      }

      case "search_files": {
        const found = await searchFilesInRoots(args?.query);
        result = found;
        break;
      }

      // -------------------------
      // SYSTEM INFO (FIXED COMMANDS ONLY)
      // -------------------------
      case "get_system_info": {
        const { stdout } = await execFileAsync("cmd.exe", ["/c", "systeminfo"]);
        result = stdout;
        break;
      }

      case "list_processes": {
        const { stdout } = await execFileAsync("cmd.exe", ["/c", "tasklist"]);
        result = stdout;
        break;
      }

      case "kill_process": {
        if (!requireConfirm(req)) throw new Error("Confirmation required (x-confirm: YES)");
        const pid = validatePid(args?.pid);
        // taskkill fixed args (no injection)
        await execFileAsync("taskkill", ["/PID", pid, "/F"]);
        result = `Process ${pid} killed`;
        break;
      }

      // -------------------------
      // BLOCKED: arbitrary command execution
      // -------------------------
      case "run_command":
        throw new Error("run_command is disabled for security");

      default:
        throw new Error("Unknown tool");
    }

    auditLog(tool_name, args, "OK", safeJson(result));
    return res.json({ ok: true, result, audit_id: auditId });
  } catch (err) {
    const msg = err?.message || "Unknown error";
    auditLog(tool_name, args, "ERROR", msg);
    return res.status(500).json({ ok: false, error: msg, audit_id: auditId });
  }
});

// =====================
// Start server
// =====================
app.listen(8787, "127.0.0.1", () => {
  console.log("LOCAL AGENT UP on http://127.0.0.1:8787");
  console.log("Allowed roots:", ALLOWED_ROOTS);
  if (!AGENT_TOKEN) {
    console.log("WARNING: CHOTU_AGENT_TOKEN is not set. /tool/run will reject requests.");
  }
});
