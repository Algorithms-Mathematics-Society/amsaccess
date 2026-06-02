# Chess Plugin Docs

Dedicated CHESS contest mode for AMS with YAML-defined rulesets and live test-play.

## Quick Start

1. Create contest with `plugin_type=CHESS`.
2. Create ruleset in `/org/chess/rulesets`.
3. Validate ruleset and open test-play.
4. Start session and submit moves through test-play APIs.

## YAML DSL Skeleton

```yaml
board:
  width: 8
  height: 8
pieces:
  - id: king
    color: white
  - id: king
    color: black
portals:
  - from: [2,2]
    to: [6,6]
```

## Core Endpoints

- `POST /org/chess/rulesets`
- `POST /org/chess/rulesets/{rulesetID}/validate`
- `POST /org/contests/{id}/chess/testplay/session`
- `POST /org/contests/{id}/chess/testplay/move`
- `GET /org/contests/{id}/chess/testplay/state`
- `GET /org/contests/{id}/chess/testplay/events`
