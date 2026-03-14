/**
 * Serial in-memory job queue with SSE subscriber broadcasting.
 * Jobs are processed one at a time — no concurrent renders — so
 * src/GeneratedMotion.tsx is never written by two jobs simultaneously.
 *
 * Module-level state persists across requests in Railway's Node.js process.
 */

import fs from "fs";
import path from "path";
import { getJob, updateJob } from "./db";
import { expandPrompt } from "./pipeline/promptExpander";
import { generateSpec } from "./pipeline/specGenerator";
import { generateAnimationCode, fixAnimationCode, wrapComponent } from "./pipeline/codeGenerator";
import { renderAndUpload, typeCheck } from "./pipeline/renderer";
import type { JobStatus, SSEEvent } from "./types";
import { STEP_LABELS } from "./types";

// ── State ──────────────────────────────────────────────────────────────────

const jobQueue: string[] = [];
let isProcessing = false;
const subscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

// ── SSE helpers ────────────────────────────────────────────────────────────

export function subscribe(
  jobId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
  subscribers.get(jobId)!.add(controller);
}

export function unsubscribe(
  jobId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  subscribers.get(jobId)?.delete(controller);
}

function emit(jobId: string, event: SSEEvent): void {
  const data = "data: " + JSON.stringify(event) + "\n\n";
  const encoded = new TextEncoder().encode(data);
  const set = subscribers.get(jobId);
  if (!set) return;
  for (const controller of set) {
    try {
      controller.enqueue(encoded);
      if (event.status === "done" || event.status === "failed") {
        controller.close();
      }
    } catch {
      set.delete(controller);
    }
  }
}

// ── Queue public API ───────────────────────────────────────────────────────

export function enqueueJob(jobId: string): void {
  jobQueue.push(jobId);
  processNext();
}

function processNext(): void {
  if (isProcessing || jobQueue.length === 0) return;
  isProcessing = true;
  const jobId = jobQueue.shift()!;
  runPipeline(jobId)
    .catch((err) => console.error("[queue] Unhandled error for", jobId, err))
    .finally(() => {
      isProcessing = false;
      processNext();
    });
}

// ── Pipeline ───────────────────────────────────────────────────────────────

async function setStep(
  jobId: string,
  step: number,
  status: JobStatus,
  extra: Partial<SSEEvent> = {}
): Promise<void> {
  await updateJob(jobId, { status, step });
  emit(jobId, { jobId, step, status, label: STEP_LABELS[step] ?? "", ...extra });
}

async function failJob(jobId: string, step: number, error: string): Promise<void> {
  await updateJob(jobId, { status: "failed", step, error });
  emit(jobId, { jobId, step, status: "failed", label: "Failed: " + error.slice(0, 200), error });
}

async function runPipeline(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  // Broadcast step 1 for any SSE clients that connected early
  emit(jobId, { jobId, step: 1, status: "queued", label: STEP_LABELS[1] });

  try {
    // Step 2: Expand simple prompt into detailed prompt
    await setStep(jobId, 2, "expanding");
    const expandResult = await expandPrompt(job.prompt);
    if (!expandResult.result) {
      await failJob(jobId, 2, "Prompt expansion failed: " + expandResult.errors.join("; "));
      return;
    }
    const detailedPrompt = expandResult.result.prompt;
    await updateJob(jobId, { detailed_prompt: detailedPrompt });

    // Step 3: Generate spec from detailed prompt
    await setStep(jobId, 3, "spec_generating");
    const specResult = await generateSpec(detailedPrompt);
    if (!specResult.spec) {
      await failJob(jobId, 3, "Spec generation failed: " + specResult.errors.join("; "));
      return;
    }
    const specText = JSON.stringify(specResult.spec, null, 2);

    // Step 4: Spec ready
    await updateJob(jobId, { spec_json: specResult.spec });
    await setStep(jobId, 4, "spec_ready", { specJson: specResult.spec });

    // Step 5: Generate animation code
    await setStep(jobId, 5, "code_generating");
    const { code, fullComponent: initialComponent, issues } = await generateAnimationCode(specText, specResult.spec);
    let fullComponent = initialComponent;
    if (issues.length > 0) console.warn("[queue] Static issues for", jobId, issues.join(", "));

    // Step 6: Code ready — TypeScript check + fix loop
    await setStep(jobId, 6, "code_ready");
    const specObj = specResult.spec as Record<string, unknown>;
    // Write component to disk so typeCheck can compile it
    const generatedPath = path.join(process.cwd(), "src", "GeneratedMotion.tsx");
    fs.writeFileSync(generatedPath, fullComponent, "utf-8");
    const tsResult = typeCheck();
    if (!tsResult.success && tsResult.error) {
      console.warn("[queue] TS errors for", jobId, "— retrying with error feedback");
      const fixedCode = await fixAnimationCode(specText, specResult.spec, code, tsResult.error);
      const hasAssets = Array.isArray(specObj.objects) &&
        (specObj.objects as Record<string, unknown>[]).some(
          (o: Record<string, unknown>) => o.shape === "asset"
        );
      fullComponent = wrapComponent(fixedCode, hasAssets);
      fs.writeFileSync(generatedPath, fullComponent, "utf-8");
      const recheck = typeCheck();
      if (!recheck.success) {
        console.warn("[queue] TS still failing after retry for", jobId, recheck.error?.slice(0, 200));
      } else {
        console.log("[queue] TS fixed on retry for", jobId);
      }
    }

    // Step 7: Render (with code-fix retry on failure)
    await setStep(jobId, 7, "rendering");
    try {
      const result = await renderAndUpload(
        jobId,
        fullComponent,
        specResult.spec as Record<string, unknown>,
        specText
      );

      // Step 8: Done
      await updateJob(jobId, {
        status: "done",
        step: 8,
        video_r2_key: result.videoKey,
        code_r2_key: result.codeKey,
        spec_r2_key: result.specKey,
      });
      emit(jobId, { jobId, step: 8, status: "done", label: STEP_LABELS[8], videoKey: result.videoKey });
    } catch (renderErr) {
      const renderMsg = renderErr instanceof Error ? renderErr.message : String(renderErr);
      console.warn("[queue] Render failed for", jobId, "— attempting code fix...");
      console.warn("[queue] Render error:", renderMsg.slice(0, 500));

      // Feed render error back to LLM to fix the code
      const fixedCode = await fixAnimationCode(specText, specResult.spec, code, renderMsg);
      const hasAssets = Array.isArray(specObj.objects) &&
        (specObj.objects as Record<string, unknown>[]).some(
          (o: Record<string, unknown>) => o.shape === "asset"
        );
      fullComponent = wrapComponent(fixedCode, hasAssets);
      fs.writeFileSync(generatedPath, fullComponent, "utf-8");

      // Retry render with fixed code
      const result = await renderAndUpload(
        jobId,
        fullComponent,
        specResult.spec as Record<string, unknown>,
        specText
      );

      console.log("[queue] Render succeeded on retry for", jobId);
      await updateJob(jobId, {
        status: "done",
        step: 8,
        video_r2_key: result.videoKey,
        code_r2_key: result.codeKey,
        spec_r2_key: result.specKey,
      });
      emit(jobId, { jobId, step: 8, status: "done", label: STEP_LABELS[8], videoKey: result.videoKey });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failJob(jobId, 7, msg);
  }
}
