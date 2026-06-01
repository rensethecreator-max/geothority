"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle2, X } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  actionLabel: string;
  actionPath?: string;
  onAction?: () => Promise<{ redirectTo?: string; preventAdvance?: boolean } | void> | { redirectTo?: string; preventAdvance?: boolean } | void;
  markCompleteOnAction?: boolean;
  canSkip: boolean;
}

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  steps: WizardStep[];
  initialStepIndex?: number;
  onStepComplete?: (stepId: string) => void;
  onFinish?: () => void;
}

export default function OnboardingWizard({
  open,
  onClose,
  steps,
  initialStepIndex = 0,
  onStepComplete,
  onFinish,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialStepIndex);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialStepIndex);
  }, [initialStepIndex, open]);

  const currentStep = steps[currentIndex];
  const isLast = currentIndex === steps.length - 1;
  const progressPct = ((currentIndex + 1) / steps.length) * 100;

  const handleAction = async () => {
    setBusy(true);
    try {
      const result = await currentStep.onAction?.();
      if (result?.preventAdvance) return;

      if (currentStep.markCompleteOnAction !== false) {
        onStepComplete?.(currentStep.id);
      }

      const redirectTarget = result?.redirectTo || currentStep.actionPath;
      if (redirectTarget) {
        router.push(redirectTarget);
        onClose();
        return;
      }

      if (isLast) {
        onFinish?.();
        onClose();
        return;
      }

      setCurrentIndex((i) => i + 1);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (busy) return;
    if (isLast) {
      onFinish?.();
      onClose();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!steps.length) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep.icon}
              <div>
                <DialogTitle>{currentStep.title}</DialogTitle>
                <DialogDescription>{currentStep.description}</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentIndex + 1} of {steps.length}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </DialogHeader>

        <div className="py-4">{currentStep.content}</div>

        <DialogFooter className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentIndex((i) => i - 1)} disabled={busy}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {currentStep.canSkip && !isLast && (
              <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy}>
                Skip
              </Button>
            )}
          </div>

          <Button onClick={handleAction} className="bg-electric-500 hover:bg-electric-400" disabled={busy}>
            {isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finish
              </>
            ) : (
              <>
                {currentStep.actionLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
