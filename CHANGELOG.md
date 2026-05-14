# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint configuration for frontend code quality
- Comprehensive test suite for backend API
- GitHub Actions CI/CD pipeline improvements
- GitHub issue and PR templates
- Secrets setup documentation for CI/CD
- CHANGELOG.md for version tracking

### Fixed
- CI/CD pipeline failures in migration checks
- Frontend linting configuration
- Backend test infrastructure setup

### Changed
- Updated CI workflow to use PostgreSQL service for tests
- Improved Docker build process with better caching

## [2.0.0] - 2026-05-11

### Added
- Live delivery feed integration
- Real-time map visualization with Leaflet
- Advanced ML models for demand forecasting
- MLflow integration for experiment tracking
- Coverage gap analysis
- Opportunity zone identification
- Multi-platform support (Blinkit, Zepto, Swiggy Instamart, BigBasket)
- Redis caching layer
- Rate limiting and security features
- Comprehensive API documentation
- Docker containerization
- Database migrations with Alembic

### Changed
- Migrated from SQLite to PostgreSQL (Neon)
- Upgraded to React 18 with modern hooks
- Improved UI/UX with Framer Motion animations
- Enhanced ML pipeline with feature engineering
- Optimized database queries with proper indexing

### Security
- Added JWT authentication
- Implemented input validation
- Added CORS configuration
- Integrated security scanning with Bandit
- Added secrets detection with detect-secrets

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Basic dark store location analysis
- Simple demand prediction model
- Coverage score calculation
- Basic dashboard UI
- PostgreSQL database integration
- FastAPI backend
- React frontend

---

## Version History

### Version 2.0.0 (Current)
**Release Date**: May 11, 2026

**Highlights**:
- Complete platform overhaul with live data integration
- Advanced ML capabilities with MLflow
- Real-time delivery tracking
- Production-ready infrastructure

**Breaking Changes**:
- Database schema changes require migration
- API endpoints restructured with `/api/v1/` prefix
- Authentication now required for most endpoints

### Version 1.0.0
**Release Date**: December 1, 2025

**Highlights**:
- Initial MVP release
- Basic analytics and predictions
- Simple dashboard interface

---


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

---

## Links

- [GitHub Repository](https://github.com/AadityaUniyal/Darkstori)
- [Documentation](./docs/)
- [Issue Tracker](https://github.com/AadityaUniyal/Darkstori/issues)
- [Project Board](https://github.com/AadityaUniyal/Darkstori/projects)

---

[Unreleased]: https://github.com/AadityaUniyal/Darkstori/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/AadityaUniyal/Darkstori/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/AadityaUniyal/Darkstori/releases/tag/v1.0.0
