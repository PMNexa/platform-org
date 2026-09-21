import { useState } from "react";
import OrgsScreen from "./screens/OrgsScreen";

/**
 * Standalone dev entry only - this package has no login flow of its own
 * (OrgsScreen takes an accessToken prop; see its own docstring), so this
 * just lets you paste one in manually to exercise the screen in
 * isolation. apps/main is the real host, and gets the token from
 * platform-auth-frontend's LoginScreen/SignupScreen instead.
 */
function App() {
  const [accessToken, setAccessToken] = useState("");
  const [submitted, setSubmitted] = useState("");

  if (submitted) return <OrgsScreen accessToken={submitted} />;

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">platform-org (standalone dev)</h1>
      <p>Paste an access token issued by a compatible auth service (same JWT_SECRET) to exercise OrgsScreen.</p>
      <div className="input-group" style={{ maxWidth: 480 }}>
        <input
          type="text"
          className="form-control"
          placeholder="access token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => setSubmitted(accessToken)}>
          Use token
        </button>
      </div>
    </div>
  );
}

export default App;
