import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  HelpCircle,
  BarChart2,
  Lock,
  ListChecks,
  AlertCircle,
  Clock,
  Check
} from "lucide-react";
import { GlassCard } from "../../ui/GlassCard";

export interface CreatedPollData {
  question: string;
  options: string[];
  anonymous: boolean;
  allowMultiple: boolean;
  quiz: boolean;
  correctOptionId?: number;
  explanation?: string;
  closeAt?: number;
}

export interface PollConstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll?: (pollData: CreatedPollData) => Promise<void> | void;
  onSubmit?: (pollData: CreatedPollData) => Promise<void> | void;
  isGroupChat?: boolean;
  isChannel?: boolean;
  theme?: "dark" | "light" | "coffee" | string;
}

export const PollConstructorModal: React.FC<PollConstructorModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
  onSubmit,
  isGroupChat = false,
  isChannel = false,
}) => {
  const [question, setQuestion] = useState<string>("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(!isGroupChat);
  const [allowMultiple, setAllowMultiple] = useState<boolean>(false);
  const [isQuiz, setIsQuiz] = useState<boolean>(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [closeTimerDuration, setCloseTimerDuration] = useState<string>("0"); // in hours
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuestion("");
      setOptions(["", ""]);
      setIsAnonymous(!isGroupChat);
      setAllowMultiple(false);
      setIsQuiz(false);
      setCorrectOptionIndex(null);
      setExplanation("");
      setCloseTimerDuration("0");
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, isGroupChat]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
    setValidationError(null);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctOptionIndex === index) {
      setCorrectOptionIndex(null);
    } else if (correctOptionIndex !== null && correctOptionIndex > index) {
      setCorrectOptionIndex(correctOptionIndex - 1);
    }
    setValidationError(null);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value.slice(0, 100);
    setOptions(newOptions);
    setValidationError(null);
  };

  const handleQuizToggle = (checked: boolean) => {
    setIsQuiz(checked);
    if (checked) {
      setAllowMultiple(false);
      if (correctOptionIndex === null && options.length > 0) {
        setCorrectOptionIndex(0);
      }
    } else {
      setCorrectOptionIndex(null);
      setExplanation("");
    }
    setValidationError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setValidationError("Введите вопрос опроса");
      return;
    }

    // Filter non-empty options
    const filteredOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (filteredOptions.length < 2) {
      setValidationError("Укажите как минимум 2 непустых варианта ответа");
      return;
    }

    if (isQuiz) {
      if (
        correctOptionIndex === null ||
        correctOptionIndex < 0 ||
        correctOptionIndex >= options.length ||
        !options[correctOptionIndex].trim()
      ) {
        setValidationError("Выберите правильный вариант ответа для викторины");
        return;
      }
    }

    // Calculate closeAt timestamp if set
    let closeAt: number | undefined = undefined;
    const durationHours = parseFloat(closeTimerDuration);
    if (durationHours > 0) {
      closeAt = Math.floor(Date.now() / 1000) + Math.round(durationHours * 3600);
    }

    // Find correct index in filtered array if options had empty holes
    let finalCorrectId: number | undefined = undefined;
    if (isQuiz && correctOptionIndex !== null) {
      const correctText = options[correctOptionIndex].trim();
      const mappedIndex = filteredOptions.findIndex((opt) => opt === correctText);
      finalCorrectId = mappedIndex >= 0 ? mappedIndex : 0;
    }

    const payload: CreatedPollData = {
      question: trimmedQuestion,
      options: filteredOptions,
      anonymous: isAnonymous,
      allowMultiple: isQuiz ? false : allowMultiple,
      quiz: isQuiz,
      correctOptionId: finalCorrectId,
      explanation: isQuiz && explanation.trim() ? explanation.trim() : undefined,
      closeAt,
    };

    setIsSubmitting(true);
    try {
      if (onCreatePoll) {
        await onCreatePoll(payload);
      } else if (onSubmit) {
        await onSubmit(payload);
      }
      onClose();
    } catch (err: any) {
      console.error("[PollConstructorModal] Ошибка создания опроса:", err);
      // Zero-Toast: локальный вывод ошибки
      setValidationError(err?.message || "Не удалось создать опрос");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="poll-constructor-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe pb-safe"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative w-full max-w-lg z-10 max-h-[90vh] flex flex-col"
          >
            <GlassCard glow className="w-full flex flex-col overflow-hidden border border-white/10 shadow-2xl bg-slate-900/95 max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="poll-constructor-title"
                      className="text-base font-semibold text-slate-100"
                    >
                      {isQuiz ? "Создание викторины" : "Создание опроса"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Задайте вопрос и укажите варианты ответов
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Question Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label
                      htmlFor="poll-question-input"
                      className="font-medium text-slate-300"
                    >
                      Вопрос
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {question.length}/255
                    </span>
                  </div>
                  <textarea
                    id="poll-question-input"
                    data-testid="poll-question-input"
                    rows={2}
                    maxLength={255}
                    placeholder="Задайте вопрос..."
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      setValidationError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all resize-none"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-300">
                      Варианты ответа ({options.length}/10)
                    </label>
                    {isQuiz && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Отметьте верный ответ
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2"
                        data-testid={`poll-option-row-${idx}`}
                      >
                        {/* Quiz correct answer selector */}
                        {isQuiz && (
                          <button
                            type="button"
                            aria-label={`Выбрать вариант ${idx + 1} как правильный`}
                            data-testid={`poll-quiz-correct-btn-${idx}`}
                            onClick={() => setCorrectOptionIndex(idx)}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              correctOptionIndex === idx
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm"
                                : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}

                        <div className="relative flex-1">
                          <input
                            type="text"
                            maxLength={100}
                            placeholder={`Вариант ${idx + 1}`}
                            value={opt}
                            data-testid={`poll-option-input-${idx}`}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all"
                          />
                        </div>

                        {/* Remove Option Button */}
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            aria-label={`Удалить вариант ${idx + 1}`}
                            data-testid={`poll-remove-option-${idx}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Option Button */}
                  {options.length < 10 && (
                    <button
                      type="button"
                      data-testid="poll-add-option-btn"
                      onClick={handleAddOption}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить вариант
                    </button>
                  )}
                </div>

                {/* Settings & Toggles */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3.5">
                  <span className="text-xs font-semibold text-slate-300">
                    Настройки опроса
                  </span>

                  {/* Anonymous Toggle (only if not restricted) */}
                  {!isGroupChat && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-200">
                            Анонимное голосование
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Имена проголосовавших останутся скрытыми
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        data-testid="poll-anonymous-toggle"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 bg-white/10"
                      />
                    </label>
                  )}

                  {/* Multiple Choice Toggle */}
                  <label
                    className={`flex items-center justify-between ${
                      isQuiz ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Выбор нескольких ответов
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {isQuiz
                            ? "Недоступно в режиме викторины"
                            : "Участники смогут выбрать более одного варианта"}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      data-testid="poll-multiple-toggle"
                      disabled={isQuiz}
                      checked={allowMultiple && !isQuiz}
                      onChange={(e) => setAllowMultiple(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 bg-white/10"
                    />
                  </label>

                  {/* Quiz Mode Toggle */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Режим викторины (Quiz)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Один правильный ответ с подсветкой результатов
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      data-testid="poll-quiz-toggle"
                      checked={isQuiz}
                      onChange={(e) => handleQuizToggle(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-white/10"
                    />
                  </label>

                  {/* Explanation for Quiz */}
                  {isQuiz && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <label
                          htmlFor="quiz-explanation"
                          className="font-medium text-slate-300"
                        >
                          Объяснение (необязательно)
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {explanation.length}/200
                        </span>
                      </div>
                      <input
                        id="quiz-explanation"
                        data-testid="poll-explanation-input"
                        type="text"
                        maxLength={200}
                        placeholder="Пояснение к правильному ответу..."
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 transition-all"
                      />
                    </div>
                  )}

                  {/* Close Timer Selection */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          Время действия
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Автоматическое закрытие
                        </p>
                      </div>
                    </div>
                    <select
                      data-testid="poll-duration-select"
                      value={closeTimerDuration}
                      onChange={(e) => setCloseTimerDuration(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                    >
                      <option value="0">Бессрочно</option>
                      <option value="1">1 час</option>
                      <option value="6">6 часов</option>
                      <option value="24">1 день (24 ч)</option>
                      <option value="72">3 дня (72 ч)</option>
                      <option value="168">7 дней</option>
                    </select>
                  </div>
                </div>

                {/* Inline Validation Error (Zero-Toast) */}
                {validationError && (
                  <div
                    data-testid="poll-validation-error"
                    className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{validationError}</span>
                  </div>
                )}
              </form>

              {/* Footer Buttons */}
              <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  data-testid="poll-create-submit-btn"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Создание...</span>
                  ) : (
                    <>
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Создать опрос</span>
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PollConstructorModal;