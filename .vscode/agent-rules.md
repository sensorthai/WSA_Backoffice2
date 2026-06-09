# AI Development Workflow Rules

## Core Principle
Before writing any code, the AI Agent MUST perform analysis and planning.

The AI Agent is NOT allowed to directly modify source code unless Walkthrough.md and Implementation.md have been created and approved.

---

# Phase 1 : Analysis
When a feature request is received:

1. Analyze the existing codebase.
2. Read related files.
3. Identify dependencies.
4. Identify risks.
5. Identify breaking changes.

Then create:

/docs/Walkthrough.md

---

# Walkthrough.md Structure
Must contain:

## Objective
What problem is being solved.

## Current State
Current implementation.

## Proposed Solution
High-level design.

## Impact Analysis
Files affected.

## Database Changes
If any.

## API Changes
If any.

## Security Considerations
Authentication.
Authorization.
Input validation.

## Risks
Potential issues.

## Rollback Plan
How to revert.

---

# Phase 2 : Implementation Plan
After Walkthrough.md is completed:

Create:

/docs/Implementation.md

Implementation.md must contain:

## Feature Overview

## Technical Design

## Folder Structure

## Data Flow

## API Contract

## Database Schema

## Migration Plan

## Testing Plan

## Deployment Plan

## Monitoring Plan

---

# Phase 3 : Task Generation
Create:

/docs/Tasks.md

Format:

- Create API Endpoint
- Create Validation Layer
- Create Service Layer
- Create Database Migration
- Create UI Component
- Add Unit Test
- Add Integration Test
- Update Documentation

Tasks must be granular and independently completable.

---

# Phase 4 : Implementation
Rules:

1. Complete one task at a time.
2. Mark task completed.
3. Explain changes.
4. Update Implementation.md.
5. Never modify unrelated files.
6. Preserve backward compatibility whenever possible.

---

# Phase 5 : Review
After all tasks completed:

Generate:

/docs/Review.md

Include:

## Summary

## Files Changed

## Breaking Changes

## Security Review

## Performance Impact

## Technical Debt

## Future Improvements

---

# Coding Standards

- Follow SOLID principles.
- Prefer composition over inheritance.
- Use TypeScript strict mode.
- Avoid duplicated code.
- Add comments only when necessary.
- Write tests for all business logic.
- Mobile-first UI.
- Accessibility compliant.
- Responsive design required.

---

# Next.js Rules

- App Router only.
- Server Components by default.
- Use Server Actions when appropriate.
- Use Tailwind CSS.
- Use shadcn/ui.
- Use React Hook Form.
- Use Zod validation.

---

# Documentation Rules
Every feature must update:

Walkthrough.md
Implementation.md
Tasks.md
Review.md

before the Pull Request is considered complete.
