#!/usr/bin/env python3
"""
FreeFile security audit scanner.

Scans the repo (tracked files + git history + untracked surface) and the
GitHub repo configuration for personal information leakage and security
misconfigurations.

Usage:
    python scripts/security_audit.py [--write-report] [--check-external]
                                     [--repo OWNER/REPO] [--json-only]
                                     [--fail-on {warn,critical}]

Exit codes:
    0 = clean (no findings above --fail-on threshold)
    1 = warnings (MEDIUM/LOW findings present)
    2 = CRITICAL or HIGH findings present

Patterns live in scripts/security_patterns.json.
User-specific values (real PAN, email, etc.) live in .security/known_values.json
which MUST be gitignored. A template is at .security/known_values.json.example.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).parent.parent.resolve()
SCRIPT_DIR = REPO_ROOT / "scripts"
SECURITY_DIR = REPO_ROOT / ".security"

PATTERNS_FILE = SCRIPT_DIR / "security_patterns.json"
ALLOWLIST_FILE = SCRIPT_DIR / "security_allowlist.json"
KNOWN_VALUES_FILE = SECURITY_DIR / "known_values.json"
REPORT_FILE = SECURITY_DIR / "audit-report.json"

MAX_FILE_BYTES = 2 * 1024 * 1024  # 2 MB per file
BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tiff",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z",
    ".db", ".sqlite", ".sqlite3",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp3", ".mp4", ".webm", ".ogg", ".wav",
    ".so", ".dylib", ".dll", ".exe", ".class", ".jar", ".pyc",
    ".keystore", ".jks", ".pfx", ".p12",
}
SKIP_DIRS = {
    "node_modules", "venv", ".venv", ".git", "dist", "build",
    "__pycache__", ".next", "target", "coverage", ".pytest_cache",
}
GITIGNORE_BASELINE = {
    "*.db", "*.sqlite", "*.sqlite3",
    "*.key", "*.pem", "*.pfx", "*.p12", "*.keystore", "*.jks",
    ".env", ".env.*",
    "secrets.json", "credentials.json",
    "venv/", "node_modules/", "__pycache__/",
    ".ssh/",
}

SEVERITY_ORDER = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
SEVERITY_RANK = {s: i for i, s in enumerate(SEVERITY_ORDER)}


@dataclass
class Finding:
    severity: str
    category: str
    rule: str
    file: str | None
    line: int | None
    match_preview: str
    context: str
    remediation: str
    source_type: str
    id: str = field(default="")

    def __post_init__(self) -> None:
        if not self.id:
            key = f"{self.category}|{self.rule}|{self.file}|{self.line}|{self.match_preview}"
            self.id = hashlib.sha1(key.encode()).hexdigest()[:12]


def redact(value: str, keep: int = 4) -> str:
    """Redact a secret — keep first N chars, replace rest with ***."""
    if len(value) <= keep:
        return "***"
    return value[:keep] + "***"


def run(cmd: list[str], cwd: Path | None = None, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=str(cwd or REPO_ROOT),
        capture_output=True,
        text=True,
        check=check,
    )


def load_patterns() -> list[dict[str, Any]]:
    if not PATTERNS_FILE.exists():
        print(f"ERROR: patterns file not found at {PATTERNS_FILE}", file=sys.stderr)
        sys.exit(3)
    data = json.loads(PATTERNS_FILE.read_text())
    return data.get("patterns", [])


def load_allowlist() -> dict[str, Any]:
    if not ALLOWLIST_FILE.exists():
        return {"exposures": [], "history_exposures": []}
    try:
        return json.loads(ALLOWLIST_FILE.read_text())
    except json.JSONDecodeError:
        return {"exposures": [], "history_exposures": []}


def is_allowlisted(finding: "Finding", raw_value: str, allowlist: dict[str, Any]) -> tuple[bool, str]:
    """Return (True, reason) if this finding is allowlisted, (False, '') otherwise."""
    if finding.category == "git_history":
        for entry in allowlist.get("history_exposures", []):
            if entry.get("rule") == finding.rule:
                return True, entry.get("reason", "")
        return False, ""

    for entry in allowlist.get("exposures", []):
        if entry.get("rule") != finding.rule:
            continue
        # File match: exact path or glob
        path_match = False
        if "file" in entry and entry["file"] == finding.file:
            path_match = True
        elif "file_glob" in entry and finding.file and glob_to_regex(entry["file_glob"]).match(finding.file):
            path_match = True
        if not path_match:
            continue
        # Optional value match
        if "value_equals" in entry and entry["value_equals"] != raw_value:
            continue
        return True, entry.get("reason", "")
    return False, ""


def load_known_values() -> dict[str, Any]:
    if not KNOWN_VALUES_FILE.exists():
        print(
            f"WARN: {KNOWN_VALUES_FILE} not found — skipping literal known-value checks.\n"
            f"      Copy .security/known_values.json.example and fill in your real values.",
            file=sys.stderr,
        )
        return {}
    try:
        return json.loads(KNOWN_VALUES_FILE.read_text())
    except json.JSONDecodeError as exc:
        print(f"ERROR: {KNOWN_VALUES_FILE} is not valid JSON: {exc}", file=sys.stderr)
        return {}


def known_value_strings(known: dict[str, Any]) -> list[tuple[str, str]]:
    """Flatten known_values.json into (category, value) pairs for literal search."""
    out: list[tuple[str, str]] = []
    if not known:
        return out
    placeholder = {"ABCDE1234F", "you@example.com", "+91XXXXXXXXXX", "Your Name", "YYYY-MM-DD", "ABCD0123456", "1234"}

    def add(category: str, value: Any) -> None:
        if isinstance(value, str) and value and value not in placeholder:
            out.append((category, value))
        elif isinstance(value, list):
            for v in value:
                add(category, v)

    for key, val in known.items():
        add(key, val)
    return out


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    """Convert a glob pattern supporting ** to a compiled regex. Anchored."""
    out: list[str] = []
    i = 0
    while i < len(pattern):
        c = pattern[i]
        if c == "*":
            if i + 1 < len(pattern) and pattern[i + 1] == "*":
                # ** = any path (including /)
                out.append(".*")
                i += 2
                if i < len(pattern) and pattern[i] == "/":
                    i += 1
            else:
                # * = any non-slash sequence
                out.append("[^/]*")
                i += 1
        elif c == "?":
            out.append("[^/]")
            i += 1
        elif c in ".+^$()|{}[]\\":
            out.append(re.escape(c))
            i += 1
        else:
            out.append(c)
            i += 1
    return re.compile("^" + "".join(out) + "$")


def is_binary(path: Path) -> bool:
    if path.suffix.lower() in BINARY_EXTS:
        return True
    try:
        with path.open("rb") as f:
            chunk = f.read(4096)
        return b"\x00" in chunk
    except OSError:
        return True


def git_tracked_files() -> list[Path]:
    proc = run(["git", "ls-files", "-z"])
    if proc.returncode != 0:
        print(f"ERROR: git ls-files failed: {proc.stderr}", file=sys.stderr)
        return []
    files = [REPO_ROOT / p for p in proc.stdout.split("\0") if p]
    return [f for f in files if f.exists() and f.is_file()]


def scan_tracked_files(files: list[Path], patterns: list[dict[str, Any]], known_values: list[tuple[str, str]]) -> list[tuple[Finding, str]]:
    """Return list of (finding, raw_match_value) tuples so allowlist can filter by value."""
    findings: list[tuple[Finding, str]] = []
    compiled = [(p, re.compile(p["regex"])) for p in patterns]
    for path in files:
        if is_binary(path):
            continue
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        rel = str(path.relative_to(REPO_ROOT))
        # Skip the scanner's own config files (they contain pattern templates / allowlist values that would self-match)
        if rel in ("scripts/security_patterns.json", "scripts/security_audit.py", "scripts/security_allowlist.json"):
            continue
        lines = text.splitlines()
        for pattern_def, compiled_re in compiled:
            placeholder_values = set(pattern_def.get("placeholder_values", []))
            for match in compiled_re.finditer(text):
                raw_value = match.group(0)
                # Skip universally-recognized placeholders
                if raw_value in placeholder_values:
                    continue
                # Locate line number
                line_no = text[: match.start()].count("\n") + 1
                line_text = lines[line_no - 1] if line_no <= len(lines) else ""
                # Apply allowlist context check
                allow_ctx = pattern_def.get("allowlist_context", [])
                lower_line = line_text.lower()
                if any(term in lower_line for term in allow_ctx):
                    continue
                finding = Finding(
                    severity=pattern_def["severity"],
                    category="tracked_files",
                    rule=pattern_def["name"],
                    file=rel,
                    line=line_no,
                    match_preview=redact(raw_value),
                    context=line_text.strip()[:200],
                    remediation=pattern_def.get("remediation", ""),
                    source_type="regex",
                )
                findings.append((finding, raw_value))

        # Known values (literal) — higher severity than regex
        for category, value in known_values:
            idx = 0
            while True:
                pos = text.find(value, idx)
                if pos < 0:
                    break
                line_no = text[:pos].count("\n") + 1
                line_text = lines[line_no - 1] if line_no <= len(lines) else ""
                finding = Finding(
                    severity="CRITICAL",
                    category="tracked_files",
                    rule=f"known_value_{category}",
                    file=rel,
                    line=line_no,
                    match_preview=redact(value),
                    context=line_text.strip()[:200],
                    remediation=f"Your real {category} is in a committed file. Remove it and rewrite git history with git filter-repo.",
                    source_type="literal",
                )
                findings.append((finding, value))
                idx = pos + len(value)
    return findings


def scan_git_history(known_values: list[tuple[str, str]]) -> list[tuple[Finding, str]]:
    findings: list[tuple[Finding, str]] = []
    if not known_values:
        return findings
    for category, value in known_values:
        # Use -S for pickaxe search — finds commits where the string was added or removed.
        proc = run(["git", "log", "--all", "--full-history", "-S", value, "--format=%H|%s"])
        if proc.returncode != 0 or not proc.stdout.strip():
            continue
        for line in proc.stdout.strip().splitlines():
            sha, _, subject = line.partition("|")
            finding = Finding(
                severity="CRITICAL",
                category="git_history",
                rule=f"history_known_value_{category}",
                file=None,
                line=None,
                match_preview=redact(value),
                context=f"commit {sha[:8]}: {subject[:120]}",
                remediation=f"Rewrite history: git filter-repo --replace-text <(echo '{value}==>REDACTED') && git push --force",
                source_type="literal",
            )
            findings.append((finding, value))
    return findings


def scan_untracked_surface(gitignore_patterns: set[str]) -> list[Finding]:
    findings: list[Finding] = []
    risky_suffixes = {".env", ".key", ".pem", ".pfx", ".p12", ".keystore", ".jks", ".sqlite", ".sqlite3"}
    risky_names = {"secrets.json", "credentials.json", ".env"}
    # Get untracked files from git
    proc = run(["git", "ls-files", "--others", "--exclude-standard", "-z"])
    if proc.returncode != 0:
        return findings
    untracked = [REPO_ROOT / p for p in proc.stdout.split("\0") if p]
    for path in untracked:
        if not path.exists():
            continue
        name = path.name
        suffix = path.suffix.lower()
        if suffix in risky_suffixes or name in risky_names or name.startswith(".env."):
            findings.append(Finding(
                severity="HIGH",
                category="untracked_surface",
                rule="risky_untracked_file",
                file=str(path.relative_to(REPO_ROOT)),
                line=None,
                match_preview=name,
                context=f"file exists locally but is not gitignored — risks future accidental commit",
                remediation=f"Add {suffix or name} to .gitignore immediately.",
                source_type="file_check",
            ))
    return findings


def audit_gitignore() -> list[Finding]:
    findings: list[Finding] = []
    gitignore = REPO_ROOT / ".gitignore"
    if not gitignore.exists():
        findings.append(Finding(
            severity="HIGH",
            category="gitignore_coverage",
            rule="no_gitignore",
            file=".gitignore",
            line=None,
            match_preview="missing",
            context=".gitignore does not exist",
            remediation="Create a .gitignore with at least the baseline patterns.",
            source_type="config_check",
        ))
        return findings
    content = gitignore.read_text()
    present = {line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("#")}
    missing = GITIGNORE_BASELINE - present
    for pattern in sorted(missing):
        findings.append(Finding(
            severity="MEDIUM",
            category="gitignore_coverage",
            rule="missing_gitignore_pattern",
            file=".gitignore",
            line=None,
            match_preview=pattern,
            context=f"baseline pattern missing from .gitignore",
            remediation=f"Add '{pattern}' to .gitignore.",
            source_type="config_check",
        ))
    return findings


def audit_github_settings(repo: str) -> tuple[dict[str, Any], list[Finding]]:
    findings: list[Finding] = []
    config: dict[str, Any] = {
        "secret_scanning": "unknown",
        "push_protection": "unknown",
        "dependabot_alerts": "unknown",
        "dependabot_security_updates": "unknown",
        "branch_protection_main": None,
        "webhooks": [],
    }
    # Main repo settings
    proc = run(["gh", "api", f"repos/{repo}", "--jq", ".security_and_analysis"])
    if proc.returncode == 0 and proc.stdout.strip():
        try:
            sa = json.loads(proc.stdout)
            config["secret_scanning"] = sa.get("secret_scanning", {}).get("status", "unknown")
            config["push_protection"] = sa.get("secret_scanning_push_protection", {}).get("status", "unknown")
            config["dependabot_security_updates"] = sa.get("dependabot_security_updates", {}).get("status", "unknown")
        except json.JSONDecodeError:
            pass

    # Dependabot alerts
    proc = run(["gh", "api", f"repos/{repo}/vulnerability-alerts"])
    # 204 = enabled, 404 = disabled
    if "404" in (proc.stderr or "") or "Not Found" in (proc.stderr or ""):
        config["dependabot_alerts"] = "disabled"
    else:
        config["dependabot_alerts"] = "enabled"

    # Branch protection on main
    proc = run(["gh", "api", f"repos/{repo}/branches/main/protection"])
    if proc.returncode == 0 and proc.stdout.strip():
        try:
            config["branch_protection_main"] = json.loads(proc.stdout)
        except json.JSONDecodeError:
            pass
    else:
        config["branch_protection_main"] = None

    # Webhooks
    proc = run(["gh", "api", f"repos/{repo}/hooks"])
    if proc.returncode == 0 and proc.stdout.strip():
        try:
            hooks = json.loads(proc.stdout)
            config["webhooks"] = [
                {"url": h.get("config", {}).get("url", "?"), "insecure_ssl": h.get("config", {}).get("insecure_ssl", "?")}
                for h in hooks
            ]
        except json.JSONDecodeError:
            pass

    # Convert to findings
    if config["secret_scanning"] != "enabled":
        findings.append(Finding(
            severity="HIGH",
            category="github_config",
            rule="secret_scanning_off",
            file=None, line=None,
            match_preview=config["secret_scanning"],
            context="GitHub secret scanning is not enabled",
            remediation="Enable at repo Settings > Code security > Secret scanning.",
            source_type="config_check",
        ))
    if config["push_protection"] != "enabled":
        findings.append(Finding(
            severity="MEDIUM",
            category="github_config",
            rule="push_protection_off",
            file=None, line=None,
            match_preview=config["push_protection"],
            context="GitHub secret scanning push protection is not enabled",
            remediation="Enable push protection at repo Settings > Code security.",
            source_type="config_check",
        ))
    if config["dependabot_alerts"] != "enabled":
        findings.append(Finding(
            severity="HIGH",
            category="github_config",
            rule="dependabot_alerts_off",
            file=None, line=None,
            match_preview=config["dependabot_alerts"],
            context="Dependabot vulnerability alerts are disabled",
            remediation="Run: gh api -X PUT repos/{repo}/vulnerability-alerts".replace("{repo}", repo),
            source_type="config_check",
        ))
    if config["dependabot_security_updates"] != "enabled":
        findings.append(Finding(
            severity="MEDIUM",
            category="github_config",
            rule="dependabot_security_updates_off",
            file=None, line=None,
            match_preview=config["dependabot_security_updates"],
            context="Dependabot automated security updates are disabled",
            remediation=f"Run: gh api -X PUT repos/{repo}/automated-security-fixes",
            source_type="config_check",
        ))
    for hook in config["webhooks"]:
        if hook.get("insecure_ssl") not in ("0", 0, False, "false"):
            findings.append(Finding(
                severity="HIGH",
                category="github_config",
                rule="insecure_webhook",
                file=None, line=None,
                match_preview=hook.get("url", "?")[:40],
                context=f"Webhook allows insecure SSL: {hook}",
                remediation="Disable insecure_ssl on the webhook or remove it.",
                source_type="config_check",
            ))
    return config, findings


def search_other_public_repos(known_values: list[tuple[str, str]], current_repo: str) -> list[Finding]:
    findings: list[Finding] = []
    for category, value in known_values:
        # gh search code returns non-zero for zero matches, which is fine
        proc = run(["gh", "search", "code", value, "--json", "repository,path", "--limit", "10"])
        if proc.returncode != 0 or not proc.stdout.strip():
            continue
        try:
            hits = json.loads(proc.stdout)
        except json.JSONDecodeError:
            continue
        for hit in hits:
            repo_name = hit.get("repository", {}).get("nameWithOwner", "?")
            if repo_name == current_repo:
                continue  # expected — we scan it above
            path = hit.get("path", "?")
            findings.append(Finding(
                severity="CRITICAL",
                category="external_leaks",
                rule=f"external_{category}",
                file=f"{repo_name}:{path}",
                line=None,
                match_preview=redact(value),
                context=f"Your {category} appears in public repo {repo_name}",
                remediation="Contact the repo owner and request removal; consider rotating the compromised value.",
                source_type="external_search",
            ))
    return findings


def git_head_sha() -> str:
    proc = run(["git", "rev-parse", "HEAD"])
    return proc.stdout.strip() if proc.returncode == 0 else "unknown"


def build_report(findings: list[Finding], suppressed: list[dict[str, Any]], github_config: dict[str, Any], repo: str, external_checked: bool) -> dict[str, Any]:
    summary = {s.lower(): 0 for s in SEVERITY_ORDER}
    for f in findings:
        summary[f.severity.lower()] += 1
    exit_code = 0
    if summary["critical"] > 0 or summary["high"] > 0:
        exit_code = 2
    elif summary["medium"] > 0 or summary["low"] > 0:
        exit_code = 1
    return {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo": repo,
        "git_head": git_head_sha(),
        "summary": summary,
        "exit_code": exit_code,
        "findings": [asdict(f) for f in sorted(findings, key=lambda x: (-SEVERITY_RANK.get(x.severity, 0), x.category, x.rule))],
        "suppressed_count": len(suppressed),
        "suppressed": suppressed,
        "github_config": github_config,
        "known_values_loaded": bool(KNOWN_VALUES_FILE.exists()),
        "external_repos_checked": external_checked,
    }


def render_human_summary(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=" * 70)
    print(f"FreeFile Security Audit — {report['generated_at'][:19]}Z")
    print(f"Repo: {report['repo']}  HEAD: {report['git_head'][:8]}")
    print("=" * 70)
    print(f"CRITICAL: {summary['critical']}   HIGH: {summary['high']}   "
          f"MEDIUM: {summary['medium']}   LOW: {summary['low']}   INFO: {summary['info']}")
    if report.get("suppressed_count", 0):
        print(f"(Allowlisted: {report['suppressed_count']} — see suppressed list in JSON report)")
    print()
    print("GitHub config:")
    gc = report["github_config"]
    for key in ("secret_scanning", "push_protection", "dependabot_alerts", "dependabot_security_updates"):
        val = gc.get(key, "?")
        icon = "✓" if val == "enabled" else "✗"
        print(f"  {icon} {key}: {val}")
    print(f"  Branch protection on main: {'configured' if gc.get('branch_protection_main') else 'none'}")
    print(f"  Webhooks: {len(gc.get('webhooks', []))}")
    print()
    if not report["findings"]:
        print("No findings. Repo is clean.")
        return
    print(f"Findings ({len(report['findings'])}):")
    print("-" * 70)
    for f in report["findings"]:
        loc = f"{f['file']}:{f['line']}" if f["file"] else "(repo-wide)"
        print(f"[{f['severity']:8}] {f['rule']:32} {loc}")
        print(f"            {f['context'][:100]}")
        if f["remediation"]:
            print(f"       fix: {f['remediation'][:100]}")
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description="FreeFile security audit scanner.")
    parser.add_argument("--write-report", action="store_true", help=f"write JSON report to {REPORT_FILE}")
    parser.add_argument("--check-external", action="store_true", help="search other public repos for known values (slow)")
    parser.add_argument("--repo", default="rohitthink/freefile", help="GitHub repo in OWNER/NAME form")
    parser.add_argument("--fail-on", choices=["warn", "critical"], default="critical", help="exit non-zero when findings at this level exist")
    parser.add_argument("--json-only", action="store_true", help="print JSON report to stdout instead of human summary")
    args = parser.parse_args()

    patterns = load_patterns()
    known = load_known_values()
    known_flat = known_value_strings(known)
    allowlist = load_allowlist()

    raw_findings: list[tuple[Finding, str]] = []
    all_findings: list[Finding] = []

    tracked = git_tracked_files()
    raw_findings.extend(scan_tracked_files(tracked, patterns, known_flat))
    raw_findings.extend(scan_git_history(known_flat))

    # Apply allowlist to raw findings (file-based rules only)
    suppressed: list[dict[str, Any]] = []
    for finding, raw_value in raw_findings:
        is_allowed, reason = is_allowlisted(finding, raw_value, allowlist)
        if is_allowed:
            suppressed.append({"id": finding.id, "rule": finding.rule, "file": finding.file, "reason": reason})
        else:
            all_findings.append(finding)

    # Non-allowlistable findings (no raw value to match against)
    all_findings.extend(scan_untracked_surface(set()))
    all_findings.extend(audit_gitignore())

    github_config, gh_findings = audit_github_settings(args.repo)
    all_findings.extend(gh_findings)

    external_checked = False
    if args.check_external and known_flat:
        all_findings.extend(search_other_public_repos(known_flat, args.repo))
        external_checked = True

    report = build_report(all_findings, suppressed, github_config, args.repo, external_checked)

    if args.write_report:
        SECURITY_DIR.mkdir(parents=True, exist_ok=True)
        REPORT_FILE.write_text(json.dumps(report, indent=2))

    if args.json_only:
        print(json.dumps(report, indent=2))
    else:
        render_human_summary(report)

    exit_code = report["exit_code"]
    if args.fail_on == "critical" and exit_code == 1:
        # warnings present but fail threshold is critical — exit 0 but keep code informational
        return 0
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
