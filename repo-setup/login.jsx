// Login gate. Two team passwords — NS and Jaggaer. No per-person auth.
// Sets window.__LOGIN_ORG__ = "ns" | "jaggaer" on success.

const { useState: useLoginState } = React;

const LOGIN_SESSION_KEY = "ns_jaggaer_login";

// Hardcoded team credentials
const CREDENTIALS = {
  ns: {
    email: "tracker@netscribes.com",
    password: "Nets@123",
    org: "ns",
    label: "Netscribes",
  },
  jaggaer: {
    email: "tracker@jaggaer.com",
    password: "Jagg@123",
    org: "jaggaer",
    label: "Jaggaer",
  },
};

function readLoginSession() {
  try { return sessionStorage.getItem(LOGIN_SESSION_KEY); } catch { return null; }
}
function writeLoginSession(org) {
  try { sessionStorage.setItem(LOGIN_SESSION_KEY, org); } catch {}
}
function clearLoginSession() {
  try { sessionStorage.removeItem(LOGIN_SESSION_KEY); } catch {}
}

window.NS_LOGIN = { readLoginSession, writeLoginSession, clearLoginSession };

function LoginGate({ onUnlock }) {
  const [email, setEmail] = useLoginState("");
  const [password, setPassword] = useLoginState("");
  const [error, setError] = useLoginState("");
  const [shaking, setShaking] = useLoginState(false);
  const [focusedField, setFocusedField] = useLoginState(null);

  function attempt() {
    const emailTrim = email.trim().toLowerCase();
    const passTrim = password.trim();
    for (const key of Object.keys(CREDENTIALS)) {
      const cred = CREDENTIALS[key];
      if (emailTrim === cred.email.toLowerCase() && passTrim === cred.password) {
        writeLoginSession(key);
        onUnlock(key);
        return;
      }
    }
    setError("Incorrect email or password.");
    setShaking(true);
    setPassword("");
    setTimeout(() => setShaking(false), 500);
  }

  function handleKey(e) {
    if (e.key === "Enter") attempt();
    if (error) setError("");
  }

  return (
    <div className="ns-login-root">
      <div className={`ns-login-frame${shaking ? " ns-login-shake" : ""}`}>

        {/* Logos */}
        <div className="ns-login-logos">
          <div className="ns-login-logo-ns">
            <img src="netscribes-logo.png" alt="Netscribes" />
          </div>
          <span className="ns-login-logo-sep">&times;</span>
          <div className="ns-login-logo-jg">
            <img src="jaggaer-logo.png" alt="Jaggaer" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="ns-login-title">
          The project<br />
          <span className="ns-login-accent">workspace.</span>
        </h1>
        <p className="ns-login-deck">
          Sign in with your team credentials to continue.
        </p>

        {/* Email */}
        <div className={`ns-login-field${focusedField === "email" ? " ns-login-field--focus" : ""}${error ? " ns-login-field--error" : ""}`} style={{ marginBottom: 8 }}>
          <label className="ns-login-label" htmlFor="ns-email-input">Email</label>
          <input
            id="ns-email-input"
            className="ns-login-input"
            type="email"
            value={email}
            autoComplete="username"
            placeholder="tracker@..."
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
            onKeyDown={handleKey}
            autoFocus
          />
        </div>

        {/* Password */}
        <div className={`ns-login-field${focusedField === "password" ? " ns-login-field--focus" : ""}${error ? " ns-login-field--error" : ""}`}>
          <label className="ns-login-label" htmlFor="ns-pw-input">Password</label>
          <input
            id="ns-pw-input"
            className="ns-login-input"
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder="Password"
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            onChange={e => { setPassword(e.target.value); if (error) setError(""); }}
            onKeyDown={handleKey}
          />
        </div>

        {/* Error */}
        <div className={`ns-login-error${error ? " ns-login-error--visible" : ""}`}>
          {error || "\u00a0"}
        </div>

        {/* Submit */}
        <button className="ns-login-btn" onClick={attempt}>
          Enter workspace&nbsp;&nbsp;&rarr;
        </button>

        {/* Footer hint */}
        <p className="ns-login-hint">
          Contact your project lead if you need access.
        </p>
      </div>
    </div>
  );
}

window.LoginGate = LoginGate;
