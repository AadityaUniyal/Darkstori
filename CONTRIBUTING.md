# Contributing to Darkstori

Thank you for your interest in contributing to Darkstori! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/Darkstori.git
   cd Darkstori
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Test your changes**
   ```bash
   # Backend tests
   pytest backend/tests/
   
   # Frontend tests
   cd frontend && npm test
   
   # Linting
   black backend/ database/
   flake8 backend/ database/
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR
   - Fill in the PR template
   - Wait for review

## 💻 Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional)
- Git

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/dev.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
alembic upgrade head

# Start server
cd backend
uvicorn app:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
cd database
pip install -r requirements.txt
python scripts/init_neon_db.py
```

## 📁 Project Structure

```
darkstori/
├── backend/           # FastAPI backend
│   ├── api/          # API routes
│   ├── core/         # Core functionality
│   ├── ml/           # Machine learning
│   └── tests/        # Backend tests
├── frontend/         # React frontend
│   └── src/
├── database/         # Database models & scripts
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── requirements/     # Python dependencies
```


## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(api): add live delivery feed endpoint

Add new endpoint for real-time delivery tracking with platform
availability and delivery time estimation.

Closes #123

---

fix(database): resolve migration conflict

Fix Alembic migration conflict between 001 and 002.

---

docs(readme): update installation instructions

Add detailed steps for database setup and MLflow configuration.
```

## 🔄 Pull Request Process

1. **Update documentation**
   - Update README if needed
   - Add/update docstrings
   - Update API documentation

2. **Add tests**
   - Unit tests for new functions
   - Integration tests for APIs
   - Minimum 80% code coverage

3. **Run checks locally**
   ```bash
   # Format code
   black backend/ database/
   isort backend/ database/
   
   # Lint
   flake8 backend/ database/
   
   # Test
   pytest backend/tests/ --cov=backend
   
   # Frontend
   cd frontend
   npm run lint
   npm test
   ```

4. **Fill PR template**
   - Clear description of changes
   - Link related issues
   - Screenshots for UI changes
   - Breaking changes noted

5. **Wait for review**
   - Address reviewer comments
   - Keep PR focused and small
   - Rebase if needed

6. **Merge requirements**
   - ✅ All CI checks pass
   - ✅ Code review approved
   - ✅ No merge conflicts
   - ✅ Documentation updated

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
pytest backend/tests/

# Run with coverage
pytest backend/tests/ --cov=backend --cov-report=html

# Run specific test
pytest backend/tests/test_live_feed.py

# Run with verbose output
pytest backend/tests/ -v
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Start services
docker-compose up -d

# Run integration tests
pytest backend/tests/integration/

# Stop services
docker-compose down
```

## 📚 Documentation

### Code Documentation

- **Python**: Google-style docstrings
- **JavaScript**: JSDoc comments
- **SQL**: Inline comments for complex queries

### User Documentation

- Update `README.md` for user-facing changes
- Add guides to `docs/` directory
- Update API documentation in `docs/API.md`

### API Documentation

- FastAPI auto-generates docs at `/api/docs`
- Add descriptions to route decorators
- Document request/response schemas

```python
@router.post("/predict", response_model=PredictionResponse)
async def predict_demand(
    request: PredictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Predict demand for a PIN code.
    
    This endpoint uses ML models to forecast delivery demand
    for the next 90 days.
    
    Args:
        request: Prediction request with PIN code and date
        db: Database session
        
    Returns:
        Prediction with confidence intervals
    """
    pass
```

## 🐛 Reporting Bugs

Use GitHub Issues with the bug template:

**Title**: Clear, concise description

**Description**:
- What happened
- What you expected
- Steps to reproduce
- Environment (OS, Python version, etc.)
- Screenshots if applicable

## 💡 Suggesting Features

Use GitHub Issues with the feature template:

**Title**: Feature name

**Description**:
- Problem it solves
- Proposed solution
- Alternative solutions considered
- Additional context

## 📞 Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Email**: aaditya.uniyal22@gmail.com

## 🎯 Good First Issues

Look for issues labeled `good first issue` - these are great for newcomers!

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Darkstori! 🎉**
