import { Check } from "lucide-react";

type CheckoutStep = "shipping" | "payment" | "review";

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
}

const CheckoutSteps = ({ currentStep, onStepClick }: CheckoutStepsProps) => {
  const steps: CheckoutStep[] = ["shipping", "payment", "review"];
  
  const canGoToStep = (targetStep: CheckoutStep) => {
    const currentIndex = steps.indexOf(currentStep);
    const targetIndex = steps.indexOf(targetStep);
    return targetIndex < currentIndex;
  };

  const handleStepClick = (step: CheckoutStep) => {
    if (onStepClick && canGoToStep(step)) {
      onStepClick(step);
    }
  };

  return (
    <div className="flex justify-center mb-10">
      <div className="flex items-center max-w-md w-full justify-between">
        {/* Shipping Step */}
        <div 
          className={`flex flex-col items-center ${
            currentStep === "shipping" ? "text-foreground font-semibold" : "text-muted-foreground"
          } ${canGoToStep("shipping") ? "cursor-pointer hover:text-foreground" : ""}`}
          onClick={() => handleStepClick("shipping")}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            currentStep === "shipping" 
              ? "bg-[#C5A880] text-[#1C1917] shadow-sm font-bold" 
              : "bg-[#1C1917] text-[#FAF8F5]"
          }`}>
            {currentStep === "shipping" ? <span>1</span> : <Check size={16} />}
          </div>
          <span className="text-xs mt-2 uppercase tracking-wider">Shipping</span>
        </div>
        
        <div className={`flex-1 h-[1.5px] mx-3 transition-colors ${currentStep !== "shipping" ? "bg-[#C5A880]" : "bg-border"}`}></div>
        
        {/* Payment Step */}
        <div 
          className={`flex flex-col items-center ${
            currentStep === "payment" ? "text-foreground font-semibold" : "text-muted-foreground"
          } ${canGoToStep("payment") ? "cursor-pointer hover:text-foreground" : ""}`}
          onClick={() => handleStepClick("payment")}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            currentStep === "payment" 
              ? "bg-[#C5A880] text-[#1C1917] shadow-sm font-bold" 
              : currentStep === "review" 
                ? "bg-[#1C1917] text-[#FAF8F5]" 
                : "bg-muted text-muted-foreground border border-border"
          }`}>
            {currentStep === "review" ? <Check size={16} /> : <span>2</span>}
          </div>
          <span className="text-xs mt-2 uppercase tracking-wider">Payment</span>
        </div>
        
        <div className={`flex-1 h-[1.5px] mx-3 transition-colors ${currentStep === "review" ? "bg-[#C5A880]" : "bg-border"}`}></div>
        
        {/* Review Step */}
        <div className={`flex flex-col items-center ${currentStep === "review" ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            currentStep === "review" 
              ? "bg-[#C5A880] text-[#1C1917] shadow-sm font-bold" 
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            <span>3</span>
          </div>
          <span className="text-xs mt-2 uppercase tracking-wider">Confirmation</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSteps;
