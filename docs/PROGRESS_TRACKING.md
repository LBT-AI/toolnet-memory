# Progress Tracking in ToolNet Memory Index

## Overview

ToolNet Memory's index UI displays real-time progress for each indexing stage. Progress tracking is **strictly based on actual work completed**, never on elapsed time or arbitrary percentages.

## Progress Types

### Real Progress (with %)

Stages that report measurable progress with accurate percentages:

#### 1. **Scanning files**

- **Metric**: Files discovered
- **Display**: Count only (e.g., "1,234 found")
- **Implementation**: Reports total files found after scan completes

#### 2. **Parsing code**

- **Metric**: Files parsed / Total files
- **Display**: Progress bar with % (e.g., "███████░░░ 44%")
- **Implementation**: `RepositoryIndexer` reports after each file is parsed
- **Guarantee**: 100% only when all files are parsed

#### 3. **Type Resolution**

- **Metric**: Files processed / Total files
- **Display**: Progress bar with % (e.g., "███████░░░ 67%")
- **Implementation**: `TypeScriptTypeResolver` reports after each source file is analyzed
- **Guarantee**: 100% only when all TypeScript analysis is complete

#### 4. **Rich Graph**

- **Metric**: Files enriched / Total files
- **Display**: Progress bar with % (e.g., "███████░░░ 82%")
- **Implementation**: `RichGraphEnricher` reports after each file is processed
- **Guarantee**: 100% only when all graph enrichment is complete

#### 5. **Semantic Code Index**

- **Metric**: Embedding batches completed / Total batches
- **Display**: Progress bar with % (e.g., "███████░░░ 55%")
- **Implementation**: `SemanticCodeEngine` reports after each batch of 8 chunks is embedded
- **Phases**:
  - `embedding`: Processing chunks through embedding model
  - `saving`: Persisting vectors to storage
- **Guarantee**: 100% only after all embeddings are generated AND saved

#### 6. **3D Visualization Dataset**

- **Metric**: Nodes/Links transformed / Total nodes/links
- **Display**: Progress bar with % (e.g., "███████░░░ 91%")
- **Implementation**: `VisualizationBuilder` reports every 100 nodes/links processed
- **Phases**:
  - `nodes`: Transforming graph symbols to visualization nodes
  - `links`: Transforming graph edges to visualization links
- **Guarantee**: 100% only when all nodes and links are transformed

### Shimmer-Only (no %)

Stages that cannot measure progress accurately and use animation only:

#### 7. **Architecture Intelligence**

- **Why shimmer-only**: Single-pass analysis with no divisible workload
- **Display**: Animated spinner without progress bar
- **Implementation**: `ArchitectureEngine.analyze()` runs as one atomic operation
- **Stages**: Entry point detection, hotspot analysis, layer detection, cluster detection

#### 8. **Graph Analysis**

- **Why shimmer-only**: Single-pass analysis with no divisible workload
- **Display**: Animated spinner without progress bar
- **Implementation**: `CodeAnalysisEngine.analyze()` runs as one atomic operation
- **Stages**: Dead code analysis, dependency analysis

## Implementation Principles

### 1. Real Progress Requirements

For a stage to show real progress (%), it MUST:

- Have a **measurable total workload** known upfront (e.g., total files, total chunks)
- Report **discrete work units completed** (e.g., files processed, batches embedded)
- Ensure `current` increments only when work is **actually complete**
- Never show 100% until **all work including persistence** is done

### 2. Progress Callback Interface

```typescript
export interface StageProgressEvent {
  current: number; // Actual units completed
  total: number; // Total units to complete
  phase?: string; // Optional sub-phase (e.g., 'embedding', 'saving')
  detail?: string; // Optional detail (e.g., current file name)
}

export type StageProgressCallback = (event: StageProgressEvent) => void;
```

### 3. Forbidden Practices

❌ **NEVER** fake progress based on:

- Elapsed time
- Arbitrary percentages (20%, 50%, 90%)
- Estimated completion time
- Timer intervals

❌ **NEVER** show 100% before:

- All processing is complete
- All data is persisted/saved
- All sub-phases are finished

### 4. UI Behavior

**With Real Progress:**

```
✳ Semantic Code Index  ███████████░░░░░░░░░░░░░░  44%
```

**Without Real Progress (Shimmer):**

```
✶ Architecture Intelligence  ░░███░░░░░░░░░░░░
```

**Stage Complete:**

```
◆ Type Resolution — done
```

## Testing

Progress tracking is validated by `tests/production/real-progress.test.ts`:

- ✅ Progress is based on discrete work units, not time
- ✅ Progress never shows 100% before work is complete
- ✅ Progress total remains constant within a phase
- ✅ Progress current is monotonically increasing
- ✅ All progress events have valid current/total values

## Adding Progress to New Stages

To add real progress tracking to a new indexing stage:

1. **Determine if progress is measurable**
   - Can you know the total workload upfront?
   - Can you track discrete units of work completed?
   - If NO to either: use shimmer-only

2. **Add progress callback parameter**

   ```typescript
   async myStage(
     projectId: string,
     onProgress?: StageProgressCallback
   ): Promise<Result> {
     // ...
   }
   ```

3. **Report progress after each work unit**

   ```typescript
   for (let i = 0; i < items.length; i++) {
     await processItem(items[i]);

     onProgress?.({
       current: i + 1,
       total: items.length,
       detail: items[i].name,
     });
   }
   ```

4. **Include persistence in progress**

   ```typescript
   // Don't report 100% until save is complete
   onProgress?.({
     current: totalBatches,
     total: totalBatches,
     phase: 'saving',
   });

   await storage.save(data);
   ```

5. **Wire to index pipeline**
   ```typescript
   await stage('my-stage', 'My Stage', async () => {
     return myEngine.process(projectId, (progress) => {
       options.onStageProgress?.({
         stage: 'my-stage',
         current: progress.current,
         total: progress.total,
         phase: progress.phase,
       });
     });
   });
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ full-index.ts                                               │
│ ├─ Orchestrates all stages                                  │
│ └─ Wires progress callbacks                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ index-pipeline.ts                                           │
│ ├─ Runs each stage sequentially                             │
│ └─ Forwards progress to UI                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ index-live-ui.ts                                            │
│ ├─ Manages UI state                                         │
│ └─ Delegates to shimmer-progress                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ shimmer-progress.ts                                         │
│ ├─ Converts progress to worker messages                     │
│ ├─ Clamps % to 0-99 until current === total                │
│ └─ Spawns shimmer-worker thread                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ shimmer-worker.ts (Worker Thread)                           │
│ ├─ Renders animation frames                                 │
│ ├─ Shows % bar for real progress                            │
│ ├─ Shows shimmer-only for unmeasurable stages               │
│ └─ Rewrites current line (\r\x1b[K)                         │
└─────────────────────────────────────────────────────────────┘
```

## Summary

- **6 stages** have real progress tracking with accurate percentages
- **2 stages** use shimmer-only animation (no fake progress)
- **0 stages** fake progress based on time or arbitrary percentages
- All progress is based on **actual work completed**
- 100% is shown **only when all work is truly complete**
