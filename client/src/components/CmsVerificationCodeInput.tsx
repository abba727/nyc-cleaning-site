import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface CmsVerificationCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}

export function CmsVerificationCodeInput({ id, value, onChange, describedBy }: CmsVerificationCodeInputProps) {
  return (
    <InputOTP
      id={id}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      aria-describedby={describedBy}
      required
      containerClassName="w-full"
    >
      <InputOTPGroup className="w-full justify-between gap-2 sm:justify-start">
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className="h-12 w-11 flex-none rounded-lg border border-slate-300 bg-white text-lg font-semibold shadow-sm first:rounded-lg first:border last:rounded-lg sm:w-12"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
