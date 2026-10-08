export function TokenGate({
  onSubmit,
  onOAuthLogin,
  error,
  oauthAvailable,
}: {
  onSubmit: (token: string) => void;
  onOAuthLogin: () => void;
  error?: string;
  oauthAvailable: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal" data-testid="token-modal">
        <h2>Connect GitHub</h2>
        <p>
          PAT with <code>repo</code> scope. Stored in <code>sessionStorage</code> only.
        </p>
        {error && <p style={{ color: 'var(--accent-red)' }}>⚠ {error}</p>}
        <TokenForm onSubmit={onSubmit} oauthAvailable={oauthAvailable} onOAuthLogin={onOAuthLogin} />
      </div>
    </div>
  );
}

function TokenForm({
  onSubmit,
  onOAuthLogin,
  oauthAvailable,
}: {
  onSubmit: (token: string) => void;
  onOAuthLogin: () => void;
  oauthAvailable: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const token = String(data.get('token') ?? '');
        if (token) onSubmit(token);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      <input
        className="input"
        name="token"
        type="password"
        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
        autoFocus
        autoComplete="off"
      />
      <button className="btn btn--primary" type="submit">
        Connect
      </button>
      {oauthAvailable && (
        <button className="btn" type="button" onClick={onOAuthLogin}>
          Login with GitHub
        </button>
      )}
    </form>
  );
}
