import React, { memo } from 'react';
import { Card } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MCQQuestionProps {
  question: {
    id: string;
    question: string;
    options: string[];
    correctOption: number;
    explanation: string;
  };
  onAnswerSelect: (answer: number) => void;
  selectedAnswer?: number;
  showFeedback: boolean;
  explanation: string;
}

const MCQQuestion: React.FC<MCQQuestionProps> = memo(({
  question,
  onAnswerSelect,
  selectedAnswer,
  showFeedback,
  explanation
}) => {
  const isCorrect = selectedAnswer === question.correctOption;
  const isIncorrect = selectedAnswer !== undefined && selectedAnswer !== question.correctOption;

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{question.question}</h3>
      </div>

      <RadioGroup
        name={`question-${question.id}`}
        value={selectedAnswer?.toString()}
        onValueChange={(value) => onAnswerSelect(parseInt(value))}
        disabled={showFeedback}
        className="space-y-3"
      >
        {question.options.map((option, index) => (
          <div key={index} className="relative">
            <RadioGroupItem
              value={index.toString()}
              id={`${question.id}-${index}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`${question.id}-${index}`}
              className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors
                ${showFeedback
                  ? index === question.correctOption
                    ? 'bg-green-500/10 border-green-500/20'
                    : index === selectedAnswer
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-foreground/5'
                  : 'hover:bg-foreground/5'
                }`}
            >
              <span className="flex-1">{option}</span>
              {showFeedback && (
                <span className="ml-2">
                  {index === question.correctOption ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : index === selectedAnswer ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : null}
                </span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {showFeedback && (
        <div className="mt-4 p-4 rounded-lg bg-foreground/5">
          <h4 className="font-medium mb-2">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h4>
          <p className="text-sm text-foreground/80">{explanation}</p>
        </div>
      )}
    </Card>
  );
});

MCQQuestion.displayName = 'MCQQuestion';

export default MCQQuestion; 