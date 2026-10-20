import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Globe,
  ListChecks,
  Check,
  BarChart2,
  AlertCircle
} from "lucide-react";

export interface PollOption {
  id: number;
  text: string;
  votesCount?: number;
  percentage?: number;
}

export interface PollData {
  pollId: string;
  question: string;
  options: string[] | PollOption[];
  anonymous?: boolean;
  allowMultiple?: boolean;
  quiz?: boolean;
  correctOptionId?: number;
  closeAt?: number; // epoch in seconds or milliseconds
  tally?: { [optionId: number]: number };
  totalVoters?: number;
  myVotes?: number[];
  isClosed?: boolean;
  explanation?: string;
}

export interface PollMessageProps {
  poll: PollData;
  message?: any;
  messageId?: string;
  isChannel?: boolean;
  onVote?: (pollId: string, selectedOptionIds: number[]) => Promise<void> | void;
  isOut?: boolean;
  currentUserId?: string;
  disabled?: boolean;
  theme?: "dark" | "light" | "coffee" | string;
  className?: string;
}

export const PollMessage: React.FC<PollMessageProps> = ({
  poll,
  message,
  messageId,
  isChannel = false,
  onVote,
  isOut = false,
  disabled = false,
  theme = "dark",
  className = "",
}) => {
  const [selectedOptions, setSelectedOptions] = useState<number[]>(() => {
    return poll?.myVotes || [];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize options array
  const normalizedOptions: PollOption[] = useMemo(() => {
    if (!poll?.options) return [];
    return poll.options.map((opt, index) => {
      if (typeof opt === "string") {
        return {
          id: index,
          text: opt,
          votesCount: poll.tally?.[index] ?? 0,
        };
      }
      return {
        ...opt,
        id: opt.id !== undefined ? opt.id : index,
        votesCount: poll.tally?.[opt.id ?? index] ?? opt.votesCount ?? 0,
      };
    });
  }, [poll?.options, poll?.tally]);

  // Check if user has already voted
  const hasVoted = useMemo(() => {
    return (
      (Array.isArray(poll?.myVotes) && poll.myVotes.length > 0) ||
      (selectedOptions.length > 0 && (poll?.myVotes?.length ?? 0) > 0)
    );
  }, [poll?.myVotes, selectedOptions]);

  // Check if poll is expired by closeAt
  const isExpired = useMemo(() => {
    if (!poll?.closeAt || poll.closeAt <= 0) return false;
    const nowSec = Date.now() / 1000;
    const closeAtSec = poll.closeAt > 1e11 ? poll.closeAt / 1000 : poll.closeAt;
    return nowSec >= closeAtSec;
  }, [poll?.closeAt]);

  const isPollClosed = Boolean(poll?.isClosed || isExpired);
  const canVote = !hasVoted && !isPollClosed && !disabled;

  // Calculate total votes and percentages
  const totalVotesCount = useMemo(() => {
    if (poll?.totalVoters !== undefined) return poll.totalVoters;
    if (poll?.tally) {
      return Object.values(poll.tally).reduce((acc, count) => acc + count, 0);
    }
    let sum = 0;
    for (const opt of normalizedOptions) {
      sum += opt.votesCount || 0;
    }
    return sum;
  }, [poll?.totalVoters, poll?.tally, normalizedOptions]);

  // Options with computed percentages
  const optionsWithPercentages = useMemo(() => {
    return normalizedOptions.map((opt) => {
      const votes = opt.votesCount ?? (poll?.tally?.[opt.id] || 0);
      const pct =
        totalVotesCount > 0
          ? Math.round((votes / totalVotesCount) * 100)
          : 0;
      return {
        ...opt,
        votesCount: votes,
        percentage: opt.percentage !== undefined ? opt.percentage : pct,
      };
    });
  }, [normalizedOptions, poll?.tally, totalVotesCount]);

  const effectivePollId = poll?.pollId || messageId || message?.id || "";

  const handleOptionClick = async (optionId: number) => {
    if (!canVote || isSubmitting) return;
    setError(null);

    if (poll.allowMultiple && !poll.quiz) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      // Single choice -> select option and vote immediately
      setSelectedOptions([optionId]);
      if (!onVote) return;
      setIsSubmitting(true);
      try {
        await onVote(effectivePollId, [optionId]);
      } catch (err: any) {
        console.error("[PollMessage] Ошибка при отправке голоса:", err);
        // Zero-Toast: локальная обработка ошибки
        setError(err?.message || "Ошибка при голосовании");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleMultipleVoteSubmit = async () => {
    if (!canVote || selectedOptions.length === 0 || isSubmitting || !onVote) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onVote(effectivePollId, selectedOptions);
    } catch (err: any) {
      console.error("[PollMessage] Ошибка при отправке голосов:", err);
      // Zero-Toast: локальная обработка ошибки
      setError(err?.message || "Ошибка при голосовании");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVotersCount = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return `${count} голос`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${count} голоса`;
    }
    return `${count} голосов`;
  };

  const formatRemainingTime = (closeAt?: number) => {
    if (!closeAt || closeAt <= 0) return null;
    const nowSec = Date.now() / 1000;
    const closeSec = closeAt > 1e11 ? closeAt / 1000 : closeAt;
    const diff = closeSec - nowSec;
    if (diff <= 0) return "Опрос завершён";
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `До закрытия: ${days} дн.`;
    if (hours > 0) return `До закрытия: ${hours} ч.`;
    return `До закрытия: ${Math.max(1, minutes)} мин.`;
  };

  const showResults = hasVoted || isPollClosed;
  const remainingTimeStr = formatRemainingTime(poll?.closeAt);

  return (
    <div
      data-testid="poll-message-card"
      className={`relative w-full max-w-md rounded-2xl p-4 transition-all select-none ${
        isOut
          ? "bg-purple-950/40 border border-purple-500/20 text-slate-100"
          : "bg-slate-900/60 border border-white/10 text-slate-100"
      } backdrop-blur-md shadow-lg ${className}`}
    >
      {/* Header with Question and Badges */}
      <div className="space-y-2 mb-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {poll.anonymous !== false ? (
            <span
              data-testid="poll-anonymous-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300 border border-white/5"
            >
              <Lock className="w-2.5 h-2.5" />
              Анонимный опрос
            </span>
          ) : (
            <span
              data-testid="poll-public-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20"
            >
              <Globe className="w-2.5 h-2.5" />
              Публичный опрос
            </span>
          )}

          {poll.quiz && (
            <span
              data-testid="poll-quiz-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30"
            >
              <HelpCircle className="w-2.5 h-2.5" />
              Викторина
            </span>
          )}

          {poll.allowMultiple && !poll.quiz && (
            <span
              data-testid="poll-multiple-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20"
            >
              <ListChecks className="w-2.5 h-2.5" />
              Несколько ответов
            </span>
          )}

          {isPollClosed && (
            <span
              data-testid="poll-closed-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/20"
            >
              <Clock className="w-2.5 h-2.5" />
              Завершён
            </span>
          )}
        </div>

        {/* Question */}
        <h4
          data-testid="poll-question"
          className="text-sm sm:text-base font-bold text-slate-100 leading-snug break-words"
        >
          {poll.question || "Опрос"}
        </h4>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {optionsWithPercentages.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const isMyVote = poll.myVotes?.includes(option.id) || (hasVoted && isSelected);
          const isCorrectAnswer = poll.quiz && option.id === poll.correctOptionId;

          // Quiz style calculations after user voted
          let quizBorderClass = "border-white/10";
          let quizBgClass = "bg-white/5";
          let quizTextClass = "text-slate-200";

          if (showResults && poll.quiz) {
            if (isCorrectAnswer) {
              quizBorderClass = "border-emerald-500/50 bg-emerald-500/10";
              quizTextClass = "text-emerald-300 font-semibold";
            } else if (isMyVote && !isCorrectAnswer) {
              quizBorderClass = "border-rose-500/50 bg-rose-500/10";
              quizTextClass = "text-rose-300 font-semibold";
            }
          } else if (showResults && isMyVote) {
            quizBorderClass = "border-purple-500/50 bg-purple-500/15";
            quizTextClass = "text-purple-200 font-medium";
          } else if (isSelected) {
            quizBorderClass = "border-purple-400/60 bg-purple-500/20";
          }

          return (
            <div
              key={option.id}
              data-testid={`poll-option-${option.id}`}
              onClick={() => handleOptionClick(option.id)}
              className={`relative overflow-hidden rounded-xl border p-3 transition-all ${quizBorderClass} ${quizBgClass} ${
                canVote
                  ? "cursor-pointer hover:border-purple-400/40 hover:bg-white/10 active:scale-[0.99]"
                  : "cursor-default"
              }`}
            >
              {/* Progress bar background for results view */}
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${option.percentage || 0}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute top-0 bottom-0 left-0 pointer-events-none opacity-25 ${
                    poll.quiz && isCorrectAnswer
                      ? "bg-emerald-500"
                      : poll.quiz && isMyVote && !isCorrectAnswer
                      ? "bg-rose-500"
                      : isMyVote
                      ? "bg-purple-500"
                      : "bg-white/30"
                  }`}
                />
              )}

              {/* Option Content */}
              <div className="relative z-10 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Selector / Icon */}
                  {!showResults ? (
                    poll.allowMultiple && !poll.quiz ? (
                      // Checkbox
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "border-white/30 bg-black/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    ) : (
                      // Radio
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "border-purple-400"
                            : "border-white/30 bg-black/20"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                        )}
                      </div>
                    )
                  ) : (
                    // Results View Icons
                    <div className="shrink-0">
                      {poll.quiz ? (
                        isCorrectAnswer ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isMyVote ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )
                      ) : isMyVote ? (
                        <Check className="w-4 h-4 text-purple-400 stroke-[3]" />
                      ) : null}
                    </div>
                  )}

                  {/* Option Text */}
                  <span
                    className={`text-xs sm:text-sm break-words ${quizTextClass}`}
                  >
                    {option.text}
                  </span>
                </div>

                {/* Percentage & Vote Count */}
                {showResults && (
                  <div className="flex items-center gap-1.5 shrink-0 pl-2 text-right">
                    <span className="text-xs font-bold text-slate-200">
                      {option.percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({option.votesCount || 0})
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multiple Choice Submit Button */}
      {canVote && poll.allowMultiple && !poll.quiz && (
        <div className="mt-3 flex justify-end">
          <button
            data-testid="poll-submit-multiple-btn"
            onClick={handleMultipleVoteSubmit}
            disabled={selectedOptions.length === 0 || isSubmitting}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Голосование...</span>
            ) : (
              <>
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Голосовать ({selectedOptions.length})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Inline Error Block (Zero-Toast) */}
      {error && (
        <div className="mt-2.5 flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Explanation for Quiz if completed */}
      {showResults && poll.quiz && poll.explanation && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-purple-300">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Объяснение:</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{poll.explanation}</p>
        </div>
      )}

      {/* Footer Details */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span data-testid="poll-total-voters">
          {formatVotersCount(totalVotesCount)}
        </span>

        {remainingTimeStr && (
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" />
            {remainingTimeStr}
          </span>
        )}
      </div>
    </div>
  );
};

export default PollMessage;