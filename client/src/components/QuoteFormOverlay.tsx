import { createContext, type ComponentProps, type ReactNode, useContext, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { InquiryForm } from "./InquiryForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type QuoteOverlayContextValue = {
  openQuoteForm: () => void;
};

const QuoteOverlayContext = createContext<QuoteOverlayContextValue | null>(null);

export function QuoteFormOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourcePath, setSourcePath] = useState("/");
  const [location, setLocation] = useLocation();

  const value = useMemo<QuoteOverlayContextValue>(() => ({
    openQuoteForm: () => {
      setSourcePath(location);
      setIsOpen(true);
    },
  }), [location]);

  return (
    <QuoteOverlayContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-2xl" aria-describedby="quote-form-description">
          <DialogHeader className="border-b px-6 pb-5 pt-6 pr-12 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#14846f]">Free consultation</p>
            <DialogTitle className="text-2xl">Request your tailored quote</DialogTitle>
            <DialogDescription id="quote-form-description">Tell us about your property and our team will follow up with a practical next step.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-2">
            <InquiryForm
              compact
              sourcePath={sourcePath}
              heading="Tell us about your property"
              onSuccess={() => {
                setIsOpen(false);
                setLocation("/thank-you/");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </QuoteOverlayContext.Provider>
  );
}

export function useQuoteFormOverlay() {
  const context = useContext(QuoteOverlayContext);
  if (!context) {
    throw new Error("Quote CTA must be rendered inside QuoteFormOverlayProvider.");
  }
  return context;
}

type QuoteCtaProps = Omit<ComponentProps<"button">, "type">;

export function QuoteCta({ children, onClick, ...props }: QuoteCtaProps) {
  const { openQuoteForm } = useQuoteFormOverlay();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      {...props}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) openQuoteForm();
      }}
    >
      {children}
    </button>
  );
}
