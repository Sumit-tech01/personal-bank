"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  Loader2,
  Lock,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatRecoveryCode, generateRecoveryCode, isValidPin } from "@/lib/auth";

export function SplashScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-700 text-white shadow-float">
        <Sprout className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-ink">
        Personal Bank
      </h1>
      <p className="mt-1 text-[13px] text-ink-secondary">Your Family. Your Farm. Your Finances.</p>
      <Loader2 className="mt-8 h-5 w-5 animate-spin text-brand-600" />
    </div>
  );
}

function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-5 pb-8 pt-safe">
        <div className="flex items-center gap-2.5 pt-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Personal Bank</p>
            <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              Private by design
            </p>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-brand-700">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[29px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
            {title}
          </h1>
          <p className="mt-2 text-[13.5px] leading-6 text-ink-secondary">{subtitle}</p>
        </div>

        <div className="mt-7 flex-1">{children}</div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[10.5px] leading-4 text-ink-muted">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your records stay on this device unless you turn on cloud sync.
        </p>
      </div>
    </div>
  );
}

export function SetupScreen() {
  const { setupAccount, notify } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [savedCode, setSavedCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recoveryCode = useMemo(() => generateRecoveryCode(), []);

  const goNext = () => {
    setError("");
    if (step === 0) {
      if (name.trim().length < 2) {
        setError("Please enter your name so the app feels like yours.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!isValidPin(pin)) {
        setError("Choose a 4 to 6 digit PIN.");
        return;
      }
      if (pin !== confirmPin) {
        setError("The two PINs do not match.");
        return;
      }
      setStep(2);
    }
  };

  const create = async () => {
    setError("");
    if (!savedCode) {
      setError("Please confirm that you saved your recovery code.");
      return;
    }
    setBusy(true);
    try {
      await setupAccount({
        name,
        pin,
        mobile: mobile || undefined,
        location: location || undefined,
        recoveryCode,
      });
      notify("Your account is ready. Welcome to Personal Bank.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AuthShell
      eyebrow={`Step ${step + 1} of 3`}
      title={
        step === 0
          ? "Let’s set up your money diary."
          : step === 1
          ? "Protect it with a PIN."
          : "Save your recovery code."
      }
      subtitle={
        step === 0
          ? "No email, no password, no paperwork. Just your name and a private PIN."
          : step === 1
          ? "You will use this PIN every time you open the app. Choose something you will remember."
          : "This is the only way back in if you forget your PIN. Write it down somewhere safe."
      }
    >
      <div className="space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="label" htmlFor="setup-name">
                Your name <span className="text-negative">*</span>
              </label>
              <input
                id="setup-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Ramesh Patil"
                autoComplete="name"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="setup-mobile">
                Mobile number <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="setup-mobile"
                className="input"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="10 digit number"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="label" htmlFor="setup-location">
                Village or town <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="setup-location"
                className="input"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Nimbud"
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <label className="label" htmlFor="setup-pin">
                Create a PIN <span className="text-negative">*</span>
              </label>
              <div className="relative">
                <input
                  id="setup-pin"
                  className="input pr-12 tracking-[0.35em]"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="4 to 6 digits"
                  inputMode="numeric"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin((previous) => !previous)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="setup-confirm">
                Enter the PIN again <span className="text-negative">*</span>
              </label>
              <input
                id="setup-confirm"
                className="input tracking-[0.35em]"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Repeat PIN"
                inputMode="numeric"
                autoComplete="new-password"
              />
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-3 text-[12px] leading-5 text-brand-800">
              <strong>Tip:</strong> Avoid 1234 or your birth year. You can change the PIN later
              in Settings.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-card border border-brand-200 bg-brand-50 p-4 text-center">
              <KeyRound className="mx-auto h-6 w-6 text-brand-700" />
              <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-700">
                Your recovery code
              </p>
              <p className="mt-2 break-all font-mono text-[22px] font-semibold tracking-[0.08em] text-brand-900">
                {formatRecoveryCode(recoveryCode)}
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-semibold text-brand-700"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4">
              <input
                type="checkbox"
                checked={savedCode}
                onChange={(event) => setSavedCode(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#2F7D4F]"
              />
              <span className="text-[13px] leading-5 text-ink-secondary">
                I have written down or saved this code. I understand it cannot be shown again
                after setup.
              </span>
            </label>

            <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
              If you lose the PIN, this code lets you choose a new one. Nobody at Personal Bank
              can recover it for you.
            </div>
          </>
        )}

        {error && (
          <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => {
                setError("");
                setStep((previous) => previous - 1);
              }}
              disabled={busy}
            >
              Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn-primary flex-1" onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={create}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {busy ? "Creating account…" : "Create my account"}
            </button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export function LockScreen() {
  const {
    account,
    unlock,
    resetPinWithRecovery,
    authLockUntil,
    notify,
  } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"pin" | "recovery">("pin");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [now, setNow] = useState(Date.now());

  const pinLength = account?.pinLength ?? 4;
  const lockRemaining = authLockUntil ? Math.max(0, authLockUntil - now) : 0;
  const locked = lockRemaining > 0;

  useEffect(() => {
    if (!authLockUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [authLockUntil]);

  const submit = async (candidate: string) => {
    if (busy || locked) return;
    setBusy(true);
    setError("");
    const result = await unlock(candidate);
    if (!result.ok) {
      setError(result.error ?? "Incorrect PIN.");
      setPin("");
    }
    setBusy(false);
  };

  const press = (key: string) => {
    if (busy || locked) return;
    setError("");
    if (key === "back") {
      setPin((previous) => previous.slice(0, -1));
      return;
    }
    if (key === "clear") {
      setPin("");
      return;
    }
    const next = `${pin}${key}`.slice(0, pinLength);
    setPin(next);
    if (next.length === pinLength) void submit(next);
  };

  const resetWithRecovery = async () => {
    setBusy(true);
    setError("");
    const result = await resetPinWithRecovery(code, newPin);
    if (!result.ok) {
      setError(result.error ?? "Could not reset your PIN.");
      setBusy(false);
      return;
    }
    notify("PIN reset. Your recovery code is still valid.");
    setBusy(false);
  };

  if (!account) return null;

  const seconds = Math.ceil(lockRemaining / 1000);

  if (mode === "recovery") {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Use your recovery code."
        subtitle="Enter the 12-character code you saved during setup, then choose a new PIN."
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="recovery-code">
              Recovery code
            </label>
            <input
              id="recovery-code"
              className="input font-mono uppercase tracking-[0.12em]"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="recovery-pin">
              New PIN
            </label>
            <input
              id="recovery-pin"
              className="input tracking-[0.35em]"
              type="password"
              value={newPin}
              onChange={(event) =>
                setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="4 to 6 digits"
              inputMode="numeric"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="recovery-confirm">
              Repeat new PIN
            </label>
            <input
              id="recovery-confirm"
              className="input tracking-[0.35em]"
              type="password"
              value={confirmPin}
              onChange={(event) =>
                setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Repeat PIN"
              inputMode="numeric"
              autoComplete="new-password"
            />
          </div>
          {newPin !== confirmPin && confirmPin.length > 0 && (
            <p className="text-[12px] font-medium text-negative">The two PINs do not match.</p>
          )}
          {error && (
            <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn-primary w-full"
            onClick={resetWithRecovery}
            disabled={busy || newPin !== confirmPin || newPin.length < 4 || !code.trim()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {busy ? "Checking…" : "Reset PIN and open"}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setMode("pin");
              setError("");
            }}
          >
            Back to PIN
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={`Hello, ${account.name.split(" ")[0]}.`}
      subtitle="Enter your PIN to open your family and farm records."
    >
      <div className="flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-[26px] font-semibold text-brand-800">
          {account.name.trim().charAt(0).toUpperCase()}
        </div>

        <div className="mt-7 flex items-center gap-3" aria-label={`${pin.length} of ${pinLength} digits entered`}>
          {Array.from({ length: pinLength }).map((_, index) => (
            <span
              key={index}
              className={`h-3.5 w-3.5 rounded-full border transition ${
                index < pin.length
                  ? "border-brand-700 bg-brand-700"
                  : "border-line-strong bg-white"
              }`}
            />
          ))}
        </div>

        <p className="mt-3 min-h-[20px] text-[12.5px] font-medium text-negative">
          {locked
            ? `Too many attempts. Try again in ${seconds}s.`
            : error || " "}
        </p>

        <div className="mt-2 grid w-full max-w-[300px] grid-cols-3 gap-2.5">
          {KEYPAD.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={locked || busy}
              className={`flex h-[56px] items-center justify-center rounded-2xl border text-[20px] font-semibold transition active:scale-95 disabled:opacity-40 ${
                key === "clear" || key === "back"
                  ? "border-transparent bg-transparent text-[12px] font-medium text-ink-muted"
                  : "border-line bg-white text-ink shadow-[0_1px_1px_rgba(23,37,27,0.03)]"
              }`}
              aria-label={key === "back" ? "Delete last digit" : key === "clear" ? "Clear PIN" : key}
            >
              {key === "back" ? "Delete" : key === "clear" ? "Clear" : key}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-5 text-[12.5px] font-semibold text-brand-700"
          onClick={() => {
            setMode("recovery");
            setError("");
          }}
        >
          Forgot your PIN? Use recovery code
        </button>

        {busy && !locked && (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking PIN…
          </p>
        )}
      </div>
    </AuthShell>
  );
}
