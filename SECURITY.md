# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FreeFile ITR, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use [GitHub Security Advisories](https://github.com/rohitthink/freefile/security/advisories/new) to report the issue privately.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 1 week
- **Fix:** Depends on severity, but we aim for critical issues within 2 weeks

## Scope

Security issues we care about:

- Data leakage (financial data leaving the device unintentionally)
- Injection vulnerabilities (SQL injection, command injection, XSS)
- Authentication bypass in filing automation
- Dependency vulnerabilities with known exploits
- Insecure data storage

## Out of Scope

- Issues requiring physical access to the device
- Social engineering attacks
- Denial of service on the local app
- Issues in third-party dependencies without a known exploit

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | Best effort |

## Disclosure Policy

We follow coordinated disclosure. Once a fix is released, we will credit the reporter (unless they prefer to remain anonymous) and publish a security advisory.
