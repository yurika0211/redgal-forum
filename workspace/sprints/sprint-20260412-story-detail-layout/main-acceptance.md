# Main-Agent Acceptance Template

## Sprint ID
- `sprint_id`: `sprint-20260412-story-detail-layout`
- `main_agent`: `codex-gpt-5`

## Input Artifacts Checked
- planner-spec path: `workspace/sprints/sprint-20260412-story-detail-layout/planner-spec.md`
- sprint-contract path: `workspace/sprints/sprint-20260412-story-detail-layout/sprint-contract.md`
- generator-output path: `workspace/sprints/sprint-20260412-story-detail-layout/generator-output.md`
- evaluator-report path: `workspace/sprints/sprint-20260412-story-detail-layout/evaluator-report.md`

## Gate Checks
- Contract criteria fully covered by evidence: yes
- Critical defects unresolved: no
- Evaluator verdict: PASS
- Scope violations detected: no

## Acceptance Decision
- `PASS` or `FAIL`: `PASS`

## If FAIL (Return Package)
- Defect list sent to generator:
1. Attempt-1 evaluator found missing sprint artifacts.
2. Attempt-1 evaluator found missing EV-MAN evidence entries.
- Missing evidence list:
1. `workspace/sprints/sprint-20260412-story-detail-layout/sprint-contract.md`
2. `workspace/sprints/sprint-20260412-story-detail-layout/generator-output.md`
- Rework deadline or next attempt condition: 已完成重做并复检通过。

## If PASS
- Approval rationale: 第二轮 evaluator 复检通过，AC-01..AC-08 全满足，日志和手工证据链完整。
- Ready for final report: yes
- Ready for version management: yes
