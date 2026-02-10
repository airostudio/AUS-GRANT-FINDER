# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

1. **Do NOT** open a public issue
2. Email security details to: [security@your-domain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to understand and address the issue.

## Security Measures

### Authentication & Authorization
- User authentication via secure OAuth providers
- Role-based access control (RBAC)
- API key management for service-to-service communication

### Data Protection
- Encryption at rest for sensitive data
- Encryption in transit (TLS 1.3)
- Regular security audits
- Secure environment variable management

### API Security
- Rate limiting
- Input validation and sanitization
- CORS configuration
- SQL injection prevention via Prisma ORM

### Third-Party Services
- Regular dependency updates
- Security scanning with GitHub Dependabot
- Minimal third-party integrations

### Best Practices
- No hardcoded secrets in code
- Environment variables for configuration
- Regular security updates
- Logging and monitoring

## Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Initial response and triage
3. **Day 3-7**: Investigation and fix development
4. **Day 8-14**: Testing and deployment
5. **Day 15+**: Public disclosure (if appropriate)

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed and fixed. Users will be notified via:
- GitHub Security Advisories
- Release notes
- Email notifications (for critical issues)

## Compliance

This project follows security best practices and guidelines from:
- OWASP Top 10
- Australian Privacy Principles (APP)
- ISO/IEC 27001 principles

## Contact

For security-related questions or concerns:
- Email: security@your-domain.com
- PGP Key: [Link to public key]

Thank you for helping keep AusGrant-Automate secure!
