# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take the security of Darkstori seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **GitHub Security Advisories** (Preferred)
   - Go to the Security tab
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to: security@darkstori.dev
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-30 days
  - Medium: 30-90 days
  - Low: Best effort

### Disclosure Policy

- We will acknowledge receipt of your vulnerability report
- We will provide an estimated timeline for a fix
- We will notify you when the vulnerability is fixed
- We will publicly disclose the vulnerability after a fix is released (with your permission, we can credit you)

## Security Best Practices

When deploying Darkstori:

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values for `JWT_SECRET_KEY`
   - Rotate secrets regularly

2. **Database**
   - Use SSL/TLS for database connections
   - Enable connection pooling limits
   - Regular backups

3. **API Security**
   - Enable rate limiting
   - Use HTTPS in production
   - Implement proper CORS policies
   - Keep dependencies updated

4. **Monitoring**
   - Enable security logging
   - Monitor for unusual activity
   - Set up alerts for failed authentication attempts

## Known Security Considerations

- This application uses JWT tokens for authentication
- API keys for external services (Google Maps, Kaggle) must be kept secure
- Database credentials should use environment variables only
- MLflow tracking server should not be publicly exposed

## Security Updates

Security updates will be released as patch versions and announced via:
- GitHub Security Advisories
- Release notes
- CHANGELOG.md

Thank you for helping keep Darkstori and our users safe!
