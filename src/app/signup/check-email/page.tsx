export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold">Check your email</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Confirm your email, then wait for an admin to approve your account before you can
        start adding recipes.
      </p>
    </div>
  );
}
