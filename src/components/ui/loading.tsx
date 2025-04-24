import { Loader2 } from "lucide-react";

export const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-thinkforge-purple" />
    </div>
  );
}; 