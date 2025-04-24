import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface MCQQuestionProps {
  data: {
    id: string;
    question: string;
    options: string[];
    correctOption: number;
    explanation: string;
  };
  onAnswer: (selectedOptionIndex: number) => void;
  selectedAnswer: number | null;
  showExplanation: boolean;
}

const MCQQuestion = ({ data, onAnswer, selectedAnswer, showExplanation }: MCQQuestionProps) => {
  // Create a unique name for the radio group based on the question ID
  const radioGroupName = `question-${data.id}`;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">{data.question}</h3>
        </div>

        <div className="space-y-2">
          {data.options.map((option, index) => {
            const isCorrect = showExplanation && index === data.correctOption;
            const isSelected = selectedAnswer === index;
            const isWrong = showExplanation && isSelected && !isCorrect;
            const optionId = `${radioGroupName}-option-${index}`;

            return (
              <div
                key={index}
                className={`flex items-center space-x-2 p-4 rounded-lg border transition-colors ${
                  isCorrect
                    ? 'bg-green-500/10 border-green-500/20'
                    : isWrong
                    ? 'bg-red-500/10 border-red-500/20'
                    : isSelected
                    ? 'bg-thinkforge-purple/10 border-thinkforge-purple/20'
                    : 'hover:bg-foreground/5'
                } ${showExplanation ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={() => !showExplanation && onAnswer(index)}
              >
                <input
                  type="radio"
                  id={optionId}
                  name={radioGroupName}
                  value={index.toString()}
                  checked={isSelected}
                  disabled={showExplanation}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor={optionId}
                  className={`flex-1 ${showExplanation ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default MCQQuestion;
