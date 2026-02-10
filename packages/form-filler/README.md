# Form Filler Package - The Closer

Automated browser-based form filling for Australian government grant portals using Playwright.

## Features

- **Portal Mappings**: Pre-configured field mappings for major portals
- **Smart Detection**: Automatically detects form fields and input types
- **Human-in-the-Loop**: Semi-automatic mode with verification checkpoints
- **Session Management**: Saves and resumes submission sessions
- **Error Recovery**: Handles timeouts and form validation errors

## Supported Portals

### Federal
- GrantConnect (grants.gov.au)
- AusTender (tenders.gov.au)

### State
- Victoria: tenders.vic.gov.au
- NSW: nswbuy.com.au
- Queensland: qld.gov.au/grants
- Other states (in development)

## Architecture

1. **Portal Mapper**: Maps AI-generated responses to form fields
2. **Browser Controller**: Manages Playwright browser sessions
3. **Form Detector**: Identifies form fields and validation rules
4. **Submission Handler**: Executes form filling with checkpoints

## Usage

```typescript
import { FormFiller } from '@ausgrant/form-filler';

const filler = new FormFiller({
  portal: 'grants.gov.au',
  mode: 'semi-automatic', // or 'manual'
});

await filler.fillApplication({
  grantId: 'grant-123',
  responses: [...],
  attachments: [...],
});
```

## Safety Features

- Screenshot capture at each step
- Human verification checkpoints
- Automatic session save/restore
- Rollback on error
- Dry-run mode for testing

## Portal Mapping Format

Each portal has a mapping file that defines:
- Form field selectors
- Input types and validation
- Navigation flow
- File upload handling
- Submission confirmation
