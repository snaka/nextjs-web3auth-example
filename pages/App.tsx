import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import {
  WALLET_ADAPTERS,
  CHAIN_NAMESPACES,
  SafeEventEmitterProvider,
  ADAPTER_EVENTS,
} from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import RPC from "./web3RPC";
import Link from "next/link";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? "";
const verifier = process.env.NEXT_PUBLIC_WEB3AUTH_VERIFIER ?? "";

const chainConfig = {
  displayName: "Polygon Testnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x13881",
  rpcTarget: "https://rpc.ankr.com/polygon_mumbai", // This is the public RPC we have added, please pass on your own endpoint while creating an app
  blockExplorer: "https://mumbai.polygonscan.com/",
  ticker: "MATIC",
  tickerName: "Matic",
};

const privateKeyProvider = new CommonPrivateKeyProvider({
  config: { chainConfig },
});

function App() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null
  );

  useEffect(() => {
    const init = async () => {
      try {
        const web3auth = new Web3AuthNoModal({
          clientId,
          chainConfig,
        });
        if (!web3auth) {
          console.error("web3auth not initialized yet");
          return;
        }

        const openloginAdapter = new OpenloginAdapter({
          privateKeyProvider,
          adapterSettings: {
            network: "testnet",
            clientId,
            uxMode: "redirect",
            loginConfig: {
              // Add login configs corresponding to the provider
              // For firebase/ cognito & other providers, you need to pass the JWT token
              // JWT login
              jwt: {
                name: "firebase-login-connect",
                verifier, // Please create a verifier on the developer dashboard and pass the name here
                typeOfLogin: "jwt",
                clientId,
              },
              // Add other login providers here
            },
          },
        });
        web3auth.configureAdapter(openloginAdapter);
        setWeb3auth(web3auth);

        setProvider(web3auth.provider);
        web3auth.on(ADAPTER_EVENTS.CONNECTED, () => {
          console.log("### web3auth connected");
        });
        web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          console.log("### web3auth disconnected");
        });
        web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
          console.log("### web3auth connecting");
        });
        web3auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
          console.error("### web3auth error", error);
        });
        await web3auth.init();

        console.log("### web3auth.init done");
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const loginWithGoogle = async (): Promise<string> => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    console.log("firebaseConfig: ", firebaseConfig);

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    // Get id Token
    const idToken = await result.user?.getIdToken();

    return idToken;
  };

  const login = async () => {
    const idToken = await loginWithGoogle();
    console.log("idToken: ", idToken);

    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connectTo(
      WALLET_ADAPTERS.OPENLOGIN,
      {
        mfaLevel: "default", // Pass on the mfa level of your choice: default, optional, mandatory, none
        // relogin: true,
        loginProvider: "jwt",
        // redirectUrl: window.location.origin,
        extraLoginOptions: {
          id_token: idToken,
          verifierIdField: "sub", // same as your JWT Verifier ID on dashboard
        },
      }
    );
    setProvider(web3authProvider);
  };

  const authenticateUser = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    console.log(idToken);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    console.log(user);
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
  };

  const getChainId = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const chainId = await rpc.getChainId();
    uiConsole(chainId);
  };
  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const address = await rpc.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const receipt = await rpc.sendTransaction();
    uiConsole(receipt);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const signedMessage = await rpc.signMessage();
    uiConsole(signedMessage);
  };

  const getPrivateKey = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const privateKey = await rpc.getPrivateKey();
    uiConsole(privateKey);
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={authenticateUser} className="card">
            Get ID Token
          </button>
        </div>
        <div>
          <button onClick={getChainId} className="card">
            Get Chain ID
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={sendTransaction} className="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Get Private Key
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}>Logged in Successfully!</p>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth
        </a>
        & NextJS Example
      </h1>

      <div className="grid">
        {web3auth?.connected ? loggedInView : unloggedInView}
      </div>

      <hr />
      <div className="grid">
        <div className="flex-container">
          <button className="card">
            <Link href="/foo">Go to Foo</Link>
          </button>
        </div>
        <div>
          <p>
            window.history.state:
            <code>{JSON.stringify(window.history.state)}</code>
          </p>
        </div>
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-pnp-examples/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
