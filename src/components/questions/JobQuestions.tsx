import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircleQuestion, Send, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import type { JobQuestion } from "@/lib/api";

interface JobQuestionsProps {
  jobId: string;
  role: "homeowner" | "contractor";
}

export function JobQuestions({ jobId, role }: JobQuestionsProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<JobQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.questions.list(jobId);
      setQuestions(data);
    } catch {
      // silently fail — card just stays empty
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAsk = async () => {
    const text = newQuestion.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const created = await api.questions.ask(jobId, text);
      setQuestions((prev) => [...prev, created]);
      setNewQuestion("");
      toast({ title: "Question submitted" });
    } catch (e) {
      toast({
        title: "Failed to submit question",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    const text = answerText.trim();
    if (!text) return;
    setAnswerSubmitting(true);
    try {
      const updated = await api.questions.answer(jobId, questionId, text);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? updated : q))
      );
      setAnsweringId(null);
      setAnswerText("");
      toast({ title: "Answer posted" });
    } catch (e) {
      toast({
        title: "Failed to post answer",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setAnswerSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading questions…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-primary" />
          Questions
          {questions.length > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {questions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {role === "contractor"
              ? "No questions yet — ask the homeowner something about this job."
              : "No questions from contractors yet."}
          </p>
        )}

        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-secondary/30 border border-border rounded-lg p-4 space-y-2"
          >
            {/* Question */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  {role === "homeowner" ? q.asked_by : "You"}
                </span>
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground">{q.question}</p>
            </div>

            {/* Answer */}
            {q.answer ? (
              <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1">
                <span className="text-xs font-medium text-primary">
                  {role === "homeowner" ? "Your answer" : "Homeowner"}
                </span>
                <p className="text-sm text-foreground">{q.answer}</p>
              </div>
            ) : role === "homeowner" ? (
              // Inline reply for homeowner
              answeringId === q.id ? (
                <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-2">
                  <Textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer…"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={answerSubmitting || !answerText.trim()}
                      onClick={() => handleAnswer(q.id)}
                    >
                      {answerSubmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Answer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAnsweringId(null);
                        setAnswerText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4 text-xs gap-1"
                  onClick={() => {
                    setAnsweringId(q.id);
                    setAnswerText("");
                  }}
                >
                  Reply
                </Button>
              )
            ) : (
              // Contractor sees awaiting badge
              <div className="ml-4">
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground border-muted-foreground/30"
                >
                  Awaiting answer
                </Badge>
              </div>
            )}
          </div>
        ))}

        {/* Ask question form — contractor only */}
        {role === "contractor" && (
          <div className="border-t border-border pt-4 space-y-2">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask the homeowner a question about this job…"
              rows={2}
              className="resize-none text-sm"
              maxLength={500}
            />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={submitting || !newQuestion.trim()}
              onClick={handleAsk}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <MessageCircleQuestion className="w-3 h-3" />
              )}
              Ask a Question
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
