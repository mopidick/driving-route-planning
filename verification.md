# 推荐筛选逻辑验证报告

日期：2026-03-22

## 1. 结论摘要

- 你反馈的“热门景点召回异常（杭州3小时未出现西湖）”已确认存在，并找到明确根因：
  - 高德 POI 接口参数名使用错误：代码用了 `keyword`，官方字段应为 `keywords`。
  - 该错误会导致关键词检索失效或接口返回参数错误，热门候选召回被严重污染。
- 已完成修复并通过自动化测试与构建验证。

## 2. 根因定位证据（真实接口）

### 2.1 错误参数下的异常表现

请求（旧逻辑等价）：`place/text` + `keyword=西湖景区`

返回摘要：
- `info=MISSING_REQUIRED_PARAMS`
- `infocode=20001`

说明：关键词字段未被正确识别。

### 2.2 正确参数下的正常表现

请求：`place/text` + `keywords=西湖景区`

返回摘要：
- `info=OK`
- `infocode=10000`
- Top结果包含：
  1. 杭州西湖风景名胜区（rating 4.9）
  2. 杭州西湖风景名胜区-断桥残雪（rating 4.9）
  3. 杭州西湖风景名胜区-白堤（rating 4.7）

说明：修正为 `keywords` 后，西湖可被稳定召回。

## 3. 本次代码修复

### 3.1 API 参数修复

- 文件：`src/services/amapApi.ts`
- 改动：
  - `place/around`: `keyword -> keywords`
  - `place/text`: `keyword -> keywords`

### 3.2 候选筛选策略增强（减少小众噪点）

- 文件：`src/services/recommendEngine.ts`
- 改动：
  - 新增低质小点过滤规则（如“口袋公园/文化小广场”等且评分低、无图）
  - 保留热门召回池 + 热度排序 + n小时可达过滤

## 4. 自动化测试用例

### 4.1 `tests/recommendation.test.ts`
- `filters by hours limit and keeps reachable items`
- `sorts by heat score first instead of shortest duration`
- `uses rating and type to raise popular scenic spots`
- `creates todo snapshot with route/tips details`
- `dedupes poi list by name and nearby location`

### 4.2 `tests/recommendEngine.test.ts`
- `keeps hotspot landmark ahead of nearby low-pop spots`
- `adds city hotspot keyword tasks for hangzhou including west lake`
- `falls back to ranked results when all candidates are below popularity threshold`
- `still respects n-hour reachable filter after popularity ranking`

## 5. 测试执行结果

- `npm test`：通过（2 files, 9 tests passed）
- `npm run build`：通过（类型检查 + 打包成功）

## 6. 当前剩余风险

- 高德返回的 POI 仍可能包含“景区子点位”（如西湖-某公园）而不是总景区主实体。
- 目前已通过规则过滤部分低质点，但尚未引入“主景区实体归并”策略。

## 7. 建议的下一步（可选）

1. 增加“主实体优先”归并规则（例如同名主景区优先于子点位）。
2. 增加城市级白名单（杭州优先西湖主实体）并做可配置化。
3. 加一条端到端回归脚本：给定城市+时长，校验核心地标必须命中。
