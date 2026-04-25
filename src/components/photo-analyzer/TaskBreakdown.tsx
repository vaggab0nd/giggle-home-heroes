import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ListChecks, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Task = {
  title: string;
  difficulty_level: "easy" | "medium" | "hard";
  estimated_minutes: number;
};

type TaskBreakdownProps = {
  description: string;
  problemType?: string;
  urgency?: string | number;
  materialsInvolved?: string[];
  requiredTools?: string[];
};

const difficultyBadge = (level: string) => {
  switch (level) {
    case "easy":
      return "bg-primary/10 text-primary";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "hard":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const TaskBreakdown = ({ description, problemType, urgency, materialsInvolved, requiredTools }: TaskBreakdownProps) => {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const fetchBreakdown = async () => {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { description };
      if (problemType) body.problem_type = problemType;
      if (urgency != null) body.urgency = String(urgency);
      if (materialsInvolved?.length) body.materials_involved = materialsInvolved;
      if (requiredTools?.length) body.required_tools = requiredTools;

      const { data, error: fnError } = await supabase.functions.invoke("analyse-breakdown", { body });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.tasks?.length) throw new Error("No tasks returned");

      setTasks(data.tasks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate task breakdown";
      setError(msg);
      toast({ title: "Breakdown failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = tasks?.reduce((sum, t) => sum + t.estimated_minutes, 0) ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (!tasks) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
        <ListChecks className="w-8 h-8 text-primary mx-auto" />
        <div>
          <h3 className="text-foreground font-semibold">Task Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Get a step-by-step shopping list of tasks needed to fix this issue
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={fetchBreakdown} disabled={loading} className="gap-2">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><ListChecks className="w-4 h-4" /> Generate Task List</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ListChecks className="w-5 h-5 text-primary" />
          <div className="text-left">
            <h3 className="text-foreground font-semibold text-sm">Task Breakdown</h3>
            <p className="text-xs text-muted-foreground">
              {tasks.length} steps · <Clock className="w-3 h-3 inline" /> {timeLabel} total
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          <ol className="divide-y divide-border">
            {tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyBadge(task.difficulty_level)}`}>
                  {task.difficulty_level}
                </span>
                <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {task.estimated_minutes}m
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default TaskBreakdown;
